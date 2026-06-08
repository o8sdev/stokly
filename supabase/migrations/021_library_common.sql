-- ════════════════════════════════════════════════════════════════════════
-- 021 — "Common" flag on the global ingredient library
--
-- Marks the everyday basics so the business app can offer one-click quick-add
-- chips, and adds the most-common items that were missing (fresh herbs + a few
-- pantry staples).
-- ════════════════════════════════════════════════════════════════════════

alter table public.global_ingredient_library
  add column is_common boolean not null default false;

-- Flag the existing basics.
update public.global_ingredient_library
set is_common = true
where name_az in (
  'Duz', 'Qara istiot', 'Qırmızı istiot', 'Şəkər', 'Un', 'Düyü',
  'Bitki yağı', 'Zeytun yağı', 'Kərə yağı',
  'Soğan', 'Sarımsaq', 'Pomidor', 'Xiyar', 'Kartof', 'Kök', 'Bibər', 'Limon',
  'Göyərti (qarışıq)',
  'Yumurta', 'Süd', 'Pendir', 'Qaymaq', 'Yoğurt',
  'Toyuq döşü', 'Mal əti'
);

-- Add the missing common items (all flagged common). yield stored as a fraction.
insert into public.global_ingredient_library
  (name_az, name_ru, category, default_unit, default_yield_percent, is_common, sort_order)
values
  ('Cəfəri',         'Петрушка',       'Göyərti',       'kq', 0.90, true, 1),
  ('Keşniş',         'Кинза',          'Göyərti',       'kq', 0.90, true, 2),
  ('Şüyüd',          'Укроп',          'Göyərti',       'kq', 0.90, true, 3),
  ('Nanə',           'Мята',           'Göyərti',       'kq', 0.90, true, 4),
  ('Göy soğan',      'Зелёный лук',    'Göyərti',       'kq', 0.90, true, 5),
  ('Tərxun',         'Тархун',         'Göyərti',       'kq', 0.90, true, 6),
  ('Sumaq',          'Сумах',          'Ədviyyat',      'q',  1.00, true, 20),
  ('Sarıkök',        'Куркума',        'Ədviyyat',      'q',  1.00, true, 21),
  ('Dəfnə yarpağı',  'Лавровый лист',  'Ədviyyat',      'q',  1.00, true, 22),
  ('Pomidor pastası','Томатная паста', 'Yarımfabrikat', 'kq', 1.00, true, 40),
  ('Sirkə',          'Уксус',          'Yarımfabrikat', 'l',  1.00, true, 41),
  ('Maya',           'Дрожжи',         'Un',            'q',  1.00, true, 42),
  ('Bal',            'Мёд',            'Yarımfabrikat', 'kq', 1.00, true, 43);
