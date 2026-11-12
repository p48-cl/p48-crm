-- crm_44: dos pipelines. 'captacion' (prospectos) y 'expansion' (negocios con clientes activos).
alter table public.etapas add column if not exists pipeline text not null default 'captacion' check (pipeline in ('captacion','expansion'));
alter table public.etapas drop constraint if exists etapas_nombre_key;
create unique index if not exists etapas_pipeline_nombre_key on public.etapas (pipeline, nombre);
insert into public.etapas (nombre, orden, probabilidad_default, color, es_ganada, es_perdida, activa, pipeline) values
 ('Detectada', 11, 20, '#BEFF00', false, false, true, 'expansion'),
 ('Propuesta', 12, 50, '#888888', false, false, true, 'expansion'),
 ('Negociación', 13, 70, '#f40101', false, false, true, 'expansion'),
 ('Ganado', 14, 100, '#099f36', true, false, true, 'expansion'),
 ('Perdido', 15, 0, '#04f6e6', false, true, true, 'expansion');
