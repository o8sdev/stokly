# Stokly — Catch-Up Log

> **Purpose:** This file is the single source of truth for picking up work on
> Stokly from any device. It records what the app is, what has been built, the
> architecture rules that must never be broken, how to run it, and what comes
> next. **Every working session must update this file** as work is done.

_Last updated: 2026-06-17. **Migrations live through `062`.** Active test tenant: **Forno Vivo**
(pizzeria + bar; business login `forno@stokly.test`), seeded with suppliers/ingredients/recipes +
a completed Day-0 opening count. Work since the 06-13 supplier-pricing report:_

_**Data-integrity & control (Phases A–E):** soft-delete/archive on master data (mig 054, nullable
`archived_at` + restore + "Archived" views); blind stock counts; required reasons on voids /
write-offs / large waste; tenant activity/audit log; variance/shrinkage alerts. **Multi-location
counts:** count every station in one session with per-line location (mig 052); day-0 = baseline.
**Per-recipe & tenant food-cost targets** (mig 053) + dashboard food-cost monitor. **Guided
onboarding:** `/app/onboarding` wizard + dashboard "Getting started" checklist (shared
`lib/data/onboarding.ts` `getOnboardingState` so wizard + card never drift)._

_**Admin console pass (W1–W4):** MRR window/join fix, `bulkChangePlan` parity with `changePlan`,
`recordPayment` period default; impersonation exit + audit-log gaps; perf RPCs + indexes (mig 059);
manage-admins UI (mig 060, super-only); confirmation modals on every destructive admin action._

_**Latest session:** removed the **global ingredient library** entirely (mig 061 drops the table;
admin catalog + tenant quick-add/browse/import-tab all gone, CSV/paste import kept); audit-log
"Əməliyyat" column now shows human-readable i18n labels; **plans reduced to Trial + Standart only**
(mig 062 deletes the 4 inactive legacy tiers) to match the landing; app-wide branded loader — a
**StoklySpinner** (brand asterisk) — plus a full-screen **sign-out curtain**; onboarding fixes
(wizard opens on step 1; dashboard card mirrors the wizard's 5 steps; quick-add persists
conversions); **yield moved off the ingredient onto the recipe line** (ingredient `yield_percent`
column kept as a hidden 100% default, no longer user-set/shown; recipe-line `yield_override` is now
the primary input, required when >1 sales point); **sales-point "Main" reframed as a default/fallback**
("Defolt"/"По умолчанию") + recipe sales-point picker required on multi-point tenants; strict
step-by-step **Day-0 opening-count wizard** (every location required, submit only on the review step
behind a confirm dialog — `components/inventory/opening-count-wizard.tsx`, branched in CountFlow on
`!preCount.hasPreviousCount`); **Sales & Purchases journals** rebuilt as per-day collapsible groups +
from/to date filter + CSV export (replaced the flat DataExplorer versions); comp tag renamed
**Komp → İkram / Комплимент**; Reports nav split into **Maliyyə (Finances)** + **Hesabatlar
(Reports)**; fixed a purchase-submit crash (`useFormState` state is transiently `undefined` on a
same-route `redirect()` → guarded `state?.error` across delivery/count/transfer/production/
ingredient/recipe forms). Added `scripts/qa-logic.ts` (27-assertion costing/stock-engine harness).
**QA:** pure-engine assertions ✓, ledger↔batches invariant 23/23 ✓, sale FIFO+location ✓,
full-menu food-cost ✓, public UI (az/ru/mobile) clean. Prior history: see the git commit log._

---

## 0. READ FIRST — current state, roadmap, how to continue

**Repo:** github.com/o8sdev/stokly (branch `main`). **Supabase project ref:**
`anbvxpoxdalizlsdcsdb`. **Migrations applied live through `062`** (the DB is already
migrated; on a *fresh* DB apply `supabase/migrations/001 → 062` in filename order).
Working tree is committed; latest commit messages are the quickest "what changed" log.

### The end-to-end loop that now works
Purchase (**Alışlar** `/app/purchases`, per-line supplier/cost/expiry, lands in a
**location**) → **Move stock** (`/app/inventory/transfer`, warehouse→kitchen, partial
batch-split, optional new use-by for freezing) → **Prep/Production** (`/app/production`,
recipe-driven batch: FIFO-consume kitchen inputs → produced batch with rolled-up cost +
yield) → **Sell** (**Satışlar** `/app/sales`, itemized, **confirm/lock**, kitchen FIFO
deduction, audited void) → **Waste** (`/app/inventory/waste`, kitchen FIFO, reverse) →
**Expiry write-off** (inventory hub "N expired → write off") → **Count** (`/app/inventory/
count`) → **Period report** (`/app/reports/period`, opening+purchases−closing = usage,
theoretical-vs-actual variance, food-cost %). Reports: food-cost, inventory-value, period.

### Architecture invariants (NEVER break these)
- `stock_movements` is **append-only**; `deriveStockLevel` (lib/calculations/stock-level.ts)
  is the single source of truth. **Σ active-batch `quantity_remaining` per ingredient ==
  `deriveStockLevel`** must always hold.
- All risky mutations are **atomic SECURITY DEFINER RPCs** (`search_path=''`, fully
  `public.`-qualified, `FOR UPDATE` locks, idempotent): `confirm_/void_daily_sales`,
  `transfer_stock`, `execute_/void_production_run`, `record_/reverse_waste`,
  `write_off_expired`. Authz inside via `current_tenant_id()` / `is_platform_admin()`.
- **Per-location consumption:** sales/waste/production-inputs FIFO-consume batches at the
  recipe's routed **consumption point** (`recipes.consumption_location_id`; null → the tenant's
  `is_default_consumption`) and **raise if short** — with a **no-batch fallback** (count-only
  ingredients, never batch-tracked, are not location-restricted). (`is_kitchen` was dropped in mig 039.)
- Reducer cases: delivery/production_output `+`, sale/waste/production_input/expiry_writeoff
  `−abs`, count = absolute, adjustment `±`, **transfer = no-op** (only moves location).
- **Test destructive/RPC SQL with `BEGIN … ROLLBACK`**, impersonating a tenant via
  `set_config('request.jwt.claims', json_build_object('sub', <tenant_member user_id>,
  'role','authenticated'), true)`. Never commit secrets; the admin password is weak (flagged).

### Roadmap (the plan) — what to build next
Plan file: `C:\Users\Rhabi\.claude\plans\quizzical-scribbling-goblet.md` (research +
audit vs restaurant best practice + the tiered roadmap). **Data-integrity tier = DONE.**
**Detailed, buildable specs for every Tier B / Tier C item below are in §9.**
- **Tier B — planning & control:** **B1 (par + shopping list, mig 034), B2 (price history +
  variance), B3 (sub-recipe yield %, mig 035) = DONE.** Next up — **B4 per-ingredient custom
  unit conversions** (piece/pack, e.g. 1 case = 24, 1 egg = 50 g — v1 only does metric
  families kg↔g, l↔ml); **B5** retire the legacy free-text `ingredients.storage_location`
  (superseded by `storage_locations`).
- **Tier C — analytics & KPIs:** **C1 turnover, C2 days-on-hand, C3 waste %, C5 stock
  aging, C6 menu engineering = DONE.** Remaining: **C4 prime cost** (needs a labor input —
  deferred with B4 as the one remaining focused pass).
- **Standing ops items:** set `SUPABASE_SERVICE_ROLE_KEY` + `CRON_SECRET` + a scheduler;
  change the weak admin password; optional daily cron to auto-run `write_off_expired`;
  delete orphaned auth user `rhabibli@outlook.com`; minor code-review nits (business-type
  chooser already fixed; nav-progress 10s edge).

### How to continue on a fresh device
```bash
git clone https://github.com/o8sdev/stokly && cd stokly && npm install
cp .env.local.example .env.local   # SUPABASE URL + anon key (+ service_role for admin)
npm run dev
```
Verify before every push: `npm run typecheck && npm run lint && npm run build`
(should be **~92 pages, green**) and `node -e "require('./messages/az.json');require('./messages/ru.json')"`.
Migrations are applied to the live project via the **Supabase MCP** (`apply_migration`);
recent: 025 batch LOT codes · 026 sales confirm/FIFO · 027 onboarding-dismiss · 028 drop
library business_types · 029 storage_locations · 030 transfer_stock · 031 kitchen
consumption · 032 production execute/void · 033 expiry write-off. **Read §7 changelog
bottom-up** for full per-feature detail.

---

## 1. What Stokly is

A restaurant inventory and food-cost management SaaS for the Azerbaijani market.
Multi-tenant (one restaurant = one tenant). Bilingual **Azerbaijani (default) +
Russian**. This repo is the **Phase 1 MVP** plus the **data foundation for two
Phase-2 features** (batch expiry / FIFO and production runs).

## 2. Stack

- **Next.js 14** (App Router) · **TypeScript** strict (no `any`)
- **Supabase** — PostgreSQL, Auth, Storage, Row-Level Security
- **Tailwind CSS** + **shadcn/ui** + **lucide-react**
- **React Hook Form** + **Zod**
- **next-intl** (`az` default, `ru`)
- Fonts: **DM Sans** (UI) + **JetBrains Mono** (all numbers / money)

## 3. Running it from a fresh clone

```bash
npm install
cp .env.local.example .env.local     # URL + anon key; + service_role for admin
# apply migrations in filename order (001 → 042) against your Supabase project
npm run dev
```

### Portals (sales-led / invite-only model)

- **Public** `/[locale]` — marketing + **demo request only**. No signup/login.
- **Business** `/[locale]/app/login` (hidden) → `/app/dashboard` etc. Accounts
  are admin-provisioned (no self-serve signup).
- **System admin** `/[locale]/admin/login` (hidden) → `/admin` console (sidebar:
  ƏSAS / TENANTLAR / MALİYYƏ / SİSTEM). Gated by `platform_admins` allowlist;
  `role` = `super` | `readonly` (read-only admins can't suspend/delete/edit
  plans). Sections: **Dashboard** (MRR cards + 12-mo line + plan donut + churn /
  onboarding-stuck / recent-activity panels + 60s activity feed), **Leads**,
  **Notifications** (bell + 6 alert types, idempotent), **Tenants** (filter/sort/
  paginate + health badge; detail tabs Overview/Ingredients/Recipes/Stock/Batches/
  Payments/Notes; god-mode: impersonate, change plan ↑/↓, record payment, note,
  **password-reset link**, **data export**, suspend, soft-delete, typed-confirm
  hard-delete), **Onboarding** pipeline (10 milestones + WhatsApp nudges),
  **Invitations** (single + bulk→CSV), **Revenue** (manual payments + overdue),
  **Plans** (DB-driven prices + per-plan **feature matrix** toggles — edit pricing
  & what each plan includes), **Feature Flags** (global kill-switch + per-tenant
  overrides), **Audit Log**, **Library**. **Cmd+K** global search.

### Subscriptions & entitlements (data-driven, admin-editable)

`plans` (price + bilingual meta) · `features` (catalog + global kill-switch) ·
`plan_features` (the per-plan toggle matrix) · `tenant_feature_overrides`
(per-tenant grant/deny). Resolution = kill-switch → tenant override → plan
inclusion, via SECURITY DEFINER `tenant_has_feature()` / `tenant_entitlements()`.
The business app gates features with `tenantHasFeature(tenantId, key)`, so moving
a tenant up/down a tier **instantly changes available functionality** (the
mechanism is retained, but the live system is now collapsed to `trial` + `normal`,
both including every feature, so the gates are effectively always-true — see §7).
Prices edit live in `/admin/plans` (Standart 99₼/mo).

### Migrations 010–021 (all applied live)

010 plans+features+matrix+overrides+resolvers · 011 tenant lifecycle (status/
plan_tier FK/trial/last_active + DAD House backfill active/professional) ·
012 activity_events + `log_activity` · 013 admin tables (manual_payments,
invitations, admin_notes, admin_audit_log, admin_notifications) · 014 signup
trigger (trial defaults + signup event + new_signup notif) · 015 payment trigger
(auto-upgrade + plan_upgraded) · 016 metrics RPCs (`admin_tenant_metrics`,
`admin_onboarding_progress`, admin-guarded) · 017 admin roles (`is_super_admin`) ·
018 lock new SECURITY DEFINER helpers to `authenticated` ·
019 flexible counts (`daily_sales`, `count_periods`, `tenants.count_cycle_days`;
tenant-scoped RLS + admin override) ·
020 blog (`blog_posts`: slug/bilingual title+excerpt+body/cover/status/
published_at; public read of `published` only, platform-admin full write) ·
021 library common (`global_ingredient_library.is_common` flag + 13 new common
items; 38 common of 72) ·
022 sales items (`daily_sales_items`: recipe_id × quantity × price snapshot per
day; `daily_sales.revenue_source` manual|items; tenant RLS owner/manager +
admin) ·
023 waste log (`stock_movements.waste_category_id` FK +
`reverses_movement_id` self-FK + partial waste index; backfilled the category id
that was crammed into `reason`) ·
024 business type (`tenants.business_type` + `global_ingredient_library
.business_types text[]`, null = universal).

### Flexible stock counts (counts are reminders, never locks)

Each confirmed count closes a **period** (last count → today) and stores a
**regenerable, versioned** report in `count_periods.report_data`:
opening + deliveries − closing = usage/COGS; food-cost % from `daily_sales`;
structured discrepancies (missing-sales / negative-usage) rendered bilingually.
Core: `lib/data/counts.ts` (boundaries, missing-sales, `createPeriodForCount`,
`generatePeriodReport`), `lib/calculations/period-report.ts` (pure compute),
`deriveStockLevelsAsOf`. **Daily sales**: `/app/sales` (+`/[date]`), one total
per day. **Count flow**: a **pre-count checklist** (period preview + sales-
completeness + edge warnings + ack) gates the existing single-submit count form
(no DB draft); a **missing-sales slide-over** (tab per day, save-all) is reachable
before and during a count. **Period report page** `/app/reports/period[/id]`
(usage table, summary, amber missing-sales banner, [Hesabatı yenilə] regenerate,
version footer). **Dashboard reminder** = 4 states (info/approaching/due/overdue)
from days-since-last-count vs `count_cycle_days` (Settings); count always
reachable from the inventory menu.

