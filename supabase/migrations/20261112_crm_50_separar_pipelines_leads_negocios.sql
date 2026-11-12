-- ============================================================================
-- APLICADA en producción 2026-11-12 · separar pipelines: leads (captación) y negocios (expansión)
-- Estado: SQL completo, probado solo como dry-run (begin ... rollback) en producción.
-- Cambios v3 respecto de v2 (encontrados con barrido de pg_depend, pg_constraint,
-- information_schema y pg_proc):
--   · v_cotizaciones y v_calificacion_oportunidad dependían de oportunidad_id: se reconstruyen.
--   · guardar_cotizacion escribe oportunidad_id: se reescribe (resuelve a lead o negocio).
--   · portal_empresa, v_dash_cartera_clientes, v_dash_tareas_responsable: no dependen de
--     columnas eliminadas; no se tocan.
--   · identity de numero: always (igual que el original).
--   · actividades y tareas: ON DELETE sin acción (igual que el original).
--   · backfill con triggers de usuario deshabilitados (no toca updated_at ni auditoría).
-- Requiere además el cambio de frontend en el mismo despliegue.
-- Respaldo previo: esquema backup_20261112.
-- Todo corre en UNA transacción. Cualquier verificación que falle revierte todo.
-- Termina en COMMIT tras aprobación explícita de Cristian.
-- ============================================================================

begin;

-- 0) Chequeos previos y foto de valores actuales (se comparan al final)
do $$
declare n_cap int; n_exp int;
begin
  select count(*) filter (where pipeline = 'captacion'), count(*) filter (where pipeline = 'expansion')
    into n_cap, n_exp from public.oportunidades;
  if n_cap <> 22 or n_exp <> 1 then
    raise exception 'Conteo previo distinto: captación=%, expansión=%', n_cap, n_exp;
  end if;
end $$;

create temp table pre_check (k text primary key, v numeric);
insert into pre_check
select 'kpi_ponderado', pipeline_ponderado_total from public.kpis_dashboard(false)
union all select 'kpi_abiertas', oportunidades_abiertas_count from public.kpis_dashboard(false)
union all select 'kpi_mrr', mrr_clientes_activos from public.kpis_dashboard(false)
union all select 'resultados_ganadas', ganadas from public.v_dash_resultados
union all select 'resultados_perdidas', perdidas from public.v_dash_resultados
union all select 'total_oportunidades', count(*) from public.oportunidades;

-- 1) Tablas nuevas con la misma forma que oportunidades
create table public.leads (like public.oportunidades including defaults including constraints including indexes);
create table public.negocios (like public.oportunidades including defaults including constraints including indexes);

alter table public.leads add constraint leads_pipeline_fijo check (pipeline = 'captacion');
alter table public.negocios add constraint negocios_pipeline_fijo check (pipeline = 'expansion');

alter table public.leads
  add constraint leads_empresa_id_fkey foreign key (empresa_id) references public.empresas(id),
  add constraint leads_contacto_principal_id_fkey foreign key (contacto_principal_id) references public.contactos(id),
  add constraint leads_etapa_id_fkey foreign key (etapa_id) references public.etapas(id),
  add constraint leads_fuente_id_fkey foreign key (fuente_id) references public.fuentes(id),
  add constraint leads_motivo_perdida_id_fkey foreign key (motivo_perdida_id) references public.motivos_perdida(id),
  add constraint leads_responsable_id_fkey foreign key (responsable_id) references public.miembros(id);

alter table public.negocios
  add constraint negocios_empresa_id_fkey foreign key (empresa_id) references public.empresas(id),
  add constraint negocios_contacto_principal_id_fkey foreign key (contacto_principal_id) references public.contactos(id),
  add constraint negocios_etapa_id_fkey foreign key (etapa_id) references public.etapas(id),
  add constraint negocios_fuente_id_fkey foreign key (fuente_id) references public.fuentes(id),
  add constraint negocios_motivo_perdida_id_fkey foreign key (motivo_perdida_id) references public.motivos_perdida(id),
  add constraint negocios_responsable_id_fkey foreign key (responsable_id) references public.miembros(id);

-- 2) Copia de datos (mismos ids, mismos numero y numero_pipeline). Antes de crear triggers nuevos.
insert into public.leads select * from public.oportunidades where pipeline = 'captacion';
insert into public.negocios select * from public.oportunidades where pipeline = 'expansion';

