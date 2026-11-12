-- Métricas por canal configurables. Cada fila define una métrica que se muestra en la ficha del cliente.
-- industria_id null = configuración por defecto; si la industria tiene filas para una plataforma, reemplazan a las por defecto.
create table if not exists public.metricas_canal_config (
  id uuid primary key default gen_random_uuid(),
  industria_id uuid references public.industrias(id) on delete cascade,
  plataforma text not null,
  metrica text not null,
  titulo text not null,
  agrega text not null check (agrega in ('suma','promedio','ultimo')),
  formato text not null check (formato in ('entero','decimal','pct','clp','x')),
  mejor_sube boolean not null default true,
  orden integer not null default 0,
  activo boolean not null default true,
  unique nulls not distinct (industria_id, plataforma, metrica)
);

alter table public.metricas_canal_config enable row level security;
create policy "miembros leen metricas config" on public.metricas_canal_config for select using (es_miembro());
create policy "admin escribe metricas config" on public.metricas_canal_config for all using (es_admin()) with check (es_admin());

-- Por defecto
insert into public.metricas_canal_config (industria_id, plataforma, metrica, titulo, agrega, formato, mejor_sube, orden) values
  (null, 'google_ads', 'inversion', 'Inversión', 'suma', 'clp', true, 1),
  (null, 'google_ads', 'clics', 'Clics', 'suma', 'entero', true, 2),
  (null, 'google_ads', 'conversiones', 'Conversiones', 'suma', 'entero', true, 3),
  (null, 'google_ads', 'roas', 'ROAS', 'promedio', 'x', true, 4),
  (null, 'gsc', 'clics', 'Clics', 'suma', 'entero', true, 1),
  (null, 'gsc', 'impresiones', 'Impresiones', 'suma', 'entero', true, 2),
  (null, 'gsc', 'ctr', 'CTR', 'promedio', 'pct', true, 3),
  (null, 'gsc', 'posicion', 'Posición media', 'promedio', 'decimal', false, 4),
  (null, 'gbp', 'vistas', 'Vistas', 'suma', 'entero', true, 1),
  (null, 'gbp', 'llamadas', 'Llamadas', 'suma', 'entero', true, 2),
  (null, 'gbp', 'rutas', 'Rutas', 'suma', 'entero', true, 3),
  (null, 'gbp', 'resenas', 'Reseñas', 'ultimo', 'entero', true, 4),
  (null, 'ga4', 'sesiones', 'Sesiones', 'suma', 'entero', true, 1),
  (null, 'ga4', 'usuarios', 'Usuarios', 'suma', 'entero', true, 2),
  (null, 'ga4', 'conversiones', 'Conversiones', 'suma', 'entero', true, 3),
  (null, 'ga4', 'tasa_conversion', 'Tasa de conversión', 'promedio', 'pct', true, 4),
  (null, 'merchant', 'clics', 'Clics', 'suma', 'entero', true, 1),
  (null, 'merchant', 'impresiones', 'Impresiones', 'suma', 'entero', true, 2),
  (null, 'merchant', 'productos_activos', 'Productos activos', 'ultimo', 'entero', true, 3),
  (null, 'instagram', 'seguidores', 'Seguidores', 'ultimo', 'entero', true, 1),
  (null, 'instagram', 'alcance', 'Alcance', 'suma', 'entero', true, 2),
  (null, 'instagram', 'interacciones', 'Interacciones', 'suma', 'entero', true, 3),
  (null, 'facebook', 'seguidores', 'Seguidores', 'ultimo', 'entero', true, 1),
  (null, 'facebook', 'alcance', 'Alcance', 'suma', 'entero', true, 2),
  (null, 'linkedin', 'seguidores', 'Seguidores', 'ultimo', 'entero', true, 1),
  (null, 'linkedin', 'impresiones', 'Impresiones', 'suma', 'entero', true, 2),
  (null, 'tiktok', 'seguidores', 'Seguidores', 'ultimo', 'entero', true, 1),
  (null, 'tiktok', 'vistas', 'Vistas', 'suma', 'entero', true, 2);

-- Turismo (hotel): el embudo se mide en reservas e ingresos
insert into public.metricas_canal_config (industria_id, plataforma, metrica, titulo, agrega, formato, mejor_sube, orden) values
  ((select id from public.industrias where nombre = 'Turismo'), 'ga4', 'sesiones', 'Sesiones', 'suma', 'entero', true, 1),
  ((select id from public.industrias where nombre = 'Turismo'), 'ga4', 'usuarios', 'Usuarios', 'suma', 'entero', true, 2),
  ((select id from public.industrias where nombre = 'Turismo'), 'ga4', 'conversiones', 'Reservas iniciadas', 'suma', 'entero', true, 3),
  ((select id from public.industrias where nombre = 'Turismo'), 'ga4', 'tasa_conversion', 'Tasa de reserva', 'promedio', 'pct', true, 4),
  ((select id from public.industrias where nombre = 'Turismo'), 'ga4', 'ingresos', 'Ingresos', 'suma', 'clp', true, 5);

-- Retail (ecommerce): compras, ingresos y tasa de compra
insert into public.metricas_canal_config (industria_id, plataforma, metrica, titulo, agrega, formato, mejor_sube, orden) values
  ((select id from public.industrias where nombre = 'Retail'), 'ga4', 'sesiones', 'Sesiones', 'suma', 'entero', true, 1),
  ((select id from public.industrias where nombre = 'Retail'), 'ga4', 'transacciones', 'Compras', 'suma', 'entero', true, 2),
  ((select id from public.industrias where nombre = 'Retail'), 'ga4', 'ingresos', 'Ingresos', 'suma', 'clp', true, 3),
  ((select id from public.industrias where nombre = 'Retail'), 'ga4', 'tasa_conversion', 'Tasa de compra', 'promedio', 'pct', true, 4),
  ((select id from public.industrias where nombre = 'Retail'), 'google_ads', 'inversion', 'Inversión', 'suma', 'clp', true, 1),
  ((select id from public.industrias where nombre = 'Retail'), 'google_ads', 'conversiones', 'Compras', 'suma', 'entero', true, 2),
  ((select id from public.industrias where nombre = 'Retail'), 'google_ads', 'roas', 'ROAS', 'promedio', 'x', true, 3);

-- Salud (clínica): solicitudes de hora
insert into public.metricas_canal_config (industria_id, plataforma, metrica, titulo, agrega, formato, mejor_sube, orden) values
  ((select id from public.industrias where nombre = 'Salud'), 'ga4', 'sesiones', 'Sesiones', 'suma', 'entero', true, 1),
  ((select id from public.industrias where nombre = 'Salud'), 'ga4', 'usuarios', 'Usuarios', 'suma', 'entero', true, 2),
  ((select id from public.industrias where nombre = 'Salud'), 'ga4', 'conversiones', 'Solicitudes de hora', 'suma', 'entero', true, 3),
  ((select id from public.industrias where nombre = 'Salud'), 'ga4', 'tasa_conversion', 'Tasa de solicitud', 'promedio', 'pct', true, 4);
