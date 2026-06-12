-- ── 050: DB review hardening ────────────────────────────────────────────────
-- 1) blog_posts gains an 'archived' status: a published post can be taken off
--    the public site without deleting it (public pages filter status =
--    'published', so archived posts disappear there automatically) and can be
--    re-published later. Text + CHECK stays the pattern (cheap to extend).
alter table public.blog_posts drop constraint if exists blog_posts_status_check;
alter table public.blog_posts
  add constraint blog_posts_status_check
  check (status = any (array['draft'::text, 'published'::text, 'archived'::text]));

-- 2) daily_sales_items: the old UNIQUE (daily_sales_id, recipe_id) made a dish
--    either ALL paid or ALL comp for a day — "3 sold + 1 staff meal" of the
--    same dish was unrepresentable. Include is_comp in the key so one paid row
--    and one comp row can coexist per dish per day.
alter table public.daily_sales_items
  drop constraint if exists daily_sales_items_daily_sales_id_recipe_id_key;
alter table public.daily_sales_items
  add constraint daily_sales_items_day_recipe_comp_key
  unique (daily_sales_id, recipe_id, is_comp);