-- 3) numero: identity por tabla (always, como el original), arrancando sobre el máximo existente
do $$
declare m int;
begin
  select coalesce(max(numero), 0) + 1 into m from public.leads;
  execute format('alter table public.leads alter column numero add generated always as identity (start with %s)', m);
  select coalesce(max(numero), 0) + 1 into m from public.negocios;
  execute format('alter table public.negocios alter column numero add generated always as identity (start with %s)', m);
end $$;

-- 4) Numeración por pipeline y validación de etapa, por tabla (reemplaza trg_oportunidad_pipeline)
create or replace function public.trg_numero_pipeline() returns trigger
language plpgsql set search_path to 'public' as $$
declare
  v_pipe text := case when tg_table_name = 'leads' then 'captacion' else 'expansion' end;
  v_etapa_pipe text;
begin
  select pipeline into v_etapa_pipe from public.etapas where id = new.etapa_id;
  if v_etapa_pipe is distinct from v_pipe then
    raise exception 'La etapa no pertenece al pipeline %', v_pipe;
  end if;
  new.pipeline := v_pipe;
  if tg_op = 'INSERT' then
    execute format('select coalesce(max(numero_pipeline), 0) + 1 from public.%I', tg_table_name) into new.numero_pipeline;
  end if;
  return new;
end $$;

-- Historial de precios: escribe en oportunidad_precios según la tabla origen
create or replace function public.trg_historial_precio() returns trigger
language plpgsql security definer set search_path to 'public' as $$
begin
  if tg_op = 'INSERT'
     or new.plan is distinct from old.plan
     or new.valor_neto is distinct from old.valor_neto
     or new.setup_neto is distinct from old.setup_neto
     or new.moneda is distinct from old.moneda then
    if tg_table_name = 'leads' then
      insert into public.oportunidad_precios (lead_id, plan, moneda, valor_neto, setup_neto, registrado_por)
      values (new.id, new.plan, new.moneda, new.valor_neto, new.setup_neto, public.mi_miembro_id());
    else
      insert into public.oportunidad_precios (negocio_id, plan, moneda, valor_neto, setup_neto, registrado_por)
      values (new.id, new.plan, new.moneda, new.valor_neto, new.setup_neto, public.mi_miembro_id());
    end if;
  end if;
  return new;
end;
$$;

-- Triggers de cada tabla nueva (mismos nombres que en oportunidades, salvo el de pipeline)
create trigger oportunidad_reglas before insert or update on public.leads for each row execute function public.trg_oportunidad_reglas();
create trigger oportunidad_reglas before insert or update on public.negocios for each row execute function public.trg_oportunidad_reglas();
create trigger zz_numero_pipeline before insert or update on public.leads for each row execute function public.trg_numero_pipeline();
create trigger zz_numero_pipeline before insert or update on public.negocios for each row execute function public.trg_numero_pipeline();
create trigger zz_fecha_cierre_real before insert or update on public.leads for each row execute function public.trg_fecha_cierre_real();
create trigger zz_fecha_cierre_real before insert or update on public.negocios for each row execute function public.trg_fecha_cierre_real();
create trigger zz_historial_precio after insert or update on public.leads for each row execute function public.trg_historial_precio();
create trigger zz_historial_precio after insert or update on public.negocios for each row execute function public.trg_historial_precio();
create trigger upd_updated_at before update on public.leads for each row execute function public.set_updated_at();
create trigger upd_updated_at before update on public.negocios for each row execute function public.set_updated_at();
create trigger aud_registro after insert or update or delete on public.leads for each row execute function public.trg_auditoria();
create trigger aud_registro after insert or update or delete on public.negocios for each row execute function public.trg_auditoria();

-- 5) RLS y permisos: mismas políticas que oportunidades; anon sin acceso
alter table public.leads enable row level security;
alter table public.negocios enable row level security;
create policy "miembros leen" on public.leads for select to authenticated using (public.es_miembro());
create policy "miembros crean" on public.leads for insert to authenticated with check (public.es_miembro());
create policy "miembros editan" on public.leads for update to authenticated using (public.es_miembro()) with check (public.es_miembro());
create policy "miembros leen" on public.negocios for select to authenticated using (public.es_miembro());
create policy "miembros crean" on public.negocios for insert to authenticated with check (public.es_miembro());
create policy "miembros editan" on public.negocios for update to authenticated using (public.es_miembro()) with check (public.es_miembro());
revoke all on public.leads, public.negocios from anon;

-- 6) Dependientes: columnas lead_id / negocio_id
alter table public.cotizaciones
  add column lead_id uuid references public.leads(id) on delete set null,
  add column negocio_id uuid references public.negocios(id) on delete set null;
