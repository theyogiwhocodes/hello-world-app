import { PLATFORM_LABELS, type Cart, type PlatformQuote } from '@app/shared';
import { PlatformLogo } from './PlatformLogo';
import { ProductImage } from './ProductImage';
import { inr } from './ResultsGrid';
import { useStore } from '../store';

interface Props {
  carts: Cart[];
  quotes: Record<string, PlatformQuote>;
  onBuy: (cart: Cart) => void;
}

export function CartPanel({ carts, quotes, onBuy }: Props) {
  const { renameCart, deleteCart, setQty, clearCart } = useStore();
  if (carts.length === 0) return <p className="muted">No carts yet. Add a product and a cart is created for its platform.</p>;
  return (
    <div className="carts">
      {carts.map((cart) => {
        const q = quotes[cart.id];
        return (
          <div key={cart.id} className="cart">
            <header>
              <input value={cart.name} onChange={(e) => renameCart(cart.id, e.target.value)} aria-label="Cart name" />
              <PlatformLogo platform={cart.platform} height={22} />
              <button className="ghost" onClick={() => deleteCart(cart.id)} aria-label={`Delete ${cart.name}`}>
                ✕
              </button>
            </header>
            {cart.items.length === 0 && <p className="muted">Empty</p>}
            {cart.items.map((i) => (
              <div key={i.product.id} className="line">
                <ProductImage src={i.product.imageUrl} alt="" platform={cart.platform} size={40} />
                <span className="grow">{i.product.title}</span>
                <span className="qty">
                  <button onClick={() => setQty(cart.id, i.product.id, i.qty - 1)} aria-label="Decrease">−</button>
                  {i.qty}
                  <button onClick={() => setQty(cart.id, i.product.id, i.qty + 1)} aria-label="Increase">+</button>
                </span>
                <span>{inr(i.product.price * i.qty)}</span>
              </div>
            ))}
            {q && cart.items.length > 0 && (
              <dl className="totals">
                <dt>Items</dt><dd>{inr(q.itemsTotal)}</dd>
                <dt>Delivery</dt><dd>{q.deliveryFee ? inr(q.deliveryFee) : 'Free'}</dd>
                <dt>Handling</dt><dd>{inr(q.handlingFee)}</dd>
                <dt>Total</dt><dd><strong>{inr(q.total)}</strong></dd>
              </dl>
            )}
            <footer>
              <button className="ghost" onClick={() => clearCart(cart.id)} disabled={!cart.items.length}>Clear</button>
              <button onClick={() => onBuy(cart)} disabled={!cart.items.length}>Buy on {PLATFORM_LABELS[cart.platform]}</button>
            </footer>
          </div>
        );
      })}
    </div>
  );
}
