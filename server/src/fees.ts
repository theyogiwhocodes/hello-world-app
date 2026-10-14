import type { Cart, Platform, PlatformQuote } from '@app/shared';

interface FeeRule {
  deliveryFee: number;
  handlingFee: number;
  /** Items total at or above which delivery is free. */
  freeDeliveryAbove: number;
  defaultEtaMinutes: number;
}

/**
 * Estimated fee rules. These change often and vary by city, time and membership;
 * treat them as defaults and edit here. Quotes built from these are flagged `estimated`.
 */
export const FEE_RULES: Record<Platform, FeeRule> = {
  amazon: { deliveryFee: 40, handlingFee: 0, freeDeliveryAbove: 499, defaultEtaMinutes: 2 * 24 * 60 },
  flipkart: { deliveryFee: 40, handlingFee: 0, freeDeliveryAbove: 500, defaultEtaMinutes: 3 * 24 * 60 },
  blinkit: { deliveryFee: 30, handlingFee: 4, freeDeliveryAbove: 199, defaultEtaMinutes: 10 },
  zepto: { deliveryFee: 30, handlingFee: 5, freeDeliveryAbove: 199, defaultEtaMinutes: 10 },
  instamart: { deliveryFee: 35, handlingFee: 5, freeDeliveryAbove: 199, defaultEtaMinutes: 15 },
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function quoteCart(cart: Cart): PlatformQuote {
  const rule = FEE_RULES[cart.platform];
  const itemsTotal = round2(cart.items.reduce((s, i) => s + i.product.price * i.qty, 0));
  const empty = cart.items.length === 0;
  const freeDeliveryApplied = !empty && itemsTotal >= rule.freeDeliveryAbove;
  const deliveryFee = empty || freeDeliveryApplied ? 0 : rule.deliveryFee;
  const handlingFee = empty ? 0 : rule.handlingFee;

  const scraped = cart.items
    .map((i) => i.product.etaMinutes)
    .filter((m): m is number => typeof m === 'number');
  const etaMinutes = scraped.length ? Math.max(...scraped) : rule.defaultEtaMinutes;

  return {
    cartId: cart.id,
    platform: cart.platform,
    itemsTotal,
    deliveryFee,
    handlingFee,
    total: round2(itemsTotal + deliveryFee + handlingFee),
    etaMinutes,
    estimated: scraped.length === 0,
    freeDeliveryApplied,
  };
}
