import { useEffect, useMemo, useState } from 'react';
import type { Cart, PlatformQuote, SearchResponse } from '@app/shared';
import { quote, search } from './api';
import { buyViaExtension, isExtensionInstalled } from './extension';
import { useStore } from './store';
import { CartPanel } from './components/CartPanel';
import { CompareTable } from './components/CompareTable';
import { ResultsGrid } from './components/ResultsGrid';
import { SearchBar } from './components/SearchBar';

export function App() {
  const { pincode, setPincode, carts, addItem } = useStore();
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [quotes, setQuotes] = useState<Record<string, PlatformQuote>>({});
  const [hasExt, setHasExt] = useState<boolean | null>(null);

  useEffect(() => {
    isExtensionInstalled().then(setHasExt);
  }, []);

  // Re-quote whenever cart contents change.
  const cartsKey = useMemo(() => JSON.stringify(carts.map((c) => [c.id, c.platform, c.items.map((i) => [i.product.id, i.product.price, i.qty, i.product.etaMinutes])])), [carts]);
  useEffect(() => {
    if (carts.length === 0) return setQuotes({});
    let stale = false;
    quote(carts)
      .then((r) => !stale && setQuotes(Object.fromEntries(r.quotes.map((q) => [q.cartId, q]))))
      .catch((e) => !stale && setError(e.message));
    return () => {
      stale = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartsKey]);

  async function onSearch(q: string) {
    setLoading(true);
    setError('');
    try {
      setData(await search(q, pincode));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function onBuy(cart: Cart) {
    const items = cart.items.map((i) => ({ productId: i.product.productId, url: i.product.url, title: i.product.title, qty: i.qty }));
    if (!hasExt) {
      setNotice('The Cart Compare extension is not installed. Install it (see README), then try again.');
      return;
    }
    const reply = await buyViaExtension({ platform: cart.platform, items });
    setNotice(reply?.ok ? (reply.message ?? 'Opened your cart.') : (reply?.message ?? 'The extension did not respond.'));
  }

  return (
    <main>
      <h1>Cart Compare</h1>
      <SearchBar pincode={pincode} onPincode={setPincode} onSearch={onSearch} loading={loading} />
      {hasExt === false && <p className="banner">Install the browser extension to enable one-click Buy into each site's cart.</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {notice && <p className="banner" role="status">{notice}</p>}
      <ResultsGrid data={data} loading={loading} onAdd={(p) => addItem(p)} />
      <h2>Carts</h2>
      <CartPanel carts={carts} quotes={quotes} onBuy={onBuy} />
      <h2>Compare</h2>
      <CompareTable carts={carts} quotes={quotes} />
    </main>
  );
}
