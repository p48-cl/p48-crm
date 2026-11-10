import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Circle, CircleSlash, Archive } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { parseSupabaseError } from '../../lib/errorHandler';

type Plataforma =
  | 'google_ads' | 'ga4' | 'meta_bm' | 'gtm_cmp' | 'gsc' | 'gbp' | 'merchant'
  | 'instagram' | 'facebook' | 'tiktok' | 'linkedin' | 'sitio_web' | 'landing' | 'otro';
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
  etiqueta?: string | null;
  url?: string | null;
}

// Plataformas que el conector P48 Marketing puede leer. Solo estas pueden verificarse solas.
const PLATAFORMAS: { id: Plataforma; nombre: string; conector: boolean; ayuda: string; multiple?: boolean }[] = [
  { id: 'google_ads', nombre: 'Google Ads', conector: true, ayuda: 'ID de cliente (123-456-7890)' },
  { id: 'ga4', nombre: 'Google Analytics 4', conector: true, ayuda: 'ID de propiedad GA4' },
  { id: 'meta_bm', nombre: 'Meta Business Manager', conector: false, ayuda: 'ID del Business Manager' },
  { id: 'gtm_cmp', nombre: 'GTM / Consent Mode v2', conector: false, ayuda: 'ID del contenedor GTM' },
  { id: 'gsc', nombre: 'Search Console', conector: true, ayuda: 'Dominio o URL de propiedad' },
  { id: 'gbp', nombre: 'Google Business Profile', conector: true, ayuda: 'ID de ubicación' },
  { id: 'merchant', nombre: 'Merchant Center', conector: true, ayuda: 'ID de cuenta Merchant' },
  { id: 'facebook', nombre: 'Página de Facebook', conector: false, ayuda: 'Nombre o URL de la página' },
  { id: 'instagram', nombre: 'Instagram', conector: false, ayuda: 'Usuario (@cuenta)' },
  { id: 'tiktok', nombre: 'TikTok', conector: false, ayuda: 'Usuario o ID de cuenta' },
  { id: 'linkedin', nombre: 'LinkedIn', conector: false, ayuda: 'URL de la página o ID' },
  { id: 'sitio_web', nombre: 'Sitio web', conector: false, ayuda: 'Dominio (ej: cliente.cl)', multiple: true },
  { id: 'landing', nombre: 'Landing page', conector: false, ayuda: 'URL de la landing', multiple: true },
  { id: 'otro', nombre: 'Otro activo digital', conector: false, ayuda: 'Nombre o URL del activo', multiple: true },
];

const CATEGORIAS: { titulo: string; ids: Plataforma[] }[] = [
  { titulo: 'Publicidad', ids: ['google_ads', 'meta_bm', 'tiktok', 'linkedin'] },
  { titulo: 'Analítica y web', ids: ['ga4', 'gsc', 'gtm_cmp', 'sitio_web', 'landing'] },
  { titulo: 'Negocio y redes', ids: ['gbp', 'merchant', 'instagram', 'facebook', 'otro'] },
];

