-- ── Recipe categories (menu sections) ───────────────────────────────────────
-- Menus group dishes into sections (breakfast, omelettes, hot dishes, soups…).
-- A tenant defines its own categories; each recipe may belong to one. The
-- recipes list and the analysis reports (menu engineering, food cost) filter by
-- category so the owner can focus on one section at a time.
create table if not exists public.recipe_categories (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  name        text not null,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  unique (tenant_id, name)
);
create index if not exists recipe_categories_tenant_idx
  on public.recipe_categories(tenant_id);

alter table public.recipe_categories enable row level security;
create policy "tenant_read" on public.recipe_categories for select
  using (tenant_id = public.current_tenant_id() or public.is_platform_admin());
create policy "tenant_write" on public.recipe_categories for insert
  with check ((tenant_id = public.current_tenant_id()
    and public.current_user_role() in ('owner','manager')) or public.is_platform_admin());
create policy "tenant_update" on public.recipe_categories for update
  using ((tenant_id = public.current_tenant_id()
    and public.current_user_role() in ('owner','manager')) or public.is_platform_admin());
create policy "tenant_delete" on public.recipe_categories for delete
  using ((tenant_id = public.current_tenant_id()
    and public.current_user_role() in ('owner','manager')) or public.is_platform_admin());

-- Deleting a category never deletes recipes — they just become uncategorised.
alter table public.recipes
  add column if not exists category_id uuid references public.recipe_categories(id) on delete set null;
create index if not exists recipes_category_idx on public.recipes(category_id);
