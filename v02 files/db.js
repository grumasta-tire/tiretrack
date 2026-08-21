/* ===================================================================
   db.js — every Supabase call for TireTrack, in one place.
   Fill in your project's URL + anon key below, then run schema.sql
   in the Supabase SQL editor, and create the "attachments" storage
   bucket (see storage-setup.md) before uploading POD/documents.
=================================================================== */

(function () {
 const SUPABASE_URL = 'https://rapjjwfwkcufyxghldem.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhcGpqd2Z3a2N1Znl4Z2hsZGVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1NjAxMDcsImV4cCI6MjEwMjEzNjEwN30.LYrTCAFZWT5B17P3D0eRFE_hsoEePlStXIzTDzc_i8Y';


  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  async function uploadFile(folder, file) {
    if (!file) return null;
    const path = `${folder}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    const { error } = await sb.storage.from('attachments').upload(path, file);
    if (error) throw error;
    const { data } = sb.storage.from('attachments').getPublicUrl(path);
    return data.publicUrl;
  }

  async function uploadMultipleFiles(folder, files) {
    const urls = [];
    for (const file of files) { urls.push(await uploadFile(folder, file)); }
    return urls;
  }

  /* ---------------- Reference data ---------------- */
  const RefDB = {
    async warehouses() {
      const { data, error } = await sb.from('warehouses').select('*').order('code');
      if (error) throw error;
      return data;
    },
    async vendors() {
      const { data, error } = await sb.from('vendors').select('*').order('name');
      if (error) throw error;
      return data;
    },
    async customers() {
      const { data, error } = await sb.from('customers').select('*, customer_sites(*)').order('name');
      if (error) throw error;
      return data;
    },
    async tireCatalog() {
      const { data, error } = await sb.from('tire_catalog').select('*').order('brand');
      if (error) throw error;
      return data;
    }
  };

  /* ---------------- Customer (name/address/PIC/contact + multiple sites) ---------------- */
  const CustomerDB = {
    async list() {
      const { data, error } = await sb.from('customers').select('*, customer_sites(*)').order('name');
      if (error) throw error;
      return data;
    },
    async create(customer, siteNames) {
      const { data: c, error: cErr } = await sb.from('customers').insert([customer]).select().single();
      if (cErr) throw cErr;
      const sites = siteNames.filter(s => s.trim()).map(s => ({ customer_id: c.id, site_name: s.trim() }));
      if (sites.length) {
        const { error: sErr } = await sb.from('customer_sites').insert(sites);
        if (sErr) throw sErr;
      }
      return c;
    },
    async update(id, customer, siteRows) {
      // siteRows: [{id?, site_name}] — id present = existing site (update), absent = new site to insert
      const { error: cErr } = await sb.from('customers').update(customer).eq('id', id);
      if (cErr) throw cErr;

      const existing = siteRows.filter(s => s.id);
      const fresh = siteRows.filter(s => !s.id && s.site_name.trim());
      for (const s of existing) {
        await sb.from('customer_sites').update({ site_name: s.site_name }).eq('id', s.id);
      }
      if (fresh.length) {
        await sb.from('customer_sites').insert(fresh.map(s => ({ customer_id: id, site_name: s.site_name.trim() })));
      }
    },
    async removeSite(siteId) {
      const { error } = await sb.from('customer_sites').delete().eq('id', siteId);
      if (error) throw error;
    },
    async remove(id) {
      const { error } = await sb.from('customers').delete().eq('id', id);
      if (error) throw error;
    }
  };

  /* ---------------- Master Data CRUD (the only pages allowed to edit/delete) ---------------- */
  const MasterDB = {
    async list(table) {
      const orderCol = table === 'warehouses' ? 'code' : 'id';
      const { data, error } = await sb.from(table).select('*').order(orderCol, { ascending: table === 'warehouses' });
      if (error) throw error;
      return data;
    },
    async create(table, record) {
      const { error } = await sb.from(table).insert([record]);
      if (error) throw error;
    },
    async update(table, id, record) {
      const idCol = table === 'warehouses' ? 'code' : 'id';
      const { error } = await sb.from(table).update(record).eq(idCol, id);
      if (error) throw error;
    },
    async remove(table, id) {
      const idCol = table === 'warehouses' ? 'code' : 'id';
      const { error } = await sb.from(table).delete().eq(idCol, id);
      if (error) throw error;
    }
  };

  /* ---------------- Tire Inventory (read-only view; changes happen via the transactions below) ---------------- */
  const InventoryDB = {
    async list() {
      const { data, error } = await sb.from('tire_inventory').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    async getBySN(sn) {
      const { data, error } = await sb.from('tire_inventory').select('*').eq('sn', sn).maybeSingle();
      if (error) throw error;
      return data;
    }
  };

  /* ---------------- Goods Receiving ---------------- */
  const ReceivingDB = {
    async list() {
      const { data, error } = await sb.from('goods_receiving').select('*, vendors(name)').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    // header: {no, posting_date, delivery_date, receive_date, receiving_type, vendor_id, from_whs, to_whs, qty, driver_name, driver_phone, plate_no}
    // items: [{sn, tire_size, pattern, compound, brand}]
    // docFile: File object or null
    async create(header, items, docFile) {
      const source_doc_url = await uploadFile('receiving-docs', docFile);
      const { data: receiving, error: recErr } = await sb.from('goods_receiving')
        .insert([{ ...header, source_doc_url }]).select().single();
      if (recErr) throw recErr;

      const rows = items.map(it => ({
        sn: it.sn, brand: it.brand || 'LUAN', tire_size: it.tire_size, pattern: it.pattern, compound: it.compound,
        whs: header.to_whs, item_status: 'Available', receive_date: header.receive_date, receiving_id: receiving.id
      }));
      const { error: invErr } = await sb.from('tire_inventory').insert(rows);
      if (invErr) throw invErr;

      // If this receiving is the destination side of a Warehouse Transfer, link it so the
      // originating delivery can auto-close.
      if (header.linked_delivery_id) {
        await sb.from('goods_receiving').update({ linked_delivery_id: header.linked_delivery_id }).eq('id', receiving.id);
      }
      return receiving;
    }
  };

  /* ---------------- Goods Delivery ---------------- */
  const DeliveryDB = {
    async list() {
      const { data, error } = await sb.from('goods_delivery')
        .select('*, customers(name, address, pic), customer_sites(site_name), delivery_items(sn, remarks, tire_inventory(brand, tire_size, pattern)), delivery_attachments(id, file_url)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    // header: {note_no, date, delivery_type, from_whs, to_whs, customer_id, site_id, driver_name, driver_phone, plate_no, qty}
    // items: [{sn}]
    // attachmentFiles: array of up to 4 File objects (optional, for record-keeping only)
    async create(header, items, attachmentFiles) {
      const { data: delivery, error: delErr } = await sb.from('goods_delivery').insert([header]).select().single();
      if (delErr) throw delErr;

      const rows = items.map(it => ({ delivery_id: delivery.id, sn: it.sn, remarks: it.remarks || null }));
      const { error: itemErr } = await sb.from('delivery_items').insert(rows);
      if (itemErr) throw itemErr;

      // Move the physical tires: update their current warehouse AND item status.
      const newWhs = header.delivery_type === 'Warehouse Transfer' ? header.to_whs : 'CST-WHS';
      const newStatus = header.delivery_type === 'Warehouse Transfer' ? undefined : 'Delivered';
      const sns = items.map(it => it.sn);
      const updatePayload = newStatus ? { whs: newWhs, item_status: newStatus } : { whs: newWhs };
      const { data: movedRows, error: moveErr } = await sb.from('tire_inventory').update(updatePayload).in('sn', sns).select('sn');
      if (moveErr) throw moveErr;
      if (!movedRows || movedRows.length !== sns.length) {
        const movedSns = (movedRows || []).map(r => r.sn);
        const missed = sns.filter(sn => !movedSns.includes(sn));
        throw new Error(`Delivery was saved, but ${missed.length} S/N could not be updated in Inventory (not found or S/N mismatch): ${missed.join(', ')}. Please check these manually.`);
      }

      if (attachmentFiles && attachmentFiles.length) {
        const urls = await uploadMultipleFiles('delivery-attachments', attachmentFiles.slice(0, 4));
        const attRows = urls.filter(Boolean).map(file_url => ({ delivery_id: delivery.id, file_url }));
        if (attRows.length) await sb.from('delivery_attachments').insert(attRows);
      }

      return delivery;
    },
    // Upload POD — receiver name, receipt date, and a photo/scan. All three close the delivery automatically.
    async submitPod(deliveryId, receiverName, receiptDate, podFile) {
      const pod_file_url = await uploadFile('pod', podFile);
      const { error } = await sb.from('goods_delivery')
        .update({ receiver_name: receiverName, receipt_date: receiptDate, pod_file_url })
        .eq('id', deliveryId);
      if (error) throw error;
    }
  };

  /* ---------------- Goods Return ---------------- */
  const ReturnDB = {
    async list() {
      const { data, error } = await sb.from('goods_return')
        .select('*, customers(name), customer_sites(site_name), return_items(sn, tire_inventory(brand, tire_size, pattern, compound))')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    // header: {return_no, date, customer_id, site_id, reason, to_whs, driver_name, driver_phone, plate_no, qty}
    // items: [{sn, brand, tire_size, pattern, compound}] — brand/size/pattern/compound only used if the S/N is new
    async create(header, items) {
      const { data: ret, error: retErr } = await sb.from('goods_return').insert([header]).select().single();
      if (retErr) throw retErr;

      for (const it of items) {
        const existing = await sb.from('tire_inventory').select('sn').eq('sn', it.sn).maybeSingle();
        if (existing.data) {
          const { error: invErr } = await sb.from('tire_inventory')
            .update({ whs: header.to_whs, item_status: 'Return', active: true })
            .eq('sn', it.sn);
          if (invErr) throw invErr;
        } else {
          const { error: insErr } = await sb.from('tire_inventory').insert([{
            sn: it.sn, brand: it.brand || 'LUAN', tire_size: it.tire_size, pattern: it.pattern, compound: it.compound,
            whs: header.to_whs, item_status: 'Return', active: true, receive_date: header.date
          }]);
          if (insErr) throw insErr;
        }
      }

      const rows = items.map(it => ({ return_id: ret.id, sn: it.sn }));
      const { error: itemErr } = await sb.from('return_items').insert(rows);
      if (itemErr) throw itemErr;

      return ret;
    }
  };

  /* ---------------- Stock Adjustment ---------------- */
  const AdjustmentDB = {
    async list() {
      const { data, error } = await sb.from('stock_adjustment')
        .select('*, adjustment_items(sn, tire_size, pattern, compound)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    // header: {no, date, reason, to_whs, notes}
    // items: [{sn, tire_size, pattern, compound}]
    // Opening Balance = adds/registers stock (positive). Any other reason
    // (Damaged, Lost / Missing, Count Correction, Other) = removes the
    // matching S/N from active stock — no qty math needed since each row
    // is exactly one physical tire.
    async create(header, items) {
      const { data: adj, error: adjErr } = await sb.from('stock_adjustment').insert([header]).select().single();
      if (adjErr) throw adjErr;

      const rows = items.map(it => ({ adjustment_id: adj.id, sn: it.sn, tire_size: it.tire_size, pattern: it.pattern, compound: it.compound }));
      const { error: itemErr } = await sb.from('adjustment_items').insert(rows);
      if (itemErr) throw itemErr;

      for (const it of items) {
        if (header.reason === 'Opening Balance') {
          const existing = await sb.from('tire_inventory').select('sn').eq('sn', it.sn).maybeSingle();
          if (existing.data) {
            const { error } = await sb.from('tire_inventory').update({ whs: header.to_whs, active: true }).eq('sn', it.sn);
            if (error) throw error;
          } else {
            const { error } = await sb.from('tire_inventory').insert([{
              sn: it.sn, brand: it.brand || 'LUAN', tire_size: it.tire_size, pattern: it.pattern, compound: it.compound,
              whs: header.to_whs, item_status: 'Available', active: true, receive_date: header.date
            }]);
            if (error) throw error;
          }
        } else {
          const { error } = await sb.from('tire_inventory').update({ active: false }).eq('sn', it.sn);
          if (error) throw error;
        }
      }
      return adj;
    }
  };

  window.RefDB = RefDB;
  window.CustomerDB = CustomerDB;
  window.MasterDB = MasterDB;
  window.InventoryDB = InventoryDB;
  window.ReceivingDB = ReceivingDB;
  window.DeliveryDB = DeliveryDB;
  window.ReturnDB = ReturnDB;
  window.AdjustmentDB = AdjustmentDB;
  window.runDb = function (promise, onSuccess, onError) { promise.then(onSuccess).catch(onError); };
})();
