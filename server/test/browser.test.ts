import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeBrowser, collectCards, getContext } from '../src/browser';
import type { Page } from 'playwright';
import { parseCards } from '../src/providers/parse';

// Exercises the real page.evaluate path (the mock provider never does). Skipped when Chromium
// isn't installed: run `npx playwright install chromium` or set CHROMIUM_PATH.
let page: Page | undefined;

beforeAll(async () => {
  try {
    const ctx = await getContext('browser-test');
    page = await ctx.newPage();
    await page.route('https://shop.test/**', (r) =>
      r.fulfill({
        contentType: 'text/html; charset=utf-8',
        body:
          '<meta charset="utf-8"><a href="/prn/butter/prid/123">' +
          '<img data-src="https://cdn.test/b.jpg" src="data:image/gif;base64,R0lGOD">' +
          '<p>Amul Butter</p><p>₹58</p></a><a href="/about">About</a>',
      }),
    );
    await page.goto('https://shop.test/');
  } catch {
    page = undefined;
  }
}, 30000);

afterAll(() => closeBrowser());

describe('collectCards (runs inside the browser)', () => {
  // vitest doesn't inject esbuild's `__name` helper but `tsx` (dev/prod server) does, so assert the
  // page-side shim directly: without it, any serialized function that uses it throws ReferenceError.
  it('defines the __name shim so tsx-compiled functions can run in the page', async (ctx) => {
    if (!page) return ctx.skip();
    expect(await page.evaluate('typeof __name')).toBe('function');
  });

  it('collects matching tiles and prefers the real image over a data: placeholder', async (ctx) => {
    if (!page) return ctx.skip();
    const cards = await collectCards(page, '/prn/.+/prid/\\d+');
    expect(cards).toHaveLength(1);
    expect(cards[0].href).toBe('https://shop.test/prn/butter/prid/123');
    expect(cards[0].text).toContain('₹58');
    expect(cards[0].img).toBe('https://cdn.test/b.jpg');
  });
});

describe('collectCards on real-site-like structures', () => {
  const html = `<meta charset="utf-8">
    <div id="results">
      <div class="tile"><a href="/Amul-Butter/dp/B0AAAAAAA1/ref=x"><img src="https://cdn.test/a1.jpg"></a>
        <h2><a href="/Amul-Butter/dp/B0AAAAAAA1/ref=y">Amul Butter 500 g</a></h2>
        <span class="a-price">₹285</span><span>M.R.P: ₹310</span></div>
      <div class="tile"><a href="/Mother-Dairy/dp/B0BBBBBBB2/ref=x"><img src="https://cdn.test/b2.jpg"></a>
        <h2><a href="/Mother-Dairy/dp/B0BBBBBBB2/ref=y">Mother Dairy Butter 100 g</a></h2>
        <span class="a-price">₹58</span></div>
    </div>`;

  it('finds the price next to the link without merging neighbouring products', async (ctx) => {
    if (!page) return ctx.skip();
    await page.unroute('https://shop.test/**');
    await page.route('https://shop.test/**', (r) => r.fulfill({ contentType: 'text/html; charset=utf-8', body: html }));
    await page.goto('https://shop.test/s?k=butter');
    const cards = await collectCards(page, '/(dp|gp/product)/[A-Z0-9]{10}', '/dp/([A-Z0-9]{10})');
    const products = parseCards('amazon', 'https://shop.test', cards);
    expect(products.map((p) => [p.productId, p.title, p.price])).toEqual([
      ['B0AAAAAAA1', 'Amul Butter 500 g', 285],
      ['B0BBBBBBB2', 'Mother Dairy Butter 100 g', 58],
    ]);
    expect(products[0].mrp).toBe(310);
    expect(products[0].imageUrl).toBe('https://cdn.test/a1.jpg');
  });
});
