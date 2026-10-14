import type { Cart, PlatformQuote, SearchResponse } from '@app/shared';

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}

export const search = (query: string, pincode: string) => post<SearchResponse>('/api/search', { query, pincode });
export const quote = (carts: Cart[]) => post<{ quotes: PlatformQuote[] }>('/api/quote', { carts });
