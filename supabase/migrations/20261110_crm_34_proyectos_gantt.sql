-- crm_34 · Gestor de proyectos (Gantt + calendario) con permisos por proyecto.
-- Extiende proyectos y tareas; no rompe el portal (portal_proyectos y la política de cliente no cambian).

-- 1) Proyectos: internos (sin cliente) o de cliente
alter table public.proyectos alter column empresa_id drop not null;
alter table public.proyectos add column if not exists tipo text not null default 'cliente';
alter table public.proyectos add column if not exists plantilla text;
alter table public.proyectos drop constraint if exists proyectos_tipo_check;
alter table public.proyectos add constraint proyectos_tipo_check check (tipo in ('interno','cliente'));
alter table public.proyectos drop constraint if exists proyectos_tipo_empresa_check;
alter table public.proyectos add constraint proyectos_tipo_empresa_check
  check ((tipo = 'cliente' and empresa_id is not null) or (tipo = 'interno' and empresa_id is null));

-- 2) Miembros asignados a cada proyecto
create table if not exists public.proyecto_miembros (
  proyecto_id uuid not null references public.proyectos(id) on delete cascade,
  miembro_id uuid not null references public.miembros(id),
  rol text not null default 'colaborador' check (rol in ('responsable','colaborador')),
  created_at timestamptz not null default now(),
  primary key (proyecto_id, miembro_id)
);

-- 3) Fases (agrupan tareas en el Gantt; se muestran al cliente si el proyecto es visible)
create table if not exists public.proyecto_fases (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos(id) on delete cascade,
  nombre text not null,
  orden int not null default 0,
  fecha_inicio date,
  fecha_fin date,
  visible_cliente boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists proyecto_fases_proyecto on public.proyecto_fases(proyecto_id, orden);

-- 4) Tareas ligadas a proyecto y fase, con inicio propio
alter table public.tareas add column if not exists proyecto_id uuid references public.proyectos(id) on delete cascade;
alter table public.tareas add column if not exists fase_id uuid references public.proyecto_fases(id) on delete set null;
alter table public.tareas add column if not exists fecha_inicio date;
create index if not exists tareas_proyecto on public.tareas(proyecto_id);

-- 5) Dependencias: una tarea espera a otra
create table if not exists public.tarea_dependencias (
  tarea_id uuid not null references public.tareas(id) on delete cascade,
  depende_de_id uuid not null references public.tareas(id) on delete cascade,
  primary key (tarea_id, depende_de_id),
  check (tarea_id <> depende_de_id)
);

-- 6) Quién ve un proyecto: admin, responsable o miembro asignado
create or replace function public.puede_ver_proyecto(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.es_miembro() and (
    public.es_admin()
    or exists (select 1 from public.proyectos p where p.id = pid and p.responsable_id = public.mi_miembro_id())
    or exists (select 1 from public.proyecto_miembros pm where pm.proyecto_id = pid and pm.miembro_id = public.mi_miembro_id())
  );
$$;

-- Quien crea un proyecto queda como responsable (así lo ve apenas se inserta)
create or replace function public.proyecto_responsable_por_defecto()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.responsable_id is null then new.responsable_id := public.mi_miembro_id(); end if;
  return new;
end $$;
drop trigger if exists proyecto_responsable_defecto on public.proyectos;
create trigger proyecto_responsable_defecto before insert on public.proyectos
  for each row execute function public.proyecto_responsable_por_defecto();

-- 7) RLS proyectos: solo los asignados ven y editan (la política de cliente no cambia)
drop policy if exists "miembros leen" on public.proyectos;
drop policy if exists "miembros actualizan" on public.proyectos;
create policy "asignados leen" on public.proyectos for select using (public.puede_ver_proyecto(id));
create policy "asignados actualizan" on public.proyectos for update
  using (public.puede_ver_proyecto(id)) with check (public.puede_ver_proyecto(id));

-- 8) RLS tareas: las de proyecto solo las ven los asignados (o su responsable); las demás siguen igual
drop policy if exists "miembros leen" on public.tareas;
drop policy if exists "miembros editan" on public.tareas;
drop policy if exists "miembros crean" on public.tareas;
create policy "miembros leen" on public.tareas for select using (
  public.es_miembro() and (proyecto_id is null or public.puede_ver_proyecto(proyecto_id) or responsable_id = public.mi_miembro_id()));
