import { describe, expect, it } from 'vitest';
import type { Cart, Product } from '@app/shared';
import { quoteCart } from '../src/fees';
import { relevance, topResults } from '../src/rank';
import { TtlCache } from '../src/cache';

const prod = (over: Partial<Product>): Product => ({
  id: 'x', platform: 'blinkit', productId: 'x', title: 'Amul Butter 100 g', price: 50,
  url: 'https://example.com', inStock: true, ...over,
});

describe('rank', () => {
  it('scores token overlap', () => {
    expect(relevance('amul butter', 'Amul Butter 100 g')).toBe(1);
    expect(relevance('amul butter', 'Amul Cheese')).toBe(0.5);
  });
  it('drops irrelevant, limits to 5, prefers in-stock', () => {
    const items = [
      prod({ id: 'a', title: 'Amul Butter', inStock: false }),
      ...Array.from({ length: 6 }, (_, i) => prod({ id: `b${i}`, title: 'Amul Butter pack' })),
      prod({ id: 'z', title: 'Shampoo' }),
    ];
    const out = topResults('amul butter', items);
    expect(out).toHaveLength(5);
    expect(out.find((p) => p.id === 'z')).toBeUndefined();
    expect(out.every((p) => p.inStock)).toBe(true);
  });
});

describe('quoteCart', () => {
  const cart = (price: number, qty = 1, platform: Cart['platform'] = 'blinkit'): Cart => ({
    id: 'c', name: 'c', platform, items: [{ product: prod({ price, platform }), qty }],
  });
  it('adds delivery and handling below the free threshold', () => {
    const q = quoteCart(cart(100));
    expect(q).toMatchObject({ itemsTotal: 100, deliveryFee: 30, handlingFee: 4, total: 134, estimated: true });
  });
  it('waives delivery at the threshold', () => {
    const q = quoteCart(cart(100, 2));
    expect(q.deliveryFee).toBe(0);
    expect(q.freeDeliveryApplied).toBe(true);
    expect(q.total).toBe(204);
  });
  it('uses scraped ETA when present', () => {
    const c = cart(100);
    c.items[0].product.etaMinutes = 8;
    expect(quoteCart(c)).toMatchObject({ etaMinutes: 8, estimated: false });
  });
  it('empty cart costs nothing', () => {
    expect(quoteCart({ id: 'c', name: 'c', platform: 'zepto', items: [] }).total).toBe(0);
  });
});

describe('TtlCache', () => {
  it('expires entries', async () => {
    const c = new TtlCache<number>(10);
    c.set('k', 1);
    expect(c.get('k')).toBe(1);
    await new Promise((r) => setTimeout(r, 20));
    expect(c.get('k')).toBeUndefined();
  });
});
