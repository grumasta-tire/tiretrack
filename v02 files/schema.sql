-- ===================================================================
-- TireTrack — full schema (run in Supabase SQL Editor)
-- Run the DROP block first only if you're starting fresh / replacing
-- an earlier version of these tables.
-- ===================================================================

-- drop table if exists delivery_items, stock_adjustment, goods_return, goods_delivery, goods_receiving, tire_inventory, tire_catalog, customer_sites, customers, vendors, warehouses cascade;

create table warehouses (
  code text primary key,          -- 'JKT-WHS', 'BPN-WHS'
  name text not null,
  address text
);

create table vendors (
  id bigint generated always as identity primary key,
  name text not null,
  contact text,
  address text
);

create table customers (
  id bigint generated always as identity primary key,
  name text not null,
  address text,
  pic text,
  contact text
);

create table customer_sites (
  id bigint generated always as identity primary key,
  customer_id bigint references customers(id) on delete cascade,
  site_name text not null
);

-- Reference catalog of valid tire specs (Master Tire page)
create table tire_catalog (
  id bigint generated always as identity primary key,
  brand text,
  tire_size text,
  pattern text,
  compound text
);

-- Every physical, serialized tire. `whs` is the CURRENT location.
-- 'CST-WHS' means it's with a customer right now.
create table tire_inventory (
  sn text primary key,
  brand text,
  tire_size text,
  pattern text,
  compound text,
  whs text references warehouses(code),
  item_status text default 'Available',   -- 'Available' | 'Delivered' | 'Return'
  active boolean default true,           -- false = removed via Stock Adjustment (damaged/lost)
  receive_date date,
  receiving_id bigint,                   -- which Goods Receiving batch brought this in
  created_at timestamptz default now()
);

create table goods_receiving (
  id bigint generated always as identity primary key,
  no text unique not null,
  posting_date date,               -- date this record was entered/posted in the system
  delivery_date date,               -- date on the vendor's/transfer's delivery note
  receive_date date,                -- date goods physically arrived at the warehouse
  receiving_type text,             -- 'Vendor' | 'Warehouse Transfer'
  vendor_id bigint references vendors(id),
  from_whs text references warehouses(code),   -- used when receiving_type = 'Warehouse Transfer'
  to_whs text references warehouses(code),
  qty integer,
  driver_name text,
  driver_phone text,
  plate_no text,
  received_by text,
  remarks text,
  source_doc_url text,             -- optional archive document, not tied to status
  linked_delivery_id bigint,       -- ties a transfer receipt back to the delivery that shipped it
  created_at timestamptz default now()
);

create table goods_delivery (
  id bigint generated always as identity primary key,
  note_no text unique not null,
  date date,
  delivery_type text,              -- 'Customer Delivery' | 'Warehouse Transfer'
  from_whs text references warehouses(code),
  to_whs text references warehouses(code),     -- used when delivery_type = 'Warehouse Transfer'
  customer_id bigint references customers(id),
  site_id bigint references customer_sites(id),
  driver_name text,
  driver_phone text,
  plate_no text,
  eta text,
  qty integer,
  ci_number text,
  po_customer text,        -- "PO Number" on the printed document
  po_date date,
  no_container text,
  shipping_vendor text,     -- e.g. "PICKUP SELF" or a freight forwarder name — who is transporting this shipment
  remarks text,
  receiver_name text,              -- POD field 1
  receipt_date date,                -- POD field 2
  pod_file_url text,               -- POD field 3
  created_at timestamptz default now()
);

create table delivery_items (
  id bigint generated always as identity primary key,
  delivery_id bigint references goods_delivery(id) on delete cascade,
  sn text references tire_inventory(sn),
  remarks text
);

create table delivery_attachments (
  id bigint generated always as identity primary key,
  delivery_id bigint references goods_delivery(id) on delete cascade,
  file_url text not null,
  created_at timestamptz default now()
);

create table goods_return (
  id bigint generated always as identity primary key,
  return_no text unique not null,
  date date,
  customer_id bigint references customers(id),
  site_id bigint references customer_sites(id),
  reason text,
  to_whs text references warehouses(code),
  driver_name text,
  driver_phone text,
  plate_no text,
  qty integer,
  created_at timestamptz default now()
);

create table return_items (
  id bigint generated always as identity primary key,
  return_id bigint references goods_return(id) on delete cascade,
  sn text references tire_inventory(sn)
);

