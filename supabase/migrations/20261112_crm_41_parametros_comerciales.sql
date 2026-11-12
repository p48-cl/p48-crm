-- crm_41 · Parámetros comerciales editables por admin: planes, setup, IVA, textos base de cotización,
-- medios de pago y etiquetas/colores de estados de cotización. Aditivo.
create table if not exists public.planes_servicio (
  codigo text primary key check (codigo in ('A','B','C','D','E','personalizado')),
  nombre text not null,
  valor_neto_clp integer not null default 0 check (valor_neto_clp >= 0),
  activo boolean not null default true,
  orden smallint not null default 0,
  actualizado_en timestamptz not null default now()
);
alter table public.planes_servicio enable row level security;
create policy "miembros leen planes" on public.planes_servicio for select to authenticated using ((select public.es_miembro()));
create policy "admin edita planes" on public.planes_servicio for update to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));
revoke all on public.planes_servicio from anon;
grant select, update on public.planes_servicio to authenticated;

insert into public.planes_servicio (codigo, nombre, valor_neto_clp, orden) values
  ('A','Estrategia + Admin ADS',550000,1),
  ('B','Plan A + Creativos',1550000,2),
  ('C','Plan B + Contenido orgánico',2250000,3),
  ('D','Full Stack',3050000,4),
  ('E','Branding (lump sum)',2500000,5),
  ('personalizado','Personalizado (precio a medida)',0,6)
on conflict (codigo) do nothing;

alter table public.configuracion_crm
  add column if not exists setup_lista_clp integer not null default 650000 check (setup_lista_clp >= 0),
  add column if not exists cotizacion_validez_dias integer not null default 15 check (cotizacion_validez_dias between 1 and 365),
  add column if not exists iva_pct numeric not null default 19 check (iva_pct >= 0 and iva_pct <= 100),
  add column if not exists comision_base text not null default 'Comisión de gestión de pauta: 15% de la inversión mensual en plataformas, con escala descendente hasta 8% según el monto invertido. La inversión en pauta se paga directamente a cada plataforma y no está incluida en esta cotización.',
  add column if not exists condiciones_base text not null default 'Valores netos en pesos chilenos, más IVA. Cotización válida por el plazo indicado. El servicio inicia con la aceptación y la entrega de accesos de administrador a las plataformas.',
  add column if not exists medios_pago text[] not null default array['Transferencia','Cheque','Tarjeta','Efectivo'],
  add column if not exists estados_cotizacion jsonb not null default '{}'::jsonb;
