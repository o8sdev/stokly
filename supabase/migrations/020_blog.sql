-- ════════════════════════════════════════════════════════════════════════
-- 020 — Blog posts (public marketing content, authored by system admins)
--
-- Bilingual columns (az required, ru optional → falls back to az on the site).
-- Anyone may read PUBLISHED posts; only platform admins may write. Drafts are
-- visible to admins only.
-- ════════════════════════════════════════════════════════════════════════

create table public.blog_posts (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  title_az     text not null,
  title_ru     text,
  excerpt_az   text,
  excerpt_ru   text,
  body_az      text not null,
  body_ru      text,
  cover_url    text,
  tag          text,
  status       text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index blog_posts_status_idx on public.blog_posts(status, published_at desc);

alter table public.blog_posts enable row level security;

-- Public (incl. anonymous) may read published posts; admins see everything.
create policy "public_read" on public.blog_posts
  for select
  using (status = 'published' or public.is_platform_admin());

-- Only platform admins may create / edit / delete.
create policy "admin_write" on public.blog_posts
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- The marketing site reads as the anon role; ensure it can select (RLS still
-- restricts to published rows).
grant select on public.blog_posts to anon, authenticated;
