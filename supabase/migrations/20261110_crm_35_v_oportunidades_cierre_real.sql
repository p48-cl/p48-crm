-- crm_35: expone fecha_cierre_real en v_oportunidades (columna nueva al final; aditivo).
create or replace view public.v_oportunidades with (security_invoker = true) as
 SELECT o.id, o.nombre, o.empresa_id, o.contacto_principal_id, o.etapa_id, o.responsable_id, o.fuente_id, o.plan, o.moneda,
    o.valor_neto, o.setup_neto, o.probabilidad, o.valor_ponderado, o.fecha_cierre_estimada, o.motivo_perdida_id,
    o.motivo_perdida_detalle, o.proxima_accion_texto, o.proxima_accion_fecha, o.archivado, o.created_at, o.updated_at,
    CASE
      WHEN e.es_ganada OR e.es_perdida THEN NULL::text
      WHEN o.proxima_accion_fecha IS NULL THEN 'sin_accion'::text
      WHEN o.proxima_accion_fecha < (now() AT TIME ZONE 'America/Santiago')::date THEN 'atrasado'::text
      WHEN o.proxima_accion_fecha <= ((now() AT TIME ZONE 'America/Santiago')::date + 2) THEN 'por_vencer'::text
      ELSE 'al_dia'::text
    END AS estado_seguimiento,
    o.numero,
    o.fecha_cierre_real
   FROM oportunidades o
     JOIN etapas e ON e.id = o.etapa_id;
