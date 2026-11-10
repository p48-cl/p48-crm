-- crm_31 · Servicios mensuales por cliente y MRR calculado.
-- MRR = fee mensual + suma de servicios activos (un monto negativo es un descuento).
-- Solo cuenta si el cliente está activo y no archivado. Aplicar vía SQL Editor o MCP.

create table if not exists public.servicios_cliente (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nombre text not null,
  monto_clp numeric(14,0) not null,
  activo boolean not null default true,
  inicio date,
  notas text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists servicios_cliente_empresa_idx on public.servicios_cliente (empresa_id);

alter table public.servicios_cliente enable row level security;

drop policy if exists "miembros leen servicios" on public.servicios_cliente;
create policy "miembros leen servicios" on public.servicios_cliente
  for select to authenticated using ((select public.es_miembro()));

drop policy if exists "miembros crean servicios" on public.servicios_cliente;
create policy "miembros crean servicios" on public.servicios_cliente
  for insert to authenticated with check ((select public.es_miembro()));

drop policy if exists "miembros editan servicios" on public.servicios_cliente;
create policy "miembros editan servicios" on public.servicios_cliente
  for update to authenticated using ((select public.es_miembro())) with check ((select public.es_miembro()));

drop policy if exists "miembros borran servicios" on public.servicios_cliente;
create policy "miembros borran servicios" on public.servicios_cliente
  for delete to authenticated using ((select public.es_miembro()));

revoke all on public.servicios_cliente from anon;
grant select, insert, update, delete on public.servicios_cliente to authenticated;

-- 1) MRR incluye servicios activos (reemplaza la versión anterior, que solo usaba el fee)
create or replace function public.trg_mrr_calculado() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.estado = 'cliente' and not coalesce(new.archivado, false) then
    new.mrr_actual_clp := coalesce(new.fee_mensual_clp, 0)
      + coalesce((select sum(s.monto_clp) from public.servicios_cliente s
                  where s.empresa_id = new.id and s.activo), 0);
  else
    new.mrr_actual_clp := 0;
  end if;
  return new;
end $$;

-- 2) Al cambiar un servicio, se recalcula el MRR de su empresa
create or replace function public.trg_servicios_recalcular() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  emp uuid := case when tg_op = 'DELETE' then old.empresa_id else new.empresa_id end;
begin
  -- Un UPDATE sin cambio de valor dispara zz_mrr_calculado (columna en la lista SET)
  update public.empresas set fee_mensual_clp = fee_mensual_clp where id = emp;
  return null;
end $$;

drop trigger if exists servicios_recalcular_mrr on public.servicios_cliente;
create trigger servicios_recalcular_mrr
  after insert or update or delete on public.servicios_cliente
  for each row execute function public.trg_servicios_recalcular();
