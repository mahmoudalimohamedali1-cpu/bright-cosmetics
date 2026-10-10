# Product

<!-- impeccable:product-schema 1 -->

> Inferred from the owner's brief (a `/goal` run that asked not to pause for questions). Every fact marked *(inferred)* is an assumption to confirm.

## Platform

web

## Stack

delegated: Vite + React + TypeScript single-page app with a shared client-side data layer persisted to localStorage, so the storefront and the admin dashboard run against the same catalog, orders, and customers without a backend. Chosen because the folder was empty, no deploy target was named, and a working end-to-end demo (order placed in the store appears in the dashboard) is the fastest proof. A real API can replace the data layer behind the same module interface. *(inferred)*

## Users

- **Shoppers** in Egypt and the Gulf *(inferred from Egyptian Arabic brief)*, mostly women 18–40, buying Korean skincare and imported cosmetics on their phones, often comparing authenticity, skin type fit, and price before ordering. Arabic first, English second.
- **The store owner and staff**, running catalog, stock, orders, cash-on-delivery, shipping by governorate, discounts, and customers from a desktop admin.

## Product Purpose

A prestige bilingual (Arabic RTL / English LTR) store for Korean and imported beauty products, plus an admin dashboard that covers everything Shopify's admin does for this kind of shop and goes past it on the things beauty retail in the region actually needs.

## Positioning

Brand name **NURI / نوري** *(inferred, placeholder)*: in Korean 누리 means "the world", in Arabic نوري means "my light". The store's claim is curated, authentic Korean and imported beauty matched to the shopper's skin, not a marketplace dump.

## Operating Context

- Payment mostly cash on delivery, plus cards and wallets; shipping priced by governorate.
- Cosmetics carry batch numbers and expiry dates; imported stock arrives in shipments with landed cost.
- Shoppers choose by skin type, concern, and routine step (cleanser → toner → serum → moisturizer → sunscreen).

## Capabilities and Constraints

- Storefront: home, collection with filters, product detail, search, wishlist, cart, checkout, order confirmation, routine finder, language toggle with full RTL.
- Admin: overview, orders, products, inventory with batch and expiry, customers and segments, discounts, analytics, abandoned carts, shipping zones, settings, and assistive insights.
- No backend yet; payment providers are not integrated. *(inferred)*

## Evidence on Hand

None. No logo, photography, prices, testimonials, or sales data were provided. All product names, prices, reviews, and dashboard figures in the build are synthetic demo data and must be labeled and replaced before launch.

## Product Principles

1. Arabic is a first-class language, not a translation layer: layout mirrors, numerals and copy read natively.
2. Authenticity and skin fit before discounts.
3. The owner should see what needs action today before seeing vanity charts.
4. Every number in the admin links to the records behind it.

## Accessibility & Inclusion

WCAG 2.2 AA contrast and keyboard access in both directions; mobile-first storefront.