### Operator setup still needed

- `SUPABASE_SERVICE_ROLE_KEY` (business creation, password reset, export, cron).
- `CRON_SECRET` + a scheduler (Vercel Cron / GitHub Action) POSTing
  `/api/admin/cron` for time-based notifications (else they refresh on dashboard
  load). Real plan prices via `/admin/plans`. Change the temp admin password.

### Live database (already provisioned)

- Supabase project: **stockly** — ref `anbvxpoxdalizlsdcsdb`
  (`https://anbvxpoxdalizlsdcsdb.supabase.co`), region ap-northeast-1.
- Migrations **001–009 are already applied** (RLS + admin override; demo +
  platform-admin tables; global ingredient library + seed; helper functions
  hardened).
- `.env.local` (git-ignored, already populated) needs `NEXT_PUBLIC_SUPABASE_URL`
  + `NEXT_PUBLIC_SUPABASE_ANON_KEY`, **plus `SUPABASE_SERVICE_ROLE_KEY`**
  (server-side, ADMIN-ONLY — creating business accounts). Optional Resend vars
  enable demo-lead emails.
- **Provision the system admin:** create your user in Supabase → Authentication
  → Users (auto-confirm), then run
  `insert into platform_admins (user_id) select id from auth.users where email='you@...';`
- Advisor WARN to clear when convenient: enable **Leaked Password Protection**
  in Supabase → Authentication → Policies.

Verification commands (all must pass clean):

```bash
npm run typecheck   # tsc --noEmit
npm run build       # next build (35+ routes)
npm run lint        # next lint
```

> Note: the authenticated dashboard needs real Supabase credentials to render.
> Only the `/login` and `/signup` pages render without a live backend.

## 4. Architecture rules — NEVER violate

1. **`stock_movements` is append-only.** Never `UPDATE`/`DELETE` it. Expiry
   write-offs and all corrections are new INSERT rows.
2. **Current ingredient-level stock is always derived** from `stock_movements`
   via `deriveStockLevel()` — never stored on `ingredients`.
3. **`ingredient_batches.quantity_remaining` IS mutable** — it is current state,
   not an event log. Update it on consumption / write-off.
4. **FIFO is enforced in application logic**, not the DB. Always consume the
   oldest non-expired batch first (`ORDER BY received_date ASC`).
5. **Invariant:** `SUM(ingredient_batches.quantity_remaining)` for an ingredient
   must always equal `deriveStockLevel()` for that ingredient.
6. **Food cost always applies yield.** 200g needed at 85% yield = 235g purchased.
7. **`tenant_id` is always server-resolved** from `tenant_members`
   (`lib/auth/tenant.ts`) — never from client input.
8. **`production_runs.output_unit_cost`** is computed from actual input costs at
   production time — never the ingredient's current `cost_per_unit`.
9. All money displays with 2 decimals + `AZN`; numbers use JetBrains Mono.

## 5. Known stack gotchas (already handled)

- Forms use **`useFormState`/`useFormStatus` from `react-dom`**, NOT
  `useActionState` (React 19 only — this project is React 18.3).
  Shared `components/ui/submit-button.tsx` carries the pending state.
- **`@supabase/ssr` must be ≥0.10** to match `@supabase/supabase-js` 2.107's
  reordered `SupabaseClient` generics (older ssr collapsed typed queries to
  `never`). Every table's `Update` type must be a real object, not `never`.
- `next.config` must be **`.mjs`** (Next 14 rejects `.ts`).
- Signup provisions tenant + owner member + waste categories via the
  **`on_auth_user_created` DB trigger** (`handle_new_tenant`, SECURITY DEFINER,
  migration 005). The signup form passes `restaurant_name` + `locale` in user
  metadata; the trigger reads it. No service-role key anywhere in the app.

## 6. Project structure (high level)

- `app/[locale]/(marketing)` — **public landing page at the locale root** (e.g.
  `/az`). Dark "control-room" marketing site; no auth.
- `app/[locale]/(auth)` — login / signup (+ `actions.ts`)
- `app/[locale]/(dashboard)` — authed app. **Home moved to `/[locale]/dashboard`**
  (the root is the landing now). Ingredients, recipes, inventory
  (count/delivery/waste), reports (food-cost/inventory-value), settings
  (+ suppliers), production (Phase 2 placeholder)
- `components/marketing` — landing components (nav, reveal, count-up, hero panel,
  testimonials, faq, demo form)
- `components/ui` — shadcn primitives + `stokly-theme.tsx` (StoklyCard,
  MetricCard, FoodCostBadge, StockBadge, DataTable, MonoValue, …)
- `components/layout` — sidebar, header, mobile-nav
- `lib/calculations` — `food-cost.ts`, `recipe-cost.ts`, `stock-level.ts`,
  `production.ts`
- `lib/data` — server query helpers
- `lib/validations` — Zod schemas
- `lib/supabase` — browser / server / middleware clients
- `messages` — `az.json`, `ru.json`
- `supabase/migrations` — `001` schema, `002` RLS, `003` batches + production

## 7. Status / changelog

### Done — Landing redesign: "Kitchen ledger" paper editorial (no migration)
Full visual flip of the marketing site from the dark "AI SaaS template" look to an ownable
paper-ledger concept: warm paper canvas (`--pp-*` tokens), ink typography, hairline rules, mono
numerals, sharp 4px corners. Hero artifact is a **till receipt** (dotted leaders, dashed rules,
barcode, teal rubber **stamp** over the barcode, zigzag torn edge) instead of a product mock; steps
hang as **kitchen tickets** (punch-hole mask, alternating rotation) on a rail; features are a
**menu index** with dot leaders; problem list is a ledger with red ✗ indexes; CTA is an ink slab;
footer is a till-slip sign-off (`* * * rights * * *`). Section heads use `№ 01 — …` index rules
(left-aligned, asymmetric). Atmosphere = fixed ruled-paper lines + red ledger margin (hidden <640px).
- Class names `mk-page/mk-glass-dark/mk-card-d/mk-atmos/mk-progress` kept but restyled (nav + blog
  compat); blog pages' inline dark colors swapped to ink. Dark instrument-panel mockups retained as
  "exhibits" with technical corner ticks + `şək. 0N` captions. Reveal/marquee/CountUp machinery reused.
- New CSS: `.mk-receipt` (+zigzag ::after), `.mk-stamp` (turbulence mask), `.mk-ticket` (--a/--b),
  `.mk-lead/.mk-lead-dots`, `.mk-barcode`, `.mk-corners`. New i18n: `landing.receipt.*` (az/ru).
- Fixed: per-row `last:border-b` inside Reveal wrappers double-ruled lists → container draws the
  closing rule. Verified in browser preview (desktop 1100px full page, mobile 390px) + build green.
- `.claude/launch.json`: `autoPort: true` for stokly-dev (user's own server holds :3000).

### Done — Onboarding wizard + sales points as core + supplier price-tracking (no migration)
Three sequential phases turning captured purchase data into setup guidance + price intelligence.
- **Phase 1 — sales points are core.** Ungated multiple consumption (sales) points: `createLocation`
  / `setConsumptionPoint` / locations-manager no longer require the Pro `multi_location` feature, so
  any tenant sets up Kitchen, Bar, etc. and routes recipes to them. Owner-facing term relabelled
  "Satış nöqtəsi / Точка продаж". `multi_location` stays defined (can gate advanced per-location
  analytics) but no longer blocks point creation.
- **Phase 2 — guided onboarding wizard (`/app/onboarding`).** A resumable, skippable stepper: Sales
  points → Suppliers → Ingredients → Recipes (linked to a point) → First stock. Sales points /
  suppliers / ingredients add inline (`createLocation`, `createSupplier`, new `addIngredientQuick` —
  return results + `router.refresh`); recipes + first stock link to their full forms. Step completion
  is derived from data. The dashboard redirects a true first-run here; the Getting-Started card gained
  a "Continue setup" CTA. `TITLE_ALIASES['/app/onboarding']` + `nav.onboarding` ("Quruluş").
- **Phase 3 — supplier price-tracking report (`/app/reports/supplier-pricing`).** Pure analysis over
  purchase history (no migration), in `lib/calculations/supplier-pricing.ts`: a per-period **supplier
  comparison** per ingredient (avg/min/max/last, cheapest highlighted + potential saving), an all-time
  **monthly price trend** (seasonality, Recharts line), and **price-rise alerts** (latest delivery >
  moving average via `isPriceOutlier`) annotated with any over-target dishes the ingredient feeds
  (reusing `buildFoodCostRows`). Reports hub card + sidebar entry.

Verified in-browser on the demo: the wizard's 5-step rail renders and an inline "Bar" sales point was
created end-to-end (also confirms Phase 1's ungate); the report's comparison table + expandable
per-supplier breakdown + monthly trend chart render. The supplier ranking / savings / price-rise
alerts populate as multi-supplier + changing-price history accrues (the onboarding now drives that
capture). Build green each phase.

### Done — Dashboard recipe food-cost monitor + per-recipe target (migration 053)
A color-coded recipe food-cost analysis on the dashboard. Migration 053:
`tenants.default_food_cost_target` (numeric, default 30) + `recipes.target_food_cost_percent`
(numeric null override). New `components/dashboard/food-cost-monitor.tsx` (client, expandable) +
`food-cost-section.tsx` (server, streamed via Suspense; reuses request-cached
recipes/ingredients/recipeIngredients/movements). Each priced dish shows current food-cost % (badge
coloured by status vs its limit — green under, amber within 5pts, red over), the **limit** (recipe
target → tenant default), and the **gap** (current − limit) as an alert; rows sorted worst-first,
header shows an over-limit count. Expanding a row reveals a per-ingredient breakdown:
**previous → current unit cost + change %** (▲ red / ▼ green), sorted by cost contribution — so when a
dish's cost rises you see which ingredient drove it. Calc in `lib/calculations/food-cost-monitor.ts`
(`buildPriceChanges` = current `cost_per_unit` vs the most recent DIFFERENT delivery price;
`buildFoodCostRows` reuses `resolveRecipeCost`/`foodCostPercent`). Inputs: recipe form gained an
optional "Hədəf maya dəyəri %" field (`recipeSchema` + action); Settings gained "Standart hədəf maya
dəyəri %" (`updateTenant`). Bilingual az/ru. Verified in-browser on the demo tenant (monitor rows +
expanded breakdown screenshotted) + clean build.

### Done — Marketing: Product mega-dropdown nav + 4-column footer + legal/company pages (no migration)
Supy.io-style marketing chrome. **Nav** (`components/marketing/marketing-nav.tsx`) gained a
**"Məhsul / Продукт" mega-dropdown** listing the 10 product features (icon + label, 2-col grid,
desktop hover/click + mobile expandable); the AI item carries a "Tezliklə / Скоро" coming-soon badge
and doesn't link. The feature list is a shared `components/marketing/product-links.ts`
(`PRODUCT_FEATURES`) reused by the footer. **Footer** (`components/marketing/shell.tsx`) expanded from
one column to **four**: Product (the feature list), Resources (Blog, Necə işləyir, FAQ, Demo), Company
(About, Contact, Careers, Pricing), Legal (Terms, Privacy, Cookies). Added `MarketingShell` +
`MarketingDoc` (ledger-styled doc layout) to shell. **New (marketing) pages:** `/about`, `/contact`
(mailto + demo CTA), `/careers` (coming-soon), `/legal/terms`, `/legal/privacy`, `/legal/cookies`;
Pricing links to the landing `#pricing` section. Page prose lives in `lib/marketing-pages.ts` (az/ru,
legal copy is a starting template to review with counsel; contact email placeholder
`salam@stokly.app`). Bilingual labels under `landing.nav.product` / `landing.features.*` /
`landing.footer.*`. Verified in-browser (dropdown, footer, terms + careers render) + clean build.

### Done — Per-location stock done right: strict consumption + per-location counts + recipe routing (migrations 051–052)
Owner reported "waste doesn't deduct from Cari stok" and asked for per-location counts + an explicit
recipe consumption point. Root cause of the first: the **Anbar (receiving) → Mətbəx (consumption)**
split — deliveries land in Anbar, consumption deducts from the routed station, and migration 043 had
made the RPCs silently absorb any shortfall from **any** location (a cross-location fallback that
blurred per-location stock). Decision: **strict per-location + clear transfer UX** (not fallback).

- **Phase 1 — strict consumption (migration 051).** `confirm_daily_sales` / `record_waste` /
  `execute_production_run`: after FIFO at the routed station leaves a shortfall, if the ingredient
  has active stock at **another** location → `raise location_short` (the app prompts a transfer);
  only when nothing exists elsewhere is it absorbed as negative at the station (true oversell kept).
  `submitDelivery` lands new stock in the sole consumption point for single-station tenants (no
  Anbar stranding). Waste form shows the per-location split + an amber "move from X to Y" prompt with
  a prefilled transfer link; the transfer page accepts `ingredient/from/to/qty` query prefill. Sales
  confirm + waste map `location_short` → an actionable message. SQL-verified on a 2-location tenant
  (waste 500 with 499 in Mətbəx + 1 in Anbar → refuse; waste 10 → OK).
- **Phase 2 — per-location counts (migration 052).** `record_stock_count(p_lines)` counts ONE
  station at a time and reconciles that station's batches to the counted figure (FIFO-reduce a
  shortfall, add a costed batch for a surplus), recording a `count` movement carrying the **delta**
  with `from_location_id` = the station. `stock-level.ts` gained `case 'count'` (delta) in both
  reducers (legacy is_absolute counts still handled). Count form gained a **station selector**
  (hidden for single-location tenants); the shown on-hand is the selected station's; switching
  stations starts a fresh sheet. The batch-based inventory view + filter now reflect counts; the core
  invariant holds per station. SQL-verified: kitchen 499→8 leaves Anbar at 1, total 9.
