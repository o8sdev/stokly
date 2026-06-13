# Stokly — Manual QA Walkthrough

> Follow this top to bottom to create and verify **every** feature, business rule, and likely flaw
> by hand. Each step lists the **action**, the **expected result**, and a **flaw-check** (what would
> mean it's broken). Written against the current behavior (strict per-location consumption,
> per-location counts, explicit recipe routing). AZ UI labels are in parentheses.

---

## 0. Pre-flight

- **Accounts:** `demo@stokly.app` / `StoklyDemo2026!` (single-location demo tenant) and
  `e2e@stokly.app` / `StoklyE2E2026!`. To exercise the **multi-station** paths (warehouse → kitchen
  → bar) you need a tenant with **2+ locations** and the `multi_location` feature — create a fresh
  signup and, from the platform-admin console, enable `multi_location` and add a Bar consumption
  point, **or** impersonate a tenant that already has them (e.g. "DAD House").
- **The golden invariant — assert it after every stock action:** for each ingredient,
  **Cari stok (the global total) == Σ of its active batch remainders**, and the per-location split
  sums to that total. Confirmed history (locked sales, period reports) must never change.
- **How to read stock:** **Anbar → İnventar** (`/app/inventory`). The **Cari stok** column is the
  global total; expand a row for the per-location split + batches; use the location filter to view
  one station. Reports are read-only.
- **Locations model:** new tenants get **Anbar** (default *receiving*) + **Mətbəx** (default
  *consumption*). Stock flows Anbar → Mətbəx/Bar by **transfer**. Consumption (sale/waste/
  production) deducts **only** from the routed station.

---

## 1. Golden path — do this first, in order

| # | Action | Expected | Flaw-check |
|---|--------|----------|-----------|
| 1 | **Create ingredient** (Mətbəx → İnqrediyentlər → Yeni): "Toyuq", unit `kg`, cost, par level, low-stock threshold, shelf life. | Appears in the list at **0** stock. | Unit picker offers only valid units; saving works. |
| 2 | **Create recipe** (Reseptlər → Yeni): "Toyuq kabab" = 0.2 kg Toyuq, set sale price. | Live food-cost % + margin compute. If the tenant has **2+ stations**, you **must pick a consumption station** (defaults to the default one, no blank option). Single-station: no picker (auto-identified). | Cost uses unit conversion; the station is always stored (never blank). |
| 3 | **Purchase** (Alış jurnalı → Alış qeyd et, or Anbar → delivery): buy 10 kg Toyuq with supplier, cost, expiry. | Cari stok = 10; a `LOT-…` batch is created; ingredient price refreshes. **Single-station tenants:** stock lands directly in the station. **Multi-station:** lands in **Anbar**. | Batch exists; price updated only if changed. |
| 4 | **(Multi-station only) Transfer** (İnventar → Köçür): move 10 kg Toyuq **Anbar → Mətbəx**. | Total unchanged (still 10); the per-location split moves from Anbar to Mətbəx. | Transfer = no-op for the total; source can't overdraw. |
| 5 | **Production** (İstehsal → Yeni), only if you use preps/Yarımfabrikat: produce N portions. | Raw inputs drawn down (FIFO, from the input station); a costed output batch + yield appear. | Output cost rolled up; raw deducted once. |
| 6 | **Sell + confirm** (Satış jurnalı → Satış qeyd et → itemized, Toyuq kabab ×5 → **Təsdiqlə**). | Day locks; Toyuq drops **1.0 kg** from the recipe's routed station; sale movements created. | **If the routed station is short but stock is in Anbar → confirm refuses with "move to {station}"** (strict). After transfer (step 4), confirm succeeds. |
| 7 | **Void** the confirmed day. | Batches restored, day re-opens to draft. | History not edited — a reversing entry is appended. |
| 8 | **Waste** (İtki jurnalı → İtki qeyd et → `/app/inventory/waste`): waste 0.5 kg Toyuq. | **Cari stok drops by 0.5.** Multi-station: deducts from the selected station; if that station is empty but stock is elsewhere, an **amber "X is in Anbar — move to Mətbəx" prompt** with a one-tap transfer appears. | The number actually drops (the original bug); reverse restores it. |
| 9 | **Reverse** that waste (in the log). | Stock restored; original shown as reversed. | Append-only; reversing twice is blocked. |
| 10 | **Expiry write-off** (İnventar → "N expired → write off"). | Past-use-by batches written off; stock drops. | Idempotent (re-running writes nothing new). |
| 11 | **Count** (İnventar → Sayım, or Sayımlar → Sayım et): pick a **station**, enter the counted qty per ingredient, save. | Period closes → redirect to its immutable report. **Counting one station leaves the others untouched**; the per-location split + total reflect the count. | Counting Mətbəx=8 must not change Anbar; invariant holds per station. |
| 12 | **Period report** (Hesabatlar → Dövr hesabatları → open the latest). | opening + purchases + production − closing = usage; theoretical-vs-actual variance; food-cost %. | The numbers reconcile to steps 3–11. |

