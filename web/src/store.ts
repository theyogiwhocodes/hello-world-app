import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Cart, Platform, Product } from '@app/shared';
import { PLATFORM_LABELS } from '@app/shared';

interface State {
  pincode: string;
  carts: Cart[];
  setPincode: (p: string) => void;
  createCart: (platform: Platform, name?: string) => string;
  renameCart: (id: string, name: string) => void;
  deleteCart: (id: string) => void;
  /** Adds to the given cart, or the first cart for that platform (creating one if none). */
  addItem: (product: Product, cartId?: string) => void;
  setQty: (cartId: string, productId: string, qty: number) => void;
  clearCart: (cartId: string) => void;
}

const uid = () => Math.random().toString(36).slice(2, 10);

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      pincode: '',
      carts: [],
      setPincode: (pincode) => set({ pincode }),
      createCart: (platform, name) => {
        const n = get().carts.filter((c) => c.platform === platform).length + 1;
        const cart: Cart = { id: uid(), platform, name: name ?? `${PLATFORM_LABELS[platform]} cart ${n}`, items: [] };
        set((s) => ({ carts: [...s.carts, cart] }));
        return cart.id;
      },
      renameCart: (id, name) => set((s) => ({ carts: s.carts.map((c) => (c.id === id ? { ...c, name } : c)) })),
      deleteCart: (id) => set((s) => ({ carts: s.carts.filter((c) => c.id !== id) })),
      addItem: (product, cartId) => {
        let id = cartId ?? get().carts.find((c) => c.platform === product.platform)?.id;
        if (!id) id = get().createCart(product.platform);
        set((s) => ({
          carts: s.carts.map((c) => {
            // A cart is bound to one platform; ignore mismatched adds.
            if (c.id !== id || c.platform !== product.platform) return c;
            const existing = c.items.find((i) => i.product.id === product.id);
            return {
              ...c,
              items: existing
                ? c.items.map((i) => (i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i))
                : [...c.items, { product, qty: 1 }],
            };
          }),
        }));
      },
      setQty: (cartId, productId, qty) =>
        set((s) => ({
          carts: s.carts.map((c) =>
            c.id !== cartId
              ? c
              : { ...c, items: c.items.flatMap((i) => (i.product.id !== productId ? [i] : qty > 0 ? [{ ...i, qty }] : [])) },
          ),
        })),
      clearCart: (cartId) =>
        set((s) => ({ carts: s.carts.map((c) => (c.id === cartId ? { ...c, items: [] } : c)) })),
    }),
    { name: 'cart-compare' },
  ),
);
