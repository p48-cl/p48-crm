import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LogOut, ExternalLink, FolderOpen, FileText, CalendarClock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { parseSupabaseError } from '../lib/errorHandler';
import {
  PortalProyecto,
  PortalEntregable,
  PortalReporte,
} from '../types/crm';

// Solo se permiten enlaces http(s); evita esquemas como javascript:
const urlSegura = (valor: string | null | undefined): string | null => {
  if (!valor) return null;
  try {
    const u = new URL(valor);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
};

// Looker Studio: solo se incrusta si el dominio es de Google y se usa la ruta de embed
const urlEmbedLooker = (valor: string | null | undefined): string | null => {
  const segura = urlSegura(valor);
  if (!segura) return null;
  const u = new URL(segura);
  const hostOk = u.protocol === 'https:' && (u.hostname === 'lookerstudio.google.com' || u.hostname === 'datastudio.google.com');
  if (!hostOk) return null;
  if (u.pathname.startsWith('/embed/')) return u.toString();
  if (u.pathname.startsWith('/reporting/')) {
    u.pathname = '/embed' + u.pathname;
    return u.toString();
  }
  return null;
};

const fecha = (iso: string | null) =>
  iso ? new Date(iso + 'T12:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const etiqueta = (v: string) => v.replace('_', ' ');

const card = 'p-4 bg-[var(--c-surface)] border border-[var(--c-line)] rounded-lg space-y-3';

export const PortalView: React.FC = () => {
  const { portalEmpresas, logout } = useAuth();
  const [empresaId, setEmpresaId] = useState(portalEmpresas[0]?.empresa_id ?? '');
  const [proyectos, setProyectos] = useState<PortalProyecto[]>([]);
  const [entregables, setEntregables] = useState<PortalEntregable[]>([]);
  const [reportes, setReportes] = useState<PortalReporte[]>([]);
  const [error, setError] = useState<string | null>(null);

  const empresa = useMemo(
    () => portalEmpresas.find((e) => e.empresa_id === empresaId) ?? portalEmpresas[0],
    [portalEmpresas, empresaId]
  );

  const cargar = useCallback(async () => {
    if (!supabase || !empresa) return;
    setError(null);
    const [p, e, r] = await Promise.all([
      supabase.from('portal_proyectos').select('*').eq('empresa_id', empresa.empresa_id),
      supabase.from('portal_entregables').select('*').eq('empresa_id', empresa.empresa_id).order('fecha_comprometida', { ascending: true, nullsFirst: false }),
      supabase.from('portal_reportes').select('*').eq('empresa_id', empresa.empresa_id).order('periodo', { ascending: false, nullsFirst: false }),
    ]);
    const fallo = p.error || e.error || r.error;
    if (fallo) setError(parseSupabaseError(fallo));
    setProyectos((p.data as PortalProyecto[]) ?? []);
    setEntregables((e.data as PortalEntregable[]) ?? []);
    setReportes((r.data as PortalReporte[]) ?? []);
  }, [empresa]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (!empresa) return null;

  const embed = urlEmbedLooker(empresa.looker_dashboard_url);
  const linkLooker = urlSegura(empresa.looker_dashboard_url);
  const linkDrive = urlSegura(empresa.drive_folder_url);
  const activos = proyectos.filter((p) => p.estado === 'en_curso');
  const proximos = entregables.filter((x) => x.estado !== 'entregado').slice(0, 3);

  return (
    <div className="min-h-screen bg-[var(--c-bg)] text-[var(--c-text)] font-sans selection:bg-[var(--c-accent)] selection:text-[var(--c-on-accent)]">
      <header className="sticky top-0 z-20 bg-[var(--c-bg)]/95 border-b border-[var(--c-line)] px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 bg-[var(--c-accent)] text-[var(--c-on-accent)] font-black flex items-center justify-center text-xs font-mono rounded shrink-0">J</div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate">{empresa.nombre}</p>
            <p className="text-[10px] font-mono uppercase text-[var(--c-muted)]">Portal de clientes</p>
          </div>
        </div>
        <button onClick={() => logout()} className="flex items-center gap-1.5 text-xs text-[var(--c-muted)] hover:text-[var(--c-text)]">
          <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Cerrar sesión</span>
        </button>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-5">
        {portalEmpresas.length > 1 && (
          <select
            value={empresa.empresa_id}
            onChange={(ev) => setEmpresaId(ev.target.value)}
            className="w-full px-3 py-2 text-xs bg-[var(--c-surface)] border border-[var(--c-line)] rounded"
          >
            {portalEmpresas.map((e) => (
              <option key={e.empresa_id} value={e.empresa_id}>{e.nombre}</option>
            ))}
          </select>
        )}

        {error && <p className="text-xs text-[var(--c-danger)] border border-[var(--c-danger)]/40 rounded p-3">{error}</p>}

        {/* Resumen */}
        <div className="grid grid-cols-2 gap-3">
          <div className={card}>
            <p className="text-[11px] font-mono uppercase text-[var(--c-muted)]">Plan</p>
            <p className="text-lg font-mono font-bold">{empresa.plan ? `Plan ${empresa.plan}` : '—'}</p>
          </div>
          <div className={card}>
            <p className="text-[11px] font-mono uppercase text-[var(--c-muted)]">Renovación</p>
            <p className="text-lg font-mono font-bold">{fecha(empresa.fecha_renovacion)}</p>
          </div>
          <div className={card}>
            <p className="text-[11px] font-mono uppercase text-[var(--c-muted)]">Proyectos activos</p>
            <p className="text-lg font-mono font-bold">{activos.length}</p>
          </div>
          <div className={card}>
            <p className="text-[11px] font-mono uppercase text-[var(--c-muted)]">Entregables pendientes</p>
            <p className="text-lg font-mono font-bold">{entregables.filter((x) => x.estado !== 'entregado').length}</p>
          </div>
        </div>

        {proximos.length > 0 && (
          <div className={card}>
            <h2 className="text-xs font-semibold flex items-center gap-2"><CalendarClock className="w-4 h-4 text-[var(--c-accent)]" /> Próximos entregables</h2>
            {proximos.map((x) => (
              <div key={x.id} className="flex justify-between gap-3 text-xs">
                <span className="truncate">{x.titulo}</span>
                <span className="font-mono text-[var(--c-muted)] whitespace-nowrap">{fecha(x.fecha_comprometida)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Dashboard */}
        <section className={card}>
          <h2 className="text-xs font-semibold">Dashboard de resultados</h2>
          {embed ? (
            <iframe
              title="Dashboard de resultados"
              src={embed}
              className="w-full h-[70vh] min-h-[420px] rounded border border-[var(--c-line)] bg-[var(--c-surface)]"
              sandbox="allow-scripts allow-same-origin allow-popups"
              referrerPolicy="no-referrer"
              allowFullScreen
            />
          ) : linkLooker ? (
            <a href={linkLooker} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-2 text-xs text-[var(--c-accent)] hover:underline">
              <ExternalLink className="w-4 h-4" /> Abrir dashboard
            </a>
          ) : (
            <p className="text-xs text-[var(--c-muted)]">Dashboard en preparación.</p>
          )}
        </section>

        {/* Proyectos */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold">Proyectos</h2>
          {proyectos.length === 0 ? (
            <p className="text-xs text-[var(--c-muted)]">Aún no hay proyectos publicados.</p>
          ) : (
            proyectos.map((p) => {
              const ents = entregables.filter((x) => x.proyecto_id === p.id);
              return (
                <div key={p.id} className={card}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{p.nombre}</p>
                      {p.descripcion && <p className="text-xs text-[var(--c-muted)] mt-0.5">{p.descripcion}</p>}
                    </div>
                    <span className="font-mono text-[10px] uppercase text-[var(--c-accent)] whitespace-nowrap">{etiqueta(p.estado)}</span>
                  </div>
                  <p className="font-mono text-[10px] text-[var(--c-muted-2)]">{fecha(p.fecha_inicio)} → {fecha(p.fecha_fin)}</p>
                  {ents.length > 0 && (
                    <div className="divide-y divide-[#222]">
                      {ents.map((x) => {
                        const doc = urlSegura(x.url_documento);
                        return (
                          <div key={x.id} className="py-2 flex items-center justify-between gap-3 text-xs">
                            <div className="min-w-0">
                              <p className="truncate">{x.titulo}</p>
                              <p className="font-mono text-[10px] text-[var(--c-muted)]">
                                {etiqueta(x.estado)}{x.fecha_comprometida ? ` · ${fecha(x.fecha_comprometida)}` : ''}
                              </p>
                            </div>
                            {doc && (
                              <a href={doc} target="_blank" rel="noreferrer noopener" className="text-[var(--c-accent)] hover:underline shrink-0">Ver</a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </section>

        {/* Reportes */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold flex items-center gap-2"><FileText className="w-4 h-4" /> Reportes</h2>
          {reportes.length === 0 ? (
            <p className="text-xs text-[var(--c-muted)]">Aún no hay reportes publicados.</p>
          ) : (
            <div className={card + ' divide-y divide-[#222] !space-y-0'}>
              {reportes.map((r) => {
                const url = urlSegura(r.url);
                return (
                  <div key={r.id} className="py-2 flex items-center justify-between gap-3 text-xs first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate">{r.titulo}</p>
                      <p className="font-mono text-[10px] text-[var(--c-muted)]">{r.tipo}{r.periodo ? ` · ${fecha(r.periodo)}` : ''}</p>
                    </div>
                    {url && <a href={url} target="_blank" rel="noreferrer noopener" className="text-[var(--c-accent)] hover:underline shrink-0">Abrir</a>}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {linkDrive && (
          <a href={linkDrive} target="_blank" rel="noreferrer noopener" className={card + ' flex items-center gap-3 text-xs hover:border-[var(--c-accent)]'}>
            <FolderOpen className="w-4 h-4 text-[var(--c-accent)]" /> Carpeta de documentos
          </a>
        )}
      </main>
    </div>
  );
};
