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
