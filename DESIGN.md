---
name: Bright / برايت
description: Joyful, loud, bilingual K-beauty store. Plum ink on cream, a lilac brand colour, one lemon pill that buys.
colors:
  plum: "#1f0229"
  plum-deep: "#12001a"
  plum-800: "#2c0a3a"
  plum-700: "#43195a"
  plum-300: "#b9a3c4"
  cream: "#fff1e7"
  cream-lit: "#fff8f2"
  cream-2: "#f8e4d6"
  cream-3: "#ebd3c3"
  ink-2: "#4a3352"
  ink-3: "#7a6680"
  ink-on-plum-2: "#dccbe2"
  lilac: "#db98f9"
  lilac-700: "#7a3aa0"
  lilac-600: "#9b55c4"
  lilac-100: "#f8eafe"
  lemon: "#fffc54"
  lemon-300: "#fffb9e"
  celadon-700: "#2f6b4f"
  celadon-600: "#3f8a5f"
  celadon-400: "#8cc4a2"
  celadon-100: "#e6f4ea"
  ok: "#3f7a5f"
  ok-bg: "#e2efe7"
  warn: "#9a6b12"
  warn-bg: "#f8ecd2"
  bad: "#a8352a"
  bad-bg: "#f7e1dd"
  info: "#3c6585"
  info-bg: "#e0eaf2"
  chart-1: "#94351f"
  chart-2: "#3f8a5f"
  chart-3: "#2a72a8"
  chart-4: "#b07a1e"
  chart-5: "#8a5cb5"
  admin-dark-pane: "#1c0626"
  admin-dark-pane-2: "#250b31"
  admin-dark-line: "#351744"
  admin-dark-line-strong: "#4a2160"
typography:
  display:
    fontFamily: "Fraunces, Lalezar, Georgia, serif"
    fontSize: "clamp(3.5rem, 1.2rem + 8.4vw, 9rem)"
    fontWeight: 900
    lineHeight: 0.9
    letterSpacing: "-0.025em"
    fontVariation: "\"SOFT\" 100, \"WONK\" 0, \"opsz\" 144"
  display-ar:
    fontFamily: "Lalezar, Fraunces, Georgia, serif"
    fontSize: "clamp(3.5rem, 1.6rem + 7.6vw, 8.5rem)"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "0"
  headline-page:
    fontFamily: "Fraunces, Lalezar, Georgia, serif"
    fontSize: "clamp(2.9rem, 1.6rem + 5.4vw, 5.5rem)"
    fontWeight: 800
    lineHeight: 0.98
    letterSpacing: "-0.02em"
    fontVariation: "\"SOFT\" 100, \"WONK\" 0, \"opsz\" 144"
  headline:
    fontFamily: "Fraunces, Lalezar, Georgia, serif"
    fontSize: "clamp(2rem, 1.2rem + 2.4vw, 3.25rem)"
    fontWeight: 800
    lineHeight: 1.04
    letterSpacing: "-0.02em"
    fontVariation: "\"SOFT\" 100, \"WONK\" 0, \"opsz\" 144"
  title:
    fontFamily: "Fraunces, Lalezar, Georgia, serif"
    fontSize: "1.05rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "0"
    fontVariation: "\"SOFT\" 100, \"opsz\" 144"
  nav:
    fontFamily: "Fraunces, Lalezar, Georgia, serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.6
    fontVariation: "\"SOFT\" 100, \"opsz\" 36"
  pill:
    fontFamily: "Fraunces, Lalezar, Georgia, serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.02em"
    fontVariation: "\"SOFT\" 100, \"opsz\" 36"
  body:
    fontFamily: "Readex Pro, system-ui, Segoe UI, Tahoma, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
  body-ar:
    fontFamily: "Readex Pro, system-ui, Segoe UI, Tahoma, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.75
    letterSpacing: "0"
  label-mono:
    fontFamily: "Space Mono, Readex Pro, ui-monospace, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.75
  label-caps:
    fontFamily: "Space Mono, Readex Pro, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0.08em"
  admin-body:
    fontFamily: "Readex Pro, system-ui, Segoe UI, Tahoma, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  admin-title:
    fontFamily: "Fraunces, Lalezar, Georgia, serif"
    fontSize: "30px"
    fontWeight: 800
    lineHeight: 1.2
    fontVariation: "\"SOFT\" 100, \"WONK\" 0, \"opsz\" 144"
  admin-figure:
    fontFamily: "Readex Pro, system-ui, Segoe UI, Tahoma, sans-serif"
    fontSize: "26px"
    fontWeight: 600
    lineHeight: 1.2
    fontFeature: "\"tnum\" 1"