alter table public.facturas
  add column lead_id uuid references public.leads(id) on delete set null,
  add column negocio_id uuid references public.negocios(id) on delete set null;
alter table public.actividades
  add column lead_id uuid references public.leads(id),
  add column negocio_id uuid references public.negocios(id);
alter table public.tareas
  add column lead_id uuid references public.leads(id),
  add column negocio_id uuid references public.negocios(id);
alter table public.servicios_cliente
  add column lead_id uuid references public.leads(id) on delete set null,
  add column negocio_id uuid references public.negocios(id) on delete set null;
alter table public.evaluaciones_oportunidad
  add column lead_id uuid references public.leads(id) on delete cascade,
  add column negocio_id uuid references public.negocios(id) on delete cascade;
alter table public.oportunidad_precios
  add column lead_id uuid references public.leads(id) on delete cascade,
  add column negocio_id uuid references public.negocios(id) on delete cascade;
alter table public.empresas
  add column origen_lead_id uuid references public.leads(id) on delete set null;

-- Backfill sin disparar triggers de usuario (evita tocar updated_at y auditoría)
alter table public.cotizaciones disable trigger user;
alter table public.facturas disable trigger user;
alter table public.actividades disable trigger user;
alter table public.tareas disable trigger user;
alter table public.servicios_cliente disable trigger user;
alter table public.evaluaciones_oportunidad disable trigger user;
alter table public.oportunidad_precios disable trigger user;
alter table public.empresas disable trigger user;

update public.cotizaciones t set lead_id = l.id from public.leads l where l.id = t.oportunidad_id;
update public.cotizaciones t set negocio_id = n.id from public.negocios n where n.id = t.oportunidad_id;
update public.facturas t set lead_id = l.id from public.leads l where l.id = t.oportunidad_id;
update public.facturas t set negocio_id = n.id from public.negocios n where n.id = t.oportunidad_id;
update public.actividades t set lead_id = l.id from public.leads l where l.id = t.oportunidad_id;
update public.actividades t set negocio_id = n.id from public.negocios n where n.id = t.oportunidad_id;
update public.tareas t set lead_id = l.id from public.leads l where l.id = t.oportunidad_id;
update public.tareas t set negocio_id = n.id from public.negocios n where n.id = t.oportunidad_id;
update public.servicios_cliente t set lead_id = l.id from public.leads l where l.id = t.oportunidad_id;
update public.servicios_cliente t set negocio_id = n.id from public.negocios n where n.id = t.oportunidad_id;
update public.evaluaciones_oportunidad t set lead_id = l.id from public.leads l where l.id = t.oportunidad_id;
update public.evaluaciones_oportunidad t set negocio_id = n.id from public.negocios n where n.id = t.oportunidad_id;
update public.oportunidad_precios t set lead_id = l.id from public.leads l where l.id = t.oportunidad_id;
update public.oportunidad_precios t set negocio_id = n.id from public.negocios n where n.id = t.oportunidad_id;
update public.empresas t set origen_lead_id = l.id from public.leads l where l.id = t.origen_oportunidad_id;

alter table public.cotizaciones enable trigger user;
alter table public.facturas enable trigger user;
alter table public.actividades enable trigger user;
alter table public.tareas enable trigger user;
alter table public.servicios_cliente enable trigger user;
alter table public.evaluaciones_oportunidad enable trigger user;
alter table public.oportunidad_precios enable trigger user;
alter table public.empresas enable trigger user;

do $$
declare r record; v_sin_destino int;
begin
  for r in select unnest(array['cotizaciones','facturas','actividades','tareas','servicios_cliente','evaluaciones_oportunidad','oportunidad_precios']) as t loop
    execute format('select count(*) from public.%I where oportunidad_id is not null and lead_id is null and negocio_id is null', r.t) into v_sin_destino;
    if v_sin_destino > 0 then raise exception 'Filas sin destino en %: %', r.t, v_sin_destino; end if;
  end loop;
  select count(*) into v_sin_destino from public.empresas where origen_oportunidad_id is not null and origen_lead_id is null;
  if v_sin_destino > 0 then raise exception 'empresas.origen sin destino: %', v_sin_destino; end if;
end $$;

-- 7) Soltar vistas que dependen de la tabla vieja o de oportunidad_id (se recrean en 9/10)
drop view public.v_cotizaciones, public.v_calificacion_oportunidad,
  public.v_avance_mes, public.v_dash_embudo, public.v_dash_forecast_mensual,
  public.v_dash_pipeline_responsable, public.v_dash_resultados, public.v_motivos_perdida,
  public.v_oportunidades_por_fuente, public.v_pipeline_por_etapa, public.v_oportunidades;

