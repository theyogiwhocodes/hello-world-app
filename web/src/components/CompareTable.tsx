import { type Cart, type PlatformQuote } from '@app/shared';
import { PlatformLogo } from './PlatformLogo';
import { inr } from './ResultsGrid';

const fmtEta = (m: number) => (m >= 1440 ? `${Math.round(m / 1440)} day${m >= 2880 ? 's' : ''}` : `${m} min`);

export function CompareTable({ carts, quotes }: { carts: Cart[]; quotes: Record<string, PlatformQuote> }) {
  const rows = carts.filter((c) => c.items.length > 0 && quotes[c.id]);
  if (rows.length < 1) return <p className="muted">Fill one or more carts to compare totals.</p>;
  const cheapest = Math.min(...rows.map((c) => quotes[c.id].total));
  const fastest = Math.min(...rows.map((c) => quotes[c.id].etaMinutes));
  return (
    <table className="compare">
      <thead>
        <tr><th>Cart</th><th>Items</th><th>Delivery</th><th>Handling</th><th>Total</th><th>ETA</th></tr>
      </thead>
      <tbody>
        {rows.map((c) => {
          const q = quotes[c.id];
          return (
            <tr key={c.id}>
              <td>{c.name}<br /><PlatformLogo platform={c.platform} height={20} /></td>
              <td>{inr(q.itemsTotal)}</td>
              <td>{q.deliveryFee ? inr(q.deliveryFee) : 'Free'}</td>
              <td>{inr(q.handlingFee)}</td>
              <td className={q.total === cheapest ? 'best' : ''}>
                <strong>{inr(q.total)}</strong>{q.total === cheapest && rows.length > 1 && ' 🏷 cheapest'}
              </td>
              <td className={q.etaMinutes === fastest ? 'best' : ''}>
                {q.estimated && '~'}{fmtEta(q.etaMinutes)}{q.etaMinutes === fastest && rows.length > 1 && ' ⚡ fastest'}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
