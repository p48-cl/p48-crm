-- ============================================================================
-- LIMPIEZA DE DATOS DE PRUEBA · CRM P48
-- ============================================================================
-- Borra los datos cargados por pruebas_cargar.sql y las filas de prueba
-- antiguas con prefijo "PRUEBA – " o "DEMO – ".
--
-- NO borra: empresas reales (ej. "Hotel Cabo de Hornos", "sdf") ni la fila
-- de la agencia ("P48 · Agencia"), salvo que su nombre empiece con PRUEBA/DEMO.
--
-- USO:
--   1. Pegar TODO este archivo en el SQL editor de Supabase (o execute_sql).
--   2. Con v_simular = true (default) solo hace un conteo y revierte todo.
--   3. Para borrar de verdad: cambiar v_simular a false y ejecutar de nuevo.
-- ============================================================================

DO $limpieza$
DECLARE
  v_simular boolean := true;   -- <-- cambiar a false para borrar de verdad
  v_resumen text;
BEGIN
  CREATE TEMP TABLE t_emp ON COMMIT DROP AS
    SELECT id FROM empresas
    WHERE nombre LIKE 'PRUEBA – %' OR nombre LIKE 'DEMO – %';

  CREATE TEMP TABLE t_opo ON COMMIT DROP AS
    SELECT id FROM oportunidades
    WHERE empresa_id IN (SELECT id FROM t_emp)
       OR nombre LIKE 'PRUEBA – %' OR nombre LIKE 'DEMO – %';

  CREATE TEMP TABLE t_pro ON COMMIT DROP AS
    SELECT id FROM proyectos
    WHERE empresa_id IN (SELECT id FROM t_emp)
       OR nombre LIKE 'PRUEBA – %' OR nombre LIKE 'DEMO – %';

  CREATE TEMP TABLE t_tar ON COMMIT DROP AS
    SELECT id FROM tareas
    WHERE empresa_id IN (SELECT id FROM t_emp)
       OR oportunidad_id IN (SELECT id FROM t_opo)
       OR proyecto_id IN (SELECT id FROM t_pro)
       OR titulo LIKE 'PRUEBA – %' OR titulo LIKE 'DEMO – %';

  CREATE TEMP TABLE t_cot ON COMMIT DROP AS
    SELECT id FROM cotizaciones
    WHERE empresa_id IN (SELECT id FROM t_emp)
       OR titulo LIKE 'PRUEBA – %' OR titulo LIKE 'DEMO – %';

  -- Dependencias primero (sin depender de cascadas)
  DELETE FROM tarea_dependencias
    WHERE tarea_id IN (SELECT id FROM t_tar) OR depende_de_id IN (SELECT id FROM t_tar);
  DELETE FROM analisis_cliente   WHERE empresa_id IN (SELECT id FROM t_emp)
                                    OR resumen LIKE 'PRUEBA – %';
  DELETE FROM analisis_solicitudes WHERE empresa_id IN (SELECT id FROM t_emp);
  DELETE FROM cargas_datos       WHERE empresa_id IN (SELECT id FROM t_emp);
  DELETE FROM seo_keywords       WHERE empresa_id IN (SELECT id FROM t_emp)
                                    OR keyword LIKE 'PRUEBA – %';
  DELETE FROM metricas_snapshot  WHERE empresa_id IN (SELECT id FROM t_emp) OR es_prueba = true;
  DELETE FROM metricas_campanas  WHERE campana_nombre LIKE 'PRUEBA – %' OR campana_nombre LIKE 'DEMO – %';
  DELETE FROM actividades        WHERE empresa_id IN (SELECT id FROM t_emp)
                                    OR oportunidad_id IN (SELECT id FROM t_opo)
                                    OR titulo LIKE 'PRUEBA – %' OR titulo LIKE 'DEMO – %';
  DELETE FROM tareas             WHERE id IN (SELECT id FROM t_tar);
  DELETE FROM reportes           WHERE empresa_id IN (SELECT id FROM t_emp)
                                    OR titulo LIKE 'PRUEBA – %' OR titulo LIKE 'DEMO – %';
  DELETE FROM proyectos          WHERE id IN (SELECT id FROM t_pro);
  DELETE FROM cotizaciones       WHERE id IN (SELECT id FROM t_cot);
  DELETE FROM oportunidades      WHERE id IN (SELECT id FROM t_opo);
  DELETE FROM contactos          WHERE empresa_id IN (SELECT id FROM t_emp);
  DELETE FROM cuentas_cliente    WHERE empresa_id IN (SELECT id FROM t_emp);
  DELETE FROM empresas           WHERE id IN (SELECT id FROM t_emp);

  -- Plantillas de calificación y criterios de prueba
  DELETE FROM criterios_calificacion
    WHERE pregunta LIKE 'PRUEBA – %'
       OR plantilla_id IN (SELECT id FROM plantillas_calificacion WHERE nombre LIKE 'PRUEBA – %');
  DELETE FROM plantillas_calificacion WHERE nombre LIKE 'PRUEBA – %';

  -- Miembros de prueba (y sus metas)
  DELETE FROM metas_comerciales WHERE miembro_id IN (SELECT id FROM miembros WHERE email LIKE '%@p48.test');
  DELETE FROM miembros          WHERE email LIKE '%@p48.test';

  IF v_simular THEN
    v_resumen := format(
      'SIMULACRO (no se borró nada). Quedarían: empresas_prueba=%s, oportunidades_prueba=%s, tareas_prueba=%s, miembros_prueba=%s, empresas_total=%s, oportunidades_total=%s',
      (SELECT count(*) FROM empresas WHERE nombre LIKE 'PRUEBA – %' OR nombre LIKE 'DEMO – %'),
      (SELECT count(*) FROM oportunidades WHERE nombre LIKE 'PRUEBA – %'),
      (SELECT count(*) FROM tareas WHERE titulo LIKE 'PRUEBA – %'),
      (SELECT count(*) FROM miembros WHERE email LIKE '%@p48.test'),
      (SELECT count(*) FROM empresas),
      (SELECT count(*) FROM oportunidades));
    RAISE EXCEPTION '%', v_resumen;   -- fuerza rollback de todo lo anterior
  END IF;
END
$limpieza$;
