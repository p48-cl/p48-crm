-- Logo por cliente: columna en empresas + bucket público «logos» (PNG/JPG/WebP, máx 512 KB).
-- Escritura solo para miembros (es_miembro()). Aplicada vía MCP.
alter table public.empresas add column if not exists logo_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 524288, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 524288, allowed_mime_types = array['image/png','image/jpeg','image/webp'];

drop policy if exists logos_miembros_insert on storage.objects;
drop policy if exists logos_miembros_update on storage.objects;
drop policy if exists logos_miembros_delete on storage.objects;
create policy logos_miembros_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and public.es_miembro());
create policy logos_miembros_update on storage.objects for update to authenticated
  using (bucket_id = 'logos' and public.es_miembro()) with check (bucket_id = 'logos' and public.es_miembro());
create policy logos_miembros_delete on storage.objects for delete to authenticated
  using (bucket_id = 'logos' and public.es_miembro());