alter table public.cotizaciones drop column oportunidad_id;
alter table public.facturas drop column oportunidad_id;
alter table public.actividades drop column oportunidad_id;
alter table public.tareas drop column oportunidad_id;
alter table public.servicios_cliente drop column oportunidad_id;
alter table public.evaluaciones_oportunidad drop column oportunidad_id;
alter table public.oportunidad_precios drop column oportunidad_id;
alter table public.empresas drop column origen_oportunidad_id;

-- 8b) oportunidad_id vuelve como columna GENERADA (solo lectura) = lead o negocio.
-- Lecturas y filtros existentes siguen igual. Las escrituras con oportunidad_id deben cambiar (ya hecho en frontend).
alter table public.cotizaciones add column oportunidad_id uuid generated always as (coalesce(lead_id, negocio_id)) stored;
alter table public.facturas add column oportunidad_id uuid generated always as (coalesce(lead_id, negocio_id)) stored;
alter table public.actividades add column oportunidad_id uuid generated always as (coalesce(lead_id, negocio_id)) stored;
alter table public.tareas add column oportunidad_id uuid generated always as (coalesce(lead_id, negocio_id)) stored;
alter table public.servicios_cliente add column oportunidad_id uuid generated always as (coalesce(lead_id, negocio_id)) stored;
alter table public.evaluaciones_oportunidad add column oportunidad_id uuid generated always as (coalesce(lead_id, negocio_id)) stored;
alter table public.oportunidad_precios add column oportunidad_id uuid generated always as (coalesce(lead_id, negocio_id)) stored;

-- Índices que caían con la columna vieja (mismos nombres)
create index cotizaciones_oportunidad_idx on public.cotizaciones (oportunidad_id);
create index facturas_oportunidad_idx on public.facturas (oportunidad_id);
create index actividades_oportunidad_idx on public.actividades (oportunidad_id, fecha_actividad desc);
create index tareas_oportunidad_id_idx on public.tareas (oportunidad_id);
create index oportunidad_precios_oportunidad_id_idx on public.oportunidad_precios (oportunidad_id);
create unique index evaluaciones_oportunidad_oportunidad_id_criterio_id_key on public.evaluaciones_oportunidad (oportunidad_id, criterio_id);
create unique index servicios_cliente_oportunidad_key on public.servicios_cliente (oportunidad_id) where oportunidad_id is not null;
create index empresas_origen_lead_idx on public.empresas (origen_lead_id);

-- 8) Tabla vieja pasa a respaldo de solo lectura, sin triggers ni escritura
alter table public.oportunidades rename to oportunidades_legacy;
drop trigger aud_oportunidades on public.oportunidades_legacy;
drop trigger oportunidad_reglas on public.oportunidades_legacy;
drop trigger oportunidades_pipeline on public.oportunidades_legacy;
drop trigger upd_oportunidades on public.oportunidades_legacy;
drop trigger zz_fecha_cierre_real on public.oportunidades_legacy;
drop trigger zz_historial_precio on public.oportunidades_legacy;
revoke insert, update, delete, truncate on public.oportunidades_legacy from authenticated, service_role;
drop function public.trg_oportunidad_pipeline();

-- 9) Vistas de oportunidades. v_oportunidades queda como unión de solo lectura
create view public.v_leads with (security_invoker = true) as
  select o.id, o.nombre, o.empresa_id, o.contacto_principal_id, o.etapa_id, o.responsable_id, o.fuente_id,
    o.plan, o.moneda, o.valor_neto, o.setup_neto, o.probabilidad, o.valor_ponderado, o.fecha_cierre_estimada,
    o.motivo_perdida_id, o.motivo_perdida_detalle, o.proxima_accion_texto, o.proxima_accion_fecha, o.archivado,
    o.created_at, o.updated_at,
    case
      when e.es_ganada or e.es_perdida then null::text
      when o.proxima_accion_fecha is null then 'sin_accion'::text
      when o.proxima_accion_fecha < (now() at time zone 'America/Santiago')::date then 'atrasado'::text
      when o.proxima_accion_fecha <= ((now() at time zone 'America/Santiago')::date + 2) then 'por_vencer'::text
      else 'al_dia'::text
    end as estado_seguimiento,
    o.numero, o.fecha_cierre_real, o.pipeline, o.numero_pipeline
  from public.leads o join public.etapas e on e.id = o.etapa_id;

