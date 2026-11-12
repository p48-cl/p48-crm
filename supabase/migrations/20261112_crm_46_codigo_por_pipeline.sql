-- crm_46: negocios con código por pipeline (LEAD-0001 captación, EXP-0001 expansión) y pipeline fijo.
alter table public.oportunidades add column if not exists pipeline text check (pipeline in ('captacion','expansion'));
alter table public.oportunidades add column if not exists numero_pipeline integer;

-- Backfill: pipeline desde la etapa; número dentro de cada pipeline en orden de creación
update public.oportunidades o set pipeline = e.pipeline from public.etapas e where e.id = o.etapa_id and o.pipeline is null;
with ord as (
  select id, row_number() over (partition by pipeline order by numero) as n from public.oportunidades
)
update public.oportunidades o set numero_pipeline = ord.n from ord where ord.id = o.id;

alter table public.oportunidades alter column pipeline set not null;
alter table public.oportunidades alter column numero_pipeline set not null;
create unique index if not exists oportunidades_pipeline_numero_key on public.oportunidades (pipeline, numero_pipeline);

-- Trigger: el pipeline lo fija la etapa; no se puede cambiar de pipeline; numera dentro del pipeline
create or replace function public.trg_oportunidad_pipeline()
returns trigger language plpgsql set search_path to 'public' as $$
declare v_pipe text;
begin
  select pipeline into v_pipe from public.etapas where id = new.etapa_id;
  if tg_op = 'UPDATE' and old.pipeline is not null and v_pipe is distinct from old.pipeline then
    raise exception 'Un negocio no puede pasar de pipeline (captación ↔ expansión)';
  end if;
  new.pipeline := coalesce(v_pipe, old.pipeline, 'captacion');
  if tg_op = 'INSERT' or new.pipeline is distinct from old.pipeline then
    new.numero_pipeline := (select coalesce(max(numero_pipeline), 0) + 1 from public.oportunidades where pipeline = new.pipeline);
  end if;
  return new;
end $$;

drop trigger if exists oportunidades_pipeline on public.oportunidades;
create trigger oportunidades_pipeline before insert or update of etapa_id on public.oportunidades
  for each row execute function public.trg_oportunidad_pipeline();

-- Vista: columnas nuevas al final
create or replace view public.v_oportunidades with (security_invoker = true) as
 SELECT o.id, o.nombre, o.empresa_id, o.contacto_principal_id, o.etapa_id, o.responsable_id, o.fuente_id, o.plan, o.moneda,
    o.valor_neto, o.setup_neto, o.probabilidad, o.valor_ponderado, o.fecha_cierre_estimada, o.motivo_perdida_id,
    o.motivo_perdida_detalle, o.proxima_accion_texto, o.proxima_accion_fecha, o.archivado, o.created_at, o.updated_at,
        CASE
            WHEN e.es_ganada OR e.es_perdida THEN NULL::text
            WHEN o.proxima_accion_fecha IS NULL THEN 'sin_accion'::text
            WHEN o.proxima_accion_fecha < (now() AT TIME ZONE 'America/Santiago'::text)::date THEN 'atrasado'::text
            WHEN o.proxima_accion_fecha <= ((now() AT TIME ZONE 'America/Santiago'::text)::date + 2) THEN 'por_vencer'::text
            ELSE 'al_dia'::text
        END AS estado_seguimiento,
    o.numero, o.fecha_cierre_real, o.pipeline, o.numero_pipeline
   FROM oportunidades o
     JOIN etapas e ON e.id = o.etapa_id;
