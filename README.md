# NURI / نوري — Korean & imported beauty store + admin

Bilingual (Arabic RTL / English LTR) storefront and a full admin dashboard, built with Vite, React 19, TypeScript, zustand and recharts.

```bash
npm install
cp .env.example .env   # then set ADMIN_EMAIL and ADMIN_PASSWORD
npm run dev            # Vite on :5173 + API on :8787 (Vite proxies /api)
```

- Store: http://localhost:5173/
- Admin: http://localhost:5173/admin (first sign-in: `ADMIN_EMAIL` + `ADMIN_PASSWORD`, the owner account; press Ctrl K anywhere in the admin to search orders, products, customers and run commands)

`npm run dev:web` runs the front end alone. Without the API the app falls back to browser-only demo mode (see below).

## How it fits together

| Path | What it is |
| --- | --- |
| `src/styles/tokens.css` | Design tokens of the "light through a lattice" world: lacquer, lit paper, celadon, brass |
| `src/i18n/` | `useI18n()` — inline bilingual strings, RTL switching, money/number/date formatting |
| `src/data/` | Types, demo catalog (real brands, synthetic prices/stock/lots), seed generator for customers, orders, reviews, discounts, shipments |
| `src/store/` | One zustand store shared by shop and admin, persisted in localStorage |
| `src/lib/commerce.ts` | Pure order maths shared by the store and the server: validation, codes, shipping, COD fee, FEFO lots |
| `src/lib/api.ts`, `sync.ts`, `track.ts` | API client, store ⇄ server sync, first-party storefront events |
| `src/lib/metrics.ts` | Analytics: KPIs, margin on landed cost, days of cover, FEFO expiry, RFM segments, cohorts |
| `server/` | API (Hono + `node:sqlite`): orders, admin auth, data sync, live events, Paymob / Bosta / WhatsApp |
| `src/storefront/` | Shop pages |
| `src/admin/` | Admin shell, command palette, pages |

## Run with the server

The API in `server/` is the source of truth when it is running. It stores everything in one SQLite file (`server/data/nuri.db`, git-ignored), seeded from `buildSeed()` on first start.

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite (5173) and the API (8787, restarts on change) together |
| `npm run dev:api` | API only |
| `npm run build` | Type-checks app + server, builds `dist/` |
| `npm start` | Production: one server on `PORT` (default 8787) serving `dist/` (SPA fallback) and `/api` |
| `docker build -t nuri . && docker run -p 8787:8787 -e ADMIN_PASSWORD=… -v nuri-data:/data nuri` | Same, in a container; the database lives on the `/data` volume |

What the server does:

- **Checkout** — `POST /api/orders` re-prices every order from the database (prices, codes, zone shipping, free-shipping threshold, COD fee and limit), checks stock, takes stock from the earliest-expiring lots (FEFO), finds or creates the customer by phone, and numbers the order inside one transaction. Errors come back bilingual: `{ error: { code, message: { ar, en } } }`.
- **Storefront data** — `GET /api/public` returns active products (without landed cost), zones, settings, published reviews, and automatic offers only; discount codes are checked one at a time (`POST /api/public/code`). Order lookup needs the matching phone (`GET /api/orders/:id?phone=`).
- **Staff accounts and roles** — every staff member signs in with their own email and password (scrypt-hashed in `staff_auth`; tokens last 7 days). On first start, with no accounts yet, the owner's login is created from `ADMIN_EMAIL` + `ADMIN_PASSWORD`; after that the owner adds staff, changes roles, resets passwords and disables accounts under **Settings → Staff and permissions** (`/api/admin/staff`). Roles (owner, manager, fulfilment, support, marketing) map to permissions in `src/lib/permissions.ts`, which both the server and the admin UI read: the server checks every admin endpoint and every record write (for example a fulfilment account can mark an order packed but gets `403 forbidden` for a price change or a cancel/refund), and the UI hides what the role can't use. Every write is recorded in an audit log (`GET /api/admin/audit`, owner and manager), and new order events and activity entries are attributed to the signed-in name by the server.
- **Admin** — the sign-in returns a bearer token. The dashboard loads everything from `GET /api/admin/bootstrap` and saves each changed record as you work (`POST /api/admin/batch`; `PUT`/`DELETE /api/admin/:collection/:id` also exist). Every record carries a revision, so a stale edit (for example a product whose stock a shopper just bought) is refused and the latest version reloaded instead of overwriting it.
- **Live view and funnel** — the storefront sends first-party events (page view, product view, add to cart, checkout start, purchase) with a random per-tab session id, no cookies, and nothing when the browser sends Do Not Track. `GET /api/admin/live` and `GET /api/admin/funnel?days=N` read them.
- **Integrations** — real calls to Paymob, Bosta and WhatsApp Cloud API, each switched on by its environment variables. Without keys the endpoints answer `501 not_configured`; the admin shows the status under **Settings → Integrations**.

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `ADMIN_PASSWORD` | first start | Password for the bootstrap owner account, used only while no staff accounts exist. Use a long random value. With no accounts and no password, admin sign-in is disabled |
| `ADMIN_EMAIL` | no | Email for the bootstrap owner account (default `owner@nuri.example`) |
| `PORT` | no | Server port (default 8787). In dev the API is pinned with `--port 8787` |
| `APP_URL` | for Paymob | Public origin, e.g. `https://shop.example.com`, used for the payment redirect and webhook URLs |
| `DATA_DIR` | no | Folder for `nuri.db` (default `server/data`, `/data` in Docker) |
| `PAYMOB_SECRET_KEY`, `PAYMOB_PUBLIC_KEY`, `PAYMOB_INTEGRATION_IDS`, `PAYMOB_HMAC` | for cards / wallets | Paymob Intention API + Unified Checkout. Integration ids: `card:123,wallet:456` or plain `123,456`. Set the transaction-processed callback to `{APP_URL}/api/payments/paymob/webhook` |
| `PAYMOB_BASE_URL` | no | Default `https://accept.paymob.com` (Egypt) |
| `BOSTA_API_KEY` | for Bosta | "Create Bosta delivery" on the order page |
| `BOSTA_BASE_URL` | no | Default `https://app.bosta.co/api/v2` |
| `WA_TOKEN`, `WA_PHONE_ID` | for WhatsApp | Send order confirmations from the store number (inside Meta's 24-hour window; otherwise a template is required) |
| `WA_API_VERSION` | no | Graph API version, default `v21.0` |

For local work, put these in `.env` (git-ignored; `.env.example` lists them). In production set real environment variables. Keys never reach the browser: `GET /api/admin/integrations` returns booleans only.

### Without the server

If `/api/health` does not answer within 1.5 s (static hosting, `vite preview`), everything works as before on this browser's localStorage: the admin opens without sign-in and shows "Demo mode: data is stored in this browser only", Live view shows its labelled simulation, and card / wallet / InstaPay stay demo-only.

## Demo data

Every price, cost, stock level, lot number, customer, order, review and figure is synthetic. With the server running, the first start copies this seed into `server/data/nuri.db`; replace it with real data there (or change `src/data/` before first start). **Settings → Reset demo data** reseeds the server database (or this browser, in demo mode).

## Before launch

- Real product photography (the shop currently draws packaging as flat-ink SVG)
- Paymob, Bosta and WhatsApp keys (code is in place; test each in its sandbox, and check Bosta city names against your account)
- Per-staff accounts and roles (the admin has one shared password today)
- Backups for `nuri.db`
- Confirm the brand name and voice choices recorded in `PRODUCT.md`

## Docs

- [`DESIGN.md`](DESIGN.md): the design system (tokens, type, components, motion, RTL rules)
- [`docs/shopify-comparison.md`](docs/shopify-comparison.md): what the admin does beyond Shopify's, and where Shopify is still ahead
