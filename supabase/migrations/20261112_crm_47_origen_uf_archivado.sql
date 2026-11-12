-- Fase 1 de la reestructuración de Operaciones.
-- Aditiva: no modifica datos existentes ni IDs.

-- Origen del cliente (lead de origen opcional)
alter table public.empresas
  add column if not exists origen text check (origen in ('lead','referido','prospeccion_directa','cliente_existente','otro')),
  add column if not exists origen_oportunidad_id uuid references public.oportunidades(id) on delete set null;
create index if not exists empresas_origen_oportunidad_idx on public.empresas(origen_oportunidad_id);

-- Facturas en UF: los totales CLP siguen siendo la referencia; el valor UF queda congelado en la factura
alter table public.facturas
  add column if not exists moneda text not null default 'CLP' check (moneda in ('CLP','UF')),
  add column if not exists monto_uf numeric(14,4),
  add column if not exists uf_valor numeric(12,2),
  add column if not exists uf_fecha date;

-- Archivado transversal
alter table public.cotizaciones add column if not exists archivado boolean not null default false;
alter table public.tareas add column if not exists archivado boolean not null default false;
alter table public.actividades add column if not exists archivado boolean not null default false;

-- Proyectos de cliente deben tener cliente; internos no
alter table public.proyectos
  add constraint proyectos_cliente_requiere_empresa check (tipo = 'interno' or empresa_id is not null);