const input =
  'w-full px-2.5 py-1.5 text-xs bg-[var(--c-field)] border border-[var(--c-line)] rounded text-[var(--c-text)] placeholder:text-[var(--c-muted-2)] focus:outline-none focus:border-[var(--c-accent)]';

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
  const [abierta, setAbierta] = useState<string | null>(null);
  const [nuevoTipo, setNuevoTipo] = useState<Plataforma>('sitio_web');
  const [nuevaEtiqueta, setNuevaEtiqueta] = useState('');

  const cargar = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    const { data, error: err } = await supabase
      .from('cuentas_cliente')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('archivado', false)
      .order('created_at', { ascending: true });
    if (err) setError(parseSupabaseError(err));
    setCuentas((data as Cuenta[]) ?? []);
  }, [empresaId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Filas: una por plataforma simple; para plataformas múltiples, una por cuenta registrada.
  type Fila = { key: string; def: (typeof PLATAFORMAS)[number]; c?: Cuenta };
  const filas: Fila[] = PLATAFORMAS.flatMap((p): Fila[] => {
    const mis = cuentas.filter((c) => c.plataforma === p.id);
    if (p.multiple) return mis.map((c): Fila => ({ key: c.id, def: p, c }));
    return [{ key: p.id, def: p, c: mis[0] }];
  });

  const guardar = async (fila: Fila, cambios: Partial<Cuenta>) => {
    if (!supabase) return;
    setError(null);
    const { error: err } = fila.c
      ? await supabase.from('cuentas_cliente').update(cambios).eq('id', fila.c.id)
      : await supabase.from('cuentas_cliente').insert({ empresa_id: empresaId, plataforma: fila.def.id, ...cambios });
    if (err) setError(parseSupabaseError(err));
    await cargar();
  };

  const agregarManual = async () => {
    if (!supabase) return;
    const etiqueta = nuevaEtiqueta.trim();
    if (!etiqueta) {
      setError('Pon un nombre para el acceso (ej: Landing campaña Navidad).');
      return;
    }
    setError(null);
    const { error: err } = await supabase
      .from('cuentas_cliente')
      .insert({ empresa_id: empresaId, plataforma: nuevoTipo, etiqueta });
    if (err) setError(parseSupabaseError(err));
    setNuevaEtiqueta('');
    await cargar();
  };

  const concedidas = filas.filter((f) => f.c?.estado === 'concedido').length;

  const registradas = filas.filter((f) => f.c);
  const pendientes = PLATAFORMAS.filter((p) => !p.multiple && !cuentas.some((c) => c.plataforma === p.id));
  const abiertaPendiente = abierta && !registradas.some((f) => f.key === abierta) ? PLATAFORMAS.find((p) => p.id === abierta && !p.multiple) : undefined;
  const filasMostrar: Fila[] = [
    ...registradas,
    ...(abiertaPendiente ? [{ key: abiertaPendiente.id, def: abiertaPendiente, c: undefined } as Fila] : []),
  ];
  const pendientesVisibles = pendientes.filter((p) => p.id !== abierta);

  const renderFila = (f: Fila) => {
    const { c, def: p } = f;
    const estado: Estado = c?.estado ?? 'pendiente';
    const ui = ESTADO_UI[estado];
    const abiertaEsta = abierta === f.key;
    const titulo = c?.etiqueta ? `${p.nombre} · ${c.etiqueta}` : p.nombre;
    return (
      <div key={f.key} className="py-2.5">
        <button
          type="button"
          onClick={() => setAbierta(abiertaEsta ? null : f.key)}
          className="w-full min-h-[44px] flex items-center justify-between gap-3 text-left"
        >
          <span className="text-sm font-medium text-[var(--c-text)]">{titulo}</span>
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
                onBlur={(e) => guardar(f, { cuenta_externa: e.target.value.trim() || null })}
              />
              <select
                className={input}
                value={estado}
                onChange={(e) =>
                  guardar(f, {
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
              onBlur={(e) => guardar(f, { concedido_por: e.target.value.trim() || null })}
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
                  onClick={() => guardar(f, { archivado: true })}
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
  };

  return (
    <div className="surface p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold text-[var(--c-text)]">Cuentas y permisos del cliente</h3>
          <p className="text-[11px] text-[var(--c-muted)]">Qué cuenta usamos y quién le dio acceso a P48</p>
        </div>
        <span className="text-[11px] text-[var(--c-muted)]">{concedidas} de {registradas.length} concedidos</span>
      </div>

      {error && <p className="text-xs text-[var(--c-danger)] border border-[var(--c-danger)]/40 rounded p-2">{error}</p>}

      {error && <p className="text-xs text-[var(--c-danger)] border border-[var(--c-danger)]/40 rounded p-2">{error}</p>}

      {registradas.length === 0 && !abierta && (
        <p className="text-xs text-[var(--c-muted)]">Todavía no hay cuentas registradas. Elige un activo abajo para empezar.</p>
      )}

      {CATEGORIAS.map((cat) => {
        const items = filasMostrar.filter((f) => cat.ids.includes(f.def.id));
        if (items.length === 0) return null;
        return (
          <div key={cat.titulo} className="space-y-1">
            <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--c-muted)]">{cat.titulo}</p>
            <div className="divide-y divide-[var(--c-line)]">
              {items.map((f) => renderFila(f))}
            </div>
          </div>
        );
      })}

      {pendientesVisibles.length > 0 && (
        <div className="border-t border-[var(--c-line)] pt-3 space-y-2">
          <p className="text-[11px] font-medium text-[var(--c-muted)]">Sin registrar · haz clic para agregar</p>
          <div className="flex flex-wrap gap-1.5">
            {pendientesVisibles.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setAbierta(p.id)}
                className="px-2.5 py-1 text-[11px] rounded-full border border-[var(--c-line)] text-[var(--c-text-2)] hover:border-[var(--c-accent)] hover:text-[var(--c-text)]"
              >
                + {p.nombre}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-[var(--c-line)] pt-3 space-y-2">
        <p className="text-[11px] font-medium text-[var(--c-muted)]">Agregar otro activo (sitio, landing, otro)</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <select className={input} value={nuevoTipo} onChange={(e) => setNuevoTipo(e.target.value as Plataforma)}>
            {PLATAFORMAS.filter((p) => p.multiple).map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
          <input
            className={input}
            placeholder="Nombre (ej: Landing Navidad)"
            value={nuevaEtiqueta}
            onChange={(e) => setNuevaEtiqueta(e.target.value)}
          />
          <button
            type="button"
            onClick={agregarManual}
            className="min-h-[44px] px-3 text-xs font-semibold rounded border border-[var(--c-line)] text-[var(--c-text)] hover:bg-[var(--c-surface-2)]"
          >
            Agregar
          </button>
        </div>
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
