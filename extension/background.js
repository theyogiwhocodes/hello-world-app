// Fills the user's cart on the target site by driving their own logged-in browser tabs.
// It only adds items. It never checks out, and it never reads or stores credentials.

const CART_URL = {
  amazon: 'https://www.amazon.in/gp/cart/view.html',
  flipkart: 'https://www.flipkart.com/viewcart',
  blinkit: 'https://blinkit.com/',
  zepto: 'https://www.zeptonow.com/',
  instamart: 'https://www.swiggy.com/instamart',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === 'ping') {
    sendResponse({ ok: true });
  } else if (msg.action === 'buy') {
    buy(msg.payload).then(sendResponse, (e) => sendResponse({ ok: false, message: String(e) }));
    return true; // async response
  }
});

function waitForLoad(tabId) {
  return new Promise((resolve) => {
    const done = (id, info) => {
      if (id === tabId && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(done);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(done);
    setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(done);
      resolve();
    }, 20000);
  });
}

// Injected into the product page. Clicks the site's own add-to-cart control `qty` times.
function clickAdd(qty) {
  const ADD = /^(add( to (cart|bag))?|buy now)$/i;
  const find = () =>
    [...document.querySelectorAll('button, [role="button"], input[type="submit"]')].find((el) => {
      const t = (el.innerText || el.value || '').trim();
      return ADD.test(t) && !el.disabled;
    }) || document.querySelector('#add-to-cart-button');
  return new Promise((resolve) => {
    let tries = 0;
    const tick = async () => {
      const btn = find();
      if (!btn) {
        if (++tries > 20) return resolve({ added: 0, reason: 'No add-to-cart button found (not logged in, out of stock, or pincode not set?)' });
        return setTimeout(tick, 500);
      }
      let added = 0;
      for (let i = 0; i < qty; i++) {
        const b = i === 0 ? btn : find() || document.querySelector('[aria-label*="increase" i], [aria-label*="plus" i], button:has(svg[aria-label*="plus" i])');
        if (!b) break;
        b.click();
        added++;
        await new Promise((r) => setTimeout(r, 600));
      }
      resolve({ added });
    };
    tick();
  });
}

async function buy({ platform, items }) {
  if (!CART_URL[platform] || !Array.isArray(items) || items.length === 0) {
    return { ok: false, message: 'Nothing to buy.' };
  }
  const failed = [];
  let addedCount = 0;

  for (const item of items) {
    const tab = await chrome.tabs.create({ url: item.url, active: false });
    await waitForLoad(tab.id);
    await sleep(1500); // SPAs hydrate after load
    try {
      const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: clickAdd, args: [item.qty] });
      if (result?.added) addedCount++;
      else failed.push(`${item.title}: ${result?.reason ?? 'not added'}`);
    } catch (e) {
      failed.push(`${item.title}: ${e}`);
    }
    await chrome.tabs.remove(tab.id).catch(() => {});
  }

  await chrome.tabs.create({ url: CART_URL[platform], active: true });
  return failed.length
    ? { ok: addedCount > 0, message: `Added ${addedCount}/${items.length} items. Not added: ${failed.join('; ')}. Check your cart.` }
    : { ok: true, message: `Added ${addedCount} item(s). Review your cart and check out there.` };
}
