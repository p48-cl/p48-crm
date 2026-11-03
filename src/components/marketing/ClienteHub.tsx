import React, { useMemo, useState } from 'react';
import { Play } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { METRICAS, Variacion, Tendencia, fechaCorta, useDatosMarketing } from './comun';

export const ClienteHub: React.FC = () => {
  const { currentUser } = useAuth();
  const { clientes, filas, cargando } = useDatosMarketing();
  const [clienteSel, setClienteSel] = useState<string>('');
  const [metricaGrafico, setMetricaGrafico] = useState<string>('ses');
  const [solicitud, setSolicitud] = useState<string | null>(null);

  const clienteId = clienteSel || clientes[0]?.id || '';
  const cliente = clientes.find((c) => c.id === clienteId);

  const serie = useMemo(() => {
    const out = new Map<string, typeof filas>();
    for (const f of filas) {
      if (f.empresa_id !== clienteId) continue;
      const k = `${f.plataforma}|${f.metrica}`;
      out.set(k, [...(out.get(k) ?? []), f]);
    }
    return out;
  }, [filas, clienteId]);

  const esPrueba = filas.some((f) => f.empresa_id === clienteId && f.es_prueba);
  const metricaActiva = METRICAS.find((m) => m.clave === metricaGrafico) ?? METRICAS[0];
  const puntos = (serie.get(`${metricaActiva.plataforma}|${metricaActiva.metrica}`) ?? []).map((f) => ({
    etiqueta: fechaCorta(f.periodo),
    valor: f.valor,
  }));

  const pedirAnalisis = async () => {
    if (!supabase || !currentUser?.id) return;
    const { error } = await supabase.from('analisis_solicitudes').insert({ solicitado_por: currentUser.id });
    setSolicitud(
      error
        ? 'No se pudo registrar la solicitud.'
        : 'Solicitud registrada. El análisis se ejecuta los lunes o cuando lo corras desde Claude.',
    );
  };

  if (cargando) return <p className="text-sm text-[var(--c-muted)]">Cargando...</p>;
  if (clientes.length === 0) return <div className="surface p-6 text-sm text-[var(--c-muted)]">No hay clientes activos todavía.</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <select
          value={clienteId}
          onChange={(e) => setClienteSel(e.target.value)}
          className="px-2.5 py-1.5 text-xs bg-[var(--c-surface)] border border-[var(--c-line)] rounded text-[var(--c-text)]"
          aria-label="Cliente"
        >
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
        <button
          onClick={pedirAnalisis}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-[var(--c-accent)] text-[var(--c-on-accent)]"
        >
          <Play className="w-3.5 h-3.5" /> Ejecutar análisis
        </button>
      </div>
      {solicitud && <p className="text-xs text-[var(--c-text-2)]">{solicitud}</p>}
      {esPrueba && <p className="text-[11px] font-mono text-[var(--c-warn)]">Datos de prueba: no son métricas reales del cliente.</p>}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {METRICAS.map((m) => {
          const s = serie.get(`${m.plataforma}|${m.metrica}`) ?? [];
          const ultimo = s[s.length - 1];
          const previo = s[s.length - 2];
          return (
            <button
              key={m.clave}
              onClick={() => setMetricaGrafico(m.clave)}
              className={`surface p-4 text-left space-y-1 ${metricaGrafico === m.clave ? 'border-[var(--c-accent)]' : ''}`}
            >
              <p className="text-[11px] font-mono uppercase tracking-wider text-[var(--c-muted)]">{m.titulo}</p>
              {ultimo ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold font-mono text-[var(--c-text)]">{m.formato(ultimo.valor)}</span>
                  <Variacion actual={ultimo.valor} previo={previo?.valor} mejorSube={m.mejorSube} />
                </div>
              ) : (
                <span className="text-sm text-[var(--c-muted-2)]">Sin datos</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="surface p-4 space-y-2">
        <p className="text-sm font-semibold text-[var(--c-text)]">
          {metricaActiva.titulo} · {cliente?.nombre}
        </p>
        {puntos.length > 1 ? (
          <Tendencia puntos={puntos} formato={metricaActiva.formato} />
        ) : (
          <p className="text-xs text-[var(--c-muted)]">Sin lecturas suficientes para este cliente.</p>
        )}
      </div>
    </div>
  );
};
