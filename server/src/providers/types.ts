import type { Platform, Product } from '@app/shared';

export interface Provider {
  platform: Platform;
  search(query: string, pincode: string): Promise<Product[]>;
}

/** A raw product tile as collected from the page DOM, before parsing. */
export interface RawCard {
  href: string;
  text: string;
  img?: string;
}