- **Phase 3 — recipe consumption point always identified.** Recipe form shows the station picker
  whenever there are 2+ consumption points (dropped the separate multi_location gate) and defaults to
  the default station (no blank option); the action stores a **concrete** `consumption_location_id`
  (chosen-if-valid else default — never null).
- **Phase 4 — `QA-WALKTHROUGH.md`** added: a top-to-bottom manual test script (pre-flight, golden
  path, feature-by-feature, invariants, flaw hunt, admin) reflecting the above.

Migrations 051–052 applied live (`anbvxpoxdalizlsdcsdb`). Single-location tenants are behaviorally
unaffected (no "other location" to refuse against / no station selector). Known follow-up:
per-location *period reports* (period totals stay global for now).

### Done — Journals are home; entry forms are a "+ qeyd et" button (no migration)
Follow-up to the sidebar restructure: the standalone entry rows (İtki qeyd et, Satışlar, Alışlar)
are **removed** from the sidebar. Each **journal** page is now the single sidebar home for its
domain and carries a green **"+ qeyd et"** header action that links to its entry form:
- **İtki jurnalı** (`/app/data/waste`) → "İtki qeyd et" → `/app/inventory/waste`
- **Satış jurnalı** (`/app/data/sales`) → "Satış qeyd et" → `/app/sales`
- **Alış jurnalı** (`/app/data/purchases`) → "Alış qeyd et" → `/app/purchases`
- **Sayımlar** (`/app/data/counts`) → "Sayım et" → `/app/inventory/count` (added for symmetry)

New groups: **Anbar** = İnventar · Sayımlar · İtki jurnalı; **Satış / Alış** = Satış jurnalı ·
Alış jurnalı · Sifariş siyahısı. A shared `EntryLinkButton` (`components/data/entry-link-button.tsx`,
Plus icon + `Link`) renders the action via `PageHeader`'s `action` slot. Because the entry pages are
no longer `NAV_SECTIONS` rows, the top-bar title lost its prefix match → added `TITLE_ALIASES` in
`nav-items.ts` (locale-stripped path tail → `nav` key) and a lookup in `header.tsx` so `/app/sales`
→ "Satışlar", `/app/inventory/waste` → "İtki qeyd et", `/app/inventory/count` → "Sayımlar" resolve
correctly instead of falling back to the dashboard label. Waste entry-page title unified to "İtki
qeyd et" (`inventory.waste_log`) so the top bar and page heading match. Bilingual
`data.add_sale/add_purchase/add_waste/add_count` (az/ru). Verified: typecheck + lint + clean build
green, demo-login screenshot (button top-right, slimmer Satış/Alış group), puppeteer top-bar eval.

### Done — Sidebar restructure + waste naming unified (no migration)
The tenant sidebar was too long (11 flat rows across two extra sections HESABATLAR + MƏLUMATLAR).
Now everything related sits under ONE collapsible group inside ƏSAS, each entry page paired with its
journal:
- **Mətbəx:** İnqrediyentlər · Reseptlər · İstehsal
- **Anbar:** İnventar · Sayımlar · İtki qeyd et · İtki jurnalı
- **Satış / Alış:** Satışlar · Satış jurnalı · Alışlar · Alış jurnalı · Sifariş siyahısı
- **Hesabatlar:** Maliyyə · Yemək dəyəri · Anbar dəyəri · Dövr hesabatları · Stok yaşlanması · Menyu
  mühəndisliyi · Məkana görə
Collapsed (default) the nav is 8 rows; groups auto-open on the active route. The standalone
`reports`/`data` sections and `MƏLUMATLAR` are gone. **Naming fixed:** waste was split between
"Tullantı" (entry page) and "İtki" (everywhere else) — unified on **İtki** (`nav.waste_log` →
"İtki qeyd et", `inventory.waste_log` → "İtki", `log_waste`/`waste_log_empty` aligned); RU keeps the
correct domain split (списание = the act, потери = the metric). Mobile tab bar swaps the food-cost
report for **Satışlar** (the daily loop). Verified via the demo login (collapsed + expanded shots).

### Done — Unit-conversion UX 1–5 (no migration)
1. **Scoped unit pickers:** recipe-line unit selects offer ONLY units valid for the chosen
   ingredient (`allowedUnitsFor` = base + metric family + pack conversions) — the save-time
   `unit_error` became unreachable.
2. **Inline "+ conversion":** a "__add" option in the line-unit select opens an in-place popover
   (unit, factor, save) backed by the new `addIngredientConversion` plain-args action; the form
   merges the new factor into its options instantly (`extraConv` state in recipe-form).
3. **Live price preview** everywhere a factor is typed (popover, ingredient detail panel — new
   `unitCost` prop —, create-form rows): `1 şüşə = 0.75 l ≈ 9.00 AZN` — a backwards factor shows an
   absurd pack price immediately.
4. **Pack presets** (`packPresetsFor`): one-tap chips (şüşə 0.33/0.5/0.75/1 l, qab 5 l, bağlama
   10/25 kq) converted into the ingredient's own base unit, shown in all three conversion editors.
5. **Buy in pack units:** delivery lines gained a unit select (base + conversions); qty+price are
   entered per pack, converted on submit (qty×factor, price÷factor) with a live "= 1.5 l ·
   12 AZN/l" hint; the price-variance chip compares per-BASE cost. RUNTIME-PROVEN: bought 2 şüşə
   of e2e olive oil → stored movement exactly +1.5 l @ 12 AZN/l. Full e2e (58 checks) re-run green;
   the driver's line-unit targeting now keys on the `__add` marker.

### Done — Tenant polish batch: feedback, create-time conversions, tables, import, e-mail reports (no migration)
- **SubmitButton** now shows a spinner during every save (global; pairs with the existing
  pendingText). Forms that stay in place keep their inline ✓/error states.
- **Unit conversions at CREATE:** the new-ingredient form has a conversions editor (rows are
  serialized into a hidden `conversions` field; `createIngredient` upserts them with the insert) —
  no more "save first, then add conversions".
- **Tables:** recipes + inventory gained name search (recipes keeps type/category filters);
  ingredients list got client pagination (50/row pages). Deep browsing stays in `/app/data/*`.
- **Import fixed + proven:** `normalizeUnit` now accepts the app's own label format ("Litr (l)",
  "Kiloqram (kq)", bare "litr/грамм") and yield strips a trailing `%` ("90%" was rejected while the
  header says "(%)"). Round-trip test `scripts/verify-import.ts` (xlsx → parser → mapped rows,
  comma decimals, bad-row rejection) — ALL PASS.
- **E-mail reports to the owner:** `sendEmail` (Resend) in lib/email/notify.ts +
  `emailPeriodReport` action + an **"E-poçtuma göndər"** button on the period report (spinner,
  sent ✓ / error / "RESEND_API_KEY not configured" states). Owner gets period results by mail even
  when managers run the dashboard. Set `RESEND_API_KEY` (+ verified sender) in prod.
- **Counting re-verified end-to-end:** e2e extended with a SECOND (closing) count — 58 assertions
  ALL PASS: period chaining, non-baseline counts stamped end-of-day, report usage math (romaine
  0.5 kq = 0.3 sold + 0.2 shrink), derived levels follow the absolute count. Noted by design:
  same-day periods have no sales window (theoretical variance engages across days).

### Done — Dashboard UX: streamed, decluttered, habit-first (no migration)
The owner dashboard now **streams**: the shell (hero greeting + quick actions + range selector)
paints from 4 cheap lookups; the KPI band, panels and ops widgets arrive via three `<Suspense>`
sections (`components/dashboard/dashboard-sections.tsx`) with skeleton fallbacks + a matching
`loading.tsx`. The 6 hottest read helpers (`getIngredients/getRecipes/getRecipeIngredients/
getStockMovements/getActiveBatches/getTenant`) are wrapped in React `cache()` so parallel sections
share one fetch per request. Decluttered: the redundant PageHeader title/buttons are gone — the
greeting IS the header (business name in brand color, streak chip right); a **quick-action row**
(visible on mobile too) leads with the daily habit **"Satış daxil et"** (primary, filled) +
count/purchases/waste; the **attention strip moved above the panels**. Delight: `.card-stagger`
entrance animation (50ms steps, reduced-motion safe) on KPI + panel grids. New i18n
`dashboard.qa_sales` (az/ru). Verified visually via the demo login (social-shots/dashboard-full.png).

### Done — DB review hardening (migration 050, applied live)
Full 14-table review against the live schema (all "text" status columns turned out to be
**text + CHECK** — values are DB-enforced everywhere; pattern kept deliberately over enums).
Two real fixes shipped:
- **blog_posts `archived`** added to the status CHECK — a published post can now be unpublished
  without deletion (public pages filter `status='published'`, so archived auto-hides; re-publish
  restores). Editor select + admin list badge + `admin.blog.archived` i18n (az/ru); BlogPost type widened.
- **daily_sales_items UNIQUE now (daily_sales_id, recipe_id, is_comp)** — was (day, recipe), which
  made a dish either ALL paid or ALL comp per day; "3 sold + 1 staff meal" of the same dish is now
  representable (UI entry for split lines is a future follow-up; aggregations already sum correctly).
Notable non-changes (deliberate): production_runs.storage_location is a vestigial free-text column
(locations now route via location_id) — left in place; count_periods allows same-day duplicate
periods (correction flow) — left; tenant roles owner/manager/staff + platform super/readonly are
already CHECK-constrained.

### Done — E2E business-logic verification through the REAL UI + 3 fixes (no migration)
`scripts/e2e-verify.ts` drives a FRESH tenant with puppeteer through every flow like a user
(51 assertions vs hand-computed numbers, DOM + SQL cross-checked; screenshots in
`social-shots/e2e/`): login/onboarding → 5 ingredients (form) → şüşə→l ×0.75 conversion (panel) →
day-0 count (pre-count gate ✓ → lands on its period report ✓) → delivery (+batches, last-price
cost refresh ✓) → prep recipe **2000 q + 500 q → 10 porsiya** (live cost 17.70 ✓ q→kq conversions ✓)
→ İstehsal (template auto-fills **2 / 0.5 kq base units** ✓, rolled-up 1.77 ₼/porsiya ✓) → dishes
(prep×1 wrapper + **Sezar with prep×0.5 + raw lines incl. 20 ml→l**, live 2.92 ✓) → sales confirm
(preview shows PREP −4, **no raw toyuq** ✓; levels 6/13/3.7/0.94/1.96 ✓; batches==derived ✓) →
waste → inventory page + dashboard (45.00 ✓) → **void** (full restoration ✓) → re-sell incl. the
prep **sold DIRECTLY ×2** → prep 3, raw untouched, day 61.00 ✓. ALL CHECKS PASSED.
Fixes shipped from findings:
1. **Day-0 trap:** the baseline count was stamped end-of-day, erasing ALL same-day activity
   recorded after it (delivery +5 vanished from derived). Baseline (first) count now stamps at
   NOW (= opening stock); later counts keep end-of-day closing semantics.
2. **Preps sellable directly (the nuggets case):** sale price enabled for Yarımfabrikat; sales
   pickers include preps with a price; `computeTheoreticalUsage` deducts a directly-sold stocked
   prep's produced ingredient 1:1 (no raw recursion, no serving-size division).
3. **İstehsal required fields:** output + quantity now `required` (empty submit previously failed
   only with a generic server error).
Open findings (not fixed): fresh tenants have ZERO waste categories and no UI to create them
(e2e had to seed one); İstehsal's ÇIXIM % mixes units (porsiya out / kq in → 400%) — cosmetic.

### Done — Brand: Stokly ✳ logo suite + favicon/OG + Instagram handoff kit (no migration)
The de-facto asterisk identity is now a real logo: **`components/brand/logo.tsx`** — `StoklyMark`
(six rounded spokes, 8° hand-stamp tilt, drawn as paths not a font glyph) + `StoklyLogo` lockup
(tones ink/paper/brand, sizes sm/md/lg). Swapped into all 9 wordmark touchpoints (marketing nav,
footer, hero receipt; tenant sidebar + mobile header; admin sidebar, header, drawer, login).
- **Icons:** `app/icon.svg` (favicon: ink tile + teal ✳), `app/apple-icon.png`,
  `app/opengraph-image.png` (1200×630 ruled-paper card: lockup + mono tagline + Hesablandı stamp);
  `public/brand-mark.svg`. `metadataBase` set from **`NEXT_PUBLIC_SITE_URL`** (set it in prod —
  remaining build warnings are the root image-route stubs, cosmetic).
- **`scripts/render-brand.ts`** (puppeteer + installed Chrome) regenerates all brand PNGs incl. IG
  kit in `social-shots/brand/` (profile tiles 1080², lockups, transparent marks). Screenshots in
  `social-shots/` re-captured with the new logo.
- **`marketing/instagram-brief.md`** — a self-contained, paste-ready prompt for a separate
  content-design chat: true product facts (no invented metrics; demo-data honesty rules), full
  brand system (hex/fonts/motifs/voice), asset inventory, IG formats, 5 content pillars, the first
  9-post grid, caption formula (AZ+RU) + hashtag bank, per-post output spec.