create view public.v_negocios with (security_invoker = true) as
  select o.id, o.nombre, o.empresa_id, o.contacto_principal_id, o.etapa_id, o.responsable_id, o.fuente_id,
    o.plan, o.moneda, o.valor_neto, o.setup_neto, o.probabilidad, o.valor_ponderado, o.fecha_cierre_estimada,
    o.motivo_perdida_id, o.motivo_perdida_detalle, o.proxima_accion_texto, o.proxima_accion_fecha, o.archivado,
    o.created_at, o.updated_at,
    case
      when e.es_ganada or e.es_perdida then null::text
      when o.proxima_accion_fecha is null then 'sin_accion'::text
      when o.proxima_accion_fecha < (now() at time zone 'America/Santiago')::date then 'atrasado'::text
      when o.proxima_accion_fecha <= ((now() at time zone 'America/Santiago')::date + 2) then 'por_vencer'::text
      else 'al_dia'::text
    end as estado_seguimiento,
    o.numero, o.fecha_cierre_real, o.pipeline, o.numero_pipeline
  from public.negocios o join public.etapas e on e.id = o.etapa_id;

create view public.v_oportunidades with (security_invoker = true) as
  select * from public.v_leads
  union all
  select * from public.v_negocios;

-- 10) Vistas dashboard, cotizaciones y calificación: mismas definiciones, leyendo las tablas nuevas
create view public.v_avance_mes with (security_invoker = true) as
  with mes as (
    select (date_trunc('month', (now() at time zone 'America/Santiago')) at time zone 'America/Santiago') as ini
  )
  select m.id as miembro_id, m.nombre,
    (select count(*) from public.v_oportunidades o
       where o.responsable_id = m.id and not o.archivado and o.created_at >= mes.ini) as leads,
    (select count(*) from public.actividades a
       where a.autor_id = m.id and a.tipo = 'reunion' and a.fecha_actividad >= mes.ini) as reuniones,
    (select count(*) from public.v_oportunidades o join public.etapas e on e.id = o.etapa_id
       where o.responsable_id = m.id and e.es_ganada and o.fecha_cierre_real::timestamp with time zone >= mes.ini) as cierres
  from public.miembros m cross join mes
  where m.activo;

create view public.v_dash_embudo with (security_invoker = true) as
  select id as etapa_id, nombre, orden, color,
    (select count(*) from public.v_oportunidades o join public.etapas e2 on e2.id = o.etapa_id
       where not o.archivado and not e2.es_perdida and e2.orden >= e.orden) as alcanzaron
  from public.etapas e
  where activa and not es_perdida
  order by orden;

create view public.v_dash_forecast_mensual with (security_invoker = true) as
  select date_trunc('month', o.fecha_cierre_estimada::timestamp with time zone)::date as mes,
    count(*) as oportunidades, sum(o.valor_neto) as valor_neto, sum(o.valor_ponderado) as valor_ponderado
  from public.v_oportunidades o join public.etapas e on e.id = o.etapa_id
  where not o.archivado and not e.es_ganada and not e.es_perdida and o.moneda = 'CLP' and o.fecha_cierre_estimada is not null
  group by 1
  order by 1;

create view public.v_dash_pipeline_responsable with (security_invoker = true) as
  select m.id as responsable_id, m.nombre as responsable,
    count(o.id) as oportunidades_abiertas,
    coalesce(sum(o.valor_neto), 0::numeric) as valor_neto_total,
    coalesce(sum(o.valor_ponderado), 0::numeric) as valor_ponderado_total
  from public.miembros m
  left join (
    select x.* from public.v_oportunidades x join public.etapas e on e.id = x.etapa_id
    where not x.archivado and not e.es_ganada and not e.es_perdida and x.moneda = 'CLP'
  ) o on o.responsable_id = m.id
  where m.activo
  group by m.id, m.nombre;

create view public.v_dash_resultados with (security_invoker = true) as
  select count(*) filter (where e.es_ganada) as ganadas,
    count(*) filter (where e.es_perdida) as perdidas,
    round(100.0 * count(*) filter (where e.es_ganada)::numeric / nullif(count(*) filter (where e.es_ganada or e.es_perdida), 0)::numeric, 1) as tasa_cierre_pct,
    round(avg(o.fecha_cierre_real - o.created_at::date) filter (where e.es_ganada and o.fecha_cierre_real is not null), 1) as ciclo_venta_dias,
    coalesce(sum(o.valor_neto) filter (where e.es_ganada and o.moneda = 'CLP'), 0::numeric) as valor_ganado_clp
  from public.v_oportunidades o join public.etapas e on e.id = o.etapa_id
  where not o.archivado;

