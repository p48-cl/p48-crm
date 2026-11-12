-- crm_45: un negocio de expansión ganado genera un servicio recurrente (alimenta el MRR por trigger).
alter table public.servicios_cliente add column if not exists oportunidad_id uuid references public.oportunidades(id) on delete set null;
create unique index if not exists servicios_cliente_oportunidad_key on public.servicios_cliente (oportunidad_id) where oportunidad_id is not null;
