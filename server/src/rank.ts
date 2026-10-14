import type { Product } from '@app/shared';

const tokenize = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

/** Fraction of query tokens that appear in the title (0..1). */
export function relevance(query: string, title: string): number {
  const q = tokenize(query);
  if (q.length === 0) return 0;
  const t = new Set(tokenize(title));
  return q.filter((tok) => t.has(tok)).length / q.length;
}

/**
 * Re-rank by token match against the query. Ties keep the site's own order
 * (Array.prototype.sort is stable), then return the top `limit` in-stock-first.
 */
export function topResults(query: string, products: Product[], limit = 5): Product[] {
  return products
    .map((p, i) => ({ p, i, score: relevance(query, p.title) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map((x) => x.p)
    .sort((a, b) => Number(b.inStock) - Number(a.inStock))
    .slice(0, limit);
}
