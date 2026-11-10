-- crm_33 · Análisis de marketing (opción 1: Claude + MCP escribe en Supabase)
-- 1) Solicitudes: por cliente o cartera, manual o programada, con resultado
alter table public.analisis_solicitudes
  add column if not exists empresa_id uuid references public.empresas(id) on delete cascade,
  add column if not exists origen text not null default 'manual' check (origen in ('manual', 'programado')),
  add column if not exists procesado_en timestamptz,
  add column if not exists resumen text,
  add column if not exists error text;

create index if not exists analisis_solicitudes_pendientes on public.analisis_solicitudes (estado, created_at);

-- 2) Resultado del análisis por cliente (texto + hallazgos estructurados)
create table if not exists public.analisis_cliente (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  solicitud_id uuid references public.analisis_solicitudes(id) on delete set null,
  periodo_desde date not null,
  periodo_hasta date not null,
  resumen text not null,
  hallazgos jsonb not null default '[]'::jsonb, -- [{tipo:'alerta'|'oportunidad'|'ok', canal, texto}]
  fuentes text[] not null default '{}',          -- plataformas leídas en esta corrida
  created_at timestamptz not null default now()
);
create index if not exists analisis_cliente_empresa on public.analisis_cliente (empresa_id, created_at desc);

alter table public.analisis_cliente enable row level security;
create policy "miembros leen analisis" on public.analisis_cliente for select using (public.es_miembro());
create policy "admin escribe analisis" on public.analisis_cliente for insert with check (public.es_admin());
create policy "admin borra analisis" on public.analisis_cliente for delete using (public.es_admin());

-- 3) Catálogo de fuentes: qué plataforma, si es pago u orgánico, qué conector la lee y si está activo.
--    Al crear un MCP nuevo (Meta, LinkedIn, TikTok) basta cambiar estado a 'activo'.
create table if not exists public.fuentes_marketing (
  plataforma text primary key,
  nombre text not null,
  tipo text not null check (tipo in ('pago', 'organico', 'analitica')),
  conector text not null,        -- mcp_google | mcp_meta | mcp_linkedin | mcp_tiktok | csv
  estado text not null default 'planificado' check (estado in ('activo', 'planificado', 'pausado')),
  tabla_destino text not null check (tabla_destino in ('metricas_campanas', 'metricas_snapshot', 'seo_keywords')),
  orden smallint not null default 0
);

alter table public.fuentes_marketing enable row level security;
create policy "miembros leen fuentes" on public.fuentes_marketing for select using (public.es_miembro());
create policy "admin edita fuentes" on public.fuentes_marketing for update using (public.es_admin());

insert into public.fuentes_marketing (plataforma, nombre, tipo, conector, estado, tabla_destino, orden) values
  ('google_ads',   'Google Ads',          'pago',      'mcp_google',   'activo',      'metricas_campanas', 10),
  ('ga4',          'Google Analytics 4',  'analitica', 'mcp_google',   'activo',      'metricas_snapshot', 20),
  ('gsc',          'Search Console',      'organico',  'mcp_google',   'activo',      'metricas_snapshot', 30),
  ('gbp',          'Perfil de Empresa',   'organico',  'mcp_google',   'activo',      'metricas_snapshot', 40),
  ('merchant',     'Merchant Center',     'pago',      'mcp_google',   'activo',      'metricas_snapshot', 50),
  ('meta_ads',     'Meta Ads',            'pago',      'mcp_meta',     'planificado', 'metricas_campanas', 60),
  ('instagram',    'Instagram orgánico',  'organico',  'mcp_meta',     'planificado', 'metricas_snapshot', 70),
  ('facebook',     'Facebook orgánico',   'organico',  'mcp_meta',     'planificado', 'metricas_snapshot', 80),
  ('linkedin_ads', 'LinkedIn Ads',        'pago',      'mcp_linkedin', 'planificado', 'metricas_campanas', 90),
  ('linkedin',     'LinkedIn orgánico',   'organico',  'mcp_linkedin', 'planificado', 'metricas_snapshot', 100),
  ('tiktok_ads',   'TikTok Ads',          'pago',      'mcp_tiktok',   'planificado', 'metricas_campanas', 110),
  ('tiktok',       'TikTok orgánico',     'organico',  'mcp_tiktok',   'planificado', 'metricas_snapshot', 120)
on conflict (plataforma) do nothing;