### Done — Admin lifecycle gaps closed: paid expiry, auto-churn, payment dedupe (migration 049)
The three real holes from the admin business-logic audit are fixed — **migration 049 applied live**:
- **`subscription_sweep(p_paid_grace_days=7, p_churn_after_days=30)`** (SECURITY DEFINER; service_role
  or platform admin): (1) ACTIVE tenants on a paid plan whose latest payment coverage
  (`max(coalesce(period_end, paid_at::date))`) lapsed > grace days → **suspended** + `payment_overdue`
  notification (tenants with NO payments are left alone — manual arrangements); (2) tenants
  **suspended > 30 days with no payment since** → **churned** (+ new `auto_churned` notification
  type) — `churned` is no longer a ghost state. Any payment still reactivates (042 trigger).
  Wired into the cron route after the trial sweep.
- **Payment replay guard:** unique partial index on `manual_payments(tenant_id, reference)` —
  a double-entered transfer can't double-count MRR or re-fire the upgrade trigger.
- **True MRR:** `getMRRMetrics` now spreads each payment evenly across the months of its
  [period_start, period_end] (24-month cap), instead of spiking the banking month.
- **Impersonation TTL:** god-mode cookie expires after 4 h.
- **Verified live (BEGIN/ROLLBACK, impersonated admin):** lapsed-paid → suspended ✓; 40-day
  suspended → churned ✓; payment after churn → active ✓; duplicate reference rejected ✓; second
  sweep idempotent ✓. First real cron run affects **0** current tenants (checked).

### Done — Correctness sweep: ingredients, recipes/preps, unit conversions (no migration)
Audited the whole add-ingredient → build-recipe → sell pipeline; six bugs found and fixed, proven
by `scripts/calc-audit.ts` (21 assertions against the REAL calc modules — run
`npx -y tsx scripts/calc-audit.ts`):
- **Batch-dish semantics unified — sale_price is per SERVING.** `computeRecipesWithCost` and the
  live `RecipeCostSummary` now compute food-cost % (and the suggested price) from **cost per
  serving**, matching menu engineering; `computeTheoreticalUsage` divides the sold qty by
  `serving_size`, so selling 1 serving of a 4-serving batch deducts ¼ batch (was: full batch per
  serving, and % inflated ×size). Live DB had **0** batch dishes/sales ⇒ no historical distortion.
- **Production template conversion:** `production/new` now converts template lines to each
  ingredient's base unit (`toBaseUnit`) — a 200 q line on a kq item pre-fills 0.2, not 200.
- **Sub-recipe line unit locked** to the prep's `serving_unit` in the editor (was free text; the
  math always meant "servings of the prep").
- **`createIngredient` now persists `par_level`** (insert dropped it; update had it).
- **Server-side recipe guards:** sub-recipe lines must reference the tenant's own `is_sub_recipe`
  recipes and never the recipe itself; demoting a referenced prep to a dish returns `in_use`
  (i18n `recipes.in_use_error` az/ru).
- Cleared the long-standing duplicate-dep lint warning in recipe-form (lint now fully clean).

### Done — Landing pricing section: the "menu card" (№ 07, no migration)
Pricing rendered as a printed **price menu** in the ledger concept: double-rule frame, centered
"STOKLY ✳ 2026 / Qiymət menyusu" header, courses with dot leaders — **Sınaq … 0 ₼ [14 gün]** and
**Standart … 99 ₼ /ay** (matches the live `plans` table: trial 0/14d, normal 99 AZN; legacy plans
inactive) — ✳ ✳ ✳ course dividers, teal "Tövsiyə olunur" stamp on Standart, 4-item includes list,
dashed-rule footer with ink CTA → `#demo` (no self-serve signup; demo form starts the trial) +
"kart tələb olunmur" note. Placed between testimonials and demo; demo→№ 08, FAQ→№ 09; nav gained
"Qiymət/Цены". New i18n `landing.pricing.*` (az/ru). **Prices are marketing copy — keep in sync
with the `plans` table if admin edits them.** Verified in preview (1100px + 390px); build green.

### Done — Dashboard engagement pass (no migration)
The owner dashboard got the "want to open it every morning" layer: a client-side **time-of-day
greeting** with the business name + a **sales-recording streak chip** (🔥 `{n} gün ardıcıl qeydiyyat`,
shown from 2+; `getSalesStreak` counts consecutive `daily_sales` days back from today/yesterday,
90-day cap). KPI values **count up** on load (`AnimatedNumber`, hydration-safe deterministic
formatting, honors reduced-motion); KPI cards lift on hover; the sales trend chart gained a dashed
**period-average reference line** + a deeper-teal **best-day bar**; danger attention chips pulse.
Files: `components/dashboard/{greeting,animated-number,sales-trend-chart,overview-panels}.tsx`,
dashboard page, `overview.ts` (+`getSalesStreak`), `dashboard.greeting_*`/`streak_n` i18n (az/ru).

### Done — Owner's overview, Phase 1: period KPI band + daily sales trend (no migration)
The tenant **dashboard** is now the owner's at-a-glance command center. A period selector
(7 gün / 30 gün / Bu ay / Keçən ay, default Bu ay) drives a 6-KPI band — **Gəlir, Yemək dəyəri %,
Brüt mənfəət, Alışlar, İtki, Anbar dəyəri** — each with a delta vs the previous equal-length window,
plus a daily-sales bar trend. KPIs reuse the period-report engine (`computePeriodReport`) over a
rolling range; no new costing logic, no migration.
- **New `lib/data/overview.ts`:** `resolveRange`/`previousRange` (UTC, inclusive) + `getOverview`
  (reuses already-loaded movements+ingredients; opening = stock at start of `from`, closing = end
  of `to`; revenue/COGS/food-cost %/gross-profit/purchases/waste/inventory). Daily sales gap-filled.
- **UI:** `components/dashboard/range-selector.tsx` (`?range=` query param) + `sales-trend-chart.tsx`
  (Recharts bar, brand `fill-primary`). Dashboard renders the band + trend above the existing
  operational widgets (recent movements / low stock / expiry). Old 4-metric row removed (subsumed).
- **i18n:** new `overview.*` namespace (az/ru). Verified green (typecheck/lint/build); dashboard is
  auth-gated so not previewable headless.
- **Phase 2 (shipped):** three drill-down panels under the trend — **top dishes by paid revenue**
  (daily_sales_items × unit_price, comps excluded), **spend by supplier** (aggregated getPurchaseLog),
  **waste by reason** (aggregated getWasteLog, reversed excluded) — plus a clickable **attention
  strip** (low stock, expiring, oversold/negative, missing-sales days). New `getOverviewPanels` +
  `components/dashboard/overview-panels.tsx`. Next: filterable/sortable/paginated explorers
  (sales/purchases/waste/counts), then a finances summary.
- **Phase 3 (shipped):** reusable `components/data/data-explorer.tsx` — free-text search, click-to-sort
  headers (desc→asc→off), pagination — driven by client column defs (accessor/render closures can't
  cross the server boundary). New owner **Data** nav section (`nav.section.data`) with **Satış jurnalı**
  (`/app/data/sales`: date/dish/qty/price/total/comp) + **Alış jurnalı** (`/app/data/purchases`:
  date/ingredient/supplier/qty/unit-cost/value). Server pages date-window via the range selector;
  `getSalesLog` added to `queries.ts`. Next: waste + stock-counts explorers, then finances summary.
- **Phase 4 (shipped):** **İtki jurnalı** (`/app/data/waste`: date/ingredient/category/qty/value +
  reversed status; range-windowed) and **Sayım nəticələri** (`/app/data/counts`: each count period's
  headline — dates, days, sales, food-cost % badge, waste, net variance, missing-sales flag — every row
  opens its period report). New `getCountRows` (counts.ts) reads each period's stored `report_data`;
  the counts list is NOT range-windowed (discrete events). Next: finances summary + gating polish.
- **Phase 5 (shipped):** **Maliyyə** (`/app/data/finances`) — a P&L statement over the selected range
  with this-period vs previous-period columns: revenue, COGS, gross profit (+margin), purchases, waste,
  inventory opening→closing→change, plus hero cards (revenue, gross profit, gross margin %, food cost
  %). Reuses `getOverview` (added `inventoryOpening`). Nav **Data** section finalized
  (sales · purchases · waste · counts · finances). **Gating decision:** the owner data hub is
  deliberately **ungated** — owners get full visibility per the explicit ask; existing plan gates still
  govern the separate Pro report pages. Whole workstream is app-layer only — **no migration**.

### Done — Stocked preps (Yarımfabrikat): correct two-stage production (migration 048)
Preps now consume **raw at production** and deduct as **their own stock at sale** (not exploded to
raw on every sale). Built on the existing produced-ingredient + production-run machinery; default
is stocked, made-to-order is opt-in. Migration 048 + app-layer; verified end-to-end via deployed
RPCs under BEGIN/ROLLBACK (produce 5 raw → 10 prep @ rolled-up cost; sell 3 → prep 7, **raw
untouched** = no double-deduct).
- **048:** `recipes.produced_ingredient_id` (→ ingredients, SET NULL). Stocked ⟺ linked;
  made-to-order ⟺ null.
- **Authoring:** recipe form shows a **Stocked** toggle for preps (default ON). On save,
  `resolveBackingPrep` (recipes/actions.ts) find-or-creates the backing produced ingredient (holds
  the prep's batches) and sets the link; toggling off unlinks (keeps the ingredient). Existing
  sub-recipes stay null → unchanged. Backing preps hidden from the recipe **raw** picker.
- **Seam (the fix):** `explode()` (theoretical-usage), `resolveRecipeCost` (recipe-cost) and
  `recipe-builder` subRecipeOptions cost — a sub-recipe line whose recipe is stocked **deducts/costs
  the produced ingredient (qty×line.qty), no raw recursion**; cost falls back to the raw recompute
  until the prep has a production cost. `getDayConfirmPreview` + the usage snapshot inherit it. The
  double-count guard = raw only at production, prep only at sale.
- **Production scaling:** picking a prep template sets output = its backing ingredient and scales
  inputs by `N / serving_size` (was 1:1). Reuses `execute_production_run`.
- **Surfacing:** Preps panel on /app/production — on-hand, cost/serving, last yield, nearest expiry
  (`getPreps`). Bilingual recipes.stocked* + production.prep* keys.
- **Counts** still reconcile via the raw-equivalent card (5 kg raw + 10 portions ⇒ 10 kg). Selling a
  stocked prep with no production drives prep stock negative (the red flag), not a silent raw explode.

### Done — Tenant UX round (9 owner requests, migrations 046–047)
1. **Dashboard:** the Getting-Started card now renders ABOVE the dashboard (never
   replacing it) and lost the business-type chooser + ingredient import/library/
   QuickAdd bits; the guided tour + recipe/count shortcuts + dismiss remain.
2. **Ingredient form alignment:** multi-column cells are flex columns with controls
   pinned `mt-auto`, so wrapped labels no longer push inputs out of line.
3. **Recipe live cost fixed:** the form's "Ümumi dəyər" multiplied raw qty × cost
   (100 q of a 5 AZN/kq item showed 500). `IngredientOption` now carries
   `unit_conversions`; the live total uses `toBaseUnit` — identical to the server calc.
4. **Inventory per location:** location filter on the inventory table (per-location
   qty, status, batches); purchases→transfers reflect since it reads active batches.
5. **Sidebar:** ƏSAS regrouped into collapsible Mətbəx (ingredients/recipes/
   production), Anbar (inventory/waste), Satış/Alış.
6. **Recipe categories (046):** `recipe_categories` + `recipes.category_id`
   (SET NULL); manage dialog on recipes page; category select on the form; section
   filters on the recipes list AND menu-engineering + food-cost reports (?category=).
7. **Suppliers editable:** `updateSupplier` + pencil-to-edit side panel.
8. **Preps raw-equivalent (counts reconcile):** `computeRawEquivalents` derives
   per-unit composition from production history (Σ inputs / Σ output per pair) and
   explodes prepped stock back to raw — inventory page card shows direct + in-preps
   = total (5 kg chicken + 10 portions nuggets ⇒ 10 kg). Verified end-to-end via the
   deployed `execute_production_run` under BEGIN/ROLLBACK. Single-level (prep-in-prep
   not recursed, v1).
9. **Comps / staff meals (047):** `daily_sales_items.is_comp` — comp lines deduct
   stock (usage/confirm unchanged) but add ZERO revenue; editor has a per-line Komp
   toggle (same dish can be paid + comp); footer + month cards show comp value
   separately; `getSalesMix` (menu engineering) counts paid units only. Sales page
   gained month-at-a-glance cards (revenue, days + daily avg, comp value).

### Done — Six operational gotchas (audit + remediation)
Audited the app against an owner-supplied "blueprint" of 6 restaurant-inventory gotchas.
**#5 (fat-finger idempotency)** and **#6 (yield)** already passed (void→re-confirm; recipe-
explosion yield is math-equivalent to transfer-time yield). The other four were closed in 4
sequential steps (migrations 043–045 + app), each build-green + live-migrated + DB-verified:
- **#3 count business date (Step A, code-only):** stock-count form takes a required Business
  Date; the count movement's `created_at` is stamped end-of-day of that date and
  `createPeriodForCount` closes the period on it (guarded: after the prior period, not future).
- **#1 negative stock (Step B, mig 043):** `confirm_daily_sales`/`record_waste`/
  `execute_production_run` no longer block on a shortfall — they absorb it on the newest batch
  (quantity_remaining goes negative, stays active), preserving Σ-batches==deriveStockLevel while
  stock shows negative. `deriveStockLevel`/`deriveAllStockLevels` no longer clamp to 0; a new
  `negative` StockStatus → red badge + red qty (inventory/ingredient tables + dashboard widget).
