-- crm_23 · Plan "personalizado" y tipo de renovación.
-- Estado: APLICADA y verificada.

alter table public.empresas drop constraint if exists empresas_plan_check;
alter table public.empresas add constraint empresas_plan_check
  check (plan is null or plan = any (array['A','B','C','D','E','personalizado']::text[]));

alter table public.oportunidades drop constraint if exists oportunidades_plan_check;
alter table public.oportunidades add constraint oportunidades_plan_check
  check (plan is null or plan = any (array['A','B','C','D','E','personalizado']::text[]));

alter table public.empresas add column if not exists renovacion_tipo text not null default 'manual';
alter table public.empresas drop constraint if exists empresas_renovacion_tipo_check;
alter table public.empresas add constraint empresas_renovacion_tipo_check
  check (renovacion_tipo in ('manual','automatica'));
