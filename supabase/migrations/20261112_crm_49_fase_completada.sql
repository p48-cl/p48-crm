-- Fases con estado de avance: el checklist del detalle del proyecto marca cada fase como completada.
alter table public.proyecto_fases add column if not exists completada boolean not null default false;
comment on column public.proyecto_fases.completada is 'Fase completada. El avance del proyecto en el Gantt se calcula con fases completadas sobre el total.';
