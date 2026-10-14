# Cart Compare

Search one product across **Amazon, Flipkart, Blinkit, Zepto and Swiggy Instamart**, see the top 5 matches per site, compare the **total (items + delivery + handling) and delivery time**, manage several carts, then hit **Buy** to have a browser extension fill that site's cart in your own logged-in browser.

```
server/     Express + TypeScript API, Playwright scrapers
web/        React + Vite UI
extension/  Chrome MV3 cart filler (plain JS, no build)
shared/     Shared TypeScript types
```

## Run it

```bash
npm install
npx playwright install chromium     # or set CHROMIUM_PATH to an existing Chromium
npm run dev                         # API :3001, UI http://localhost:5173
MOCK=1 npm run dev                  # same, with fake data (no scraping)
npm test && npm run typecheck
```

Load the extension: `chrome://extensions` -> Developer mode -> **Load unpacked** -> `extension/`.
The UI detects it and hides the "install" banner. Log in to each shop in the same browser first.

## Important caveats

- **Scrapers are unverified against the live sites.** None of the five has a public API, and the build sandbox blocked all five domains, so the selectors and location (pincode) handling in `server/src/providers/scrape.ts` were written from knowledge of the sites, not tested live. Expect to tune them. The pure parsing logic (`parse.ts`) is unit-tested on synthetic tiles. Quick-commerce sites gate results behind a serviceable location, and all five use bot detection, so some searches will return an error card for that site; the others still render.
- Scraping may breach each site's Terms of Service. Use for personal purposes only.
- **Fees are estimates.** Delivery/handling fees and free-delivery thresholds are static config in `server/src/fees.ts` and vary by city, time and membership. ETAs come from the scraped page when the site shows one (quick commerce), otherwise from config (shown with `~`).
- **Buy** drives your own browser tabs: it opens each product page and clicks the site's own add button, then opens the cart. It never checks out or touches credentials. The add-button detection and the cart URLs for Blinkit/Zepto/Instamart (which use cart drawers) are best-effort and unverified; it reports which items it could not add.
- Carts are stored in your browser's `localStorage`. Each cart is bound to one platform.

## Hosting online

The Dockerfile builds the React app and serves it from the Express server, so one URL does everything (`PORT` defaults to 8080).

```bash
docker build -t cart-compare .
docker run -p 8080:8080 -e MOCK=1 cart-compare   # http://localhost:8080
```

> The Dockerfile was written but **not build-tested** (the authoring sandbox had no Docker daemon).

**Free options for testing**

| Option | Real scraping | Notes |
|---|---|---|
| **Render** free web service | Unlikely | Connect the repo; `render.yaml` is included. Sleeps after ~15 min idle (slow first load). 512 MB RAM is tight for Chromium, so use `MOCK=1` there. |
| **Fly.io / Railway** | Unlikely | Small free allowance or trial credits; both run the Dockerfile. |
| **Your own computer + Cloudflare Tunnel** (`cloudflared tunnel --url http://localhost:8080`) | **Best chance** | Free, residential IP, more RAM. The sites tend to block datacenter IPs. |

**Using the extension with a hosted URL:** run `node scripts/set-extension-origin.mjs https://your-app.example.com`, then reload the extension at `chrome://extensions`. Each user installs the extension themselves.
