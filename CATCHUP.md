# Stokly — Catch-Up Log

> **Purpose:** This file is the single source of truth for picking up work on
> Stokly from any device. It records what the app is, what has been built, the
> architecture rules that must never be broken, how to run it, and what comes
> next. **Every working session must update this file** as work is done.

_Last updated: 2026-06-08 (batch expiry + production foundation landed)_

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
# apply migrations in filename order (001 → 009) against your Supabase project
npm run dev
```

### Portals (sales-led / invite-only model)

- **Public** `/[locale]` — marketing + **demo request only**. No signup/login.
- **Business** `/[locale]/app/login` (hidden) → `/app/dashboard` etc. Accounts
  are admin-provisioned (no self-serve signup).
- **System admin** `/[locale]/admin/login` (hidden) → `/admin` console:
  demo-leads inbox, restaurants list + **Enter (god-mode impersonation)**,
  create business. Gated by the `platform_admins` allowlist.

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

## 9. Next steps (Phase 2 and beyond)

- Full **Production** screen: pick output ingredient + recipe template, enter
  inputs, preview FIFO batch consumption, confirm → run side effects.
- Make expiry write-offs run on a schedule (cron / edge function) instead of
  only on dashboard load.
- Batch-level UI on inventory: per-batch list, manual write-off, FIFO preview.
- POS integration (Phase 3) → `sale` movements + batch consumption.
- Tests for `consumeFIFO`, production cost/yield, `deriveStockLevel` invariant.

## 10. Git / deploy

- Remote: `https://github.com/o8sdev/stokly`
- Default branch: `main`
- Secrets are git-ignored (`.env*.local`). Never commit real keys.
