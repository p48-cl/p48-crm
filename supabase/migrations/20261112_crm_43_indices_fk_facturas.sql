-- Índices para FK de facturas (linter: unindexed_foreign_keys)
create index if not exists facturas_cotizacion_idx on public.facturas (cotizacion_id);
create index if not exists facturas_oportunidad_idx on public.facturas (oportunidad_id);
create index if not exists facturas_creada_por_idx on public.facturas (creada_por);
