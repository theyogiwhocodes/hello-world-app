import type { Platform, Product } from '@app/shared';
import type { RawCard } from './types';

const RUPEE = /(?:₹|Rs\.?|INR)\s*([\d,]+(?:\.\d+)?)/g;

function prices(text: string): number[] {
  return [...text.matchAll(RUPEE)].map((m) => Number(m[1].replace(/,/g, ''))).filter((n) => n > 0);
}

const UNIT = /(\d+(?:\.\d+)?\s?(?:g|gm|kg|ml|l|ltr|pcs|pc|pack|units?))\b/i;
const ETA = /(\d{1,3})\s?(?:mins?|minutes)\b/i;

const ID_FROM_URL: Record<Platform, (u: URL) => string | undefined> = {
  amazon: (u) => u.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/)?.[1],
  flipkart: (u) => u.searchParams.get('pid') ?? undefined,
  blinkit: (u) => u.pathname.match(/\/prid\/(\d+)/)?.[1],
  zepto: (u) => u.pathname.match(/\/pvid\/([0-9a-f-]+)/i)?.[1],
  instamart: (u) => u.pathname.match(/\/item\/([A-Za-z0-9]+)/)?.[1],
};

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();

/**
 * Turn raw DOM cards into Products. Heuristic: the lowest ₹ figure is the selling
 * price, the highest is the MRP; the title is the longest non-price text line.
 */
export function parseCards(platform: Platform, base: string, cards: RawCard[], limit = 20): Product[] {
  const seen = new Set<string>();
  const out: Product[] = [];
  for (const c of cards) {
    let url: URL;
    try {
      url = new URL(c.href, base);
    } catch {
      continue;
    }
    const productId = ID_FROM_URL[platform](url);
    if (!productId || seen.has(productId)) continue;

    const nums = prices(c.text);
    if (nums.length === 0) continue;

    const lines = c.text
      .split(/\n+/)
      .map(clean)
      .filter((l) => l && !RUPEE.test(l) && !/^(add|\d+\s?%?\s?off|ad|sponsored)$/i.test(l));
    RUPEE.lastIndex = 0;
    const title = lines.sort((a, b) => b.length - a.length)[0];
    if (!title) continue;

    const price = Math.min(...nums);
    const mrp = Math.max(...nums);
    seen.add(productId);
    out.push({
      id: `${platform}:${productId}`,
      platform,
      productId,
      title,
      price,
      mrp: mrp > price ? mrp : undefined,
      unit: c.text.match(UNIT)?.[1],
      imageUrl: c.img,
      url: url.toString(),
      inStock: !/out of stock|sold out|currently unavailable/i.test(c.text),
      etaMinutes: c.text.match(ETA) ? Number(c.text.match(ETA)![1]) : undefined,
    });
    if (out.length >= limit) break;
  }
  return out;
}
