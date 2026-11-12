-- crm_38 · Facturas registradas manualmente desde el SII y borrado de actividades para admin.

create table if not exists public.facturas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete restrict,
  cotizacion_id uuid references public.cotizaciones(id) on delete set null,
  oportunidad_id uuid references public.oportunidades(id) on delete set null,
  tipo_documento smallint not null default 33 check (tipo_documento in (33, 34)),
  folio integer not null check (folio > 0),
  fecha_emision date not null,
  fecha_vencimiento date,
  monto_neto numeric not null default 0 check (monto_neto >= 0),
  monto_iva numeric not null default 0 check (monto_iva >= 0),
  monto_total numeric not null default 0 check (monto_total >= 0),
  estado_pago text not null default 'pendiente' check (estado_pago in ('pendiente', 'pagada', 'anulada')),
  fecha_pago date,
  medio_pago text,
  url_documento text,
  notas text,
  creada_por uuid references public.miembros(id),
  archivado boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tipo_documento, folio)
);

create index if not exists facturas_empresa_idx on public.facturas (empresa_id);

alter table public.facturas enable row level security;

drop policy if exists "miembros leen facturas" on public.facturas;
create policy "miembros leen facturas" on public.facturas for select using (es_miembro());

drop policy if exists "miembros crean facturas" on public.facturas;
create policy "miembros crean facturas" on public.facturas for insert with check (es_miembro());

drop policy if exists "miembros editan facturas" on public.facturas;
create policy "miembros editan facturas" on public.facturas for update using (es_miembro()) with check (es_miembro());

drop policy if exists "admin borra facturas" on public.facturas;
create policy "admin borra facturas" on public.facturas for delete using (es_admin());

drop policy if exists "admin borra actividades" on public.actividades;
create policy "admin borra actividades" on public.actividades for delete using (es_admin());
