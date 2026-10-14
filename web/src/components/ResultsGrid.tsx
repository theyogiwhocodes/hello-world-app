import { PLATFORMS, PLATFORM_LABELS, type Product, type SearchResponse } from '@app/shared';

interface Props {
  data: SearchResponse | null;
  loading: boolean;
  onAdd: (p: Product) => void;
}

export const inr = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export function ResultsGrid({ data, loading, onAdd }: Props) {
  if (!data && !loading) return <p className="muted">Search for a product to compare prices across all five sites.</p>;
  return (
    <div className="results">
      {PLATFORMS.map((platform) => {
        const r = data?.results[platform];
        return (
          <section key={platform} className="col">
            <h3>{PLATFORM_LABELS[platform]}</h3>
            {loading && <p className="muted">Searching…</p>}
            {!loading && r && 'error' in r && <p className="error">{r.error}</p>}
            {!loading &&
              r &&
              Array.isArray(r) &&
              r.map((p) => (
                <article key={p.id} className="card">
                  {p.imageUrl && <img src={p.imageUrl} alt="" loading="lazy" />}
                  <div className="info">
                    <a href={p.url} target="_blank" rel="noreferrer" className="title">
                      {p.title}
                    </a>
                    {p.unit && <span className="muted">{p.unit}</span>}
                    <div className="price">
                      <strong>{inr(p.price)}</strong>
                      {p.mrp && <s className="muted">{inr(p.mrp)}</s>}
                      {p.etaMinutes && <span className="eta">{p.etaMinutes} min</span>}
                    </div>
                  </div>
                  <button disabled={!p.inStock} onClick={() => onAdd(p)}>
                    {p.inStock ? 'Add' : 'Out of stock'}
                  </button>
                </article>
              ))}
          </section>
        );
      })}
    </div>
  );
}