---

## 2. Feature-by-feature (create / edit / delete each; verify; probe)

- **Dashboard** (`/app/dashboard`): range selector drives the KPI band + sales trend; quick-actions
  deep-link; attention/expiry/low-stock cards; dismiss the onboarding card.
- **Ingredients** (list / detail / import / library): full CRUD; inline unit conversions; price
  history (last/avg + variance chip); delete is blocked once movements exist; CSV import; copy from
  the admin library.
- **Recipes** (list / detail / new): CRUD; raw + sub-recipe (Yarımfabrikat) lines; categories; live
  cost/margin; stocked-prep link; **consumption-station picker when 2+ stations**.
- **Production** (list / new): execute (FIFO inputs → costed output batch + yield); void (only while
  the output is unconsumed); recipe-driven input prefill + scaling.
- **Inventory** (`/app/inventory` + delivery / transfer / **per-station count** / waste): per-location
  view + filter; raw-equivalents card; expired write-off; the four entry forms; waste reverse.
- **Sales** (`/app/sales`, `/app/sales/[date]`): simple total vs itemized; comp/staff vs paid lines;
  pre-confirm usage preview; confirm locks + freezes the theoretical-usage snapshot; void reverses;
  missing-days fill.
- **Purchases / shopping-list**: delivery form; purchase log + supplier spend; suggested reorders
  (below par/threshold); "create purchase from list" prefill.
- **Reports**: food-cost, inventory-value, stock-aging, menu-engineering (stars/plowhorses/puzzles/
  dogs), by-location (multi_location), period list + immutable detail.
- **Data explorers** (`/app/data/{sales,purchases,waste,counts,finances}`): filter/sort/paginate;
  the "+ qeyd et" buttons route to the entry forms.
- **Settings**: tenant (name/currency/locale/count cycle/business type); suppliers CRUD; locations
  (kind, default receiving, consumption points, frozen flag; `multi_location` gating; can't delete a
  location holding stock or the default).
- **Guide** (`/app/guide`): "How Stokly works" renders + links.
- **Auth / onboarding**: signup → tenant provisioning (seeds Anbar+Mətbəx + categories); login
  routing (tenant vs admin); forgot/reset password; `/app/suspended` gate when status = suspended.

---

## 3. Business-logic invariants to assert

- `stock_movements` is append-only; **Cari stok == Σ active-batch remaining**, per location and
  overall, after every action.
- FIFO oldest-first; **consumption is strict to the routed station** (refuses with a transfer prompt
  when stock is elsewhere; true oversell — nothing elsewhere — is allowed as negative at the station).
- **Count = per-station reconciliation** (a signed delta that resets only that station's batches);
  transfer = no-op for the total; adjustment = signed.
- Confirmed sales are immutable (the theoretical-usage snapshot is frozen — a later recipe edit does
  not rewrite history); voids are append-only reversals.
- Negative stock is allowed and flagged red (oversell), never hidden as 0.
- Period identity: opening + purchases + production − closing = usage; food-cost % is consistent
  across dashboard / food-cost report / period report.

---

## 4. Flaw hunt (deliberately try to break it)

- **Waste/sell stock that's only in Anbar** → must show the transfer prompt and, after transfer,
  deduct (regression test for the "waste doesn't deduct" bug).
- **Count one station** → must not change another station's count.
- **Oversell** beyond all batches everywhere → allowed as negative at the station, flagged; no
  partial corruption.
- **Unit conversions:** buy in packs, use in g/kg → cost & usage scale correctly.
- **Comp/staff meals:** counted in usage, excluded from revenue.
- **Expiry + frozen location:** frozen shelf life; write-off idempotency.
- **Multi-station routing:** route two recipes to different stations (Kitchen vs Bar), sell both,
  confirm → each deducts from its own station; the by-location report splits correctly.
- **Double void / double reverse:** second attempt is rejected ("already …").
- **Locale switch az↔ru** mid-flow: every label is translated.

---

## 5. Admin console (platform-admin account)

- Tenants list/detail; change plan; set/extend trial; suspend → the tenant hits `/app/suspended`;
  reactivate; impersonate (4h, audited); data export; lifecycle visibility panel.
- Library / blog / feature-flags / leads / revenue as available; the admin action log records each
  mutation.

---

## Notes / known edges

- **Single-location demo tenant** can't exercise the multi-station paths (transfer prompt,
  per-station count selector, recipe station picker) — use a 2-location tenant for steps 4, 6
  (refuse), 8 (prompt), 11 (per-station), and §4 multi-station.
- **Legacy count-only ingredients** (set by old global counts, never delivered, no batches) may show
  a transient mismatch until their first per-station count reconciles their batches — batch-tracked
  ingredients (the norm) are unaffected.
- **Per-location period reports** are not yet split by station (period totals stay global); this is a
  known follow-up.
