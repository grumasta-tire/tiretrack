-- Run this FIRST, before repair-delivery-status.sql (or before using
-- Goods Delivery for Customer Delivery at all) — CST-WHS represents
-- "with a customer" collectively and needs to exist as a row in
-- warehouses because tire_inventory.whs has a foreign key to it.

insert into warehouses (code, name, address)
values ('CST-WHS', 'Customer Site (Various)', 'Represents tires currently delivered to any customer site')
on conflict (code) do nothing;
