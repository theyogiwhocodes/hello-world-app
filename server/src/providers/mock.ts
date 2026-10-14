import { PLATFORM_LABELS, type Platform, type Product } from '@app/shared';
import type { Provider } from './types';

/** Deterministic pseudo-random so mock prices are stable per query+platform. */
function seeded(seed: string) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
  };
}

const VARIANTS = ['', 'Classic', 'Family Pack', 'Premium', 'Value Pack', 'Organic', 'Small'];
const UNITS = ['100 g', '200 g', '500 g', '1 kg', '250 ml', '1 L'];
const QUICK: Platform[] = ['blinkit', 'zepto', 'instamart'];

export function mockProvider(platform: Platform): Provider {
  return {
    platform,
    async search(query) {
      const rnd = seeded(`${platform}:${query}`);
      const base = 40 + Math.floor(rnd() * 200);
      const out: Product[] = [];
      for (let i = 0; i < 7; i++) {
        const variant = VARIANTS[i];
        const price = Math.round(base * (0.7 + rnd() * 0.8) + i * 6);
        const unit = UNITS[Math.floor(rnd() * UNITS.length)];
        const productId = `${platform.slice(0, 2).toUpperCase()}${1000 + i}${Math.floor(rnd() * 90 + 10)}`;
        out.push({
          id: `${platform}:${productId}`,
          platform,
          productId,
          title: `${`${query} ${variant}`.trim()} ${unit}`,
          price,
          mrp: Math.round(price * 1.12),
          unit,
          url: `https://example.com/${platform}/${productId}`,
          inStock: rnd() > 0.1,
          etaMinutes: QUICK.includes(platform) ? 8 + Math.floor(rnd() * 10) : undefined,
        });
      }
      return out;
    },
  };
}

export const MOCK_LABEL = (p: Platform) => `${PLATFORM_LABELS[p]} (mock)`;
