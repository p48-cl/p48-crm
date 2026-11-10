-- crm_30 · Configuración del sistema (fila única) editable solo por admins.
-- Lectura para miembros; escritura con es_admin(). Aplicada vía MCP.
create table if not exists public.configuracion_crm (
  id smallint primary key default 1 check (id = 1),
  tema_defecto text not null default 'claro' check (tema_defecto in ('claro', 'oscuro')),
  dias_alerta_renovacion int not null default 60 check (dias_alerta_renovacion between 1 and 365),
  dias_sin_actividad int not null default 30 check (dias_sin_actividad between 1 and 365),
  vista_clientes_defecto text not null default 'tabla' check (vista_clientes_defecto in ('tabla', 'tarjetas')),
  actualizado_en timestamptz not null default now()
);

insert into public.configuracion_crm (id) values (1) on conflict (id) do nothing;

alter table public.configuracion_crm enable row level security;

drop policy if exists "miembros leen configuracion" on public.configuracion_crm;
create policy "miembros leen configuracion" on public.configuracion_crm
  for select to authenticated using ((select public.es_miembro()));

drop policy if exists "admin edita configuracion" on public.configuracion_crm;
create policy "admin edita configuracion" on public.configuracion_crm
  for update to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));

revoke all on public.configuracion_crm from anon, authenticated;
grant select, update on public.configuracion_crm to authenticated;
