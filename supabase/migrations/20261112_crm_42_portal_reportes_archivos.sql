-- crm_42 · El portal del cliente también ve los reportes subidos como archivo (crm_40).
-- Se agregan columnas al final de la vista; las políticas de storage ya permiten leer solo lo visible para el cliente.
create or replace view public.portal_reportes as
 select id, empresa_id, proyecto_id, titulo, tipo, periodo, url, archivo_path, archivo_nombre
   from public.reportes r
  where (not archivado) and visible_cliente and (empresa_id in (select public.empresas_del_cliente()));
