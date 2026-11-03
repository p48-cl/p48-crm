import React, { useMemo, useState } from 'react';
import { Download, Upload, AlertTriangle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { parseSupabaseError as parseErrorSafe } from '../../lib/errorHandler';
import { useAuth } from '../../context/AuthContext';
import { descargarCSV, parseCSV } from '../../lib/csv';
import { PLANTILLAS, procesarCampanas, procesarMetricas, type FilaCampana, type FilaMetrica } from './plantillas';
import { useDatosMarketing } from './comun';

const select = 'px-2.5 py-1.5 text-xs bg-[var(--c-surface)] border border-[var(--c-line)] rounded text-[var(--c-text)]';

export const Importador: React.FC = () => {
  const { currentUser } = useAuth();
  const { clientes, cargando } = useDatosMarketing();
  const [clienteSel, setClienteSel] = useState('');
  const [plantillaId, setPlantillaId] = useState(PLANTILLAS[0].id);
  const [archivo, setArchivo] = useState<string | null>(null);
  const [filasCsv, setFilasCsv] = useState<string[][] | null>(null);
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);

  const clienteId = clienteSel || clientes[0]?.id || '';
  const plantilla = PLANTILLAS.find((p) => p.id === plantillaId) ?? PLANTILLAS[0];

  const resultado = useMemo(() => {
    if (!filasCsv || filasCsv.length < 2) return null;
    return plantilla.tipo === 'metricas' ? procesarMetricas(filasCsv, plantilla) : procesarCampanas(filasCsv, plantilla);
  }, [filasCsv, plantilla]);

  const leer = async (f: File | undefined) => {
    setMensaje(null);
    if (!f) return;
    if (f.size > 2_000_000) { setMensaje({ ok: false, texto: 'El archivo supera 2 MB.' }); return; }
    setArchivo(f.name);
    setFilasCsv(parseCSV(await f.text()));
  };

  const importar = async () => {
    if (!supabase || !resultado || resultado.filas.length === 0 || !clienteId) return;
    setGuardando(true);
    setMensaje(null);
    const base = { empresa_id: clienteId, origen: 'csv', cargado_por: currentUser?.id ?? null, es_prueba: false, capturado_en: new Date().toISOString() };
    let error;
    if (plantilla.tipo === 'metricas') {
      ({ error } = await supabase
        .from('metricas_snapshot')
        .upsert((resultado.filas as FilaMetrica[]).map((r) => ({ ...base, ...r })), { onConflict: 'empresa_id,plataforma,metrica,periodo' }));
    } else {
      ({ error } = await supabase
        .from('metricas_campanas')
        .upsert((resultado.filas as FilaCampana[]).map((r) => ({ ...base, ...r })), { onConflict: 'empresa_id,plataforma,campana_id,periodo' }));
    }
    if (!error) {
      await supabase.from('cargas_datos').insert({
        empresa_id: clienteId, plantilla: plantilla.id, origen: 'csv', archivo, filas: resultado.filas.length, cargado_por: currentUser?.id ?? null,
      });
    }
    setGuardando(false);
    setMensaje(error ? { ok: false, texto: parseErrorSafe(error) } : { ok: true, texto: `Importadas ${resultado.filas.length} filas. Ya se ven en Dashboard, Ads y la ficha del cliente.` });
    if (!error) { setFilasCsv(null); setArchivo(null); }
  };

  if (cargando) return <p className="text-sm text-[var(--c-muted)]">Cargando...</p>;
  if (!isSupabaseConfigured) return <div className="surface p-6 text-sm text-[var(--c-muted)]">La carga de datos requiere Supabase.</div>;
  if (clientes.length === 0) return <div className="surface p-6 text-sm text-[var(--c-muted)]">No hay clientes activos todavía.</div>;

  const vista = resultado?.filas.slice(0, 6) ?? [];
  const columnas = vista[0] ? Object.keys(vista[0]) : [];

  return (
    <div className="space-y-5">
      <div className="surface p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <select value={clienteId} onChange={(e) => setClienteSel(e.target.value)} className={select} aria-label="Cliente">
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <select value={plantillaId} onChange={(e) => { setPlantillaId(e.target.value); setFilasCsv(null); setArchivo(null); setMensaje(null); }} className={select} aria-label="Plantilla">
            {PLANTILLAS.map((p) => <option key={p.id} value={p.id}>{p.titulo}</option>)}
          </select>
          <button
            onClick={() => descargarCSV(`ejemplo_${plantilla.id}.csv`, plantilla.ejemplo)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border border-[var(--c-line)] text-[var(--c-text)] hover:bg-[var(--c-surface-2)]"
          >
            <Download className="w-3.5 h-3.5" /> Descargar ejemplo
          </button>
        </div>
        <p className="text-[11px] text-[var(--c-muted)]">{plantilla.descripcion} Las fechas se agrupan al lunes de su semana. Si una fila ya existe, se actualiza.</p>
        <label className="flex items-center gap-2 px-3 py-6 border border-dashed border-[var(--c-line)] rounded cursor-pointer hover:border-[var(--c-accent)] text-xs text-[var(--c-text-2)] justify-center">
          <Upload className="w-4 h-4" />
          {archivo ?? 'Elegir archivo CSV (máx. 2 MB)'}
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { leer(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
      </div>

      {mensaje && (
        <p className={`text-xs border rounded p-2 ${mensaje.ok ? 'text-[var(--c-ok)] border-[var(--c-ok)]/40' : 'text-[var(--c-danger)] border-[var(--c-danger)]/40'}`}>{mensaje.texto}</p>
      )}

      {filasCsv && filasCsv.length < 2 && <p className="text-xs text-[var(--c-danger)]">El archivo no tiene filas de datos.</p>}

      {resultado && (
        <div className="surface p-4 space-y-3">
          {resultado.faltantes.length > 0 ? (
            <p className="flex items-start gap-1.5 text-xs text-[var(--c-danger)]">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              Faltan columnas: {resultado.faltantes.join(', ')}. Revisa los encabezados o descarga el ejemplo.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-[var(--c-text)]">
                  <span className="font-semibold">{resultado.filas.length}</span> filas válidas de {resultado.total}
                  {resultado.errores.length > 0 && <span className="text-[var(--c-warn)]"> · {resultado.errores.length} con error (se omiten)</span>}
                </p>
                <button
                  onClick={importar}
                  disabled={guardando || resultado.filas.length === 0}
                  className="px-3 py-1.5 text-xs font-semibold rounded bg-[var(--c-accent)] text-[var(--c-on-accent)] disabled:opacity-40"
                >
                  {guardando ? 'Importando...' : `Importar ${resultado.filas.length} filas`}
                </button>
              </div>
              {vista.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="text-left text-[var(--c-muted)] font-mono uppercase">
                        {columnas.map((c) => <th key={c} className="pr-3 pb-1 font-normal">{c}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {vista.map((r, i) => (
                        <tr key={i} className="border-t border-[var(--c-line)] text-[var(--c-text-2)]">
                          {columnas.map((c) => <td key={c} className="pr-3 py-1 whitespace-nowrap">{String((r as unknown as Record<string, unknown>)[c] ?? '')}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {resultado.filas.length > vista.length && <p className="text-[10px] text-[var(--c-muted)] mt-1">Vista previa de {vista.length} de {resultado.filas.length}.</p>}
                </div>
              )}
            </>
          )}
          {resultado.errores.length > 0 && (
            <ul className="text-[11px] text-[var(--c-warn)] space-y-0.5 max-h-32 overflow-y-auto">
              {resultado.errores.slice(0, 20).map((e) => <li key={e}>{e}</li>)}
              {resultado.errores.length > 20 && <li>... y {resultado.errores.length - 20} más</li>}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