rounded:
  control: "10px"
  frame: "14px"
  soft: "16px"
  card-photo: "18px"
  panel: "20px"
  tile: "24px"
  pill: "999px"
  ellipse: "50%"
spacing:
  s-1: "4px"
  s-2: "8px"
  s-3: "12px"
  s-4: "16px"
  s-5: "24px"
  s-6: "32px"
  s-7: "48px"
  s-8: "64px"
  s-9: "96px"
  gutter: "clamp(16px, 4vw, 48px)"
  page-max: "1360px"
components:
  button-pill-cta:
    backgroundColor: "{colors.lemon}"
    textColor: "{colors.plum}"
    typography: "{typography.pill}"
    rounded: "{rounded.ellipse}"
    padding: "14px 40px"
    height: "58px"
  button-lemon:
    backgroundColor: "{colors.lemon}"
    textColor: "{colors.plum}"
    rounded: "{rounded.ellipse}"
    padding: "0 32px"
    height: "48px"
  button-lemon-hover:
    backgroundColor: "{colors.lemon-300}"
  button-outline:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.plum}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "48px"
  button-outline-hover:
    backgroundColor: "{colors.plum}"
    textColor: "{colors.cream}"
  icon-button-round:
    textColor: "{colors.plum}"
    rounded: "{rounded.ellipse}"
    size: "44px"
  filter-pill:
    textColor: "{colors.plum}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "40px"
  filter-pill-hover:
    backgroundColor: "{colors.lilac-100}"
  filter-pill-selected:
    backgroundColor: "{colors.lilac}"
    textColor: "{colors.plum}"
  chip-skin-fit:
    backgroundColor: "{colors.celadon-100}"
    textColor: "{colors.celadon-700}"
    rounded: "{rounded.pill}"
    padding: "4px 14px"
  text-field:
    backgroundColor: "{colors.cream-lit}"
    textColor: "{colors.plum}"
    typography: "{typography.body}"
    rounded: "{rounded.frame}"
    padding: "10px 16px"
    height: "52px"
  ticker:
    backgroundColor: "{colors.lilac}"
    textColor: "{colors.plum}"
    height: "36px"
  count-badge:
    backgroundColor: "{colors.lilac}"
    textColor: "{colors.plum}"
    rounded: "{rounded.control}"
    height: "19px"
  product-card:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.plum}"
    typography: "{typography.title}"
    padding: "14px 16px 18px"
  accordion-row:
    textColor: "{colors.plum}"
    padding: "14px 0"
    height: "60px"
  door-panel:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.plum}"
    width: "min(460px, 100vw)"
  admin-rail:
    backgroundColor: "{colors.plum}"
    textColor: "{colors.cream}"
    width: "248px"
  admin-pane:
    backgroundColor: "{colors.cream-lit}"
    textColor: "{colors.plum}"
    typography: "{typography.admin-body}"
    rounded: "{rounded.frame}"
    padding: "16px"
  admin-button-primary:
    backgroundColor: "{colors.plum-800}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "36px"
  admin-button-primary-hover:
    backgroundColor: "{colors.plum-700}"
  admin-button-live:
    backgroundColor: "{colors.lemon}"
    textColor: "{colors.plum}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "36px"
  admin-badge-ok:
    backgroundColor: "{colors.ok-bg}"
    textColor: "{colors.ok}"
    rounded: "{rounded.pill}"
    padding: "0 8px"
    height: "22px"
---

# Design System: Bright / برايت

## Overview

**Creative North Star: "The Laughing Vanity"**

Bright sells Korean and imported skincare the way a friend shows you her vanity: loudly, happily, and up close. The storefront is a cream counter-top ruled in plum ink. On it sit a laughing face with cream on her cheek, a chunky soft serif that shouts one short line, hand-drawn lilac stickers, and a single lemon pill that buys. The design reference the owner pinned is vibebevvy.com, and the build follows its entrance, its scroll moments and its sticker culture. The system refuses the hushed pastel K-beauty catalogue, and the earlier "lattice light" world was discarded by the owner and must not come back.

One brand has two registers. The storefront (Persuade) is mobile-first, Arabic RTL by default with English LTR, with full-bleed photography, an entrance sheet, scroll-driven motion and big type. The admin (Operate) is the same brand turned quiet for desktop work: a plum rail, a cream workspace, hairlined panes, Readex Pro at 14px, tabular figures, and lemon kept for the one live action on screen.

Density in the storefront is generous. Sections breathe on clamp() padding between 56px and 150px, product cells are large, and type runs huge. The admin is compact, with 36px controls, 16px pane padding and 24px page padding.

