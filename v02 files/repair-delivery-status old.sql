-- ===================================================================
-- repair-delivery-status.sql — one-time fix for deliveries that were
-- saved before the tire_inventory status-update fix existed (or that
-- silently failed to update). Safe to run multiple times.
--
-- What it does: for every S/N attached to a delivery via
-- delivery_items, sets its current warehouse + item status to match
-- what that delivery actually did — CST-WHS + 'Delivered' for
-- Customer Delivery, or the destination warehouse for Warehouse
-- Transfer. Run this once in the Supabase SQL Editor.
-- ===================================================================

update tire_inventory ti
set
  whs = case when gd.delivery_type = 'Warehouse Transfer' then gd.to_whs else 'CST-WHS' end,
  item_status = case when gd.delivery_type = 'Warehouse Transfer' then ti.item_status else 'Delivered' end
from delivery_items di
join goods_delivery gd on gd.id = di.delivery_id
where di.sn = ti.sn;

-- Quick check afterward — this should return 0 rows if everything is fixed:
-- select ti.sn, ti.whs, ti.item_status, gd.note_no, gd.delivery_type
-- from tire_inventory ti
-- join delivery_items di on di.sn = ti.sn
-- join goods_delivery gd on gd.id = di.delivery_id
-- where gd.delivery_type = 'Customer Delivery' and (ti.whs != 'CST-WHS' or ti.item_status != 'Delivered');
