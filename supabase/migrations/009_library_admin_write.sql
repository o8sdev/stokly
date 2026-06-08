-- ════════════════════════════════════════════════════════════════════════
-- 009 — Let system admins curate the global ingredient library.
-- The library is public-read (007); these add admin-only write policies so the
-- console can add/edit/remove catalog entries without the service key.
-- ════════════════════════════════════════════════════════════════════════

create policy "admin_insert" on public.global_ingredient_library
  for insert with check (public.is_platform_admin());

create policy "admin_update" on public.global_ingredient_library
  for update using (public.is_platform_admin());

create policy "admin_delete" on public.global_ingredient_library
  for delete using (public.is_platform_admin());
