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
    return Array.from(document.querySelectorAll('a[href]'))
      .filter((a) => re.test((a as HTMLAnchorElement).getAttribute('href') || ''))
      .map((a) => ({
        href: (a as HTMLAnchorElement).href,
        text: (a as HTMLElement).innerText || '',
        img: (a.querySelector('img') as HTMLImageElement | null)?.src,
      }));
  }, hrefPattern);
}

export async function closeBrowser() {
  if (!browserP) return;
  (await browserP).close();
  browserP = undefined;
  contexts.clear();
}