create view public.v_motivos_perdida with (security_invoker = true) as
  select m.id as motivo_id, m.nombre, count(o.id) as cantidad
  from public.motivos_perdida m
  left join public.v_oportunidades o on o.motivo_perdida_id = m.id and not o.archivado
  where m.activo
  group by m.id;

create view public.v_oportunidades_por_fuente with (security_invoker = true) as
  select f.id as fuente_id, f.nombre, count(o.id) as cantidad
  from public.fuentes f
  left join public.v_oportunidades o on o.fuente_id = f.id and not o.archivado
  where f.activo
  group by f.id;

create view public.v_pipeline_por_etapa with (security_invoker = true) as
  select e.id as etapa_id, e.nombre, e.orden, e.color, e.es_ganada, e.es_perdida,
    count(o.id) as cantidad,
    coalesce(sum(o.valor_ponderado) filter (where o.moneda = 'CLP'), 0::numeric) as valor_ponderado
  from public.etapas e
  left join public.v_oportunidades o on o.etapa_id = e.id and not o.archivado
  where e.activa
  group by e.id;

-- v_cotizaciones: mantiene oportunidad_id (= lead o negocio) para no romper el frontend hasta el PR de frontend
create view public.v_cotizaciones with (security_invoker = true) as
  SELECT c.id,
    c.numero,
    c.empresa_id,
    coalesce(c.lead_id, c.negocio_id) AS oportunidad_id,
    c.titulo,
    c.estado,
    c.fecha_emision,
    c.validez_dias,
    c.moneda,
    c.iva_pct,
    c.condicion_comision,
    c.condiciones_comerciales,
    c.notas_internas,
    c.creada_por,
    c.created_at,
    c.updated_at,
    COALESCE(sum(i.cantidad * i.precio_neto) FILTER (WHERE i.recurrente), 0::numeric) AS neto_mensual,
    COALESCE(sum(i.cantidad * i.precio_neto) FILTER (WHERE NOT i.recurrente), 0::numeric) AS neto_unico,
    c.fecha_emision + c.validez_dias AS vence_el,
    c.uf_valor,
    c.uf_fecha,
    c.lead_id,
    c.negocio_id
  FROM cotizaciones c
    LEFT JOIN cotizacion_items i ON i.cotizacion_id = c.id
  GROUP BY c.id;

create view public.v_calificacion_oportunidad with (security_invoker = true) as
  SELECT coalesce(ev.lead_id, ev.negocio_id) AS oportunidad_id,
    sum(ev.puntaje_obtenido) AS puntaje_total,
    sum(c.peso) AS puntaje_maximo,
    COALESCE(bool_or(c.es_eliminatorio AND NOT ev.excepcion_aplicada AND
        CASE
            WHEN c.tipo = 'si_no'::text THEN ev.valor_respuesta = 'no'::text
            ELSE ev.valor_respuesta::numeric <= 1::numeric
        END), false) AS falla_eliminatorio
  FROM evaluaciones_oportunidad ev
    JOIN criterios_calificacion c ON c.id = ev.criterio_id
  GROUP BY coalesce(ev.lead_id, ev.negocio_id);

-- Permisos de vistas: solo usuarios autenticados y service_role (anon sin acceso)
revoke all on public.v_leads, public.v_negocios, public.v_oportunidades, public.v_avance_mes,
  public.v_dash_embudo, public.v_dash_forecast_mensual, public.v_dash_pipeline_responsable,
  public.v_dash_resultados, public.v_motivos_perdida, public.v_oportunidades_por_fuente,
  public.v_pipeline_por_etapa, public.v_cotizaciones, public.v_calificacion_oportunidad from anon;
grant select on public.v_leads, public.v_negocios, public.v_oportunidades, public.v_avance_mes,
  public.v_dash_embudo, public.v_dash_forecast_mensual, public.v_dash_pipeline_responsable,
  public.v_dash_resultados, public.v_motivos_perdida, public.v_oportunidades_por_fuente,
  public.v_pipeline_por_etapa, public.v_cotizaciones, public.v_calificacion_oportunidad to authenticated, service_role;