- **#4 immutable history (Step C, mig 044):** `daily_sales_theoretical_usage` snapshots each
  confirmed day's exploded per-ingredient usage (written in confirmDailySales, cleared on void);
  the period report sums the snapshot for fully-covered windows, falling back to live recompute
  only for pre-feature days. A recipe edit no longer rewrites past reports (actual COGS was
  already immutable).
- **#2 base-unit + pack conversions / B4 (Step D, mig 045):** `ingredient_unit_conversions`
  defines e.g. 1 şüşə = 750 ml for an ml-based ingredient. `toBaseUnit` consults metric families
  then per-ingredient factors (kills the silent same-unit fallback); `getIngredients` attaches
  `unit_conversions` so `computeRecipesWithCost`/`computeTheoreticalUsage` convert exactly. A
  conversions editor sits on the ingredient page; recipe save rejects (`unit` error) any line
  whose unit has no path to the base. Buying-by-the-case in deliveries is a noted follow-up.

### Done — Admin total control over the tenant lifecycle
The platform admin can now drive every real-world transition from `/admin/tenants/[id]`,
with full visibility — closing the gaps left after the trial-suspend work. App-layer only
(no migration); admin writes use the migration-008 RLS override.
- **Visibility:** a Lifecycle panel on the tenant page shows **trial end + days-left /
  "expired N days ago"** and the **suspended-on** date (data was already on the row).
- **Flexible trial** (`setTrialPeriod`, replaces the fixed `extendTrial`): quick +14/+30,
  custom days, or an exact end date; relative math anchors on **max(now, current end)** so
  extending a lapsed trial always lands in the future; always (re)sets `status='trial'` +
  clears `suspended_at`, so it doubles as **Grant/revive trial** from any status. New
  `TrialDialog`; the control is always shown ("Extend trial" / "Grant trial").
- **Tier swap = real activation** (`changePlan`): moving to a paid plan sets `active` +
  clears `suspended_at` from **any** status (suspended tenant → Standart = back in);
  downgrade to trial seeds a fresh end date if missing/past.
- **Reach any transition:** reactivate offered for suspended/churned, suspend for
  active/trial, in both the detail action bar and the tenants-list row menu (threaded
  `trial_ends_at` through `TenantRow`). `recordPayment` still reactivates via the 042 trigger.
- Bilingual `admin.tenant_detail.*` keys. Verified: typecheck+lint+build green; BEGIN/ROLLBACK
  sanity on the net writes (expired-trial extend → live trial; suspended → Standart → active).

### Done — Two-plan subscription + trial → auto-suspend → pay-to-reactivate
Collapsed the 5-tier ladder to just **`trial` + `normal` (Standart, 99₼/mo)**, both
including **every** feature — the feature-flag infra stays (gates are now always-true
no-ops). The trial is time-limited (14 days); when it elapses the account is
**suspended, not deleted**, and blocked from `/app/*` until a payment reactivates it.
- **041 (two plans):** add `normal`; `plan_features` all-included for trial+normal
  (also fixed `report_inventory_value` being gated off every plan); migrate tenants
  off removed tiers; **deactivate** (not delete) starter/professional/growth/enterprise
  so historical `manual_payments`/activity FKs survive. `PlanKey = 'trial' | 'normal'`;
  `PLAN_COLORS` + revenue payment-dialog default → `normal`. `/admin/plans` +
  create-business are DB-driven → auto-show the 2 active plans.
- **042 (reactivation):** re-created `on_payment_recorded` so **any** payment clears a
  suspension/churn (reactivate-first, before the existing higher-rank upgrade branch,
  so a same-rank `normal`→`normal` payment also revives a suspended tenant).
- **Enforcement (the missing piece):** `requireTenant` now fetches tenant status,
  **lazy auto-suspends** an elapsed trial on load, and redirects suspended/churned/
  deleted members to **`/app/suspended`** (admin impersonation exempt; `status` added to
  `TenantContext`). New `app/[locale]/app/suspended/page.tsx` (OUTSIDE `(protected)` → no
  loop): card with the Standart plan + price, contact line, sign-out. `/api/admin/cron`
  also bulk-suspends elapsed trials via the service role (catches tenants who never log
  in). Bilingual `suspended.*` az/ru.
- Verified: live SQL (2 active plans, every feature true, no stranded tier); BEGIN/
  ROLLBACK e2e on throwaway + the real tenant (trial-expire → cron-suspend → pay →
  active/normal, suspended_at cleared) — real tenant untouched; typecheck+lint+build
  green. Migrations 041–042 applied live.

### Done — Multiple consumption points (Bar + Kitchen)
A venue can run several consumption points (e.g. a Bar drawing down its own stock, separate
from the Kitchen). Shipped in 6 phases (migrations 036–039), gated by the new `multi_location`
feature (Professional+/trial; Starter excluded); basic locations + transfers stay free.
- **Schema (036, 039):** `storage_locations` gained `kind` (kitchen/bar/prep/storage/
  cold_storage/freezer/receiving), multi-valued `is_consumption_point`, and one
  `is_default_consumption` per tenant — replacing the single `is_kitchen` (since dropped).
  `recipes.consumption_location_id` (ON DELETE SET NULL) routes a dish to a point.
  `default_consumption_location()` helper; `handle_new_tenant` seeds kind + flags.
- **Routing RPCs (037):** `confirm_daily_sales` (`p_usage` gains per-line `location_id`),
  `record_waste` (`p_location_id`), `execute_production_run` (`p_input_location_id`) FIFO from
  a parameterized location (coalesce → default); error generalized to `location_short:<loc>:<ing>`;
  no-batch fallback preserved; void/reverse unchanged (restore by batch_id). Old single-kitchen
  overloads dropped.
- **App (P4–P5):** locations manager (kind selector + consumption-point/default-consumption
  chips + presets; 2nd point gated by `multi_location`); recipe form consumption-location
  picker (dishes); `confirmDailySales` partitions sold items by recipe location, emits
  per-(ingredient, location) usage; `getDayConfirmPreview` mirrors it (per-location
  availability, `DayConfirmPreviewLine.location_name`); waste + production location selectors;
  `getConsumptionPoints` helper.
- **Reporting (P6):** `/app/reports/by-location` (gated) — stock value + period sales/waste per
  consumption point. Bilingual az/ru throughout; each phase typecheck+lint+build green; migrations
  036–039 applied + verified.
- **Follow-ups:** surface `location_name` per line in the sales confirm UI (data already flows);
  the admin `hardDeleteTenant` ordered-delete bug (found during the DAD House cleanup) is still open.

### Done — Tier C6: menu engineering report
Classify priced menu items by popularity × profitability into stars / plowhorses /
puzzles / dogs. No migration — reuses sales mix + recipe cost.
- Pure calc `lib/calculations/menu-engineering.ts`: popularity = units_sold ÷ total;
  contribution margin = sale_price − plate_cost; "high" = at/above the median of each;
  4-quadrant classification + per-class counts.
- `getSalesMix(tenant, from, to)` in `lib/data/queries.ts` (units sold per recipe from
  itemized daily sales); plate cost from `computeRecipesWithCost` (costPerServing).
- `/app/reports/menu-engineering`: date-range filter + class-count cards + per-item table
  (sold, popularity %, plate cost, price, margin, class badge) + a legend with the
  recommended action per class. Reports-index card + nav entry (Grid2x2).
- Bilingual az/ru (`menu_eng.*`). typecheck + lint + build green.

### Done — Tier C1/C2/C3: period KPIs (turnover, days-on-hand, waste %)
Surfaced on the period report — no migration, no report regeneration (derived purely from
the stored `PeriodReportData`).
- Pure `computePeriodKpis(data)` (`lib/calculations/period-report.ts`): inventory turnover
  = COGS ÷ avg inventory value (avg = (opening+closing)/2); days-on-hand = avg ÷ COGS ×
  days_in_period; waste % = waste_value ÷ COGS. Null-safe when COGS/inventory is zero.
- A "KPI" card row added to `period-report-view.tsx` (turnover ×, days-on-hand, waste %).
- Bilingual az/ru (`report_period.turnover` / `days_on_hand` / `waste_percent` /
  `kpis_title`). typecheck + lint + build green.

### Done — Tier C5: stock aging report
Inventory aging + value-at-risk. No migration — reads active `ingredient_batches`.
- Pure calc `lib/calculations/stock-aging.ts`: active batches bucketed by age
  (`today − received_date`) into 0–7 / 8–30 / 31+ day bands, value per band, and an
  at-risk total (31+ band OR near-expiry ≤7d). Deterministic (`nowMs` arg).
- `/app/reports/stock-aging`: band value/count cards + at-risk card, then grouped tables
  (oldest band first) with per-batch age, value, and a near-expiry highlight. Reports-index
  card + nav entry (Hourglass).
- Bilingual az/ru (`stock_aging.*`). typecheck + lint + build green. No entitlement gate yet
  (no feature key — available to all, like the period report).

### Done — Tier B3: sub-recipe yield %
A batch sauce/stock loses volume in prep, so usable output < raw input. `recipes.yield_percent`
(migration **035**, applied live; 0–1 fraction, default 1 = no change).
- `subRecipeUnitCost = batchCost / (serving_size × yield_percent)` (`lib/calculations/recipe-cost.ts`);
  `theoretical-usage.ts` `explode` divides sub-recipe consumption by `(serving_size × yield_percent)`
  so a lossy batch consumes proportionally more raw.
- Recipe form: a yield % field shown for sub-recipes (default 100); `recipeSchema` takes a 0–100
  percentage, the action stores a 0–1 fraction. `recipes` Row/Insert types updated.
- Bilingual az/ru (`recipes.yield`, `recipes.yield_hint`). typecheck + lint + build green; migration
  035 verified (column numeric/nullable/default 1 + BEGIN/ROLLBACK write test).

### Done — Tier B2: supplier price history + receiving price-variance
Receiving cost control. No migration — built from existing `delivery` movements
(`unit_cost` / `supplier_id` / `created_at`).
- Pure calc `lib/calculations/price-variance.ts`: `PriceStat` (last cost + moving avg of
  the last 5 deliveries + count), `priceVariance = (cost − avg)/avg`, `isPriceOutlier`
  (>10%). Usable both server- and client-side.
- Data `lib/data/queries.ts`: `getIngredientPriceStats` (per-ingredient stats keyed by id,
  for the form) + `getIngredientPriceHistory` (one ingredient's deliveries + supplier names
  + stat, for the panel).
- **Price-history panel** (`components/ingredients/price-history-panel.tsx`) on the
  ingredient detail/edit page: last / avg / delivery-count cards + a per-delivery table
  flagging each purchase's % vs the average (amber above, green below).
- **Receiving variance chip** on the purchase form: each line shows the selected
  ingredient's last/avg price and, when the typed `unit_cost` deviates >10% from the moving
  average, a ↑/↓ chip. `DeliveryForm` gained a `priceStats` prop; the purchases page feeds
  it `getIngredientPriceStats`.
- Bilingual az/ru (`price_history.*`). typecheck + lint + build green.
- Note: §9 said "extend `getPurchaseLog` with last/avg"; delivered as the dedicated
  price-history panel + form chip instead (clearer surfaces than per-row log stats).

### Done (code) — Tier B1: par levels + build-to-par shopping list
Build-to-par planning. `ingredients.par_level` (migration **034**) is the *target* to top
stock up to; `low_stock_threshold` stays the *reorder trigger*. **Migration 034 applied
live** — `par_level` verified numeric/nullable on the live DB + a BEGIN/ROLLBACK write
test passed (set/read/rollback, nothing persisted).
- **Shopping list** `/app/purchases/shopping-list` (new child in the Satış/Alış nav group):
  every ingredient below par OR at/below its reorder threshold, with `suggested_qty =
  max(0, par − on_hand)`, last paid cost (newest delivery → est. line cost), grouped by
  supplier with per-supplier subtotals; urgent (below-threshold) items flagged + sorted
  first. Empty state when everything is at/above par.
- **Create purchase from list** → `/app/purchases?prefill=id:qty,…`; `DeliveryForm` gained
  an optional `initialLines` prop that seeds its lines (defaulting unit cost + supplier per
  ingredient). A global "create purchase" CTA + per-supplier "order these" links.
