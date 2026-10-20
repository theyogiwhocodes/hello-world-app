import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import type { RawCard } from './providers/types';

let browserP: Promise<Browser> | undefined;
const contexts = new Map<string, Promise<BrowserContext>>();

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

function getBrowser(): Promise<Browser> {
  browserP ??= chromium.launch({
    headless: true,
    // Containers run as root without a user-namespace sandbox.
    args: process.env.CHROMIUM_NO_SANDBOX === '1' ? ['--no-sandbox', '--disable-dev-shm-usage'] : [],
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
      await c.addInitScript('window.__name = window.__name || ((fn) => fn);');
      await init?.(c);
      return c;
    });
    contexts.set(key, ctx);
  }
  return ctx;
}

/** Collect every anchor whose href matches `hrefPattern` with its visible text and image. */
export async function collectCards(page: Page, hrefPattern: string): Promise<RawCard[]> {
  return page.evaluate((pattern) => {
    const re = new RegExp(pattern);
    // Lazy-loaded tiles often keep a data: placeholder in src; look at the real-URL attributes first.
    const bestImage = (root: Element): string | undefined => {
      const candidates: string[] = [];
      for (const img of Array.from(root.querySelectorAll('img'))) {
        const srcset = img.getAttribute('srcset') || img.getAttribute('data-srcset') || '';
        const fromSet = srcset.split(',').map((x) => x.trim().split(/\s+/)[0]).filter(Boolean).pop();
        candidates.push(
          img.getAttribute('data-src') || '',
          fromSet || '',
          img.currentSrc || '',
          img.getAttribute('src') || '',
        );
      }
      const ok = candidates.find((u) => u && !u.startsWith('data:') && !/sprite|placeholder|loading|blank/i.test(u));
      return ok ? new URL(ok, location.href).href : undefined;
    };
    return Array.from(document.querySelectorAll('a[href]'))
      .filter((a) => re.test((a as HTMLAnchorElement).getAttribute('href') || ''))
      .map((a) => ({
        href: (a as HTMLAnchorElement).href,
        text: (a as HTMLElement).innerText || '',
        img: bestImage(a),
      }));
  }, hrefPattern);
}

export async function closeBrowser() {
  if (!browserP) return;
  (await browserP).close();
  browserP = undefined;
  contexts.clear();
}
