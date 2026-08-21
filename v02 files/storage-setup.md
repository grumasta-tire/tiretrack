# Supabase Storage setup (for POD photos and receiving documents)

1. In Supabase, go to **Storage** → **New bucket**.
2. Create a bucket named `attachments`, set it to **Public** (so uploaded photos can be viewed via a plain URL — fine since these aren't sensitive files).
3. Add a policy allowing uploads from the anon key: Storage → `attachments` bucket → Policies → New Policy → allow `INSERT` and `SELECT` for role `anon`. (Or run the SQL below in the SQL Editor.)

```sql
create policy "allow anon uploads" on storage.objects
  for insert to anon
  with check (bucket_id = 'attachments');

create policy "allow anon reads" on storage.objects
  for select to anon
  using (bucket_id = 'attachments');
```

Files get uploaded to two folders inside this one bucket: `attachments/pod/` (Goods Delivery POD scans) and `attachments/receiving-docs/` (Goods Receiving source documents).
