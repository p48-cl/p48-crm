-- crm_40 · Reportes con archivo subido manualmente (PDF, PPTX, XLSX, imágenes...)
-- Aditivo: la columna url pasa a ser opcional; todo reporte debe tener url o archivo.
alter table public.reportes
  add column if not exists archivo_path text,
  add column if not exists archivo_nombre text,
  add column if not exists archivo_bytes bigint;

alter table public.reportes alter column url drop not null;
alter table public.reportes drop constraint if exists reportes_tipo_check;
alter table public.reportes add constraint reportes_tipo_check
  check (tipo = any (array['mensual','auditoria','presentacion','otro']));
alter table public.reportes add constraint reportes_url_o_archivo_check
  check (url is not null or archivo_path is not null);

-- Bucket privado (50 MB por archivo). Los clientes no leen directo: solo lo visible para ellos.
insert into storage.buckets (id, name, public, file_size_limit)
values ('reportes', 'reportes', false, 52428800)
on conflict (id) do nothing;

create policy "reportes_miembros_select" on storage.objects for select to authenticated
  using (bucket_id = 'reportes' and public.es_miembro());
create policy "reportes_miembros_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'reportes' and public.es_miembro());
create policy "reportes_miembros_update" on storage.objects for update to authenticated
  using (bucket_id = 'reportes' and public.es_miembro());
create policy "reportes_admin_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'reportes' and public.es_admin());
create policy "reportes_cliente_select" on storage.objects for select to authenticated
  using (
    bucket_id = 'reportes'
    and exists (
      select 1 from public.reportes r
      where r.archivo_path = storage.objects.name
        and r.visible_cliente and not r.archivado
        and r.empresa_id in (select public.empresas_del_cliente())
    )
  );
