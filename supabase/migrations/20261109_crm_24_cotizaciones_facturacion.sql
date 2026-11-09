-- crm_24 · Cotizaciones y datos de facturación del cliente.
-- Solo miembros del equipo (RLS). Sin acceso desde el portal de clientes.

-- 1. Datos de facturación en la ficha (rut ya existe en empresas)
alter table public.empresas
  add column if not exists razon_social text,
  add column if not exists giro text,
  add column if not exists direccion_facturacion text,
  add column if not exists email_facturacion text,
  add column if not exists dias_pago integer not null default 30;

alter table public.empresas drop constraint if exists empresas_dias_pago_check;
alter table public.empresas add constraint empresas_dias_pago_check check (dias_pago between 0 and 365);

-- 2. Cotizaciones
create table if not exists public.cotizaciones (
  id uuid primary key default gen_random_uuid(),
  numero integer generated always as identity,
  empresa_id uuid not null references public.empresas(id) on delete restrict,
  oportunidad_id uuid references public.oportunidades(id) on delete set null,
  titulo text not null,
  estado text not null default 'borrador'
    check (estado in ('borrador','enviada','aceptada','rechazada','vencida')),
  fecha_emision date not null default (now() at time zone 'America/Santiago')::date,
  validez_dias integer not null default 15 check (validez_dias between 1 and 180),
  moneda text not null default 'CLP' check (moneda in ('CLP','USD')),
  iva_pct numeric not null default 19 check (iva_pct between 0 and 100),
  condicion_comision text not null default '',
  condiciones_comerciales text not null default '',
  notas_internas text,
  creada_por uuid references public.miembros(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (numero)
);

-- 3. Líneas de la cotización
create table if not exists public.cotizacion_items (
  id uuid primary key default gen_random_uuid(),
  cotizacion_id uuid not null references public.cotizaciones(id) on delete cascade,
  orden integer not null default 1,
  concepto text not null,
  plan text check (plan is null or plan in ('A','B','C','D','E','personalizado')),
  cantidad numeric not null default 1 check (cantidad > 0),
  precio_neto numeric not null check (precio_neto >= 0),
  recurrente boolean not null default false  -- true = cobro mensual; false = pago único (setup, branding)
);

create index if not exists cotizaciones_empresa_idx on public.cotizaciones(empresa_id);
create index if not exists cotizaciones_oportunidad_idx on public.cotizaciones(oportunidad_id);
create index if not exists cotizaciones_creada_por_idx on public.cotizaciones(creada_por);
create index if not exists cotizacion_items_cotizacion_idx on public.cotizacion_items(cotizacion_id);

create trigger set_updated_at before update on public.cotizaciones
  for each row execute function public.set_updated_at();

-- 4. Totales calculados en la base (no en el navegador)
create or replace view public.v_cotizaciones with (security_invoker = true) as
select
  c.*,
  coalesce(sum(i.cantidad * i.precio_neto) filter (where i.recurrente), 0)      as neto_mensual,
  coalesce(sum(i.cantidad * i.precio_neto) filter (where not i.recurrente), 0)  as neto_unico,
  c.fecha_emision + c.validez_dias                                              as vence_el
from public.cotizaciones c
left join public.cotizacion_items i on i.cotizacion_id = c.id
group by c.id;

-- 5. RLS: solo miembros; borrar solo admin
alter table public.cotizaciones enable row level security;
alter table public.cotizacion_items enable row level security;

create policy "miembros leen cotizaciones" on public.cotizaciones for select to authenticated using ((select public.es_miembro()));
create policy "miembros crean cotizaciones" on public.cotizaciones for insert to authenticated with check ((select public.es_miembro()));
create policy "miembros editan cotizaciones" on public.cotizaciones for update to authenticated using ((select public.es_miembro())) with check ((select public.es_miembro()));
create policy "admin borra cotizaciones" on public.cotizaciones for delete to authenticated using ((select public.es_admin()));

create policy "miembros leen items" on public.cotizacion_items for select to authenticated using ((select public.es_miembro()));
create policy "miembros crean items" on public.cotizacion_items for insert to authenticated with check ((select public.es_miembro()));
create policy "miembros editan items" on public.cotizacion_items for update to authenticated using ((select public.es_miembro())) with check ((select public.es_miembro()));
create policy "miembros borran items" on public.cotizacion_items for delete to authenticated using ((select public.es_miembro()));

revoke all on public.cotizaciones, public.cotizacion_items, public.v_cotizaciones from anon;