-- 11) Funciones que leían la tabla vieja o oportunidad_id
create or replace function public.kpis_dashboard(p_solo_mios boolean default false)
returns table(pipeline_ponderado_total numeric, oportunidades_abiertas_count bigint, seguimientos_atrasados_count bigint, tareas_hoy_count bigint, mrr_clientes_activos numeric)
language sql stable set search_path to 'public' as $$
  with abiertas as (
    select o.* from public.v_oportunidades o
    join public.etapas e on e.id = o.etapa_id
    where not o.archivado and not e.es_ganada and not e.es_perdida
      and (not p_solo_mios or o.responsable_id = public.mi_miembro_id())
  )
  select
    coalesce((select sum(valor_ponderado) from abiertas where moneda = 'CLP'), 0),
    (select count(*) from abiertas),
    (select count(*) from abiertas where proxima_accion_fecha < (now() at time zone 'America/Santiago')::date),
    (select count(*) from public.tareas t
      where not t.completada
        and t.fecha_vencimiento = (now() at time zone 'America/Santiago')::date
        and (not p_solo_mios or t.responsable_id = public.mi_miembro_id())),
    coalesce((select sum(mrr_actual_clp) from public.empresas
      where estado = 'cliente' and not archivado
        and (not p_solo_mios or responsable_id = public.mi_miembro_id())), 0);
$$;

create or replace function public.desactivar_miembro(p_miembro uuid, p_reasignar_a uuid)
returns void
language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.es_admin() then
    raise exception 'Solo un admin puede desactivar miembros' using errcode = '42501';
  end if;
  if p_miembro = p_reasignar_a then
    raise exception 'Debes reasignar los registros a otro miembro' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.miembros where id = p_reasignar_a and activo) then
    raise exception 'El miembro de destino no está activo' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.miembros where id = p_miembro and rol = 'admin')
     and (select count(*) from public.miembros where rol = 'admin' and activo) <= 1 then
    raise exception 'No puedes desactivar al único admin' using errcode = 'P0001';
  end if;
  update public.empresas set responsable_id = p_reasignar_a where responsable_id = p_miembro;
  update public.leads set responsable_id = p_reasignar_a where responsable_id = p_miembro;
  update public.negocios set responsable_id = p_reasignar_a where responsable_id = p_miembro;
  update public.tareas set responsable_id = p_reasignar_a where responsable_id = p_miembro and not completada;
  update public.miembros set activo = false where id = p_miembro;
end $$;

-- guardar_cotizacion: el frontend sigue enviando oportunidad_id; se resuelve a lead o negocio.
create or replace function public.guardar_cotizacion(p_id uuid, p_cab jsonb, p_items jsonb)
returns uuid
language plpgsql
set search_path to 'public'
as $function$
declare
  v_id uuid := p_id;
  v_op uuid := nullif(p_cab->>'oportunidad_id', '')::uuid;
  v_lead uuid;
  v_neg uuid;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La cotización necesita al menos una línea';
  end if;

  if v_op is not null then
    select id into v_lead from public.leads where id = v_op;
    if v_lead is null then
      select id into v_neg from public.negocios where id = v_op;
      if v_neg is null then
        raise exception 'Oportunidad no encontrada';
      end if;
    end if;
  end if;

  if p_id is null then
    insert into public.cotizaciones (
      empresa_id, lead_id, negocio_id, titulo, estado, validez_dias, moneda, uf_valor, uf_fecha,
      iva_pct, condicion_comision, condiciones_comerciales, notas_internas, creada_por
    ) values (
      (p_cab->>'empresa_id')::uuid,
      v_lead,
      v_neg,
      p_cab->>'titulo',
      p_cab->>'estado',
      (p_cab->>'validez_dias')::integer,
      p_cab->>'moneda',
      nullif(p_cab->>'uf_valor', '')::numeric,
      nullif(p_cab->>'uf_fecha', '')::date,
      (p_cab->>'iva_pct')::numeric,
      coalesce(p_cab->>'condicion_comision', ''),
      coalesce(p_cab->>'condiciones_comerciales', ''),
      nullif(p_cab->>'notas_internas', ''),
      nullif(p_cab->>'creada_por', '')::uuid
    )
    returning id into v_id;
  else
    update public.cotizaciones set
      lead_id = v_lead,
      negocio_id = v_neg,
      titulo = p_cab->>'titulo',
      estado = p_cab->>'estado',
      validez_dias = (p_cab->>'validez_dias')::integer,
      moneda = p_cab->>'moneda',
      uf_valor = nullif(p_cab->>'uf_valor', '')::numeric,
      uf_fecha = nullif(p_cab->>'uf_fecha', '')::date,
      iva_pct = (p_cab->>'iva_pct')::numeric,
      condicion_comision = coalesce(p_cab->>'condicion_comision', ''),
      condiciones_comerciales = coalesce(p_cab->>'condiciones_comerciales', ''),
      notas_internas = nullif(p_cab->>'notas_internas', '')
    where id = p_id;
    if not found then
      raise exception 'Cotización no encontrada o sin permiso';
    end if;
    delete from public.cotizacion_items where cotizacion_id = p_id;
  end if;

  insert into public.cotizacion_items (cotizacion_id, orden, concepto, plan, cantidad, precio_neto, recurrente)
  select v_id, x.orden, x.concepto, nullif(x.plan, ''), x.cantidad, x.precio_neto, x.recurrente
  from jsonb_to_recordset(p_items) as x(
    orden integer, concepto text, plan text, cantidad numeric, precio_neto numeric, recurrente boolean
  );

  return v_id;
