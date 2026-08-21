-- ===================================================================
-- migration-v5.sql — run this if you already have the v4 database
-- set up. Run once in the Supabase SQL Editor.
-- ===================================================================

-- 1. New fields on Goods Receiving
alter table goods_receiving add column if not exists received_by text;
alter table goods_receiving add column if not exists remarks text;

-- 2. New fields on Goods Delivery
alter table goods_delivery add column if not exists po_customer text;
alter table goods_delivery add column if not exists remarks text;

-- 3. Goods Return restructured to support multiple S/N per return (like
--    Goods Delivery). If you already have return data in the old
--    single-sn goods_return table, back it up first — this migrates
--    it automatically into the new structure.
alter table goods_return add column if not exists qty integer;

create table if not exists return_items (
  id bigint generated always as identity primary key,
  return_id bigint references goods_return(id) on delete cascade,
  sn text references tire_inventory(sn)
);
alter table return_items enable row level security;
do $$ begin
  create policy "allow all - return_items" on return_items for all using (true) with check (true);
exception when duplicate_object then null;
end $$;

-- If the old goods_return table still has a "sn" column (single S/N per
-- return), migrate each existing row into return_items, then drop it:
do $$ begin
  if exists (select 1 from information_schema.columns where table_name='goods_return' and column_name='sn') then
    insert into return_items (return_id, sn)
    select id, sn from goods_return where sn is not null;
    update goods_return set qty = 1 where qty is null;
    alter table goods_return drop column sn;
  end if;
end $$;
