-- crm_37 · Ficha de cliente: estado de pago, facturación, inicio de contrato y riesgos (manual).
-- Todas las columnas son nulas: no reescriben datos existentes.

alter table public.empresas
  add column if not exists inicio_contrato date,
  add column if not exists estado_pago text,
  add column if not exists fecha_ultimo_pago date,
  add column if not exists proxima_facturacion date,
  add column if not exists riesgos_oportunidades text;

alter table public.empresas drop constraint if exists empresas_estado_pago_check;
alter table public.empresas add constraint empresas_estado_pago_check
  check (estado_pago is null or estado_pago in ('al_dia','por_vencer','atrasado'));
