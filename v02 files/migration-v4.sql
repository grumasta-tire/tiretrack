-- ===================================================================
-- migration-v4.sql — run this if you already have the v3 database
-- set up and don't want to lose existing data. Run once in the
-- Supabase SQL Editor.
-- ===================================================================

-- 1. Customer contact fields
alter table customers add column if not exists address text;
alter table customers add column if not exists pic text;
alter table customers add column if not exists contact text;

-- 2. Goods Receiving date fields (replaces the old single "date" column)
alter table goods_receiving add column if not exists posting_date date;
alter table goods_receiving add column if not exists delivery_date date;
alter table goods_receiving add column if not exists receive_date date;
-- Backfill from the old "date" column if it still exists, then you can drop it manually:
-- update goods_receiving set posting_date = date, receive_date = date where posting_date is null;
-- alter table goods_receiving drop column date;

-- 3. Delivery attachments (up to 4 supporting files per delivery)
create table if not exists delivery_attachments (
  id bigint generated always as identity primary key,
  delivery_id bigint references goods_delivery(id) on delete cascade,
  file_url text not null,
  created_at timestamptz default now()
);
alter table delivery_attachments enable row level security;
do $$ begin
  create policy "allow all - delivery_attachments" on delivery_attachments for all using (true) with check (true);
exception when duplicate_object then null;
end $$;

-- 4. Item status: migrate old values to the new three-state model
update tire_inventory set item_status = 'Available' where item_status = 'New Item' and whs != 'CST-WHS';
update tire_inventory set item_status = 'Delivered' where whs = 'CST-WHS';
update tire_inventory set item_status = 'Return' where item_status = 'Return Item';
alter table tire_inventory alter column item_status set default 'Available';
