import { PLATFORMS, type Platform } from '@app/shared';
import { mockProvider } from './mock';
import { scrapeProvider } from './scrape';
import type { Provider } from './types';

export function getProviders(): Record<Platform, Provider> {
  const mock = process.env.MOCK === '1';
  return Object.fromEntries(
    PLATFORMS.map((p) => [p, mock ? mockProvider(p) : scrapeProvider(p)]),
  ) as Record<Platform, Provider>;
}
