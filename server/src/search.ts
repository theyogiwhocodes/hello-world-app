import { PLATFORMS, type Platform, type SearchResponse, type SearchResult } from '@app/shared';
import { TtlCache } from './cache';
import { getProviders } from './providers';
import { topResults } from './rank';

const cache = new TtlCache<SearchResult>(5 * 60 * 1000);
/** Best matches kept per site. */
const TOP_N = 1;
const PROVIDER_TIMEOUT_MS = 30_000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timed out after ${ms / 1000}s`)), ms);
    p.then(resolve, reject).finally(() => clearTimeout(t));
  });
}

export async function searchAll(query: string, pincode: string): Promise<SearchResponse> {
  const providers = getProviders();
  const entries = await Promise.all(
    PLATFORMS.map(async (platform): Promise<[Platform, SearchResult]> => {
      const key = `${platform}|${pincode}|${query.toLowerCase()}`;
      const cached = cache.get(key);
      if (cached) return [platform, cached];
      try {
        const raw = await withTimeout(providers[platform].search(query, pincode), PROVIDER_TIMEOUT_MS);
        const top = topResults(query, raw, TOP_N);
        const result: SearchResult = top.length ? top : { error: 'No matching products found (or the site blocked the request)' };
        if (top.length) cache.set(key, result);
        return [platform, result];
      } catch (e) {
        return [platform, { error: e instanceof Error ? e.message : String(e) }];
      }
    }),
  );
  return { query, pincode, results: Object.fromEntries(entries) as SearchResponse['results'] };
}
