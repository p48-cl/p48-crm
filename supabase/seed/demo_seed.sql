-- Datos DEMO para probar el CRM. Todos los ids empiezan con 'dede' y los nombres con 'DEMO –'.
-- Para borrarlos: ejecutar supabase/seed/demo_cleanup.sql.
-- Responsable: el primer miembro activo. Ejecutar con un miembro ya creado.

-- Empresas
insert into empresas (id, nombre, estado, industria_id, plan, fee_mensual_clp, setup_fee_clp, fecha_renovacion, salud, responsable_id) values
('dede0000-0000-4000-8000-000000000001', 'DEMO – Hotel Andes Austral', 'prospecto', (select id from industrias where nombre = 'Turismo'), null, null, null, null, null, (select id from miembros where activo order by created_at limit 1)),
('dede0000-0000-4000-8000-000000000002', 'DEMO – Clínica Mirador', 'prospecto', (select id from industrias where nombre = 'Salud'), null, null, null, null, null, (select id from miembros where activo order by created_at limit 1)),
('dede0000-0000-4000-8000-000000000003', 'DEMO – Retail Sur Ltda', 'cliente', (select id from industrias where nombre = 'Retail'), 'B', 1500000, 650000, '2026-12-18', 'amarillo', (select id from miembros where activo order by created_at limit 1)),
('dede0000-0000-4000-8000-000000000004', 'DEMO – Edu Norte', 'prospecto', (select id from industrias where nombre = 'Educación'), null, null, null, null, null, (select id from miembros where activo order by created_at limit 1));

-- Contactos
insert into contactos (id, empresa_id, nombre, apellido, cargo, rol_decision, email, es_principal) values
('dede0000-0000-4000-8000-000000000011', 'dede0000-0000-4000-8000-000000000001', 'Camila', 'Demo', 'Gerente comercial', 'decisor', 'camila.demo@example.com', true),
('dede0000-0000-4000-8000-000000000012', 'dede0000-0000-4000-8000-000000000002', 'Rodrigo', 'Demo', 'Director de marketing', 'decisor', 'rodrigo.demo@example.com', true),
('dede0000-0000-4000-8000-000000000013', 'dede0000-0000-4000-8000-000000000003', 'Valentina', 'Demo', 'Jefa de e-commerce', 'influenciador', 'valentina.demo@example.com', true),
('dede0000-0000-4000-8000-000000000014', 'dede0000-0000-4000-8000-000000000004', 'Matías', 'Demo', 'Coordinador de admisiones', 'usuario', 'matias.demo@example.com', true);

-- Oportunidades (una por etapa relevante: Diagnóstico, Negociación, Lead, Ganado, Perdido)
insert into oportunidades (id, nombre, empresa_id, contacto_principal_id, etapa_id, responsable_id, fuente_id, plan, moneda, valor_neto, setup_neto, fecha_cierre_estimada, motivo_perdida_id, proxima_accion_texto, proxima_accion_fecha) values
('dede0000-0000-4000-8000-000000000021', 'DEMO – Hotel Andes · Pauta Google', 'dede0000-0000-4000-8000-000000000001', 'dede0000-0000-4000-8000-000000000011', (select id from etapas where nombre = 'Diagnóstico'), (select id from miembros where activo order by created_at limit 1), (select id from fuentes where nombre = 'Sitio web'), 'B', 'CLP', 1500000, 650000, '2026-12-01', null, 'Enviar diagnóstico', '2026-11-05'),
('dede0000-0000-4000-8000-000000000022', 'DEMO – Clínica Mirador · Expansión', 'dede0000-0000-4000-8000-000000000002', 'dede0000-0000-4000-8000-000000000012', (select id from etapas where nombre = 'Negociación'), (select id from miembros where activo order by created_at limit 1), (select id from fuentes where nombre = 'Referido'), 'C', 'CLP', 2200000, 650000, '2026-11-20', null, 'Revisar contrato', '2026-11-04'),
('dede0000-0000-4000-8000-000000000023', 'DEMO – Clínica Mirador · Inicial', 'dede0000-0000-4000-8000-000000000002', 'dede0000-0000-4000-8000-000000000012', (select id from etapas where nombre = 'Lead'), (select id from miembros where activo order by created_at limit 1), (select id from fuentes where nombre = 'Google Ads'), null, 'CLP', 1200000, 0, '2026-12-10', null, 'Agendar llamada', '2026-11-06'),
('dede0000-0000-4000-8000-000000000024', 'DEMO – Retail Sur · Renovación', 'dede0000-0000-4000-8000-000000000003', 'dede0000-0000-4000-8000-000000000013', (select id from etapas where nombre = 'Ganado'), (select id from miembros where activo order by created_at limit 1), (select id from fuentes where nombre = 'Referido'), 'B', 'CLP', 1500000, 650000, '2026-10-15', null, null, null),
('dede0000-0000-4000-8000-000000000025', 'DEMO – Edu Norte · Campaña admisión', 'dede0000-0000-4000-8000-000000000004', 'dede0000-0000-4000-8000-000000000014', (select id from etapas where nombre = 'Perdido'), (select id from miembros where activo order by created_at limit 1), (select id from fuentes where nombre = 'Evento o webinar'), 'A', 'CLP', 500000, 0, '2026-10-30', (select id from motivos_perdida where nombre = 'Presupuesto insuficiente para pauta'), null, null);

