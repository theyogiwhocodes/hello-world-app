import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeBrowser, collectCards, getContext } from '../src/browser';
import type { Page } from 'playwright';

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
