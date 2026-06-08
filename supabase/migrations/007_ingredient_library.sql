-- ════════════════════════════════════════════════════════════════════════
-- 007 — Global ingredient library (quick-start catalog)
--
-- A non-tenant, read-only catalog of common Azerbaijani restaurant ingredients.
-- Restaurants pick from it to populate their own ingredients in one click.
-- ════════════════════════════════════════════════════════════════════════

create table public.global_ingredient_library (
  id uuid primary key default gen_random_uuid(),
  name_az text not null,
  name_ru text,
  category text not null,
  default_unit text not null,
  default_yield_percent numeric(5,4) default 1.0,
  sort_order integer default 0
);

alter table public.global_ingredient_library enable row level security;

-- Public read; no client writes (curated by the system admin only).
create policy "public_read" on public.global_ingredient_library
  for select using (true);

create index idx_library_category
  on public.global_ingredient_library(category, name_az);

insert into public.global_ingredient_library
  (name_az, name_ru, category, default_unit, default_yield_percent)
values
  -- ƏT VƏ QUŞÇULUQ
  ('Toyuq döşü', 'Куриная грудка', 'Et', 'kq', 0.90),
  ('Toyuq budü', 'Куриное бедро', 'Et', 'kq', 0.85),
  ('Mal əti', 'Говядина', 'Et', 'kq', 0.80),
  ('Donuz əti', 'Свинина', 'Et', 'kq', 0.82),
  ('Qoyun əti', 'Баранина', 'Et', 'kq', 0.78),
  ('Quzu əti', 'Ягнятина', 'Et', 'kq', 0.80),
  ('Hind quşu', 'Индейка', 'Et', 'kq', 0.85),
  ('Kolbasa', 'Колбаса', 'Et', 'kq', 1.0),
  ('Sosis', 'Сосиска', 'Et', 'kq', 1.0),
  ('Bal balığı', 'Форель', 'Baliq', 'kq', 0.65),
  ('Nərə balığı', 'Осётр', 'Baliq', 'kq', 0.60),
  ('Qıl balığı', 'Судак', 'Baliq', 'kq', 0.55),
  -- TƏRƏVƏZ
  ('Pomidor', 'Помидор', 'Tərəvəz', 'kq', 0.90),
  ('Xiyar', 'Огурец', 'Tərəvəz', 'kq', 0.93),
  ('Soğan', 'Лук', 'Tərəvəz', 'kq', 0.85),
  ('Sarımsaq', 'Чеснок', 'Tərəvəz', 'kq', 0.80),
  ('Kartof', 'Картофель', 'Tərəvəz', 'kq', 0.80),
  ('Kök', 'Морковь', 'Tərəvəz', 'kq', 0.85),
  ('Kələm', 'Капуста', 'Tərəvəz', 'kq', 0.80),
  ('Bibər', 'Перец болгарский', 'Tərəvəz', 'kq', 0.85),
  ('Badımcan', 'Баклажан', 'Tərəvəz', 'kq', 0.88),
  ('Kabak', 'Кабачок', 'Tərəvəz', 'kq', 0.90),
  ('Ispanak', 'Шпинат', 'Tərəvəz', 'kq', 0.90),
  ('Göyərti (qarışıq)', 'Зелень', 'Tərəvəz', 'kq', 0.85),
  ('Limon', 'Лимон', 'Tərəvəz', 'kq', 0.75),
  -- SÜD MƏHSULLARİ
  ('Kərə yağı', 'Сливочное масло', 'Süd', 'kq', 1.0),
  ('Bitki yağı', 'Растительное масло', 'Süd', 'l', 1.0),
  ('Zeytun yağı', 'Оливковое масло', 'Süd', 'l', 1.0),
  ('Süd', 'Молоко', 'Süd', 'l', 1.0),
  ('Qaymaq', 'Сливки', 'Süd', 'l', 1.0),
  ('Yoğurt', 'Йогурт', 'Süd', 'kq', 1.0),
  ('Pendir', 'Сыр', 'Süd', 'kq', 1.0),
  ('Kəsmik', 'Творог', 'Süd', 'kq', 1.0),
  ('Yumurta', 'Яйцо', 'Süd', 'ədəd', 1.0),
  -- UN VƏ TAXIL
  ('Un', 'Мука', 'Un', 'kq', 1.0),
  ('Düyü', 'Рис', 'Un', 'kq', 1.0),
  ('Makaron', 'Макароны', 'Un', 'kq', 1.0),
  ('Çörək', 'Хлеб', 'Un', 'kq', 1.0),
  ('Çörək kıntısı', 'Панировочные сухари', 'Un', 'kq', 1.0),
  ('Nişasta', 'Крахмал', 'Un', 'kq', 1.0),
  ('Şəkər', 'Сахар', 'Un', 'kq', 1.0),
  ('Duz', 'Соль', 'Un', 'kq', 1.0),
  -- ƏDVİYYAT
  ('Qara istiot', 'Чёрный перец', 'Ədviyyat', 'q', 1.0),
  ('Qırmızı istiot', 'Красный перец', 'Ədviyyat', 'q', 1.0),
  ('Zəfəran', 'Шафран', 'Ədviyyat', 'q', 1.0),
  ('Darçın', 'Корица', 'Ədviyyat', 'q', 1.0),
  ('Zirə', 'Зира', 'Ədviyyat', 'q', 1.0),
  ('Kəkotu', 'Тимьян', 'Ədviyyat', 'q', 1.0),
  ('Reyhan', 'Базилик', 'Ədviyyat', 'q', 1.0),
  -- İÇKİ
  ('Su (butulka)', 'Вода бутылка', 'İçki', 'ədəd', 1.0),
  ('Çay', 'Чай', 'İçki', 'q', 1.0),
  ('Qəhvə (espresso)', 'Кофе эспрессо', 'İçki', 'q', 1.0),
  ('Limonad bazası', 'База лимонад', 'İçki', 'l', 1.0),
  ('Şirə (portağal)', 'Сок апельсин', 'İçki', 'l', 1.0),
  -- SOUSLAR VƏ YARIMFABRIKAT
  ('Pomidor sousu', 'Томатный соус', 'Yarımfabrikat', 'kq', 1.0),
  ('Mayonez', 'Майонез', 'Yarımfabrikat', 'kq', 1.0),
  ('Ketçup', 'Кетчуп', 'Yarımfabrikat', 'kq', 1.0),
  ('Soya sousu', 'Соевый соус', 'Yarımfabrikat', 'l', 1.0),
  ('Bulyon (toyuq)', 'Бульон куриный', 'Yarımfabrikat', 'l', 1.0);
