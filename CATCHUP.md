# Stokly — Catch-Up Log

> **Purpose:** This file is the single source of truth for picking up work on
> Stokly from any device. It records what the app is, what has been built, the
> architecture rules that must never be broken, how to run it, and what comes
> next. **Every working session must update this file** as work is done.

_Last updated: 2026-06-08_

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
cp .env.local.example .env.local     # fill in real Supabase keys
# apply migrations in order against your Supabase project:
#   supabase/migrations/001_initial_schema.sql
#   supabase/migrations/002_rls.sql
#   supabase/migrations/003_batches_and_production.sql
npm run dev
```

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
  **service-role client** (RLS blocks the first inserts).

## 6. Project structure (high level)

- `app/[locale]/(auth)` — login / signup (+ `actions.ts`)
- `app/[locale]/(dashboard)` — authed app: dashboard, ingredients, recipes,
  inventory (count/delivery/waste), reports (food-cost/inventory-value),
  settings (+ suppliers), production (Phase 2 placeholder)
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

### In progress — Batch expiry (FIFO) + Production-run foundation
See section 8 for the live task checklist.

## 8. Current task — batch expiry + production foundation

Goal: design the data model + Phase-1 UI touchpoints for (a) batch-level expiry
tracking with FIFO consumption and (b) production runs (raw → finished goods),
so Phase 2 can build the full UI without painful migrations.

Checklist (updated as completed):

- [ ] `003_batches_and_production.sql` — `ingredient_batches`,
      `production_runs`, `production_run_inputs`; extend `stock_movements`
      (batch_id, expiry_date, new movement_types); extend `ingredients`
      (is_produced, default_shelf_life_days, storage_location).
- [ ] `002_rls.sql` — RLS for the three new tables.
- [ ] `types/app.ts` — IngredientBatch, ExpiringBatch, BatchConsumption,
      ProductionRun, ProductionRunInput.
- [ ] `types/database.ts` — typed rows for new tables + extended columns.
- [ ] `lib/calculations/stock-level.ts` — `consumeFIFO`, `getExpiringBatches`,
      `buildExpiryWriteOff` (+ invariant comment).
- [ ] `lib/calculations/production.ts` — `calculateProductionCost`,
      `calculateActualYield`.
- [ ] Delivery form — optional per-line expiry date; create `ingredient_batches`
      rows alongside `stock_movements` on submit.
- [ ] Ingredient form — `is_produced` toggle + shelf-life + storage fields.
- [ ] Dashboard — "Vaxtı Bitən Məhsullar" expiry-warning widget.
- [ ] Stock dashboard — expandable per-ingredient batch breakdown.
- [ ] Phase-2 placeholder routes: `production/page.tsx`,
      `production/new/page.tsx`.
- [ ] typecheck + build + lint green; push.

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