end $function$;

-- 12) Verificación final: si algo no cuadra, todo se revierte
do $$
declare v_expected int; v_actual int;
begin
  if (select count(*) from public.leads) <> 22 or (select count(*) from public.negocios) <> 1 then
    raise exception 'Conteo final distinto en leads/negocios';
  end if;
  if (select count(*) from public.v_oportunidades) <> (select v from pre_check where k = 'total_oportunidades') then
    raise exception 'v_oportunidades no suma el total previo';
  end if;
  if (select count(*) from public.oportunidades_legacy) <> 23 then
    raise exception 'La tabla legacy no conserva las 23 filas';
  end if;
  for v_actual, v_expected in
    select
      (select count(*) from public.cotizaciones where lead_id is not null or negocio_id is not null),
      (select count(*) from backup_20261112.cotizaciones where oportunidad_id is not null)
    union all select
      (select count(*) from public.facturas where lead_id is not null or negocio_id is not null),
      (select count(*) from backup_20261112.facturas where oportunidad_id is not null)
    union all select
      (select count(*) from public.actividades where lead_id is not null or negocio_id is not null),
      (select count(*) from backup_20261112.actividades where oportunidad_id is not null)
    union all select
      (select count(*) from public.tareas where lead_id is not null or negocio_id is not null),
      (select count(*) from backup_20261112.tareas where oportunidad_id is not null)
    union all select
      (select count(*) from public.servicios_cliente where lead_id is not null or negocio_id is not null),
      (select count(*) from backup_20261112.servicios_cliente where oportunidad_id is not null)
    union all select
      (select count(*) from public.evaluaciones_oportunidad where lead_id is not null or negocio_id is not null),
      (select count(*) from backup_20261112.evaluaciones_oportunidad where oportunidad_id is not null)
    union all select
      (select count(*) from public.oportunidad_precios where lead_id is not null or negocio_id is not null),
      (select count(*) from backup_20261112.oportunidad_precios where oportunidad_id is not null)
    union all select
      (select count(*) from public.empresas where origen_lead_id is not null),
      (select count(*) from backup_20261112.empresas where origen_oportunidad_id is not null)
    union all select
      (select count(*) from public.v_cotizaciones where oportunidad_id is not null),
      (select count(*) from backup_20261112.cotizaciones where oportunidad_id is not null)
    union all select
      (select count(*) from public.v_calificacion_oportunidad where oportunidad_id is not null),
      (select count(distinct oportunidad_id) from backup_20261112.evaluaciones_oportunidad where oportunidad_id is not null)
  loop
    if v_actual <> v_expected then
      raise exception 'Dependientes no cuadran: actual=% respaldo=%', v_actual, v_expected;
    end if;
  end loop;
  if (select pipeline_ponderado_total from public.kpis_dashboard(false)) <> (select v from pre_check where k = 'kpi_ponderado')
     or (select oportunidades_abiertas_count from public.kpis_dashboard(false)) <> (select v from pre_check where k = 'kpi_abiertas')
     or (select mrr_clientes_activos from public.kpis_dashboard(false)) <> (select v from pre_check where k = 'kpi_mrr') then
    raise exception 'kpis_dashboard cambió tras la migración';
  end if;
  if (select ganadas from public.v_dash_resultados) <> (select v from pre_check where k = 'resultados_ganadas')
     or (select perdidas from public.v_dash_resultados) <> (select v from pre_check where k = 'resultados_perdidas') then
    raise exception 'v_dash_resultados cambió tras la migración';
  end if;
  -- Vistas que no cambian: deben seguir compilando
  perform 1 from public.portal_empresa;
  perform 1 from public.v_dash_cartera_clientes;
  perform 1 from public.v_dash_tareas_responsable;
  raise notice 'VERIFICACION OK';
end $$;

-- Aplicada con COMMIT.
commit;
