-- ===================================================================
-- migration-v8.sql — Vendor field on Goods Delivery is now a proper
-- link to Master Vendor (dropdown), replacing the earlier free-text
-- "shipping_vendor" field. Run once in Supabase SQL Editor.
-- ===================================================================

alter table goods_delivery add column if not exists vendor_id bigint references vendors(id);

-- If you'd added "PICKUP SELF" as free text before, add it as an
-- actual vendor row now so it's selectable from the dropdown:
insert into vendors (name, contact, address)
select 'PICKUP SELF', null, null
where not exists (select 1 from vendors where name = 'PICKUP SELF');

-- The old free-text column (if migration-v7 was run) is no longer
-- used by the app but is left in place — safe to drop later once
-- you've confirmed nothing needs it:
-- alter table goods_delivery drop column if exists shipping_vendor;
