import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

export type TipoCanal = 'pago' | 'organico' | 'analitica';
export type EstadoCanal = 'activo' | 'planificado' | 'pausado';

export interface Canal {
  plataforma: string;
  nombre: string;
  tipo: TipoCanal;
  conector: string;
  estado: EstadoCanal;
  muestra: string; // qué se verá cuando el conector esté activo
}

// Espejo del catálogo fuentes_marketing (crm_33). El estado real se lee de la base;
// esta lista da el orden, la agrupación y el texto de ayuda si la base no responde.
export const CANALES: Canal[] = [
  { plataforma: 'google_ads', nombre: 'Google Ads', tipo: 'pago', conector: 'mcp_google', estado: 'activo', muestra: 'Inversión, conversiones, CPA y ROAS por campaña.' },
  { plataforma: 'meta_ads', nombre: 'Meta Ads', tipo: 'pago', conector: 'mcp_meta', estado: 'planificado', muestra: 'Campañas de Facebook e Instagram: inversión, resultados, CPA, frecuencia.' },
  { plataforma: 'tiktok_ads', nombre: 'TikTok Ads', tipo: 'pago', conector: 'mcp_tiktok', estado: 'planificado', muestra: 'Campañas de TikTok: inversión, vistas, clics y conversiones.' },
  { plataforma: 'linkedin_ads', nombre: 'LinkedIn Ads', tipo: 'pago', conector: 'mcp_linkedin', estado: 'planificado', muestra: 'Campañas B2B: inversión, leads de formulario y CPL.' },
  { plataforma: 'gsc', nombre: 'Search Console (SEO)', tipo: 'organico', conector: 'mcp_google', estado: 'activo', muestra: 'Clics, impresiones, CTR, posición media y keywords.' },
  { plataforma: 'gbp', nombre: 'Perfil de Empresa', tipo: 'organico', conector: 'mcp_google', estado: 'activo', muestra: 'Vistas, llamadas, rutas y clics al sitio desde Google Maps.' },
  { plataforma: 'instagram', nombre: 'Instagram', tipo: 'organico', conector: 'mcp_meta', estado: 'planificado', muestra: 'Seguidores, alcance, interacciones y publicaciones.' },
  { plataforma: 'facebook', nombre: 'Facebook', tipo: 'organico', conector: 'mcp_meta', estado: 'planificado', muestra: 'Seguidores de la página, alcance e interacciones.' },
  { plataforma: 'tiktok', nombre: 'TikTok', tipo: 'organico', conector: 'mcp_tiktok', estado: 'planificado', muestra: 'Seguidores, vistas de video e interacciones.' },
  { plataforma: 'linkedin', nombre: 'LinkedIn', tipo: 'organico', conector: 'mcp_linkedin', estado: 'planificado', muestra: 'Seguidores de la página, impresiones e interacciones.' },
  { plataforma: 'ga4', nombre: 'Google Analytics 4', tipo: 'analitica', conector: 'mcp_google', estado: 'activo', muestra: 'Sesiones, usuarios y conversiones del sitio.' },
  { plataforma: 'merchant', nombre: 'Merchant Center', tipo: 'pago', conector: 'mcp_google', estado: 'activo', muestra: 'Productos, clics e impresiones de Shopping.' },
];

export type Agrega = 'suma' | 'promedio' | 'ultimo';
export type FormatoKpi = 'entero' | 'decimal' | 'pct' | 'clp' | 'x';

export interface KpiCanal {
  metrica: string; // nombre exacto que envía el conector o el CSV
  titulo: string;
  agrega: Agrega; // cómo combinar las semanas del periodo
  formato: FormatoKpi; // pct: fracción (0,05 = 5%)
  mejorSube?: boolean; // false si un valor menor es mejor (posición). Por defecto true
}