- Pure calc `lib/calculations/shopping-list.ts` (`computeShoppingList`); data assembly
  `getShoppingList` in `lib/data/queries.ts` (on-hand via `deriveAllStockLevels`, last cost
  from each ingredient's newest delivery movement). `par_level` added to the ingredient form
  (hint distinguishing target vs. minimum), the Zod schema, the create/update actions, and
  `types/database.ts`.
- Bilingual az/ru (`nav.shopping_list`, `ingredients.par_level*`, `shopping.*`). typecheck +
  lint + build green; the `purchases/shopping-list` route compiles.

### Done — data-integrity round (production, unit conversions, expiry write-off)
Researched real restaurant back-of-house best practice (procurement → receive → store
→ kitchen → prep/batch → sell → waste → count → cost/variance) and audited our logic.
Core loop was solid; fixed the three correctness gaps that silently drift stock/COGS:
- **Stock reducer** (`stock-level.ts`): now handles `production_input` (−), `production_output`
  (+) and `expiry_writeoff` (−) (transfer stays a no-op). Period report buckets production
  (produced as inbound, raw-into-production excluded so cost isn't double-counted).
- **Production / prep (full)** — migration **032** `execute_production_run` (atomic, kitchen
  FIFO inputs → produced batch with rolled-up cost + shelf-life expiry + actual yield;
  refreshes the produced ingredient's cost) + `void_production_run`. New `/app/production`
  list + `/app/production/new` form (recipe template pre-fills inputs, live cost/yield).
  Verified: 5 kg chicken etc. → 4.2 kg nuggets @ 4.976 cost, yield 73.7%, invariant holds;
  void restores it.
- **Unit conversions (v1)** — `units.ts` metric families (kq↔q, l↔ml) + `toBaseUnit`,
  applied in `recipe-cost` + `theoretical-usage` so a recipe written in `q`/`ml` for a
  `kq`/`l` ingredient now costs/depletes correctly. Per-ingredient custom (piece/pack)
  conversions deferred to Tier B (not shipped half-wired).
- **Expiry write-off** — migration **033** `write_off_expired` + a "N expired — write off"
  panel on the inventory hub. Expired batches now actually leave inventory/COGS.
- Bilingual az/ru; typecheck + lint + build (92 pages) green; engines smoke-tested via
  BEGIN/ROLLBACK. **Deferred roadmap** (documented in the plan): Tier B (par/build-to-par
  + suggested order, supplier price history/variance, sub-recipe yield, custom units) and
  Tier C (turnover, days-on-hand, waste %, prime cost, stock aging, menu engineering).

### Done — Satış / Alış nav dropdown + Alışlar (purchases) page
The sidebar **Satışlar** item is now a collapsible **"Satış / Alış"** group with two
children — **Satışlar** (`/app/sales`) and **Alışlar** (`/app/purchases`). The group
auto-expands + highlights when you're on either route (`nav-items.ts` gained a `NavGroup`
shape + `isNavGroup`; `sidebar.tsx` renders groups; `header.tsx` flattens children for the
page title).
- **Alışlar** = the daily purchase entry (reuses the delivery `DeliveryForm` — per-line
  supplier, cost, expiry, received-into location → creates batches = **adds to stock**)
  **plus** a browsable **purchase history** by period, modelled on the waste page.
  `getPurchaseLog(tenant, from, to)` (delivery movements joined ingredient+supplier) +
  `components/inventory/purchase-log-table.tsx` (read-only) + summary cards (spend, count).
- `submitDelivery` now redirects back to `/app/purchases`; the old
  `/app/inventory/delivery` **redirects** there; the dashboard quick-buy + low-stock
  "Order" links repoint to `/app/purchases`.
- Bilingual az/ru (`nav.trade`, `nav.purchases`, `purchases.*`). typecheck + lint + build
  (92 pages) green.

### Done — storage locations + stock movement (warehouse → kitchen), per-line supplier
Stock now physically lives in a per-tenant **location** and can be **moved** between
them; sales/waste consume the **kitchen**.
- **029** `storage_locations` (is_kitchen / is_default_receiving / is_frozen),
  seeded Anbar + Mətbəx per tenant (+ in `handle_new_tenant`); `ingredient_batches.location_id`
  (existing stock backfilled into the Kitchen); `stock_movements.from/to_location_id` +
  `'transfer'` type; batch_code is now a non-unique human reference. Settings → **Locations**
  CRUD (rename / add / delete-guard / set kitchen / default-receiving / frozen).
- **Per-line supplier** on deliveries (the same ingredient can come from different
  suppliers; "no supplier" always valid); a per-delivery **"received into [location]"**
  (defaults to Warehouse).
- **030** `transfer_stock(ingredient, from, to, qty, expiry?)` — atomic FIFO **batch split**
  (source loses qty, destination gains a child batch keeping the **same LOT code**, cost,
  supplier-lot). The optional new use-by lets a move into a **frozen** location extend
  shelf life. New `/app/inventory/transfer` page + "Move stock" on the hub.
- **031 kitchen-only** — `confirm_daily_sales` + new `record_waste` / `reverse_waste`
  RPCs consume **kitchen** batches FIFO and **refuse** (raise) when the kitchen can't
  cover it; the confirm preview + waste form show a "move to kitchen first" message.
  *No-batch fallback:* ingredients never batch-tracked (count-only) aren't location-restricted.
  This also fixes a pre-existing drift (waste never used to decrement batches).
- Inventory hub shows each ingredient's **per-location breakdown** + a Location column on
  batches; movements render the `transfer` type.
- **Verified** end-to-end via BEGIN/ROLLBACK (impersonating the tenant): deliver 15 into
  Anbar → move 4 to Mətbəx (split, 2 LOT codes kept) → waste 1 + sell 2 from the kitchen
  → Anbar 11 / Mətbəx 1; overdrawing the kitchen / source **raises**. typecheck + lint +
  build (90 pages) green; advisors clean.

### Done — removed business-type → library filtering (every tenant sees the full library)
Reverted the "show only ingredients matching the tenant's business type" logic.
Businesses still **choose and display** their type (`tenants.business_type`, the
chooser, the type chips on settings/onboarding) — it's now purely informational.
- `getCommonLibrary()` and the tenant library page no longer filter; deleted
  `getLibraryForTenant` (the library page uses the unfiltered `getGlobalLibrary`).
- Dropped the per-item association: admin library add-form lost the business-type
  checkboxes, the table lost the type chips, `addLibraryItem` no longer reads/writes
  it, and migration **028** drops `global_ingredient_library.business_types`
  (types + the `admin.library.business_types` i18n key removed too).
- typecheck + lint + build (86 pages) green.

### Done — onboarding card now reliably disappears once setup is complete (code-review fixes)
Review target: "once a business completes onboarding, İdarə paneli must stop showing
the welcome/onboarding messages." Root cause + 12 findings fixed:
- **Cache gap (the actual symptom).** `createRecipe`, `createIngredient`,
  `importIngredients`, `addFromLibrary` revalidated only their own route, **not the
  dashboard** — so finishing the ingredients/recipes step left the Getting-Started
  card in the client Router Cache until it expired. Added `revalidatePath(.../dashboard)`
  to all four (matching `submitStockCount` / `setBusinessType`, which already did it);
  also added it to `submitDelivery` so dashboard widgets don't read stale.
- **Stuck-forever path.** Completion is derived from 4 steps incl. ≥1 recipe; a
  recipe-less business could never clear the card. Added an explicit dismissal:
  migration `027_onboarding_dismissed.sql` (`tenants.onboarding_dismissed_at`),
  `dismissOnboarding` action + a "Bu kartı gizlət / Скрыть" link on the card; the gate
  now also honours the dismissal.
- **Silent business-type failure.** `BusinessTypeChooser` ignored `setBusinessType`'s
  error and `optimistic ?? current` masked the server truth → chip looked selected but
  the step never saved. Now rolls the highlight back + shows `business_type.save_error`.
- **Welcome tour.** localStorage key is now **per-tenant** (no leak between businesses
  sharing a browser); the "seen" flag is written **only when the tour actually fires**
  (navigating within the 500 ms delay no longer suppresses an unseen tour); removed the
  `startedRef` so StrictMode reschedules cleanly.
- **Efficiency.** Dashboard now loads the 4 cheap onboarding signals first and
  early-returns, so onboarding-stage tenants no longer pay for movements / recent /
  batches / recipe-ingredients queries they never render.
- Cross-referenced `hasInitialCount` ↔ `getLastCountInfo` to prevent drift.
- typecheck + lint + build (86 pages) green; security advisors unchanged (no new RLS gaps).

### Done — confirm/lock daily sales → atomic FIFO inventory deduction (full)
- **UI + actions now built on the tested engine.** `confirmDailySales` (explodes
  the day's recipes → per-ingredient usage → calls the `confirm_daily_sales` RPC)
  and `voidDailySales` (calls `void_daily_sales`); `saveDailySalesItems` refuses
  a confirmed day (`error:'locked'`, DB trigger is the backstop).
  `getDayConfirmPreview` computes the inventory impact (per-ingredient deduction
  + current on-hand + short/oversell flags + COGS) for the review screen.
  `SalesDayActions` (client): draft → review panel + "Confirm & lock"; confirmed
  → green locked badge + audited "Void" (with inline are-you-sure). `SalesItemEditor`
  takes a `locked` prop (read-only when confirmed). Status badges on /sales list +
  /sales/[date]. Bilingual az/ru; typecheck + lint + build green.
- **DB engine** (migration **026**, live-tested). A day's sales are a
  `draft` until **confirmed**; confirming deducts inventory and **locks** the day.
  Two SECURITY DEFINER, single-transaction RPCs:
  - `confirm_daily_sales(day, usage jsonb)` — writes a `sale` stock_movement per
    ingredient (deducts derived stock) + **FIFO-consumes `ingredient_batches`**
    (oldest `LOT-` first, records each cut in `sale_batch_consumption`, marks
    depleted), then sets `status='confirmed'`. Row-locked + status-guarded →
    idempotent (no double-deduct).
  - `void_daily_sales(day)` — restores the consumed batches, writes append-only
    reversing `adjustment` movements, re-opens the day to `draft`. (Audited
    void & re-enter — chosen correction model.)
  - Immutability is **DB-enforced**: trigger `guard_confirmed_sale_items` blocks
    insert/update/delete of items on a confirmed day.
  - Verified live (BEGIN/ROLLBACK, no pollution): sell 8 from batches [5,10] →
    LOT-260601-01 depleted (5), LOT-260605-01 →7; double-confirm rejected; void
    restored [5,10] + `sale 8 / adjustment 8` pair; status round-tripped.
  - New cols: `daily_sales.status/confirmed_at/confirmed_by`,
    `stock_movements.daily_sales_id`, table `sale_batch_consumption`. Types added.
- **Next (not yet built):** the TS actions (`confirmDailySales` explodes recipes
  → usage → RPC; `voidDailySales`), block edits on confirmed days in
  `saveDailySalesItems`, and the UI (status badge, "Confirm day" review screen
  showing the inventory impact, "Void" button). Then reconcile the period report.

### Done — batch identifiers (LOT-YYMMDD-NN) + supplier lot
- Every received batch now gets a human-readable, trackable code **`LOT-YYMMDD-NN`**
  (received date + per-tenant per-day sequence) plus an optional **supplier lot
  number** (manufacturer's printed lot, for recall traceability). Migration
  **025**: `ingredient_batches.batch_code` + `supplier_lot_no`, a `set_batch_code`
  BEFORE-INSERT trigger (so any insert path gets a code), backfill of existing
  batches, and a unique index `(tenant_id, batch_code)`.
- Delivery form: a supplier-lot input per line; `submitDelivery` stores it
  (batch_code is trigger-generated). Inventory table's batch sub-rows now show
  the batch code + supplier lot alongside received/remaining/expiry/cost.
  Bilingual az/ru; typecheck + lint + build green.
- **Next (planned):** live sales → stock FIFO deduction consuming these batches
  (per the code-review finding that sales don't currently deduct from live
  inventory). The internal UUID stays the PK; LOT- is the display/tracking id.

### Done — onboarding is now an explanatory guided tour (driver.js)
- Replaced the manual "complete each step" checklist on the dashboard with an
  **explanatory walkthrough** (`components/dashboard/welcome-tour.tsx`, driver.js
  ^1.4): centered step-by-step popovers explaining the 5-step workflow
  (ingredients → recipes → initial count → sales → waste), bilingual, brand-styled
  (`.stokly-tour`). Auto-runs once per browser (localStorage
  `stokly_onboarding_tour_v1`) and replayable via a "Start tour" button.
- `GettingStarted` slimmed to a welcome card: the tour + the **functional**
  business-type chooser + quick-start shortcuts + type-filtered quick-add.
  Dropped the done/not-done badges + `OnboardingSteps` prop (dashboard still
  computes step state for the show/hide gate). driver.css imported in the client
  component (fine in App Router). typecheck + lint + build green.

### Done — first-run onboarding + business type + type-filtered library
- **Business type** on the tenant (migration 024 `tenants.business_type`): a
  curated list (restaurant/cafe/coffee/fast_food/pizzeria/bakery/pastry/bar/
  kebab/teahouse/other — `lib/constants/business-types.ts`, bilingual). Chosen on
  first run and editable in Settings (`setBusinessType` + select in updateTenant).
- **First-run GettingStarted checklist** (`components/dashboard/getting-started
  .tsx` + `business-type-chooser.tsx`): replaces the old empty-state. Five steps
  with done-state + explanations + actions — choose type → add ingredients
  (type-filtered quick-add) → recipes → initial count → daily sales/waste.
  Dashboard shows it until the 4 core steps are done (gated by `onboarding_screen`).
  Old `OnboardingEmptyState` removed.
- **Type-filtered library**: `global_ingredient_library.business_types text[]`
  (null = universal, shown to all). `getLibraryForTenant` / `getCommonLibrary`
  filter to `business_types is null OR contains the tenant's type` (PostgREST
  `.or(is.null,cs.{type})`). Wired into ingredients page, library page, onboarding
  quick-add. Admin library: business_types checkboxes on the add form + tag chips
  in the table (`getGlobalLibrary` stays unfiltered for admin). Operator confirmed
  untagged = shown to all; existing 72 items are untagged (universal) — tag
  type-specific ones going forward.
- Bilingual az/ru; typecheck + lint + build green; migration applied. TODO:
  per-row editing of an existing item's business_types in admin (set at add-time
  for now).

### Done — business users can change their password in Settings
- Accounts are admin-provisioned with a temporary password; the tenant owner can
  now replace it in `/app/settings` → **Security** card. New `changePassword`
  action (`supabase.auth.updateUser`, new + confirm typed twice, min 8, stays on
  the page with a success message — unlike the recovery `updatePassword` which
  redirects). Bilingual az/ru; typecheck + lint + build green.

### Fixed — auth redirect loop on /admin and /app (member-less / non-admin)
- The middleware blindly redirected **any** authenticated user off a login page
  to that portal's home (rule #4). Combined with the layout guards
  (`requirePlatformAdmin` → /admin/login, `requireTenant` → /app/login), a
  signed-in user lacking the portal's role looped forever
  (`/admin → /admin/login → /admin → …`). Showed up after deleting a tenant left
  its owner auth account orphaned (no membership, not an admin).
- Fix: removed the blind middleware redirects; the **login pages** now do the
  "already signed in → go home" check themselves, role-aware — admin login
  redirects only actual `platform_admins`; business login redirects admins → /admin
  and members → /app/dashboard, and lets a member-less account reach the form.
  typecheck + lint + build green. (Platform admin is `rhlhabibli@gmail.com`.)

### Done — waste log (browsable, valued, append-only with reversal)
- Waste was already a `waste` stock_movement (auto-deducts from stock); made it a
  first-class **log**. Migration **023**: proper `waste_category_id` FK (was
  crammed into `reason`), `reverses_movement_id` self-FK for append-only
  corrections, partial waste index.
- `submitWaste` now snapshots the ingredient cost into `unit_cost` (so waste
  **value** = qty×cost is stable), sets the category FK + an optional short
  `reason`, and redirects to the log. `reverseWaste` inserts an `adjustment` that
  adds the wasted qty back and points at the original (owner/manager only, no
  double-reversal) — the original is never edited/deleted.
- **`/app/inventory/waste`** is now a hub: entry form (shows on-hand + a
  live value preview + over-stock warning + reason) on the left; a **period
  filter (from/to)** + summary cards (total waste value, entry count) + the
  browsable **log table** (date, ingredient, qty, value, category, note, Reverse
  / "Reversed" badge) on the right. New **"Waste log"** sidebar item.
- `getWasteLog(tenant, from, to)` joins ingredient + category, computes value,
  flags reversed entries. Decision (confirmed): waste log only now;
  **multi-location stock is a separate future phase** (today there's one stock
  level per ingredient; `ingredients.storage_location` is just a label — no
  per-location balances or transfers yet). Bilingual az/ru; typecheck + lint +
  build green; migration applied + advisors clean.

### Done — sales require an initial (zero) stock count
- Fixed a domain flaw: sales could be recorded before any stock existed. Now the
  **initial count is a prerequisite** — `hasInitialCount(tenantId)` (any
  count_period or 'count' movement) gates sales. The `/sales` + `/sales/[date]`
  pages show a `NeedsInitialCount` guard (→ /app/inventory/count) and all three
  sales actions (saveDailySales / saveDailySalesItems / saveDailySalesBatch)
  reject with `no_count`.
- Made the **first count a pure baseline**: `salesWindow` returns null when
  there's no previous count, so the baseline count doesn't nag for sales / has no
  COGS / theoretical usage (sales tracking starts after it). The pre-count modal
  shows a "baseline note" and skips period-length warnings for the first count.
- The dashboard `CountReminder` already prompts the "never counted" state, so new
  businesses are guided to count first. Bilingual az/ru. typecheck + lint + build
  green.

### Done — itemized sales (menu items × qty) + theoretical-vs-actual usage
- Sales were a single money total per day, which can't relate to stock. Now a
  day's sales are entered as **receipt-style line items** — menu item (recipe) ×
  quantity — and revenue is derived from a per-item **price snapshot**
  (`recipes.sale_price` at entry). Migration **022** adds `daily_sales_items` +
  `daily_sales.revenue_source` (manual|items).
- **`lib/calculations/theoretical-usage.ts`**: explodes sold recipes into
  expected base-unit ingredient consumption (qty × line.quantity / yield,
  recursing sub-recipes by serving_size; reuses recipe-cost's context builder).
- **Period report** now computes theoretical usage for the period's sold items
  and shows, per ingredient, `theoretical_qty` + `variance` (actual − expected),
  plus a **theoretical vs actual food-cost** callout. `computePeriodReport` /
  `generatePeriodReport` extended; gated by `has_itemized_sales` so older stored
  reports degrade gracefully (regenerate to populate).
- **UI**: `components/sales/sales-item-editor.tsx` (menu-item dropdown + qty
  rows, live revenue, price-snapshot, note); `saveDailySalesItems` action
  (snapshots prices server-side, validates tenant ownership, replaces the day's
  items). `/sales` + `/sales/[date]` use it; **fallback to the money form when a
  tenant has no recipes yet**. Recent list shows an "itemized" badge.
- Chosen behavior (confirmed with operator): per-day item totals (not
  per-receipt) + theoretical-vs-actual variance (counts still set real stock,
  no live auto-deduction). Bilingual az/ru. typecheck + lint + build green;
  migration applied + advisors clean.
- **Prereq for the operator:** itemized entry + theoretical usage need recipes
  (menu items) with sale prices; without a menu the day falls back to a money
  total.

### Done — landing mockups reframed as control-room instrument panels
- The product mockups read as macOS/iOS app screenshots (traffic-light window
  chrome + `stokly.app/…` address-bar titles). Replaced `WindowChrome` with a
  `Panel` carrying a **telemetry header**: a steady status LED, a boxed `STOKLY`
  system mark, the module name in spaced mono, and a pulsing live dot + `CANLI`/
  `ОНЛАЙН` + signal-bar readout. No traffic lights.
- Titles are now module names (`İDARƏ PANELİ` / `RESEPT` / `İNVENTAR`, ru
  `ПАНЕЛЬ`/`РЕЦЕПТ`/`СКЛАД`) — stored already-uppercase to avoid AZ dotted-İ
  casing issues. New `landing.mock.live` key (az/ru).
- Swapped the soft mint "iOS health" pills (`#ECFDF5`/`#065F46`) for terminal
  tags (teal text + `border-brand/30` on `bg-brand/10`). Panel radius 14px +
  inset top highlight; CSS `.mk-panel` / `.mk-led` / `.mk-live-dot` (+ reduced-
  motion guard) replace `.mk-window`.
- Verified on the live landing (preview): 4 panels, 0 traffic dots, 0 light
  pills, 14px radius. typecheck + lint + build green.

### Done — navigation loading UX (progress bar + spinner + skeletons)
- **`components/ui/navigation-progress.tsx`** (client, mounted once in the locale
  layout inside `<Suspense>`): a thin teal top progress bar (instant) + a
  **centered spinner over a blurred backdrop** that appears only after a ~180 ms
  beat, so quick client transitions stay clean (bar only) and slower loads get
  the frosted overlay. App Router has no router
  events, so it detects nav *start* from same-origin link clicks + a patched
  `history.pushState`/`popstate`, and *completion* when `usePathname()` /
  `useSearchParams()` change. Trickles to 90% then snaps to 100% + fades; a 10s
  failsafe prevents a stuck bar.
- **Skeletons:** `components/ui/skeleton.tsx` upgraded to a smooth gradient
  **shimmer** (CSS `.skeleton` / `.skeleton-d` for light app vs. dark admin,
  per-element `--sk-delay` stagger, `prefers-reduced-motion` aware).
  `components/ui/skeletons.tsx` adds composable blocks (`PageHeaderSkeleton`,
  `StatCardsSkeleton`, `CardSkeleton`, `TableSkeleton`, `CardGridSkeleton`).
- **`components/ui/spinner.tsx`** — reusable `Spinner` + `LoadingScreen` for
  Suspense fallbacks.
- **Route `loading.tsx`** (instant skeletons during server navigation, via Next
  Suspense): business app group catch-all + dashboard/ingredients/recipes/
  inventory/reports; admin console group catch-all + tenants (dark). Intra-tab
  navigation in each group is covered by the group-level file; page-specific
  files override where a closer match helps.
- typecheck + lint + build green.

### Done — one-click quick-add of common ingredients (migration 021)
- `global_ingredient_library.is_common` flag (migration 021): flagged the 25
  existing basics + inserted 13 missing common items (fresh herbs Cəfəri/Keşniş/
  Şüyüd/Nanə/Göy soğan/Tərxun, spices Sumaq/Sarıkök/Dəfnə yarpağı, pantry tomato-
  paste/vinegar/yeast/honey). **38 common of 72 total**, verified live.
- `getCommonLibrary()` + **`components/ingredients/quick-add.tsx`** (client): a
  "Tez əlavə et" chip row — one tap adds an ingredient (cost 0, reusing the tested
  `addFromLibrary`) and the chip disappears; "Hamısını əlavə et" adds the rest.
  Already-added basics filtered out by name; the section hides when empty.
- Surfaced on the **Ingredients page** (above the table) + the **onboarding empty
  state**; gated by the `ingredient_library` entitlement.
- Admin `/admin/library`: an **is_common checkbox** on the add form + a per-row
  **star toggle** (`toggleLibraryCommon`) so the operator curates the chip set.
- Bilingual az/ru. typecheck + lint + build green. Commit `f584274`.

### Done — ingredient add-form polish
- **Unit dropdown** (`UNIT_OPTIONS`) instead of free text on the ingredient form,
  kept consistent with the DB / library units.
- Hover **"?" hints** (`components/ui/field-hint.tsx`) on cost-per-unit and yield-%
  fields; **"Az stok həddi" renamed → "Minimum stok həddi"** with an explanatory
  hint. Commit `6d8ef0b`.

### Done — blog (public reading + admin authoring)
- Migration **020** `blog_posts` (slug, bilingual title/excerpt/body, cover,
  draft/published status, published_at) — public reads `published` only,
  platform-admin full write.
- Public pages under `app/[locale]/(marketing)`: **`/blog`** index + **`/blog/
  [slug]`** article, sharing the marketing shell; **"Bloq" nav link** added.
- System-admin CRUD in the admin console (list / create / edit / publish-unpublish
  / delete), platform-admin gated. Sample posts seeded.
- Bilingual az/ru. Designed to match the marketing aesthetic.

### Done — landing copy revision + URL/redirect fixes
- Removed "Azərbaycan restoranları üçün qurulub"; **shortened every landing
  feature blurb** to short, precise, attention-grabbing facts (no deep specifics).
  Full section-by-section AZ rewrite per operator wording (navbar, hero + chips,
  showcases, mock UI, problem, features, how, mission, metrics, testimonials, CTA,
  demo, FAQ, footer); HoReCa terminology ("Maya dəyəri", "itkilər", "real vaxt
  rejimində", "Demo tələb et").
- **Bug:** nav section/demo anchors were hash-only, so off the landing (e.g. on
  `/blog`) they became `/blog#product`. Fixed → `/${locale}#section`. Commit
  `bf758c3`.
- **Bug:** `/blog` redirected to login — middleware used an allowlist. Inverted to
  **protect only `/app` and `/admin`** (minus auth pages). Commit `29b6458`.
- **Decision:** keep `/az` + `/ru` in URLs (next-intl `localePrefix: 'always'`).

### Done — graceful missing-service-key handling
- Create-business crashed with "Your project's URL and Key are required…" because
  `SUPABASE_SERVICE_ROLE_KEY` was empty in `.env.local`. Hardened:
  `createAdminClient` throws a typed `ServiceRoleKeyMissingError`; `createBusiness`
  catches it → returns `{error:'service_key'}`; the form shows a localized
  `business.no_key` message instead of an unhandled runtime error. Operator must
  still paste the real key + restart for business creation to work. Commit
  `0771cf3`. (Admin password was set to a temporary value via privileged SQL —
  change it.)

### Done — Phase 1 MVP (scaffold)
- Full schema (`001`), RLS (`002`), auth flow, i18n, all Phase-1 pages and
  components, calculations, validations. typecheck/build/lint all green.

### Done — Design system rollout
- Dark-navy sidebar + teal (`#00C896`) brand, DM Sans + JetBrains Mono, flat
  bordered cards, `stokly-theme.tsx` component library applied across every
  page. Login page visually verified.

### Done — Batch expiry (FIFO) + Production-run foundation
All 10 checklist items below complete. typecheck + build (39 routes) + lint
green. Login smoke-tested. Pushed to `main`.

Key files added/changed this round:
- `supabase/migrations/003_batches_and_production.sql` (+ RLS at end of file)
- `types/database.ts`, `types/app.ts`
- `lib/calculations/stock-level.ts` (FIFO/expiry), `lib/calculations/production.ts`
- `lib/data/queries.ts` → `getActiveBatches`
- `lib/validations/{ingredient,stock-movement}.ts`
- `app/[locale]/(dashboard)/inventory/actions.ts` (delivery → batches)
- `app/[locale]/(dashboard)/ingredients/actions.ts` (produced fields)
- `components/inventory/{delivery-form,inventory-table}.tsx`
- `components/ingredients/ingredient-form.tsx`
- `components/dashboard/expiry-widget.tsx`
- `app/[locale]/(dashboard)/page.tsx` (expiry widget)
- `app/[locale]/(dashboard)/production/{page,new/page}.tsx` (Phase-2 stubs)
- nav: added Production entry; messages: az/ru new keys

Deliberate decision: **auto expiry write-off on dashboard load was NOT wired
up** (it would mutate data on every page view). `buildExpiryWriteOff()` exists
as a helper; running it belongs in a scheduled job — see section 9.

## 8. Completed task — batch expiry + production foundation

Goal: design the data model + Phase-1 UI touchpoints for (a) batch-level expiry
tracking with FIFO consumption and (b) production runs (raw → finished goods),
so Phase 2 can build the full UI without painful migrations.

Checklist (updated as completed):

- [x] `003_batches_and_production.sql` — `ingredient_batches`,
      `production_runs`, `production_run_inputs`; extend `stock_movements`
      (batch_id, expiry_date, new movement_types); extend `ingredients`
      (is_produced, default_shelf_life_days, storage_location). **RLS for the
      three new tables lives at the END of 003** (not 002) so migrations apply
      in order.
- [x] `002_rls.sql` — pointer note added; actual policies are in 003.
- [x] `types/app.ts` — IngredientBatch, ExpiringBatch, BatchConsumption,
      ProductionRun, ProductionRunInput, StockMovementInsert.
- [x] `types/database.ts` — typed rows for new tables + extended columns +
      new movement types + BatchStatus.
- [x] `lib/calculations/stock-level.ts` — `consumeFIFO`, `getExpiringBatches`,
      `buildExpiryWriteOff` (+ invariant comment at top).
- [x] `lib/calculations/production.ts` — `calculateProductionCost`,
      `calculateActualYield`, `defaultProductionExpiry`, `totalInputCost`.
- [x] Delivery form — optional per-line expiry date; creates `ingredient_batches`
      rows alongside `stock_movements` on submit (one movement + one batch per
      line; movement.batch_id left null for deliveries — append-only respected).
- [x] Ingredient form — `is_produced` toggle + shelf-life + storage fields
      (conditional, Radix Switch submits `is_produced=on`).
- [x] Dashboard — "Vaxtı Bitən Məhsullar" expiry-warning widget (red ≤2d,
      amber ≤7d), empty state, stacked under low-stock.
- [x] Stock dashboard — expandable per-ingredient batch breakdown
      (`components/inventory/inventory-table.tsx`, client, click to expand).
- [x] Phase-2 placeholder routes: `production/page.tsx` (coming-soon),
      `production/new/page.tsx` (redirects to `/production`).
- [x] typecheck + build + lint green; pushed.

### Done — Phase A: demo-only public site + two hidden portals + god-mode admin
- Public site is demo-request only (no signup/login). Demo form persists to
  `demo_requests` via the SECURITY DEFINER `submit_demo_request` RPC + best-effort
  Resend email; verified end-to-end.
- **Routing moved:** the whole business app now lives under `/[locale]/app/*`
  (login at `/app/login`); the old `/dashboard` + `(auth)` groups are gone.
  Nav/links/middleware/redirects all updated.
- **System admin** at `/[locale]/admin/*`: console (leads inbox, tenants list,
  create business), gated by `requirePlatformAdmin`. **God-mode** = migration 008
  RLS admin-override + tenant impersonation (a `stokly_admin_tenant` cookie; the
  admin "Enters" a restaurant and reuses the whole business app, with an
  exit banner). Business creation uses the admin service client + the 005 trigger.
- Build (49 routes) + typecheck + lint green. Admin login UI + lead capture
  verified in the browser; full console/impersonation verified once a real admin
  is provisioned.
- NOTE: a cleanup query accidentally dropped the `DAD House` test tenant
  (rhabibli@outlook.com); it was re-provisioned (tenant + owner + waste
  categories). Any data added to it before was lost.

### Done — Phase B: bulk ingredient import + onboarding
- Migrations **007** (global library + 59 seed rows) and **009** (admin write
  on the library). `xlsx` (SheetJS) added.
- `lib/import/parse-ingredients.ts` — unit normalization (AZ/RU/EN→AZ), draft
  validation, matrix + paste parsers (pure, shared client/server).
- `app/api/templates/ingredients/route.ts` — GET returns a real .xlsx template
  (verified: HTTP 200, 23 KB, "Microsoft Excel 2007+").
- Import page `…/app/(protected)/ingredients/import` with 3 tabs: **Excel/CSV**
  (client SheetJS parse), **Library** (multi-select), **Paste**. Shared editable
  colour-coded preview (`components/import/import-preview.tsx`) → batch insert +
  supplier auto-create (`…/ingredients/import/actions.ts`).
- Standalone library page + the import "Library" tab share
  `components/import/library-selector.tsx`.
- Ingredients list gains an **İdxal et / Kitabxana** button; the business
  dashboard shows a 3-option **onboarding empty state** when ingredients = 0.
- Admin console `/admin/library` — curate the global catalog (add/delete).
- typecheck + build (56 routes) + lint green. Template endpoint + middleware
  routing verified via curl; the interactive import UI couldn't be
  screenshot-verified this session (preview compiler flakiness) but is build-
  clean and reuses verified Phase-A patterns.

### Done — landing redesigned to premium light/airy (Supy/MarketMan)
- Reworked the landing from dark control-room → **light, airy, product-led**:
  white page, deep-ink type, teal accent, big **dark Stokly UI mockups** floating
  with soft premium shadows. Generous whitespace.
- New `components/marketing/mockups.tsx`: `WindowChrome`, `MockDashboard` +
  `HeroMock` (floating cards), `MockRecipe`, `MockInventory` — realistic product
  shots built from the app's visual language.
- Added: logo wall + ★ rating/trust line; three alternating product-showcase
  sections (`landing.showcase`); premium light cards (`.mk-card`, `.mk-shadow-*`,
  `.mk-lift`), light-glass nav, tinted blooms, refined type/spacing. One dark
  metrics band + dark final-CTA band for contrast.
- New i18n: `landing.trust.{rating,count,logos,logos_label}`, `landing.showcase`,
  `landing.mock.*` (AZ + RU). Removed the old dark `hero-panel.tsx`.
- Premium CSS lives under the "PREMIUM LIGHT SYSTEM" block in globals.css.
  typecheck + build (41 routes) + lint green; verified across hero / mockups /
  showcases at desktop + mobile.

### Superseded — marketing landing page (dark control-room)
- Public bilingual (AZ/RU) landing at the locale root `/[locale]`. **Routing
  refactor:** dashboard home moved `/[locale]` → `/[locale]/dashboard`; middleware
  makes the root public; nav/header/redirects updated; post-login →
  `/dashboard`.
- Aesthetic: deep-navy + teal, **Bricolage Grotesque** display + DM Sans +
  JetBrains Mono, grid/grain/glow, IntersectionObserver scroll-reveal, count-up
  stats, hero instrument-panel, testimonials marquee, FAQ accordion, demo CTA.
  All CSS/IO — no animation libraries added.
- Sections: hero, trust strip, problem, services bento, how-it-works, mission,
  metrics band, testimonials, demo+CTA, FAQ, final CTA, footer.
- **Placeholders to swap later:** testimonials are realistic but fictional;
  the demo form is front-end only (success state, not wired to a backend).
- Gotcha fixed: `CountUp` must format numbers deterministically (not
  `toLocaleString`) — Node vs browser ICU differ and cause hydration mismatches.
  A `<noscript>` fallback reveals content if JS is off.

### Done — service_role key eliminated (migration 005)
- Signup provisioning moved into the `on_auth_user_created` trigger
  (`handle_new_tenant`, SECURITY DEFINER, `search_path=''`). Signup action now
  just calls `auth.signUp` with `restaurant_name`/`locale` metadata; removed
  `createServiceClient` and the `slugify` util. The app no longer reads
  `SUPABASE_SERVICE_ROLE_KEY` at all — `.env.local` / `.env.local.example` /
  README updated. `.env.local` is populated (URL + anon key) and git-ignored.

### Done — DB provisioned + hardened
- Applied migrations 001 → 004 to the **stockly** Supabase project via MCP.
  Verified: 11 tables, RLS on all, extended columns + 8-value movement_type
  check, 19 policies. Hardened the 3 SECURITY DEFINER helpers (`search_path=''`,
  fully-qualified refs). Remaining advisor WARNs (`current_tenant_id` /
  `current_user_role` executable via RPC) are **intentionally accepted** —
  revoking EXECUTE would break RLS, and they only expose the caller's own
  membership. `rls_auto_enable` is Supabase-managed (not ours).

## 9. Next steps — Tier B & Tier C build-specs

Production runs, expiry write-off and (metric) unit conversions shipped in the
**data-integrity round (DONE)**. The remaining roadmap, in priority order, with
enough detail to execute. **Next free migration number = `036`** (034, 035 used by B1, B3 — applied live). Reuse the
existing patterns (atomic SECURITY DEFINER RPCs, append-only movements,
`deriveStockLevel`, `computePeriodReport`, `computeRecipesWithCost`,
`DeliveryForm`/`getPurchaseLog`, suppliers/locations CRUD).

### Tier B — planning & control

**B1 · Par levels + build-to-par suggested order / shopping list — ✅ DONE (migration 034 applied live)**
- Shipped exactly as specced below. `ingredients.par_level` (migration `034_par_levels`);
  `lib/calculations/shopping-list.ts` + `getShoppingList`; `/app/purchases/shopping-list`
  page + `components/inventory/shopping-list-view.tsx`; `DeliveryForm` `initialLines` prefill.
- Today only `ingredients.low_stock_threshold` (reorder point) exists — no target/par.
- DB (034): `alter table ingredients add column par_level numeric`. Keep the threshold
  as the *trigger*, par as the *target*.
- Calc: `suggested_qty = max(0, par_level − on_hand)` (on_hand from
  `deriveAllStockLevels`); flag items where `on_hand ≤ low_stock_threshold`.
- UI: a "Sifariş siyahısı / Shopping list" page (or a panel on `/app/purchases`): items
  below par with suggested qty, last supplier (`ingredients.supplier_id`) + last paid
  cost, grouped by supplier; "create purchase from list" pre-fills the Alışlar
  `DeliveryForm`. Add the `par_level` input to the ingredient form.

**B2 · Supplier price history + receiving price-variance — ✅ DONE**
- Data already exists (delivery `stock_movements`: unit_cost/supplier_id/created_at +
  `ingredient_batches`: unit_cost/received_date) — **no migration**.
- Calc: per ingredient, last price + moving average of last N deliveries;
  `variance% = (new_cost − avg) / avg`; flag |variance| > ~10%.
- UI: on the purchase line show last/avg price + a warning chip when the typed
  `unit_cost` deviates; an ingredient "price history" panel on the ingredient detail.
  Extend `getPurchaseLog` with last/avg.

**B3 · Sub-recipe yield % — ✅ DONE (migration 035 applied live)**
- A batch recipe (sauce/stock) loses volume; today `subRecipeUnitCost = batchCost /
  serving_size` (yield assumed 100%).
- DB (035): `alter table recipes add column yield_percent numeric default 1` (0–1).
- Calc: `subRecipeUnitCost = batchCost / (serving_size × yield_percent)`
  (`lib/calculations/recipe-cost.ts`); in `theoretical-usage.ts` `explode`, divide the
  sub-recipe consumption by `(serving_size × yield_percent)` so a lossy batch consumes
  more raw. UI: a yield field on the recipe form for `is_sub_recipe` recipes.

**B4 · Per-ingredient custom unit conversions (piece/pack)** — the deferred half of units
- v1 already does metric families (kq↔q, l↔ml) via `toBaseUnit` in
  `lib/constants/units.ts`. This adds fixed-factor units (1 case = 24 ədəd; 1 egg = 0.05 kq).
- DB (035): `ingredient_units(id, tenant_id, ingredient_id, unit, factor_to_base numeric)`
  + RLS mirroring `suppliers`; types.
- Calc: extend `toBaseUnit` to take a per-ingredient `{unit→factor}` map; thread an
  **optional** `customUnits` into `buildResolveContext` → `resolveRecipeCost`/`explode`
  (default empty = metric-only, zero regression); also convert alternate units on the
  purchase/count forms.
- UI: ingredient-form "alternate units" mini-manager; recipe-line + purchase-line unit
  dropdowns offer base + same-family + the ingredient's custom units, with a hint.

**B5 · Retire legacy `ingredients.storage_location`** (free text) — superseded by
`storage_locations`. Remove from the ingredient form; optional migration to drop the
column once nothing reads it.

### Tier C — analytics & KPIs (formulas from the best-practice research)

**Status: C1, C2, C3, C5, C6 = ✅ DONE. C4 (prime cost) needs a labor input — deferred
with B4 as the remaining focused pass.**

Mostly new report pages/queries under `/app/reports`, little/no schema. KPI math is pure
(`lib/calculations/*`). Reuse `computePeriodReport` (opening/closing/COGS/waste already
computed), `computeRecipesWithCost` (plate cost), `daily_sales_items` (sales mix),
`ingredient_batches` (aging).

- **C1 · Inventory turnover** = `COGS ÷ avg inventory value`, avg = `(opening_value +
  closing_value)/2` (both already in `PeriodReportData`).
- **C2 · Days-on-hand** = `365 ÷ annualised turnover` (or `avg inventory ÷ COGS ×
  days_in_period`), per period.
- **C3 · Waste %** = `waste_value ÷ COGS` (`waste_value` already in `PeriodReportData`),
  plus a by-category breakdown from `waste_categories` + `getWasteLog`.
- **C4 · Prime cost** = `(COGS + labor) ÷ revenue`. Needs a **labor input** — add a
  per-period labor figure (`count_periods.labor_cost` or a settings field); until entered,
  show COGS-only with a note.
- **C5 · Stock aging — ✅ DONE.** Active `ingredient_batches` bucketed by age (`today −
  received_date`) into bands (0–7 / 8–30 / 31+ days) with value-at-risk + near-expiry
  highlight. Reuse `getActiveBatches` / `getExpiringBatches`.
- **C6 · Menu engineering (stars / plowhorses / puzzles / dogs)**: per menu item,
  **popularity** = `units_sold ÷ total_units_sold` (from `daily_sales_items` over a range)
  and **profitability** = contribution margin = `sale_price − plate_cost` (from
  `computeRecipesWithCost`). Classify vs median popularity & margin into the 4 quadrants;
  a report page with the 2×2 matrix + a recommended action per item.

### Standing ops (not feature work)
- Set `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` + a scheduler; change the weak admin
  password; optional daily cron calling `write_off_expired`; delete orphaned auth user
  `rhabibli@outlook.com`. **Later (Phase 3):** POS integration → `sale` movements; unit
  tests for `consumeFIFO` / production cost-yield / the `deriveStockLevel` invariant.

## 10. Git / deploy

- Remote: `https://github.com/o8sdev/stokly`
- Default branch: `main`
- Secrets are git-ignored (`.env*.local`). Never commit real keys.
