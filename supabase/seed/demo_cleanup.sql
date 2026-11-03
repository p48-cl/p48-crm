-- Borra SOLO los datos DEMO (ids que empiezan con 'dede', campañas 'DEMO-%').
-- No toca los registros PRUEBA – ni datos reales. Orden respeta las llaves foráneas.

delete from metricas_campanas where es_prueba and campana_id like 'DEMO-%';
delete from metricas_snapshot where es_prueba and empresa_id::text like 'dede%';
delete from tareas where id::text like 'dede%';
delete from actividades where id::text like 'dede%';
delete from proyectos where id::text like 'dede%';           -- entregables caen en cascada
delete from oportunidades where id::text like 'dede%';       -- evaluaciones y precios caen en cascada
delete from contactos where id::text like 'dede%';
delete from empresas where id::text like 'dede%';            -- cuentas, estrategia, accesos caen en cascada

-- Verificación: debe devolver 0 en todo.
select
  (select count(*) from empresas where id::text like 'dede%') empresas,
  (select count(*) from oportunidades where id::text like 'dede%') oportunidades,
  (select count(*) from metricas_campanas where es_prueba and campana_id like 'DEMO-%') campanas;
