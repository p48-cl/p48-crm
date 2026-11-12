-- Procedencia manual: reemplaza prospeccion_directa por manual.
-- No hay filas con prospeccion_directa; las filas con origen null no se tocan.
alter table public.empresas drop constraint if exists empresas_origen_check;
alter table public.empresas add constraint empresas_origen_check
  check (origen in ('lead','referido','manual','cliente_existente','otro'));
