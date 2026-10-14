import type { Platform } from '@app/shared';
import { collectCards, getContext } from '../browser';
import { parseCards } from './parse';
import type { Provider } from './types';

interface SiteConfig {
  base: string;
  searchUrl: (q: string) => string;
  /** Regex source matched against anchor hrefs that are product tiles. */
  hrefPattern: string;
  /** Page actions that set the delivery location. Best-effort; sites change these often. */
  setLocation?: (page: import('playwright').Page, pincode: string) => Promise<void>;
}

async function typePincode(page: import('playwright').Page, pincode: string, inputSel: string) {
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
  },
  flipkart: {
    base: 'https://www.flipkart.com',
    searchUrl: (q) => `https://www.flipkart.com/search?q=${encodeURIComponent(q)}`,
    hrefPattern: '/p/itm[a-z0-9]+\\?.*pid=',
  },
  blinkit: {
    base: 'https://blinkit.com',
    searchUrl: (q) => `https://blinkit.com/s/?q=${encodeURIComponent(q)}`,
    hrefPattern: '/prn/.+/prid/\\d+',
    setLocation: (page, pin) => typePincode(page, pin, 'input[placeholder*="location" i], input[name="select-locality"]'),
  },
  zepto: {
    base: 'https://www.zeptonow.com',
    searchUrl: (q) => `https://www.zeptonow.com/search?query=${encodeURIComponent(q)}`,
    hrefPattern: '/pn/.+/pvid/[0-9a-f-]+',
    setLocation: (page, pin) => typePincode(page, pin, 'input[placeholder*="location" i], input[placeholder*="area" i]'),
  },
  instamart: {
    base: 'https://www.swiggy.com',
    searchUrl: (q) => `https://www.swiggy.com/instamart/search?custom_back=true&query=${encodeURIComponent(q)}`,
    hrefPattern: '/instamart/item/',
    setLocation: (page, pin) => typePincode(page, pin, 'input[placeholder*="location" i], input[placeholder*="area" i]'),
  },
};

export function scrapeProvider(platform: Platform): Provider {
  const cfg = SITES[platform];
  return {
    platform,
    async search(query, pincode) {
      const ctx = await getContext(`${platform}:${pincode}`);
      const page = await ctx.newPage();
      try {
        await page.goto(cfg.searchUrl(query), { waitUntil: 'domcontentloaded', timeout: 20000 });
        await cfg.setLocation?.(page, pincode);
        await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
        await page.waitForSelector(`a[href]`, { timeout: 5000 }).catch(() => {});
        const cards = await collectCards(page, cfg.hrefPattern);
        return parseCards(platform, cfg.base, cards);
      } finally {
        await page.close();
      }
    },
  };
}