create policy "miembros editan" on public.tareas for update
  using (public.es_miembro() and (proyecto_id is null or public.puede_ver_proyecto(proyecto_id) or responsable_id = public.mi_miembro_id()))
  with check (public.es_miembro() and (proyecto_id is null or public.puede_ver_proyecto(proyecto_id) or responsable_id = public.mi_miembro_id()));
create policy "miembros crean" on public.tareas for insert
  with check (public.es_miembro() and (proyecto_id is null or public.puede_ver_proyecto(proyecto_id)));
create policy "admin borra" on public.tareas for delete using (public.es_admin() or (proyecto_id is not null and public.puede_ver_proyecto(proyecto_id)));

-- 9) RLS tablas nuevas
alter table public.proyecto_miembros enable row level security;
alter table public.proyecto_fases enable row level security;
alter table public.tarea_dependencias enable row level security;

create policy "asignados leen" on public.proyecto_miembros for select using (public.puede_ver_proyecto(proyecto_id));
create policy "responsable o admin asigna" on public.proyecto_miembros for insert with check (public.puede_ver_proyecto(proyecto_id));
create policy "responsable o admin edita" on public.proyecto_miembros for update using (public.puede_ver_proyecto(proyecto_id)) with check (public.puede_ver_proyecto(proyecto_id));
create policy "responsable o admin quita" on public.proyecto_miembros for delete using (public.puede_ver_proyecto(proyecto_id));

create policy "asignados leen" on public.proyecto_fases for select using (public.puede_ver_proyecto(proyecto_id));
create policy "asignados crean" on public.proyecto_fases for insert with check (public.puede_ver_proyecto(proyecto_id));
create policy "asignados editan" on public.proyecto_fases for update using (public.puede_ver_proyecto(proyecto_id)) with check (public.puede_ver_proyecto(proyecto_id));
create policy "asignados borran" on public.proyecto_fases for delete using (public.puede_ver_proyecto(proyecto_id));
create policy "cliente lee fases visibles" on public.proyecto_fases for select using (
  visible_cliente and exists (select 1 from public.proyectos p where p.id = proyecto_id and p.visible_cliente and not p.archivado
    and p.empresa_id in (select public.empresas_del_cliente())));

create policy "asignados leen" on public.tarea_dependencias for select using (
  exists (select 1 from public.tareas t where t.id = tarea_id and t.proyecto_id is not null and public.puede_ver_proyecto(t.proyecto_id)));
create policy "asignados crean" on public.tarea_dependencias for insert with check (
  exists (select 1 from public.tareas t where t.id = tarea_id and t.proyecto_id is not null and public.puede_ver_proyecto(t.proyecto_id)));
create policy "asignados borran" on public.tarea_dependencias for delete using (
  exists (select 1 from public.tareas t where t.id = tarea_id and t.proyecto_id is not null and public.puede_ver_proyecto(t.proyecto_id)));

-- 10) Los proyectos que ya existían: su responsable (o los admin) los siguen viendo; se asigna el responsable como miembro
insert into public.proyecto_miembros (proyecto_id, miembro_id, rol)
  select id, responsable_id, 'responsable' from public.proyectos where responsable_id is not null
  on conflict do nothing;

-- 11) Funciones: la de trigger no es llamable; puede_ver_proyecto solo con sesión
revoke execute on function public.proyecto_responsable_por_defecto() from public, anon, authenticated;
revoke execute on function public.puede_ver_proyecto(uuid) from public, anon;
grant execute on function public.puede_ver_proyecto(uuid) to authenticated;

-- 12) Solo el admin o el responsable gestionan los miembros del proyecto
create or replace function public.gestiona_proyecto(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.es_miembro() and (public.es_admin() or exists (select 1 from public.proyectos p where p.id = pid and p.responsable_id = public.mi_miembro_id()));
$$;
revoke execute on function public.gestiona_proyecto(uuid) from public, anon;
grant execute on function public.gestiona_proyecto(uuid) to authenticated;
drop policy if exists "asignados asignan" on public.proyecto_miembros;
drop policy if exists "asignados editan" on public.proyecto_miembros;
drop policy if exists "asignados quitan" on public.proyecto_miembros;
create policy "gestor asigna" on public.proyecto_miembros for insert with check (public.gestiona_proyecto(proyecto_id));
create policy "gestor edita" on public.proyecto_miembros for update using (public.gestiona_proyecto(proyecto_id)) with check (public.gestiona_proyecto(proyecto_id));
create policy "gestor quita" on public.proyecto_miembros for delete using (public.gestiona_proyecto(proyecto_id));
