export type Platform = 'amazon' | 'flipkart' | 'blinkit' | 'zepto' | 'instamart';

export const PLATFORMS: Platform[] = ['amazon', 'flipkart', 'blinkit', 'zepto', 'instamart'];

export const PLATFORM_LABELS: Record<Platform, string> = {
  amazon: 'Amazon',
  flipkart: 'Flipkart',
  blinkit: 'Blinkit',
  zepto: 'Zepto',
  instamart: 'Swiggy Instamart',
};

export interface Product {
  id: string;
  platform: Platform;
  productId: string;
  title: string;
  price: number;
  mrp?: number;
  unit?: string;
  imageUrl?: string;
  url: string;
  inStock: boolean;
  /** Delivery ETA scraped from the page, in minutes, when the site shows one. */
  etaMinutes?: number;
}

export interface CartItem {
  product: Product;
  qty: number;
}

export interface Cart {
  id: string;
  name: string;
  platform: Platform;
  items: CartItem[];
}

export interface PlatformQuote {
  cartId: string;
  platform: Platform;
  itemsTotal: number;
  deliveryFee: number;
  handlingFee: number;
  total: number;
  etaMinutes: number;
  /** True when the ETA/fees come from config defaults rather than the live site. */
  estimated: boolean;
  freeDeliveryApplied: boolean;
}

export type SearchResult = Product[] | { error: string };

export interface SearchResponse {
  query: string;
  pincode: string;
  results: Record<Platform, SearchResult>;
}

export interface BuyRequest {
  platform: Platform;
  items: { productId: string; url: string; title: string; qty: number }[];
}
