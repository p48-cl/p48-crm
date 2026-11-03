import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Circle, CircleSlash, Archive } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { parseSupabaseError } from '../../lib/errorHandler';

type Plataforma = 'google_ads' | 'ga4' | 'meta_bm' | 'gtm_cmp' | 'gsc' | 'gbp' | 'merchant';
type Estado = 'pendiente' | 'concedido' | 'revocado';

interface Cuenta {
  id: string;
  empresa_id: string;
  plataforma: Plataforma;
  cuenta_externa: string | null;
  estado: Estado;
  verificado_automatico: boolean;
  concedido_por: string | null;
  fecha_concedido: string | null;
  notas: string | null;
  archivado?: boolean;
  ultima_lectura?: string | null;
}

// Plataformas que el conector P48 Marketing puede leer. Solo estas pueden verificarse solas.
const PLATAFORMAS: { id: Plataforma; nombre: string; conector: boolean; ayuda: string }[] = [
  { id: 'google_ads', nombre: 'Google Ads', conector: true, ayuda: 'ID de cliente (123-456-7890)' },
  { id: 'ga4', nombre: 'Google Analytics 4', conector: true, ayuda: 'ID de propiedad GA4' },
  { id: 'meta_bm', nombre: 'Meta Business Manager', conector: false, ayuda: 'ID del Business Manager' },
  { id: 'gtm_cmp', nombre: 'GTM / Consent Mode v2', conector: false, ayuda: 'ID del contenedor GTM' },
  { id: 'gsc', nombre: 'Search Console', conector: true, ayuda: 'Dominio o URL de propiedad' },
  { id: 'gbp', nombre: 'Google Business Profile', conector: true, ayuda: 'ID de ubicación' },
  { id: 'merchant', nombre: 'Merchant Center', conector: true, ayuda: 'ID de cuenta Merchant' },
];

const input =
  'w-full px-2.5 py-1.5 text-xs bg-[var(--c-surface)] border border-[var(--c-line)] rounded text-[var(--c-text)] placeholder:text-[var(--c-muted-2)] focus:outline-none focus:border-[var(--c-accent)]';

const ESTADO_UI: Record<Estado, { texto: string; color: string; Icono: React.ElementType }> = {
  concedido: { texto: 'Concedido', color: 'text-[var(--c-ok)]', Icono: CheckCircle2 },
  pendiente: { texto: 'Pendiente', color: 'text-[var(--c-muted)]', Icono: Circle },
  revocado: { texto: 'Revocado', color: 'text-[var(--c-danger)]', Icono: CircleSlash },
};


// Salud de datos: solo aplica a plataformas que el conector puede leer
const saludLectura = (conector: boolean, c?: Cuenta) => {
  if (!conector) return { texto: 'Sin conector', color: 'text-[var(--c-muted-2)]' };
  if (!c || !c.cuenta_externa) return { texto: 'Falta ID de cuenta', color: 'text-[var(--c-muted)]' };
  if (!c.ultima_lectura) return { texto: 'Sin lecturas', color: 'text-[var(--c-muted)]' };
  const dias = Math.floor((Date.now() - new Date(c.ultima_lectura).getTime()) / 86400000);
  if (dias > 7) return { texto: `Atrasada · ${dias} días`, color: 'text-[var(--c-danger)]' };
  return { texto: 'Al día', color: 'text-[var(--c-ok)]' };
};

