# Stokly — Catch-Up Log

> **Purpose:** This file is the single source of truth for picking up work on
> Stokly from any device. It records what the app is, what has been built, the
> architecture rules that must never be broken, how to run it, and what comes
> next. **Every working session must update this file** as work is done.

_Last updated: 2026-06-08 (Blog (public + admin authoring), one-click quick-add
of common ingredients, ingredient-form polish, landing-copy + URL/redirect fixes)_

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
# apply migrations in filename order (001 → 021) against your Supabase project
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
a tenant up/down a tier **instantly changes available functionality** (verified:
professional→starter removes `bulk_import`; a per-tenant override re-grants it).
Placeholder prices ship (49/99/169/299); edit live in `/admin/plans`.

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
