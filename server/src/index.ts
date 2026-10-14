import cors from 'cors';
import express from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { quoteCart } from './fees';
import { searchAll } from './search';
import { closeBrowser } from './browser';
import type { Cart } from '@app/shared';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, mock: process.env.MOCK === '1' }));

app.post('/api/search', async (req, res) => {
  const query = String(req.body?.query ?? '').trim();
  const pincode = String(req.body?.pincode ?? '').trim();
  if (!query) return res.status(400).json({ error: 'query is required' });
  if (!/^\d{6}$/.test(pincode)) return res.status(400).json({ error: 'pincode must be 6 digits' });
  res.json(await searchAll(query, pincode));
});

app.post('/api/quote', (req, res) => {
  const carts = req.body?.carts as Cart[] | undefined;
  if (!Array.isArray(carts)) return res.status(400).json({ error: 'carts must be an array' });
  res.json({ quotes: carts.map(quoteCart) });
});

// In production the built React app is served from this same process (one URL, no CORS).
const webDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../web/dist');
if (existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(webDist, 'index.html')));
}

const port = Number(process.env.PORT ?? 3001);
const server = app.listen(port, () => console.log(`API on :${port}${process.env.MOCK === '1' ? ' (MOCK data)' : ''}`));
process.on('SIGINT', async () => {
  server.close();
  await closeBrowser();
  process.exit(0);
});
