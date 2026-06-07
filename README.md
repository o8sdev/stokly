# Stokly

Restaurant inventory and food-cost management SaaS for the Azerbaijani market — Phase 1 MVP.

## Stack

- **Next.js 14** (App Router) + **TypeScript** (strict)
- **Supabase** — PostgreSQL, Auth, Storage, Row-Level Security
- **Tailwind CSS** + **shadcn/ui**
- **React Hook Form** + **Zod**
- **next-intl** — Azerbaijani (default) + Russian

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a Supabase project, then copy the env template and fill it in:

   ```bash
   cp .env.local.example .env.local
   ```

   Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. No
   service-role key is needed — tenant provisioning at signup runs in a
   database trigger (migration 005).

3. Apply the database migrations (via the Supabase CLI or SQL editor),
   in order `001` → `005`:

   ```bash
   supabase db push
   # or run supabase/migrations/*.sql in filename order
   ```

4. Run the dev server:

   ```bash
   npm run dev
   ```

## Core domain rules

- **`stock_movements` is append-only.** No `UPDATE`/`DELETE` anywhere.
- **Current stock is always derived** from the movement log via
  `deriveStockLevel()` — never stored on `ingredients`.
- **Food cost always applies yield.** 200g needed at 85% yield costs
  `200 / 0.85 = 235g` of purchased product. See
  `lib/calculations/food-cost.ts`.
- **`tenant_id` is always server-resolved** from `tenant_members` — never from
  client input. See `lib/auth/tenant.ts`.

## Project layout

- `app/[locale]/(auth)` — login / signup
- `app/[locale]/(dashboard)` — authenticated app (ingredients, recipes,
  inventory, reports, settings)
- `lib/calculations` — food-cost and stock-level logic
- `lib/validations` — Zod schemas
- `lib/supabase` — browser / server / middleware clients
- `messages` — `az.json`, `ru.json`
- `supabase/migrations` — schema + RLS