// Métricas básicas que muestra cada plataforma al abrirla. Si el conector usa otro nombre, la tarjeta queda en "—".
export const KPIS_CANAL: Record<string, KpiCanal[]> = {
  ga4: [
    { metrica: 'sesiones', titulo: 'Sesiones', agrega: 'suma', formato: 'entero' },
    { metrica: 'usuarios', titulo: 'Usuarios', agrega: 'suma', formato: 'entero' },
    { metrica: 'conversiones', titulo: 'Conversiones', agrega: 'suma', formato: 'entero' },
    { metrica: 'tasa_conversion', titulo: 'Tasa de conversión', agrega: 'promedio', formato: 'pct' },
  ],
  gsc: [
    { metrica: 'clics', titulo: 'Clics', agrega: 'suma', formato: 'entero' },
    { metrica: 'impresiones', titulo: 'Impresiones', agrega: 'suma', formato: 'entero' },
    { metrica: 'ctr', titulo: 'CTR', agrega: 'promedio', formato: 'pct' },
    { metrica: 'posicion', titulo: 'Posición media', agrega: 'promedio', formato: 'decimal', mejorSube: false },
  ],
  gbp: [
    { metrica: 'vistas', titulo: 'Vistas', agrega: 'suma', formato: 'entero' },
    { metrica: 'llamadas', titulo: 'Llamadas', agrega: 'suma', formato: 'entero' },
    { metrica: 'rutas', titulo: 'Rutas', agrega: 'suma', formato: 'entero' },
    { metrica: 'resenas', titulo: 'Reseñas', agrega: 'ultimo', formato: 'entero' },
  ],
  merchant: [
    { metrica: 'clics', titulo: 'Clics', agrega: 'suma', formato: 'entero' },
    { metrica: 'impresiones', titulo: 'Impresiones', agrega: 'suma', formato: 'entero' },
    { metrica: 'productos_activos', titulo: 'Productos activos', agrega: 'ultimo', formato: 'entero' },
  ],
  instagram: [
    { metrica: 'seguidores', titulo: 'Seguidores', agrega: 'ultimo', formato: 'entero' },
    { metrica: 'alcance', titulo: 'Alcance', agrega: 'suma', formato: 'entero' },
    { metrica: 'interacciones', titulo: 'Interacciones', agrega: 'suma', formato: 'entero' },
    { metrica: 'visitas_perfil', titulo: 'Visitas al perfil', agrega: 'suma', formato: 'entero' },
  ],
  facebook: [
    { metrica: 'seguidores', titulo: 'Seguidores', agrega: 'ultimo', formato: 'entero' },
    { metrica: 'alcance', titulo: 'Alcance', agrega: 'suma', formato: 'entero' },
    { metrica: 'interacciones', titulo: 'Interacciones', agrega: 'suma', formato: 'entero' },
  ],
  tiktok: [
    { metrica: 'seguidores', titulo: 'Seguidores', agrega: 'ultimo', formato: 'entero' },
    { metrica: 'vistas', titulo: 'Vistas', agrega: 'suma', formato: 'entero' },
    { metrica: 'interacciones', titulo: 'Interacciones', agrega: 'suma', formato: 'entero' },
  ],
  linkedin: [
    { metrica: 'seguidores', titulo: 'Seguidores', agrega: 'ultimo', formato: 'entero' },
    { metrica: 'impresiones', titulo: 'Impresiones', agrega: 'suma', formato: 'entero' },
    { metrica: 'interacciones', titulo: 'Interacciones', agrega: 'suma', formato: 'entero' },
  ],
};

export const GRUPOS_CANAL: { tipo: TipoCanal; titulo: string }[] = [
  { tipo: 'pago', titulo: 'Pago' },
  { tipo: 'organico', titulo: 'Orgánico' },
  { tipo: 'analitica', titulo: 'Analítica' },
];

export const canalDe = (plataforma: string) => CANALES.find((c) => c.plataforma === plataforma);

// Catálogo con el estado vigente desde fuentes_marketing
export function useCanales(): Canal[] {
  const [canales, setCanales] = useState<Canal[]>(CANALES);
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    let vivo = true;
    supabase
      .from('fuentes_marketing')
      .select('plataforma,estado')
      .then(({ data }) => {
        if (!vivo || !data) return;
        const estado = new Map((data as { plataforma: string; estado: EstadoCanal }[]).map((f) => [f.plataforma, f.estado]));
        setCanales(CANALES.map((c) => ({ ...c, estado: estado.get(c.plataforma) ?? c.estado })));
      });
    return () => {
      vivo = false;
    };
  }, []);
  return canales;
}
