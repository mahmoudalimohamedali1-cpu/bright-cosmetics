# NURI / نوري — Korean & imported beauty store + admin

Bilingual (Arabic RTL / English LTR) storefront and a full admin dashboard, built with Vite, React 19, TypeScript, zustand and recharts.

```bash
npm install
npm run dev
```

- Store: http://localhost:5173/
- Admin: http://localhost:5173/admin (press Ctrl K anywhere in the admin to search orders, products, customers and run commands)

## How it fits together

| Path | What it is |
| --- | --- |
| `src/styles/tokens.css` | Design tokens of the "light through a lattice" world: lacquer, lit paper, celadon, brass |
| `src/i18n/` | `useI18n()` — inline bilingual strings, RTL switching, money/number/date formatting |
| `src/data/` | Types, demo catalog (real brands, synthetic prices/stock/lots), seed generator for customers, orders, reviews, discounts, shipments |
| `src/store/` | One zustand store shared by shop and admin, persisted in localStorage — an order placed in the shop appears in the admin |
| `src/lib/metrics.ts` | Analytics: KPIs, margin on landed cost, days of cover, FEFO expiry, RFM segments, cohorts |
| `src/storefront/` | Shop pages |
| `src/admin/` | Admin shell, command palette, pages |

## Demo data

Every price, cost, stock level, lot number, customer, order, review and figure is synthetic. Replace `src/data/` with real data, or swap the store actions in `src/store/index.ts` for API calls; components only talk to that interface. Use **Settings → Reset demo data** in the admin to start over.

## Before launch

- Real product photography (the shop currently draws packaging as flat-ink SVG)
- Payment gateway (cards, wallets, InstaPay are UI only), courier APIs, WhatsApp Business API
- Backend + auth for the admin
- Confirm the brand name and voice choices recorded in `PRODUCT.md`
