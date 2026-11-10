import React, { useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { formatCLP } from '../../lib/formatters';
import { Barras, Tendencia, Variacion, fechaCorta, useDatosMarketing } from './comun';

const select =
  'px-2.5 py-1.5 text-xs bg-[var(--c-surface)] border border-[var(--c-line)] rounded text-[var(--c-text)]';
const DIAS_ATRASO = 7;
const CONECTOR = ['google_ads', 'ga4', 'gsc', 'gbp', 'merchant'];

interface Alerta {
  cliente: string;
  texto: string;
}

export const MktDashboard: React.FC = () => {
  const { clientes, filas, cuentas, cargando } = useDatosMarketing();
  const [filtroCliente, setFiltroCliente] = useState('todos');
  const [semanas, setSemanas] = useState(8);
  const [conPrueba, setConPrueba] = useState(false);

  const datos = useMemo(() => {
    const ids = new Set(filtroCliente === 'todos' ? clientes.map((c) => c.id) : [filtroCliente]);
    const base = filas.filter((f) => ids.has(f.empresa_id) && (conPrueba || !f.es_prueba));
    const periodos = [...new Set(base.map((f) => f.periodo))].sort().slice(-semanas);
    const enRango = base.filter((f) => periodos.includes(f.periodo));
    const val = (emp: string, pl: string, me: string, per: string) =>
      enRango.find((f) => f.empresa_id === emp && f.plataforma === pl && f.metrica === me && f.periodo === per)?.valor;

    // Totales por semana en toda la selección.
    const porSemana = periodos.map((per) => {
      let ses = 0, clics = 0, inv = 0, valorConv = 0;
      const posiciones: number[] = [];
      for (const id of ids) {
        ses += val(id, 'ga4', 'sesiones', per) ?? 0;
        clics += val(id, 'gsc', 'clics', per) ?? 0;
        const i = val(id, 'google_ads', 'inversion', per) ?? 0;
        inv += i;
        valorConv += i * (val(id, 'google_ads', 'roas', per) ?? 0);
        const p = val(id, 'gsc', 'posicion', per);
        if (p !== undefined) posiciones.push(p);
      }
      return {
        per,
        ses,
        clics,
        inv,
        roas: inv > 0 ? valorConv / inv : 0,
        pos: posiciones.length ? posiciones.reduce((a, b) => a + b, 0) / posiciones.length : 0,
      };
    });

    const ultima = periodos[periodos.length - 1];
    const penultima = periodos[periodos.length - 2];

    // Tabla por cliente (última semana) y alertas.
    const alertas: Alerta[] = [];
    const tabla = clientes
      .filter((c) => ids.has(c.id))
      .map((c) => {
        const ses = ultima ? val(c.id, 'ga4', 'sesiones', ultima) : undefined;
        const sesPrev = penultima ? val(c.id, 'ga4', 'sesiones', penultima) : undefined;
        const inv = ultima ? val(c.id, 'google_ads', 'inversion', ultima) : undefined;
        const roas = ultima ? val(c.id, 'google_ads', 'roas', ultima) : undefined;
        const clics = ultima ? val(c.id, 'gsc', 'clics', ultima) : undefined;
        const pos = ultima ? val(c.id, 'gsc', 'posicion', ultima) : undefined;

        if (ses !== undefined && sesPrev && (ses - sesPrev) / sesPrev < -0.2)
          alertas.push({ cliente: c.nombre, texto: `Sesiones cayeron ${Math.abs(Math.round(((ses - sesPrev) / sesPrev) * 100))}% vs la semana anterior.` });
        if (inv !== undefined && inv > 0 && roas === 0)
          alertas.push({ cliente: c.nombre, texto: `Inversión de ${formatCLP(inv)} sin retorno (ROAS 0) en la última semana.` });

        const suyas = cuentas.filter((k) => k.empresa_id === c.id);
        for (const k of suyas) {
          if (k.estado === 'revocado') alertas.push({ cliente: c.nombre, texto: `Acceso revocado en ${k.plataforma}.` });
          else if (k.estado === 'pendiente' && k.cuenta_externa)
            alertas.push({ cliente: c.nombre, texto: `${k.plataforma} con ID cargado pero acceso pendiente de verificar.` });
          else if (k.estado === 'concedido' && CONECTOR.includes(k.plataforma)) {
            const dias = k.ultima_lectura ? Math.floor((Date.now() - new Date(k.ultima_lectura).getTime()) / 86400000) : null;
            if (dias === null) alertas.push({ cliente: c.nombre, texto: `${k.plataforma} sin lecturas registradas.` });
            else if (dias > DIAS_ATRASO) alertas.push({ cliente: c.nombre, texto: `${k.plataforma} sin lectura hace ${dias} días.` });
          }
        }
        return { c, ses, sesPrev, inv, roas, clics, pos };
      });

    return { periodos, porSemana, tabla, alertas, ultima, penultima };
  }, [clientes, filas, cuentas, filtroCliente, semanas, conPrueba]);

  if (cargando) return <p className="text-sm text-[var(--c-muted)]">Cargando...</p>;
  if (clientes.length === 0) return <div className="surface p-6 text-sm text-[var(--c-muted)]">No hay clientes activos todavía.</div>;

  const { porSemana, tabla, alertas, ultima } = datos;
  const u = porSemana[porSemana.length - 1];
  const p = porSemana[porSemana.length - 2];

  const kpis = [
    { t: 'Inversión Ads', v: u ? formatCLP(u.inv) : '—', a: u?.inv, b: p?.inv, mejor: true },
    { t: 'ROAS ponderado', v: u ? `${u.roas.toFixed(1)}x` : '—', a: u?.roas, b: p?.roas, mejor: true },
    { t: 'Sesiones GA4', v: u ? u.ses.toLocaleString('es-CL') : '—', a: u?.ses, b: p?.ses, mejor: true },
    { t: 'Clics GSC', v: u ? u.clics.toLocaleString('es-CL') : '—', a: u?.clics, b: p?.clics, mejor: true },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <select className={select} value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)} aria-label="Cliente">
          <option value="todos">Toda la cartera</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
        <select className={select} value={semanas} onChange={(e) => setSemanas(Number(e.target.value))} aria-label="Rango">
          <option value={4}>Últimas 4 semanas</option>
          <option value={8}>Últimas 8 semanas</option>
          <option value={12}>Últimas 12 semanas</option>
        </select>
        <label className="flex items-center gap-1.5 text-xs text-[var(--c-text-2)]">
          <input type="checkbox" checked={conPrueba} onChange={(e) => setConPrueba(e.target.checked)} />
          Incluir datos de prueba
        </label>
        {ultima && <span className="text-[11px] text-[var(--c-muted)] ml-auto">Semana del {fechaCorta(ultima)}</span>}
      </div>

      {porSemana.length === 0 ? (
        <div className="surface p-6 text-sm text-[var(--c-muted)]">
          Sin lecturas en el rango. Marca "Incluir datos de prueba" o espera la lectura semanal.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {kpis.map((k) => (
              <div key={k.t} className="surface p-4 space-y-1">
                <p className="text-[11px] font-mono uppercase tracking-wider text-[var(--c-muted)]">{k.t}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold font-mono text-[var(--c-text)]">{k.v}</span>
                  {k.a !== undefined && <Variacion actual={k.a} previo={k.b} mejorSube={k.mejor} />}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-2 gap-4">
            <div className="surface p-4 space-y-2">
              <p className="text-sm font-semibold text-[var(--c-text)]">Inversión Ads por semana</p>
              <Barras puntos={porSemana.map((s) => ({ etiqueta: fechaCorta(s.per), valor: s.inv }))} formato={formatCLP} />
            </div>
            <div className="surface p-4 space-y-2">
              <p className="text-sm font-semibold text-[var(--c-text)]">Sesiones GA4 por semana</p>
              {porSemana.length > 1 ? (
                <Tendencia puntos={porSemana.map((s) => ({ etiqueta: fechaCorta(s.per), valor: s.ses }))} formato={(v) => v.toLocaleString('es-CL')} />
              ) : (
                <p className="text-xs text-[var(--c-muted)]">Se necesitan al menos dos semanas.</p>
              )}
            </div>
          </div>

          <div className="surface overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[var(--c-muted)] border-b border-[var(--c-line)]">
                  {['Cliente', 'Sesiones', 'Clics GSC', 'Posición', 'Inversión', 'ROAS'].map((h) => (
                    <th key={h} className="p-3 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tabla.map((r) => (
                  <tr key={r.c.id} className="border-b border-[var(--c-line)] last:border-0">
                    <td className="p-3 font-medium text-[var(--c-text)] whitespace-nowrap">{r.c.nombre}</td>
                    <td className="p-3 font-mono">
                      {r.ses !== undefined ? r.ses.toLocaleString('es-CL') : '—'}{' '}
                      {r.ses !== undefined && <Variacion actual={r.ses} previo={r.sesPrev} mejorSube />}
                    </td>
                    <td className="p-3 font-mono">{r.clics !== undefined ? r.clics.toLocaleString('es-CL') : '—'}</td>
                    <td className="p-3 font-mono">{r.pos !== undefined ? r.pos.toFixed(1) : '—'}</td>
                    <td className="p-3 font-mono">{r.inv !== undefined ? formatCLP(r.inv) : '—'}</td>
                    <td className="p-3 font-mono">{r.roas !== undefined ? `${r.roas.toFixed(1)}x` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <section className="surface p-4 space-y-2" aria-label="Alertas de marketing">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[var(--c-warn)]" />
          <h2 className="text-sm font-semibold text-[var(--c-text)]">Alertas</h2>
        </div>
        {alertas.length === 0 ? (
          <p className="text-xs text-[var(--c-muted)]">Sin alertas en la cartera.</p>
        ) : (
          <ul className="space-y-1.5 text-xs">
            {alertas.map((a, i) => (
              <li key={i} className="text-[var(--c-text-2)]">
                <span className="font-medium text-[var(--c-text)]">{a.cliente}</span> · {a.texto}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
