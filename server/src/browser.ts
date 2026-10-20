import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import type { RawCard } from './providers/types';

let browserP: Promise<Browser> | undefined;
const contexts = new Map<string, Promise<BrowserContext>>();

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

function getBrowser(): Promise<Browser> {
  browserP ??= chromium.launch({
    // HEADLESS=0 opens a visible window: handy for debugging and less likely to be flagged as a bot.
    headless: process.env.HEADLESS !== '0',
    args: [
      '--disable-blink-features=AutomationControlled',
      // Containers run as root without a user-namespace sandbox.
      ...(process.env.CHROMIUM_NO_SANDBOX === '1' ? ['--no-sandbox', '--disable-dev-shm-usage'] : []),
    ],
    executablePath: process.env.CHROMIUM_PATH || undefined,
  });
  return browserP;
}

/** One context per (platform, pincode) so location state never leaks between searches. */
export async function getContext(key: string, init?: (ctx: BrowserContext) => Promise<void>) {
  let ctx = contexts.get(key);
  if (!ctx) {
    ctx = getBrowser().then(async (b) => {
      const c = await b.newContext({
        userAgent: UA,
        locale: 'en-IN',
        timezoneId: 'Asia/Kolkata',
        geolocation: { latitude: 28.6139, longitude: 77.209 },
        permissions: ['geolocation'],
        viewport: { width: 1366, height: 900 },
      });
      // tsx/esbuild wraps functions with a `__name` helper; when Playwright serializes a function
      // into the page (page.evaluate) that helper doesn't exist there, so define a no-op shim.
      await c.addInitScript(
        'window.__name = window.__name || ((fn) => fn); Object.defineProperty(navigator, "webdriver", { get: () => undefined });',
      );
      await init?.(c);
      return c;
    });
    contexts.set(key, ctx);
  }
  return ctx;
}

/**
 * Collect product tiles. For each anchor whose href matches `hrefPattern`, climb to the smallest
 * ancestor that shows a ₹ price while still containing only that one product, and return that
 * container's text. (On Amazon/Flipkart the price sits next to the link, not inside it.)
 * `idPattern` (one capture group) identifies the product in an href; defaults to the href sans query.
 */
export async function collectCards(page: Page, hrefPattern: string, idPattern?: string): Promise<RawCard[]> {
  return page.evaluate(
    ({ pattern, idPat }) => {
      const re = new RegExp(pattern);
      const idRe = idPat ? new RegExp(idPat) : null;
      const keyOf = (href: string) => (idRe ? (href.match(idRe)?.[1] ?? href) : href.split(/[?#]/)[0]);
      const productLinks = (root: Element) =>
        Array.from(root.querySelectorAll('a[href]')).filter((a) => re.test(a.getAttribute('href') || ''));

      // Lazy-loaded tiles often keep a data: placeholder in src; look at the real-URL attributes first.
      const bestImage = (root: Element): string | undefined => {
        const candidates: string[] = [];
        for (const img of Array.from(root.querySelectorAll('img'))) {
          const srcset = img.getAttribute('srcset') || img.getAttribute('data-srcset') || '';
          const fromSet = srcset.split(',').map((x) => x.trim().split(/\s+/)[0]).filter(Boolean).pop();
          candidates.push(img.getAttribute('data-src') || '', fromSet || '', img.currentSrc || '', img.getAttribute('src') || '');
        }
        const ok = candidates.find((u) => u && !u.startsWith('data:') && !/sprite|placeholder|loading|blank/i.test(u));
        return ok ? new URL(ok, location.href).href : undefined;
      };

      return productLinks(document.body).map((a) => {
        let node: Element = a;
        while (node.parentElement && node.parentElement !== document.body) {
          if (/[₹]|Rs\.?\s?\d/.test((node as HTMLElement).innerText || '')) break;
          const parent = node.parentElement;
          const keys = new Set(productLinks(parent).map((l) => keyOf((l as HTMLAnchorElement).href)));
          if (keys.size > 1) break; // would swallow a neighbouring product
          node = parent;
        }
        return {
          href: (a as HTMLAnchorElement).href,
          text: (node as HTMLElement).innerText || '',
          img: bestImage(node),
        };
      });
    },
    { pattern: hrefPattern, idPat: idPattern },
  );
}

export async function closeBrowser() {
  if (!browserP) return;
  (await browserP).close();
  browserP = undefined;
  contexts.clear();
}