**Key Characteristics:**
- Plum ink (#1f0229) does all the type, every outline and every 1px hairline. There is no grey and no black.
- The ground is cream (#fff1e7). Depth comes from cream steps and hairlines, never from shadows.
- Lilac (#db98f9) is the brand colour: the ticker bar, the wordmark, stickers, badges and selected states.
- Lemon (#fffc54) appears only as the elliptical buy pill with a plum outline and an arrow.
- Fraunces is set heavy with SOFT 100 for Latin display. Lalezar at weight 400 sets Arabic display. Space Mono carries Latin small print and Readex Pro carries text.
- Product grids are hairline-ruled cells with no boxes and no gaps.
- Signature motion: a lilac entrance sheet with a diagonal wipe, a headline that slides in letter by letter, the hero shrinking to a card, headings that fill as you scroll, a spinning product band, endless marquees and sliding door panels.

## Colors

The palette is a deep plum ink on a warm cream ground, with one candy brand colour (lilac) and one shout colour (lemon) that is reserved for buying.

**Token-name note.** `src/styles/tokens.css` still carries names from the discarded world. `--lacquer-950…100` now hold the **plum** scale. `--brass` holds **lemon**. `--brass-600` and `--brass-700` hold **purple values** (#7a3aa0 and #6d2f91) and not lemon. `--paper*` holds the **cream** steps. New code should use the semantic aliases `--plum`, `--cream`, `--lilac`, `--lilac-700/600/100` and `--lemon`. Read the legacy names by role only.

### Primary
- **Aubergine Plum Ink** (#1f0229, `--plum` / `--lacquer-900` / `--ink`): all storefront type, every 1px outline and hairline, the hero card ground before the photo loads, the solid-header text, the admin rail, and the selected or filled state of outline buttons (plum fill, cream text). `theme-color` is plum too.
- **Night Plum** (#12001a, `--lacquer-950`): the admin dark-theme background.
- **Plum 800 / 700** (#2c0a3a / #43195a): admin-only depth. 800 is the light-theme primary button and the bulk bar. 700 is its hover, the active rail item and the active-row inset marker.
- **Dusk Plum** (#b9a3c4, `--lacquer-300`): admin rail group headings and the scrollbar-thumb hover.

### Secondary
- **Candy Lilac** (#db98f9, `--lilac`): the brand colour. It fills the ticker bar, the wordmark, sunburst stickers and badges, the authenticity seal, count badges, the entrance sheet, selected filter pills and quiz options, progress and meter fills, the reached steps on the order timeline, `::selection`, and the admin dark-theme accent. It always carries plum text or a plum outline. It is never used as text on cream.
- **Deep Lilac** (#7a3aa0, `--lilac-700`, which equals `--brass-600`): the only lilac allowed as text or line on cream. It is used for focus outlines (2px), the newsletter success line, the "100%" on the seal, routine timing, and the hover on the dark selected chip.
- **Lilac 600** (#9b55c4): the markers on the ingredient list.
- **Lilac Mist** (#f8eafe, `--lilac-100`): hover wash for pills, options and links, the checked payment row, and note boxes.

### Tertiary
- **Lemon** (#fffc54, `--lemon` / `--brass`): the buy pill (`v-pill`, `sf-btn--lemon`) and the skip link. In the admin it marks the one live action (`btn--live`), the dark-theme primary button, the active rail marker (3px), live counts, stars, the live pulse and the input focus glow.
- **Pale Lemon** (#fffb9e, `--brass-300`): the hover state of lemon buttons and admin `::selection`.
- **Celadon** (700 #2f6b4f, 600 #3f8a5f, 400 #8cc4a2, 100 #e6f4ea): the calm "fits your skin / in stock / verified / saved" tone. Used for skin-fit chips, the in-stock dot, the verified-buyer mark, discount savings, field success, admin switches and pressed admin chips.

### Neutral
- **Cream** (#fff1e7, `--cream` / `--paper`): the ground of every storefront page, the solid header, door panels, product cells, and the admin workspace.
- **Lit Cream** (#fff8f2, `--paper-lit`): inputs, the routines band, the delivery box, meter tracks, and admin panes.
- **Cream 2** (#f8e4d6, `--paper-2`): recessed tiles such as the product-page media tile, thumbnails, the checkout summary aside, the confirmation order box, review replies and admin product thumbs.
- **Cream 3** (#ebd3c3, `--paper-3`): empty stars and scrollbar thumbs.
- **Plum Grey 2** (#4a3352, `--ink-2`): secondary text, meta, mono small print and footer column heads.
- **Plum Grey 3** (#7a6680, `--ink-3`): placeholders and faint counts.
- **Soft hairline** (`color-mix(in srgb, var(--plum) 22%, transparent)`, `--line-soft`): secondary rules, such as dashed "off" chips, zone rows and unreached timeline segments. Mega-menu rows use plum at 18%.
- **Status** (admin and storefront stock): ok #3f7a5f on #e2efe7, warn #9a6b12 on #f8ecd2, bad #a8352a on #f7e1dd, info #3c6585 on #e0eaf2. Dark theme: ok #8fd0ae/#1e3329, warn #f0c56f/#3a2c10, bad #f39a8c/#3d1712, info #9cc3e2/#182a38.
- **Admin dark theme**: background #12001a, pane #1c0626, pane-2 #250b31, line #351744, line-strong #4a2160, text #fff1e7 / #dccbe2 / #a891b0, accent lilac with plum text.
- **Chart palette** (admin data only, validated with the dataviz checker on the pane colour): light chart-1 #94351f, chart-2 #3f8a5f, chart-3 #2a72a8, chart-4 #b07a1e, chart-5 #8a5cb5. Dark: #d9664c, #3f9a78, #4a86d0, #b8892a, #9a7ad0, with the grid on the dark line colour #351744. Use them in this order. They are data inks and never brand colours.

### Named Rules
**The Plum Ink Rule.** Every piece of storefront type, every outline and every rule is plum (#1f0229) at 1px, or plum mixed toward transparent. There is no neutral grey, no #000, and no 2px borders, except the 2px focus outline.

**The One Lemon Rule.** In the storefront, lemon fills one shape: the elliptical buy pill, with a plum 1px outline, plum text and an arrow. Lemon is never a section background, never text, and never a highlight.

**The Lilac Carries Plum Rule.** Lilac is a fill, and plum always sits on it or around it. When lilac has to be a line or a word on cream, use Deep Lilac (#7a3aa0).

## Typography

**Display Font:** Fraunces (variable: opsz 9–144, wght 400–900, SOFT 0–100, WONK 0–1), with Lalezar and Georgia as fallbacks
**Arabic Display Font:** Lalezar (one weight)
**Body Font:** Readex Pro (wght 200–700), with system-ui, Segoe UI and Tahoma as fallbacks
**Label/Mono Font:** Space Mono (400, 700). Arabic falls back to Readex Pro.

**Character:** A chunky, soft-cornered serif shouts short lines while a typewriter mono whispers the facts. The pair reads as a joyful label printer: big friendly headline, small honest lot number. In Arabic, Lalezar does the shouting and Readex Pro does everything else.

### Hierarchy
- **Display** (Fraunces 900, `clamp(3.5rem, 1.2rem + 8.4vw, 9rem)`, line-height 0.9, -0.025em, max 11ch): the hero headline only. Cream on the photo, with a soft plum text-shadow. Arabic: Lalezar 400, `clamp(3.5rem, 1.6rem + 7.6vw, 8.5rem)`, line-height 1.2, max 9ch.
- **Giant words** (Fraunces 900, `max(18vw, 108px)` in the spin band, 9vw in the footer slogan, -0.03 to -0.035em): the repeated "Bright برايت" band and the footer line. Both are display-only and aria-hidden or decorative.
- **Page headline** (Fraunces 800, `--step-6` = `clamp(2.9rem, 1.6rem + 5.4vw, 5.5rem)`, line-height 0.98): page titles (`sf-h1`). `--step-5` is used for section h2, product names and quiz questions.
- **Headline** (Fraunces 800, `clamp(2rem, 1.2rem + 2.4vw, 3.25rem)`, line-height 1.04, -0.02em): home section headings (`v-h2`) and the scroll-fill heading (`clamp(1.75rem, 1rem + 2.6vw, 3.25rem)`, centred, max 21ch). Arabic line-height is 1.3 to 1.35.
- **Title** (Fraunces 600, 1.05rem, line-height 1.25): product names in cards, cart lines, routine cells, fold titles (`--step-1`) and option labels (`--step-2`). Prices are Fraunces 600 with tabular figures, and big prices are 800 at `--step-4`. Arabic titles are Lalezar 400 at 1.15rem, line-height 1.4.
- **UI serif** (Fraunces 600–700, opsz 36, 0.9375–1.125rem): nav links (underlined, 1px, thickening to 2px on hover), accordion buttons, the ticker, mega-menu links and testimonial names. RTL swaps these to Readex Pro 500.
- **Body** (Readex Pro 400, `--step-0` 0.9375rem, line-height 1.6, or 1.75 in RTL): running text, form labels (500, `--step--1`) and button labels (500).
- **Label / small print** (Space Mono 400, 0.75–0.8125rem, line-height 1.7–1.8): brand lines, meta, counts, crumbs, flags, accordion and fold bodies, hints, the lot record and legal text. RTL swaps to Readex Pro at 0.9375rem with no uppercase.
- **Column label** (Space Mono 400, 0.75rem, uppercase, 0.08em): footer and mobile-menu column heads only.
- **Admin**: body is Readex Pro 14px with line-height 1.5 (1.65 RTL). Page h1 is Fraunces 800 at 30px (Lalezar 400 in RTL). Pane heads are Readex Pro 600 at 15px. KPI figures are Readex Pro 600 at 26px with tabular figures. Table headers are 12px at 500.

The modular scale (`--step--2…--step-6`) runs 0.75, 0.8125, 0.9375, 1.0625, 1.3125, 1.75, 2.375rem, then two clamps.

### Named Rules
**The Soft Shout Rule.** Latin display is always Fraunces with `"SOFT" 100, "WONK" 0, "opsz" 144`, at weight 800–900 and with negative tracking (-0.02 to -0.035em). It is never light and never italic. Only the wordmark switches WONK to 1.

**The Lalezar Rule.** Arabic display is Lalezar at weight 400 only. It is never faux-bolded, its line-height is 1.2 or more, it is never letter-spaced (`[dir=rtl] * { letter-spacing: 0 !important }`), and it is never split into letters. The headline slide-in animates Arabic word by word so the letters stay joined.

**The Typewriter Fact Rule.** Facts are mono: lot numbers, tracking, codes, counts, meta and legal. Codes stay Space Mono, LTR-isolated (`direction: ltr; unicode-bidi: isolate`), in both languages. Every other piece of Arabic small print uses Readex Pro.

**The Western Digits Rule.** Numbers use Western digits in both languages (`ar-EG-u-nu-latn`), with tabular figures for prices, tables, steppers and KPIs.

## Layout

The storefront is a single centred column (`--page-max` 1360px, `--gutter` `clamp(16px, 4vw, 48px)`). Full-bleed bands break out of it: the ticker, hero, spin band, marquee strip, routines band, wild strip and the footer slogan. Spacing snaps to an 8px module (`--s-1…--s-9`: 4, 8, 12, 16, 24, 32, 48, 64, 96). Section padding is fluid and generous, `clamp(56–72px, 8–10vw, 112–150px)`.

- **First viewport:** a lilac ticker (36px), then a transparent sticky header (72px desktop, 64px under 1024px) over a full-bleed photo that fills `100svh - ticker`. The header is a three-column grid: links at the inline-start, the wordmark centred, and 44px round icon buttons at the inline-end. The header turns solid (cream, plum text, plum bottom rule) once you leave the top of home, or on any other page. The headline sits at the inline-start in the bottom third. The lemon pill sits centred near the bottom.
- **Product grid:** hairline cells. Home uses 4 columns, dropping to 2 under 860px. The shop uses 2 columns, then 3 at 760px, 4 at 1100px and 5 at 1560px. Cells are `aspect-ratio 4/5` tiles with the drawn product inset, and the body sits below.
- **Two-up sections:** the accordion with photo, the lot seal with copy, the PDP (1.1fr / 1fr, with sticky media) and checkout (1.25fr / 1fr, with a sticky summary). All collapse to one column under 860–960px.
- **Mirroring:** layout uses logical properties throughout (`inset-inline`, `padding-inline`, `border-inline-end`). Directional motion and arrows multiply by `--flip` / `--v-flip` (-1 in RTL). Icons that point use `.v-flip` / `.sf-flip`.
- **Admin:** a 248px plum rail plus a fluid main area. The sticky 60px top bar uses a translucent cream blur. Content is capped at 1440px with 24px (`clamp(16px, 2.5vw, 32px)`) padding. The grid has 16px gaps (`grid-2`, `grid-3`, and `grid-main` = 1fr + 360px). The rail becomes an off-canvas door under 1024px.
- **Breakpoints in use:** 420, 480, 640, 760, 860, 960, 1024, 1100 and 1560px.

## Elevation & Depth

The storefront is flat. Depth comes from four things: 1px plum hairlines, the cream tonal steps (cream-lit above, cream-2 recessed), rounded photo frames with a plum outline, and motion. There are no box-shadows on storefront cards, panels, photos or buttons at rest. Legibility over photography uses text-shadow only (the hero headline `0 2px 40px rgb(31 2 41 / .3)`, the transparent header `0 1px 14px rgb(31 2 41 / .35)`) and a plum gradient shade over the hero image. Door panels sit over a plum scrim (`rgb(31 2 41 / .32)`).

The admin is mostly flat as well: panes are hairlined. Shadows appear only on overlays (the drawer, the command palette, the off-canvas rail, toasts, chart tooltips, the save bar) and on the pressed segmented button.

### Shadow Vocabulary
- **Raised segment** (`--shadow-1`): the pressed state of an admin segmented control.
- **Floating** (`--shadow-2`): admin toasts, chart tooltips and the sticky save bar.
- **Overlay** (`--shadow-3`): the admin drawer, the command palette and the open off-canvas rail.

### Named Rules
**The Hairline-Not-Shadow Rule.** A storefront surface separates from its neighbour with a 1px plum line or a cream step, never a shadow. If you reach for a shadow, draw a line instead.

## Shapes

Two silhouettes carry the brand: the **ellipse** and the **sunburst**. The buy pill is a true ellipse (`border-radius: 50%`), not a stadium. Round icon buttons, steppers, avatars, timeline dots and arrows are circles. Lilac stickers are jagged 18-ray sunbursts (32 rays on the seal), drawn as SVG polygons with a plum stroke and tilted between -10° and 14°.

Secondary controls are stadium pills (`999px`): outline buttons, filter pills, chips, flags and the skip link. Photographs and media tiles get soft frames with a 1px plum outline: 24px for the hero card and banner, the why-photo and the PDP tile; 18–20px for routine and wild cards; 16px for thumbnails, the spin object and notes. Form fields are 14px. The admin uses 14px panes (`--r-frame`) and 10px controls (`--r-control`). Product drawings are flat SVG packaging shapes (dropper, pump, jar, pad, tube, toner, mask, cushion, tint) at 200×260, in the product's own packaging colours with one white highlight stroke.

Playful tilt is part of the shape language: wild-strip cards rotate ±2–5°, stickers rotate, the wordmark's Arabic chip rotates -8°, and hover states rotate by 1–3°.

## Components

### Buttons
Every button is outlined in plum, and the one that buys is lemon.
- **Buy pill (signature):** an ellipse (`50%`) in lemon with a 1px plum outline and plum Fraunces 700 at 1rem, uppercase with 0.02em tracking and an underlined label, plus a 20px arrow. Size is `min-height 58px`, padding `14px 40px`. In RTL it is Lalezar at 1.125rem with no case change. On hover it rotates -3° and scales to 1.04 with a spring, and the arrow nudges 5px toward the inline-end. Focus has a 4px offset ring. The page-level variant `sf-btn--lemon` is Fraunces 600 and runs from 44px (`--sm`) to 68px (`--xl`), with Pale Lemon on hover.
- **Outline button:** a stadium (999px) on cream with a 1px plum outline and Readex 500 text, at 48px (44 small, 56 large, 68 extra large) with 24px inline padding. On hover it fills plum with cream text. Disabled is 45% opacity.
- **Round icon button:** a 44px hit area with a 40px 1px ring in `currentColor`. On hover the ring scales to 1.06 with a 12% `currentColor` wash. The storefront page variant fills plum on hover, and lilac when pressed (wishlist).
- **Text button:** plum with a 1px underline at a 0.3em offset, thickening to 2px on hover.
- **Admin:** 36px (30 small) buttons with a 10px radius and Readex 500 at 14px. Primary is plum-800 with white text (lemon with plum text in dark theme). `btn--live` is lemon, for the single live action. Ghost and danger variants exist. Active presses translate down 1px.

### Chips & Pills
- **Filter pill / pick:** a 40–44px stadium, transparent with a 1px plum outline. It washes Lilac Mist on hover and fills Candy Lilac when pressed or checked. Counts inside are mono at `--step--2`.
- **Chip:** 32px, outlined with the soft hairline. Variants: `fit` (celadon on celadon-100), `off` (dashed, struck through), `on` (plum fill, cream text, Deep Lilac on hover) and `link` (plum outline, 44px).
- **Sticker:** a lilac sunburst with Fraunces 800 text rotated -10°, sized by container query (`19cqi`). It rotates 30° on card hover, and on confirmation and 404 it spins slowly (30–40s).
- **Admin chips and badges:** a 22px stadium with a 6px `currentColor` dot, in status pastels. Pressed admin chips are celadon.

### Cards / Containers
- **Product cell:** no box. It is a cell in the hairline grid on cream. The tile is 4:5 with the SVG packaging inset at 9%/20%. On hover the drawing lifts 6px and tilts -2° (mirrored), and the name underlines. A sticker sits at the top inline-start, a round wishlist button at the top inline-end, and quick-add (lemon) and peek actions appear on hover or focus (always visible on touch or under 760px). The body is a Fraunces title, a mono brand line and a price aligned to the end. Sold-out drops to 45% opacity with a half grayscale.
- **Media frames:** photos and tiles use the radii from Shapes with a 1px plum outline. The routine card photo tilts -1° and scales to 1.02 on hover.
- **Recessed boxes:** checkout and confirmation summaries use cream-2 with a 24px radius and 32px padding and no outline. Notes use Lilac Mist at 16px.
- **Admin pane:** cream-lit with a 1px hairline and a 14px radius. The head is padded 14px 16px over a rule, the body 16px. The KPI ledger is one framed grid with 1px gaps that show the line colour through.

### Inputs / Fields
- **Storefront field:** 52px, cream-lit, with a 1px plum-at-40% outline and a 14px radius, padded 10px 16px. On hover the outline goes full plum. On focus it shows a plum border plus a 2px plum outline at a 2px offset. The error state is `--bad` border plus a 1px ring. Selects use a plum chevron at the inline-end.
- **Underline field (signature):** search, newsletter and order lookup use no box at all. They are a single plum bottom rule with display-size (search) or mono (newsletter, lookup) text, and focus thickens the rule with `box-shadow: 0 1px 0 plum`.
- **Choice rows:** payment options are 72px rows between hairlines with a custom 24px radio (plum dot on lilac when checked) and a Lilac Mist row when selected. Quiz options are 60–72px outlined stadiums that fill lilac when on.
- **Admin field:** 38px, pane background, a 1px strong line and a 10px radius. Focus shows a Deep Lilac border plus a 3px lemon glow at 28%.

### Navigation
- **Ticker:** a 36px lilac bar of plum claims (authentic, cash on delivery, lot on every unit, free shipping over the threshold, matched to your skin), separated by the Bright dot glyph. It loops endlessly and pauses on hover.
- **Header:** transparent cream text over the hero, then solid cream with plum text and a plum rule. Links are underlined Fraunces 600. Disclosure chevrons rotate 180° when open. Mega menus and search drop as full-width cream panels between plum rules. Mega rows are 48px with mono counts.
- **Wordmark:** "Bright" in Fraunces 900 (SOFT 100, WONK 1, 34px, or 28px mobile and 44px footer), always lilac and always LTR, with "برايت" in Lalezar inside a rotated 1.5px outlined pill beside it.
- **Mobile menu:** lives inside a door panel. Big links are Lalezar or Fraunces at 2rem, with stadium-outlined secondary links and mono column heads.
- **Admin rail:** plum, with pale plum (#dccbe2) text links at 8px radius. Active is plum-700 with a 3px lemon marker at the inline edge. Group heads are dusk plum at 12px. Counts are stadiums, and lemon when live.

### Door Panel (signature)
A sliding side panel used for the cart, the mobile menu, filters and quick view. It is cream, 460px wide (860px `--wide`), with a 1px plum edge rule. It slides from the inline-end (or the start) over 520ms on `--ease-door` (`cubic-bezier(0.7, 0, 0.2, 1)`) above a plum scrim. The head has a Fraunces 800 title at `--step-4` over a plum rule, and the foot sits above a plum rule. The admin drawer is the same idea at 560px.

### Entrance Sheet (signature)
Home only, once per page load. A full-screen lilac sheet with a soft white radial glow draws the "Bright / برايت" wordmark in a cream outline over 1.1s (stroke-dash). It waits up to 700ms for Fraunces and 1.8s for the hero photo, then wipes off on a diagonal edge over 900ms (`cubic-bezier(0.76, 0, 0.24, 1)`), moving toward the inline-start (mirrored in RTL) while the mark slides out. The hero photo waits zoomed to 1.12 and settles over 1.6s as it is revealed.

### Hero Slide-in & Shrink (signature)
The headline slides in from the inline-end edge one piece at a time: Latin by letter (each word kept unbreakable) and Arabic by word, 45ms apart, 950ms each on the spring `cubic-bezier(0.34, 1.56, 0.64, 1)`, with a small per-letter tilt that settles to zero. The real text is read once by assistive tech. The sparkle sticker pops in at +1.3s, and the support line and pill rise at +1.1s and +1.35s. Scrolling the first 60% of the viewport scales the hero into an inset card (a 24px gap, 12px under 640px) with corners rounding to 24px.

### Scroll Moments
- **Heading fill:** each word fades from 20% to solid as the heading travels from 92% to 38% of the viewport.
- **Spin band:** the giant "Bright برايت" words slide 14vw and darken from 16% opacity while a bestseller drawing turns 540° on Y (two faces, so the label always reads), floats ±14px and tilts ±6°.
- **Marquees:** two identical groups translate by -50% (or +50% in RTL), linear and endless (36–40s). Hover pauses them.
- **Seal:** the authenticity seal ring rotates once every 48s.

All scroll effects share one passive listener and one requestAnimationFrame, and write CSS variables (`--hp`, `--hs`, `--fill`, `--sp`).

### Accordion & Testimonials
- **Accordion:** one item open at a time, rows between plum hairlines. The trigger is a 60px Fraunces 700 row with a plus/minus icon. The panel opens by animating `grid-template-rows` 0fr→1fr over 0.4s. The body is mono at 54ch.
- **Testimonials:** one big quote at a time in Fraunces 800 (`clamp(1.5rem, …, 3rem)`, max 26ch), with a 56px lilac initials avatar, 56px round arrows and 44px dot targets. Initials only, with no stock faces.

### Reduced Motion
Under `prefers-reduced-motion: reduce`, the entrance sheet is skipped and the headline renders whole. There is no hero shrink, heading fill or spin. Marquees stop and become horizontally scrollable, the seal stops, and hover transforms (pill tilt, ring scale, card tilt) are removed. Globally, every animation and transition collapses to 1ms.

### Photography
- Lifestyle photography is joyful and up close: laughing faces, cream on a cheek, textures, droppers and glass, in natural light. Every raster lives in `src/storefront/media.ts` with its Unsplash photo id as provenance and bilingual alt text, and is served through `srcset`. It is placeholder art to be replaced by Bright's own shoot before launch.
- Products are never photographed stand-ins. They are drawn as flat SVG packaging (`ProductVisual`) until real product photography exists.
- Photos sit in rounded frames with a 1px plum outline (see Shapes), never borderless with shadows. The hero photo alone is full-bleed, under a plum gradient shade.

## Do's and Don'ts

### Do:
- **Do** set every storefront line, outline and hairline in plum (#1f0229) at 1px, on a cream (#fff1e7) ground.
- **Do** make lemon (#fffc54) the elliptical buy pill (`border-radius: 50%`, 1px plum outline, plum text, arrow) and nothing else in the storefront.
- **Do** use lilac (#db98f9) as a fill with plum on or around it: ticker, wordmark, stickers, badges, selected states. Switch to Deep Lilac (#7a3aa0) whenever lilac must be text or a line.
- **Do** set Latin display in Fraunces 800–900 with `"SOFT" 100, "WONK" 0, "opsz" 144` and negative tracking, and Arabic display in Lalezar 400 with line-height of 1.2 or more.
- **Do** put small print, codes, counts and meta in Space Mono (Readex Pro under Arabic), and keep lot and tracking codes LTR-isolated.
- **Do** use Western digits (`ar-EG-u-nu-latn`) and tabular figures for every price, count and table.
- **Do** build grids as hairline-ruled cells: a top rule, then each cell rules its bottom and inline-end, with the last column open.
- **Do** write layout in logical properties and multiply directional motion by `--flip` / `--v-flip`.
- **Do** frame photos with a 1px plum outline and 16–24px corners, and give every raster an entry in `media.ts` with provenance and bilingual alt text.
- **Do** drive scroll motion through the shared `useScrollFrame` loop and CSS variables, and give every motion a reduced-motion fallback that shows the final state.
- **Do** keep the admin in its Operate register: Readex Pro 14px, 36px controls, hairlined cream-lit panes, plum rail, and lemon only for the single live action.

### Don't:
- **Don't** bring back the discarded "lattice light" world or drift toward a hushed pastel K-beauty catalogue.
- **Don't** letter-space Arabic, split Arabic into letters, or fake-bold Lalezar.
- **Don't** use lemon as a background, text colour or highlight in the storefront, or put it on any shape other than the ellipse pill.
- **Don't** set body text or small labels in lilac (#db98f9) on cream.
- **Don't** give storefront cards, panels or photos a box-shadow or a boxed card frame. Depth is hairlines and cream steps.
- **Don't** use grey or black for lines or type. Plum and its mixes are the only neutrals in the storefront.
- **Don't** add new legacy-named tokens (`--lacquer-*`, `--brass*`, `--paper*`). Name new tokens by role (`--plum`, `--cream`, `--lilac`, `--lemon`).
- **Don't** use stock product photos in place of the drawn packaging, or ship a raster without its provenance.
- **Don't** use the chart palette (`--chart-1…5`) as brand colour, or brand colours as chart series.