create table stock_adjustment (
  id bigint generated always as identity primary key,
  no text unique not null,
  date date,
  reason text,              -- 'Opening Balance' | 'Damaged' | 'Lost / Missing' | 'Count Correction' | 'Other'
  to_whs text references warehouses(code),
  notes text,
  created_at timestamptz default now()
);

create table adjustment_items (
  id bigint generated always as identity primary key,
  adjustment_id bigint references stock_adjustment(id) on delete cascade,
  sn text,
  tire_size text,
  pattern text,
  compound text
);

-- Row Level Security — permissive for now (internal team use only, no login yet)
alter table warehouses enable row level security;
alter table vendors enable row level security;
alter table customers enable row level security;
alter table customer_sites enable row level security;
alter table tire_catalog enable row level security;
alter table tire_inventory enable row level security;
alter table goods_receiving enable row level security;
alter table goods_delivery enable row level security;
alter table delivery_items enable row level security;
alter table delivery_attachments enable row level security;
alter table goods_return enable row level security;
alter table return_items enable row level security;
alter table stock_adjustment enable row level security;
alter table adjustment_items enable row level security;

create policy "allow all - warehouses" on warehouses for all using (true) with check (true);
create policy "allow all - vendors" on vendors for all using (true) with check (true);
create policy "allow all - customers" on customers for all using (true) with check (true);
create policy "allow all - customer_sites" on customer_sites for all using (true) with check (true);
create policy "allow all - tire_catalog" on tire_catalog for all using (true) with check (true);
create policy "allow all - tire_inventory" on tire_inventory for all using (true) with check (true);
create policy "allow all - goods_receiving" on goods_receiving for all using (true) with check (true);
create policy "allow all - goods_delivery" on goods_delivery for all using (true) with check (true);
create policy "allow all - delivery_items" on delivery_items for all using (true) with check (true);
create policy "allow all - delivery_attachments" on delivery_attachments for all using (true) with check (true);
create policy "allow all - goods_return" on goods_return for all using (true) with check (true);
create policy "allow all - return_items" on return_items for all using (true) with check (true);
create policy "allow all - stock_adjustment" on stock_adjustment for all using (true) with check (true);
create policy "allow all - adjustment_items" on adjustment_items for all using (true) with check (true);

-- Seed reference data
insert into warehouses (code, name, address) values
  ('JKT-WHS', 'Jakarta Warehouse (Main)', 'Sampoerna Strategic Square, South Tower, 8th Floor, Jakarta'),
  ('BPN-WHS', 'Balikpapan Warehouse (Secondary)', 'Kawasan Industri Kariangau, Balikpapan'),
  ('CST-WHS', 'Customer Site (Various)', 'Represents tires currently delivered to any customer site');

insert into vendors (name, contact, address) values
  ('PT Multistrada Arah Sarana', '+62 21-5555-0101', 'Cikarang, West Java'),
  ('PT Gajah Tunggal Tbk', '+62 21-5555-0202', 'Tangerang, Banten'),
  ('Haian Group HQ (Factory)', '+86 21-5555-0303', 'Shanghai, China');

insert into customers (name) values
  ('PT Kaltim Prima Coal'), ('PT Berau Coal'), ('PT Adaro Indonesia'), ('PT Kideco Jaya Agung'), ('PT Bukit Asam');

insert into customer_sites (customer_id, site_name) values
  ((select id from customers where name='PT Kaltim Prima Coal'), 'Sangatta Site'),
  ((select id from customers where name='PT Berau Coal'), 'Lati Site'),
  ((select id from customers where name='PT Berau Coal'), 'Binungan Site'),
  ((select id from customers where name='PT Adaro Indonesia'), 'Tutupan Site'),
  ((select id from customers where name='PT Adaro Indonesia'), 'Wara Site'),
  ((select id from customers where name='PT Kideco Jaya Agung'), 'Roto South'),
  ((select id from customers where name='PT Bukit Asam'), 'Tanjung Enim');

insert into tire_catalog (brand, tire_size, pattern, compound) values
  ('LUAN', '27.00R49', 'HA-710', 'Standard'),
  ('LUAN', '16.00R25', 'HA-710', 'Standard'),
  ('LUAN', '18.00R25', 'GT-751', 'Heavy Duty'),
  ('LUAN', '23.5R25', 'E-3/L-3', 'Standard');
