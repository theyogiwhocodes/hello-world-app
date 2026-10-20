import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Page } from 'playwright';
import { PLATFORM_LABELS, type Platform } from '@app/shared';
import { collectCards, getContext } from '../browser';
import { parseCards } from './parse';
import type { Provider } from './types';

interface SiteConfig {
  base: string;
  searchUrl: (q: string) => string;
  /** Regex source matched against anchor hrefs that are product tiles. */
  hrefPattern: string;
  /** Regex source with one capture group that extracts the product id from an href. */
  idPattern: string;
  /** Page actions that set the delivery location. Best-effort; sites change these often. */
  setLocation?: (page: Page, pincode: string) => Promise<void>;
}

async function typePincode(page: Page, pincode: string, inputSel: string) {
  const input = page.locator(inputSel).first();
  if (await input.isVisible({ timeout: 4000 }).catch(() => false)) {
    await input.fill(pincode);
    await page.waitForTimeout(1200);
    await page.keyboard.press('ArrowDown').catch(() => {});
    await page.keyboard.press('Enter').catch(() => {});
    await page.waitForTimeout(1500);
  }
}

const SITES: Record<Platform, SiteConfig> = {
  amazon: {
    base: 'https://www.amazon.in',
    searchUrl: (q) => `https://www.amazon.in/s?k=${encodeURIComponent(q)}`,
    hrefPattern: '/(dp|gp/product)/[A-Z0-9]{10}',
    idPattern: '/(?:dp|gp/product)/([A-Z0-9]{10})',
  },
  flipkart: {
    base: 'https://www.flipkart.com',
    searchUrl: (q) => `https://www.flipkart.com/search?q=${encodeURIComponent(q)}`,
    hrefPattern: '/p/itm[a-z0-9]+\\?.*pid=',
    idPattern: 'pid=([A-Z0-9]+)',
  },
  blinkit: {
    base: 'https://blinkit.com',
    searchUrl: (q) => `https://blinkit.com/s/?q=${encodeURIComponent(q)}`,
    hrefPattern: '/prn/.+/prid/\\d+',
    idPattern: '/prid/(\\d+)',
    setLocation: (page, pin) => typePincode(page, pin, 'input[placeholder*="location" i], input[name="select-locality"]'),
  },
  zepto: {
    base: 'https://www.zeptonow.com',
    searchUrl: (q) => `https://www.zeptonow.com/search?query=${encodeURIComponent(q)}`,
    hrefPattern: '/pn/.+/pvid/[0-9a-f-]+',
    idPattern: '/pvid/([0-9a-f-]+)',
    setLocation: (page, pin) => typePincode(page, pin, 'input[placeholder*="location" i], input[placeholder*="area" i]'),
  },
  instamart: {
    base: 'https://www.swiggy.com',
    searchUrl: (q) => `https://www.swiggy.com/instamart/search?custom_back=true&query=${encodeURIComponent(q)}`,
    hrefPattern: '/instamart/item/',
    idPattern: '/item/([A-Za-z0-9]+)',
    setLocation: (page, pin) => typePincode(page, pin, 'input[placeholder*="location" i], input[placeholder*="area" i]'),
  },
};

const BLOCKED =
  /captcha|robot check|are you a robot|not a robot|unusual traffic|access denied|verify you are human|automated access|temporarily blocked/i;

/** With DEBUG_SCRAPE=1, save a screenshot + HTML of the failing page to see exactly what the bot saw. */
async function saveDebug(page: Page, platform: Platform) {
  if (process.env.DEBUG_SCRAPE !== '1') return;
  const dir = path.resolve('debug');
  await mkdir(dir, { recursive: true });
  const stamp = `${platform}-${Date.now()}`;
  await page.screenshot({ path: path.join(dir, `${stamp}.png`) }).catch(() => {});
  await writeFile(path.join(dir, `${stamp}.html`), await page.content().catch(() => ''));
  console.log(`[${platform}] debug saved: ${path.join(dir, stamp)}.{png,html}`);
}

export function scrapeProvider(platform: Platform): Provider {
  const cfg = SITES[platform];
  const label = PLATFORM_LABELS[platform];
  return {
    platform,
    async search(query, pincode) {
      const ctx = await getContext(`${platform}:${pincode}`);
      const page = await ctx.newPage();
      try {
        await page.goto(cfg.searchUrl(query), { waitUntil: 'domcontentloaded', timeout: 20000 });
        await cfg.setLocation?.(page, pincode);
        await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
        await page.waitForSelector('a[href]', { timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(1500); // let SPAs render tiles after the network goes quiet

        const title = await page.title().catch(() => '');
        const cards = await collectCards(page, cfg.hrefPattern, cfg.idPattern);
        const products = parseCards(platform, cfg.base, cards);
        console.log(`[${platform}] "${title}" ${page.url()} -> ${cards.length} tiles, ${products.length} with a price`);

        if (products.length === 0) {
          await saveDebug(page, platform);
          const body = await page.evaluate(() => document.body?.innerText?.slice(0, 2000) ?? '').catch(() => '');
          if (BLOCKED.test(`${title}\n${body}`)) {
            throw new Error(`${label} showed a bot check / captcha ("${title}"). Try HEADLESS=0, or wait and retry.`);
          }
          if (cards.length === 0) {
            throw new Error(
              `${label}: no product links found on "${title}". The pincode/location prompt may not have been handled, or the page layout changed. Run with DEBUG_SCRAPE=1 and check server/debug/.`,
            );
          }
          throw new Error(`${label}: found ${cards.length} product links but none showed a ₹ price (layout changed?).`);
        }
        return products;
      } finally {
        await page.close();
      }
    },
  };
}
