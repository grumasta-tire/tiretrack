-- ===================================================================
-- migration-v6.sql — Stock Adjustment redesign (Opening Balance +
-- batch-based, no more vendor/driver/plate/qty_change fields).
-- Run once in the Supabase SQL Editor.
--
-- WARNING: this replaces the old stock_adjustment table structure.
-- If you have existing adjustment records you want to keep, export
-- them first (Table Editor > stock_adjustment > Export). This
-- migration does not attempt to auto-convert old rows, since the
-- old model (single S/N + qty_change) doesn't map cleanly onto the
-- new batch model.
-- ===================================================================

drop table if exists stock_adjustment cascade;

create table stock_adjustment (
  id bigint generated always as identity primary key,
  no text unique not null,
  date date,
  reason text,
  to_whs text references warehouses(code),
  notes text,
  created_at timestamptz default now()
);

create table if not exists adjustment_items (
  id bigint generated always as identity primary key,
  adjustment_id bigint references stock_adjustment(id) on delete cascade,
  sn text,
  tire_size text,
  pattern text,
  compound text
);

alter table stock_adjustment enable row level security;
alter table adjustment_items enable row level security;

do $$ begin
  create policy "allow all - stock_adjustment" on stock_adjustment for all using (true) with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "allow all - adjustment_items" on adjustment_items for all using (true) with check (true);
exception when duplicate_object then null;
end $$;
