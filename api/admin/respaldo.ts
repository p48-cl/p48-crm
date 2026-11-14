// Respaldo de datos del CRM (148). Solo administradores.
// Variables en Vercel: SUPABASE_URL (o VITE_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY.
// Devuelve un JSON con todas las tablas de public. No registra valores en logs.

const TABLAS = [
  'empresas', 'contactos', 'leads', 'oportunidades_legacy', 'negocios', 'cotizaciones',
  'cotizacion_items', 'cuentas_cliente', 'facturas', 'proyectos', 'proyecto_miembros',
  'proyecto_fases', 'tareas', 'tarea_dependencias', 'entregables', 'entregables_internos',
  'actividades', 'evaluaciones_oportunidad', 'oportunidad_precios', 'reportes',
  'analisis_cliente', 'analisis_solicitudes', 'estrategia_cliente', 'servicios_cliente',
  'cliente_usuarios', 'metricas_snapshot', 'metricas_campanas', 'seo_keywords',
  'cargas_datos', 'metas_comerciales', 'uf_diaria', 'notificaciones', 'audit_log',
  'miembros', 'configuracion_crm', 'etapas', 'criterios_calificacion', 'plantillas_calificacion',
  'planes_servicio', 'fuentes_marketing', 'metricas_canal_config', 'accesos_admin_marketing',
];

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.status(405).send('Método no permitido.');
    return;
  }

  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = (req.headers.authorization ?? '').replace(/^Bearer /, '');
  if (!url || !service || !token) {
    res.status(500).send('Configuración incompleta.');
    return;
  }

  const headersServicio = { apikey: service, Authorization: `Bearer ${service}` };

  // 1) Quién llama: usuario de la sesión actual.
  const who = await fetch(`${url}/auth/v1/user`, { headers: { apikey: service, Authorization: `Bearer ${token}` } });
  if (!who.ok) {
    res.status(401).send('Sesión no válida.');
    return;
  }
  const { email } = (await who.json()) as { email?: string };

  // 2) Debe ser admin en miembros.
  const rolRes = await fetch(
    `${url}/rest/v1/miembros?select=rol&email=eq.${encodeURIComponent(email ?? '')}`,
    { headers: headersServicio },
  );
  const filas = (await rolRes.json()) as Array<{ rol: string }>;
  if (!filas?.[0] || filas[0].rol !== 'admin') {
    res.status(403).send('Solo administradores.');
    return;
  }

  // 3) Exportar cada tabla.
  const respaldo: Record<string, unknown> = {
    generado_en: new Date().toISOString(),
    tablas: {} as Record<string, unknown>,
  };
  const tablas = respaldo.tablas as Record<string, unknown>;
  for (const tabla of TABLAS) {
    const r = await fetch(`${url}/rest/v1/${tabla}?select=*`, { headers: headersServicio });
    tablas[tabla] = r.ok ? await r.json() : { error: `HTTP ${r.status}` };
  }

  const fecha = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="p48-crm-respaldo-${fecha}.json"`);
  res.status(200).send(JSON.stringify(respaldo, null, 2));
}
