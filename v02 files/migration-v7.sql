-- ===================================================================
-- migration-v7.sql — fields needed for the official Delivery Note
-- PDF template (CI Number, PO Date, No Container, shipping vendor,
-- ETA, per-item remarks). Run once in Supabase SQL Editor.
-- ===================================================================

alter table goods_delivery add column if not exists ci_number text;
alter table goods_delivery add column if not exists po_date date;
alter table goods_delivery add column if not exists no_container text;
alter table goods_delivery add column if not exists shipping_vendor text;
alter table goods_delivery add column if not exists eta text;

alter table delivery_items add column if not exists remarks text;