export const CuentasCliente: React.FC<{ empresaId: string; notas: string; onNotas: (v: string) => void }> = ({
  empresaId,
  notas,
  onNotas,
}) => {
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [abierta, setAbierta] = useState<Plataforma | null>(null);

  const cargar = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    const { data, error: err } = await supabase
      .from('cuentas_cliente')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('archivado', false);
    if (err) setError(parseSupabaseError(err));
    setCuentas((data as Cuenta[]) ?? []);
  }, [empresaId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const guardar = async (plataforma: Plataforma, cambios: Partial<Cuenta>) => {
    if (!supabase) return;
    setError(null);
    const existente = cuentas.find((c) => c.plataforma === plataforma);
    const { error: err } = existente
      ? await supabase.from('cuentas_cliente').update(cambios).eq('id', existente.id)
      : await supabase.from('cuentas_cliente').insert({ empresa_id: empresaId, plataforma, ...cambios });
    if (err) setError(parseSupabaseError(err));
    await cargar();
  };

  const concedidas = PLATAFORMAS.filter((p) => cuentas.find((c) => c.plataforma === p.id)?.estado === 'concedido').length;

  return (
    <div className="surface p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold text-[var(--c-text)]">Cuentas y permisos del cliente</h3>
          <p className="text-[11px] text-[var(--c-muted)]">Qué cuenta usamos y quién le dio acceso a P48</p>
        </div>
        <span className="text-[11px] text-[var(--c-muted)]">{concedidas} de {PLATAFORMAS.length} concedidos</span>
      </div>

      {error && <p className="text-xs text-[var(--c-danger)] border border-[var(--c-danger)]/40 rounded p-2">{error}</p>}

      <div className="divide-y divide-[var(--c-line)]">
        {PLATAFORMAS.map((p) => {
          const c = cuentas.find((x) => x.plataforma === p.id);
          const estado: Estado = c?.estado ?? 'pendiente';
          const ui = ESTADO_UI[estado];
          const abiertaEsta = abierta === p.id;
          return (
            <div key={p.id} className="py-2.5">
              <button
                type="button"
                onClick={() => setAbierta(abiertaEsta ? null : p.id)}
                className="w-full min-h-[44px] flex items-center justify-between gap-3 text-left"
              >
                <span className="text-sm font-medium text-[var(--c-text)]">{p.nombre}</span>
                <span className="flex items-center gap-2 text-xs">
                  {c?.cuenta_externa && <span className="font-mono text-[var(--c-muted)] truncate max-w-[140px]">{c.cuenta_externa}</span>}
                  <span className={`hidden sm:inline ${saludLectura(p.conector, c).color}`}>{saludLectura(p.conector, c).texto}</span>
                  <ui.Icono className={`w-4 h-4 ${ui.color}`} />
                  <span className={ui.color}>{ui.texto}</span>
                </span>
              </button>

              {abiertaEsta && (
                <div className="mt-2 space-y-2 pl-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      className={input}
                      placeholder={p.ayuda}
                      defaultValue={c?.cuenta_externa ?? ''}
                      onBlur={(e) => guardar(p.id, { cuenta_externa: e.target.value.trim() || null })}
                    />
                    <select
                      className={input}
                      value={estado}
                      onChange={(e) =>
                        guardar(p.id, {
                          estado: e.target.value as Estado,
                          fecha_concedido: e.target.value === 'concedido' ? new Date().toISOString().slice(0, 10) : null,
                        })
                      }
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="concedido">Concedido</option>
                      <option value="revocado">Revocado</option>
                    </select>
                  </div>
                  <input
                    className={input}
                    placeholder="¿Quién concedió el acceso? (nombre o correo del cliente)"
                    defaultValue={c?.concedido_por ?? ''}
                    onBlur={(e) => guardar(p.id, { concedido_por: e.target.value.trim() || null })}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--c-muted)]">
                    <span>
                      {c?.fecha_concedido ? `Concedido el ${c.fecha_concedido}` : 'Sin fecha de concesión'}
                      {c?.ultima_lectura ? ` · Última lectura ${new Date(c.ultima_lectura).toLocaleDateString('es-CL')}` : ''}
                      {' · '}
                      {p.conector
                        ? c?.verificado_automatico
                          ? 'Verificado por conector'
                          : 'Verificación automática pendiente de integrar'
                        : 'Verificación manual'}
                    </span>
                    {c && (
                      <button
                        type="button"
                        onClick={() => guardar(p.id, { archivado: true })}
                        className="inline-flex items-center gap-1 min-h-[44px] px-2 hover:text-[var(--c-danger)]"
                      >
                        <Archive className="w-3.5 h-3.5" /> Quitar
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div>
        <label className="block text-[11px] font-medium text-[var(--c-muted)] mb-1">Notas generales de accesos</label>
        <textarea
          rows={2}
          value={notas}
          onChange={(e) => onNotas(e.target.value)}
          placeholder="Ej: Partner ID invitado, falta confirmación por correo..."
          className={input}
        />
      </div>
    </div>
  );
};