-- Proyecto de onboarding de Retail Sur (cliente demo)
insert into proyectos (id, empresa_id, nombre, descripcion, estado, fecha_inicio, fecha_fin, responsable_id, visible_cliente) values
('dede0000-0000-4000-8000-000000000031', 'dede0000-0000-4000-8000-000000000003', 'DEMO – Onboarding Retail Sur', 'Accesos admin, tracking y primera campaña', 'en_curso', '2026-10-20', null, (select id from miembros where activo order by created_at limit 1), true);

-- Tareas (vencida, para hoy, futura, completada)
insert into tareas (id, empresa_id, oportunidad_id, responsable_id, titulo, descripcion, fecha_vencimiento, prioridad, completada) values
('dede0000-0000-4000-8000-000000000041', 'dede0000-0000-4000-8000-000000000001', 'dede0000-0000-4000-8000-000000000021', (select id from miembros where activo order by created_at limit 1), 'DEMO – Enviar diagnóstico a Hotel Andes', null, '2026-10-30', 'alta', false),
('dede0000-0000-4000-8000-000000000042', 'dede0000-0000-4000-8000-000000000002', 'dede0000-0000-4000-8000-000000000022', (select id from miembros where activo order by created_at limit 1), 'DEMO – Revisar contrato Clínica Mirador', null, '2026-11-03', 'alta', false),
('dede0000-0000-4000-8000-000000000043', 'dede0000-0000-4000-8000-000000000003', null, (select id from miembros where activo order by created_at limit 1), 'DEMO – Revisar accesos Google Ads Retail Sur', null, '2026-11-10', 'media', false),
('dede0000-0000-4000-8000-000000000044', 'dede0000-0000-4000-8000-000000000003', null, (select id from miembros where activo order by created_at limit 1), 'DEMO – Enviar reporte de octubre', null, '2026-11-01', 'baja', true);

-- Actividades (llamada, reunión, nota)
insert into actividades (id, empresa_id, oportunidad_id, contacto_id, autor_id, tipo, titulo, descripcion, resultado, fecha_actividad) values
('dede0000-0000-4000-8000-000000000051', 'dede0000-0000-4000-8000-000000000001', 'dede0000-0000-4000-8000-000000000021', 'dede0000-0000-4000-8000-000000000011', (select id from miembros where activo order by created_at limit 1), 'llamada', 'DEMO – Llamada de seguimiento', 'Pidió ver casos de hoteles de la zona.', 'Interesada', '2026-10-28 15:00:00-03'),
('dede0000-0000-4000-8000-000000000052', 'dede0000-0000-4000-8000-000000000002', 'dede0000-0000-4000-8000-000000000022', 'dede0000-0000-4000-8000-000000000012', (select id from miembros where activo order by created_at limit 1), 'reunion', 'DEMO – Reunión de propuesta', 'Presentamos plan C. Piden ajuste de setup.', 'Pendiente respuesta', '2026-10-29 11:00:00-03'),
('dede0000-0000-4000-8000-000000000053', 'dede0000-0000-4000-8000-000000000003', null, 'dede0000-0000-4000-8000-000000000013', (select id from miembros where activo order by created_at limit 1), 'nota', 'DEMO – Nota de cuenta', 'Cliente conforme con los primeros resultados.', null, '2026-10-31 09:30:00-03'),
('dede0000-0000-4000-8000-000000000054', null, null, 'dede0000-0000-4000-8000-000000000014', (select id from miembros where activo order by created_at limit 1), 'llamada', 'DEMO – Llamada sin interés', 'Presupuesto cerrado para este año.', 'Perdida', '2026-10-27 17:00:00-03');

-- Métricas de campañas (Retail Sur, dos semanas). es_prueba = true, campana_id 'DEMO-…'
insert into metricas_campanas (empresa_id, plataforma, campana_id, campana_nombre, canal, periodo, presupuesto_diario_clp, costo_clp, impresiones, clics, conversiones, valor_conversion_clp, es_prueba, origen) values
('dede0000-0000-4000-8000-000000000003', 'google_ads', 'DEMO-1', 'DEMO – Búsqueda marca', 'search', '2026-10-26', 20000, 310000, 42000, 2100, 64, 2480000, true, 'manual'),
('dede0000-0000-4000-8000-000000000003', 'google_ads', 'DEMO-1', 'DEMO – Búsqueda marca', 'search', '2026-11-02', 20000, 298000, 39500, 1990, 61, 2360000, true, 'manual'),
('dede0000-0000-4000-8000-000000000003', 'google_ads', 'DEMO-2', 'DEMO – Genérico ecommerce', 'search', '2026-10-26', 25000, 455000, 61000, 1450, 22, 880000, true, 'manual'),
('dede0000-0000-4000-8000-000000000003', 'google_ads', 'DEMO-2', 'DEMO – Genérico ecommerce', 'search', '2026-11-02', 25000, 468000, 63500, 1510, 19, 760000, true, 'manual'),
('dede0000-0000-4000-8000-000000000003', 'meta_ads', 'DEMO-3', 'DEMO – Retargeting', 'social', '2026-11-02', 15000, 210000, 98000, 2400, 11, 540000, true, 'manual');

-- Métricas orgánicas de redes (Retail Sur)
insert into metricas_snapshot (empresa_id, plataforma, metrica, periodo, valor, origen, es_prueba) values
('dede0000-0000-4000-8000-000000000003', 'instagram', 'seguidores', '2026-10-26', 8200, 'manual', true),
('dede0000-0000-4000-8000-000000000003', 'instagram', 'seguidores', '2026-11-02', 8350, 'manual', true),
('dede0000-0000-4000-8000-000000000003', 'instagram', 'alcance', '2026-11-02', 41000, 'manual', true);
