import { describe, expect, it } from 'vitest';
import { parseCards } from '../src/providers/parse';

describe('parseCards', () => {
  it('parses a quick-commerce tile', () => {
    const out = parseCards('blinkit', 'https://blinkit.com', [
      { href: '/prn/amul-butter/prid/12345', text: '10 mins\nAmul Butter - Pasteurised\n100 g\n₹58\n₹62\nADD', img: 'i.jpg' },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      platform: 'blinkit', productId: '12345', title: 'Amul Butter - Pasteurised',
      price: 58, mrp: 62, unit: '100 g', etaMinutes: 10, inStock: true,
    });
  });
  it('dedupes by product id and skips tiles without a price', () => {
    const tile = { href: 'https://www.amazon.in/x/dp/B012345678', text: 'Thing\n₹1,299' };
    const out = parseCards('amazon', 'https://www.amazon.in', [tile, tile, { href: '/dp/B0AAAAAAAA', text: 'No price here' }]);
    expect(out).toHaveLength(1);
    expect(out[0].price).toBe(1299);
  });
  it('marks out of stock', () => {
    const out = parseCards('zepto', 'https://www.zeptonow.com', [
      { href: '/pn/milk/pvid/abc-123', text: 'Milk 500 ml\n₹30\nOut of stock' },
    ]);
    expect(out[0].inStock).toBe(false);
  });
});
