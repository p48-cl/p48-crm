import React, { useState, useMemo } from 'react';
import { Phone, Video, FileText, Mail, Plus, Building2, Kanban, User, Filter, FileSpreadsheet, Receipt, Archive, ArchiveRestore } from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { Actividad, TipoActividad } from '../types/crm';
import { formatFecha, formatFechaHora, formatCLP, formatCorrelativo } from '../lib/formatters';
import { Kpi } from '../components/dashboard/ui';

interface ActivitiesViewProps {
  onOpenNewActivity: () => void;
  onEditActividad: (a: Actividad) => void;
  onSelectEmpresa: (id: string) => void;
  onSelectOportunidad: (id: string) => void;
}

// Evento de la línea de tiempo: actividad manual, cotización o factura emitida
type Evento =
  | { kind: 'actividad'; id: string; fecha: string; empresaId: string | null; act: Actividad }
  | { kind: 'cotizacion'; id: string; fecha: string; empresaId: string; titulo: string; numero: number; estado: string }
  | { kind: 'factura'; id: string; fecha: string; empresaId: string; tipo: 33 | 34; folio: number; total: number; estadoPago: string };

const SIN_CLIENTE = '__sin_cliente__';

export const ActivitiesView: React.FC<ActivitiesViewProps> = ({
  onOpenNewActivity,
  onEditActividad,
  onSelectEmpresa,
  onSelectOportunidad,
}) => {
  const { actividades, empresasTodas: empresas, oportunidades, contactos, miembros, cotizaciones, facturas, actualizarActividad } = useCRM();
  const [verArchivadas, setVerArchivadas] = useState(false);

  const nombreEmpresa = useMemo(() => new Map(empresas.map((e) => [e.id, e.nombre])), [empresas]);

  // Indicadores: volumen reciente y clientes activos sin contacto registrado en 30 días
  const indicadores = useMemo(() => {
    const hace7 = Date.now() - 7 * 86400000;
    const hace30 = Date.now() - 30 * 86400000;
    const vigentes = actividades.filter((a) => !a.archivado);
    const ultimas7 = vigentes.filter((a) => new Date(a.fecha_actividad).getTime() >= hace7);
    const ultimaPorEmpresa = new Map<string, number>();
    for (const a of vigentes) {
      if (!a.empresa_id) continue;
      const t = new Date(a.fecha_actividad).getTime();
      if (t > (ultimaPorEmpresa.get(a.empresa_id) ?? 0)) ultimaPorEmpresa.set(a.empresa_id, t);
    }
    const clientes = empresas.filter((e) => e.estado === 'cliente' && !e.archivado);
    const sinContacto = clientes.filter((e) => (ultimaPorEmpresa.get(e.id) ?? 0) < hace30).length;
    return {
      n7: ultimas7.length,
      reuniones7: ultimas7.filter((a) => a.tipo === 'reunion').length,
      llamadas7: ultimas7.filter((a) => a.tipo === 'llamada').length,
      clientes: clientes.length,
      sinContacto,
    };
  }, [actividades, empresas]);

  const [filtroCliente, setFiltroCliente] = useState<string>('todos');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroAutor, setFiltroAutor] = useState<string>('todos');

  // Eventos combinados: actividades vigentes + cotizaciones + facturas (no archivadas)
  const eventos = useMemo<Evento[]>(() => {
    const lista: Evento[] = [];
    for (const a of actividades) {
      if (!!a.archivado !== verArchivadas) continue;
      lista.push({ kind: 'actividad', id: `a-${a.id}`, fecha: a.fecha_actividad, empresaId: a.empresa_id ?? null, act: a });
    }
    if (verArchivadas) return lista;
    for (const c of cotizaciones) {
      if (c.archivado) continue;
      lista.push({ kind: 'cotizacion', id: `c-${c.id}`, fecha: c.fecha_emision, empresaId: c.empresa_id, titulo: c.titulo, numero: c.numero, estado: c.estado });
    }
    for (const f of facturas) {
      if (!f.empresa_id) continue;
      lista.push({ kind: 'factura', id: `f-${f.id}`, fecha: f.fecha_emision, empresaId: f.empresa_id, tipo: f.tipo_documento, folio: f.folio, total: Number(f.monto_total), estadoPago: f.estado_pago });
    }
    return lista;
  }, [actividades, cotizaciones, facturas, verArchivadas]);

  // Filtros aplicados y agrupación por cliente (grupos ordenados por el evento más reciente)
  const grupos = useMemo(() => {
    const filtrados = eventos.filter((ev) => {
      if (filtroCliente !== 'todos' && (ev.empresaId ?? SIN_CLIENTE) !== filtroCliente) return false;
      if (filtroTipo !== 'todos') {
        if (ev.kind === 'actividad' && ev.act.tipo !== filtroTipo) return false;
        if (ev.kind === 'cotizacion' && filtroTipo !== 'cotizacion') return false;
        if (ev.kind === 'factura' && filtroTipo !== 'factura') return false;
        if (ev.kind === 'actividad' && ['cotizacion', 'factura'].includes(filtroTipo)) return false;
      }
      if (filtroAutor !== 'todos' && (ev.kind !== 'actividad' || ev.act.autor_id !== filtroAutor)) return false;
      return true;
    });
    const porCliente = new Map<string, Evento[]>();
    for (const ev of filtrados) {
      const clave = ev.empresaId ?? SIN_CLIENTE;
      porCliente.set(clave, [...(porCliente.get(clave) ?? []), ev]);
    }
    return [...porCliente.entries()]
      .map(([clave, items]) => ({
        clave,
        nombre: clave === SIN_CLIENTE ? 'Sin cliente' : nombreEmpresa.get(clave) ?? '—',
        items: items.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()),
      }))
      .sort((a, b) => new Date(b.items[0].fecha).getTime() - new Date(a.items[0].fecha).getTime());
  }, [eventos, filtroCliente, filtroTipo, filtroAutor, nombreEmpresa]);

  const totalEventos = grupos.reduce((n, g) => n + g.items.length, 0);

  const clientesOpciones = useMemo(
    () => empresas.filter((e) => !e.archivado).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [empresas]
  );

  const getIcono = (tipo: TipoActividad) => {
    switch (tipo) {
      case 'llamada':
        return <Phone className="w-3.5 h-3.5 text-[var(--c-info)]" />;
      case 'reunion':
        return <Video className="w-3.5 h-3.5 text-[var(--c-accent)]" />;
      case 'nota':
        return <FileText className="w-3.5 h-3.5 text-[var(--c-warn)]" />;
      case 'correo_manual':
        return <Mail className="w-3.5 h-3.5 text-purple-400" />;
    }
  };

  const renderEvento = (ev: Evento) => {
    if (ev.kind === 'actividad') {
      const act = ev.act;
      const con = contactos.find((c) => c.id === act.contacto_id);
      const op = oportunidades.find((o) => o.id === act.oportunidad_id);
      const autor = miembros.find((m) => m.id === act.autor_id);
      return (
        <div
          onClick={() => onEditActividad(act)}
          className="p-3.5 bg-[var(--c-surface)] rounded-lg border border-[var(--c-line)] hover:border-[var(--c-muted-2)] cursor-pointer space-y-2"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-[var(--c-surface-2)] flex items-center justify-center">{getIcono(act.tipo)}</div>
              <span className="font-semibold text-xs text-[var(--c-text)]">{act.titulo}</span>
              <span className="text-[10px] uppercase font-mono text-[var(--c-muted)]">({act.tipo.replace('_', ' ')})</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] text-[var(--c-muted)]">{formatFechaHora(act.fecha_actividad)}</span>
              <button
                type="button"
                title={act.archivado ? 'Restaurar' : 'Archivar'}
                onClick={(e) => { e.stopPropagation(); actualizarActividad(act.id, { archivado: !act.archivado }); }}
                className="p-1 text-[var(--c-muted)] hover:text-[var(--c-text)]"
              >
                {act.archivado ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          {act.descripcion && <p className="text-xs text-[var(--c-text-2)] leading-relaxed whitespace-pre-line pl-8">{act.descripcion}</p>}
          {act.resultado && (
            <div className="ml-8 p-2 bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded text-xs text-[var(--c-accent)]">
              <span className="font-semibold">Acuerdo:</span> {act.resultado}
            </div>
          )}
          <div className="pt-2 border-t border-[var(--c-line)] flex flex-wrap items-center gap-3 text-[11px] text-[var(--c-muted)] font-mono pl-8">
            {op && (
              <button onClick={(e) => { e.stopPropagation(); onSelectOportunidad(op.id); }} className="hover:text-[var(--c-accent)] flex items-center gap-1 font-sans">
                <Kanban className="w-3 h-3 text-[var(--c-muted-2)]" />
                <span>{op.nombre}</span>
              </button>
            )}
            {con && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3 text-[var(--c-muted-2)]" />
                <span>{con.nombre} {con.apellido}</span>
              </span>
            )}
            <span className="ml-auto text-[var(--c-muted-2)]">Por {autor?.nombre ?? 'Equipo'}</span>
          </div>
        </div>
      );
    }
    if (ev.kind === 'cotizacion') {
      return (
        <div className="p-3 bg-[var(--c-surface)] rounded-lg border border-[var(--c-line)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded bg-[var(--c-surface-2)] flex items-center justify-center shrink-0"><FileSpreadsheet className="w-3.5 h-3.5 text-[var(--c-ok)]" /></div>
            <span className="font-mono text-[11px] text-[var(--c-muted)] shrink-0">{formatCorrelativo('COT', ev.numero)}</span>
            <span className="text-xs text-[var(--c-text)] truncate">{ev.titulo}</span>
            <span className="text-[10px] uppercase font-mono text-[var(--c-muted)] shrink-0">· {ev.estado}</span>
          </div>
          <span className="font-mono text-[11px] text-[var(--c-muted)] shrink-0">{formatFecha(ev.fecha)}</span>
        </div>
      );
    }
    return (
      <div className="p-3 bg-[var(--c-surface)] rounded-lg border border-[var(--c-line)] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded bg-[var(--c-surface-2)] flex items-center justify-center shrink-0"><Receipt className="w-3.5 h-3.5 text-[var(--c-info)]" /></div>
          <span className="font-mono text-[11px] text-[var(--c-text)] shrink-0">{ev.tipo}-{String(ev.folio).padStart(6, '0')}</span>
          <span className="text-xs text-[var(--c-text-2)] truncate">{ev.tipo === 33 ? 'Factura afecta' : 'Factura exenta'}</span>
          <span className="text-[10px] uppercase font-mono text-[var(--c-muted)] shrink-0">· {ev.estadoPago}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="font-mono text-[11px] text-[var(--c-text)]">{formatCLP(ev.total)}</span>
          <span className="font-mono text-[11px] text-[var(--c-muted)]">{formatFecha(ev.fecha)}</span>
        </div>
      </div>
    );
  };

  const selectClase = 'bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)] focus:outline-none';

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-sans text-[var(--c-text)]">Línea de Tiempo por Cliente</h1>
          <p className="text-xs text-[var(--c-muted)] mt-0.5">Actividades, cotizaciones y facturas, agrupadas por cliente</p>
        </div>

        <button
          onClick={onOpenNewActivity}
          className="bg-[var(--c-accent)] hover:bg-[var(--c-accent-hover)] active:scale-[0.98] text-[var(--c-on-accent)] font-semibold text-xs py-2 px-3.5 rounded flex items-center gap-1.5 transition-all shadow-sm font-sans"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Registrar Actividad</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Kpi etiqueta="Últimos 7 días" valor={indicadores.n7} nota={`${indicadores.llamadas7} llamadas · ${indicadores.reuniones7} reuniones`} />
        <Kpi etiqueta="Clientes sin contacto" valor={`${indicadores.sinContacto} de ${indicadores.clientes}`} tono={indicadores.sinContacto > 0 ? 'aviso' : 'normal'} nota="sin actividad registrada en 30 días" />
      </div>

      <div className="flex flex-wrap items-center gap-3 bg-[var(--c-surface)] p-3 rounded-lg border border-[var(--c-line)]">
        <Filter className="w-3.5 h-3.5 text-[var(--c-muted)]" />
        <select value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)} className={selectClase} aria-label="Filtrar por cliente">
          <option value="todos">Todos los clientes</option>
          <option value={SIN_CLIENTE}>Sin cliente</option>
          {clientesOpciones.map((e) => (
            <option key={e.id} value={e.id}>{e.nombre}</option>
          ))}
        </select>
        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className={selectClase} aria-label="Filtrar por tipo">
          <option value="todos">Todos los tipos</option>
          <option value="llamada">Llamadas</option>
          <option value="reunion">Reuniones</option>
          <option value="nota">Notas internas</option>
          <option value="correo_manual">Correos manuales</option>
          <option value="cotizacion">Cotizaciones</option>
          <option value="factura">Facturas</option>
        </select>
        <select value={filtroAutor} onChange={(e) => setFiltroAutor(e.target.value)} className={selectClase} aria-label="Filtrar por autor">
          <option value="todos">Todos los autores</option>
          {miembros.map((m) => (
            <option key={m.id} value={m.id}>{m.nombre}</option>
          ))}
        </select>
        <button onClick={() => setVerArchivadas((v) => !v)} className="ml-auto font-mono text-[11px] text-[var(--c-muted)] hover:text-[var(--c-text)]">
          {verArchivadas ? 'Ver activas' : 'Ver archivadas'}
        </button>
        <div className="font-mono text-xs text-[var(--c-muted)]">{totalEventos} eventos</div>
      </div>

      {grupos.length === 0 ? (
        <p className="text-xs text-[var(--c-muted)] py-8 text-center">No hay eventos con estos filtros.</p>
      ) : (
        <div className="space-y-6">
          {grupos.map((g) => {
            const empresaId = g.clave !== SIN_CLIENTE ? g.clave : null;
            return (
              <section key={g.clave} className="space-y-2">
                <header className="flex items-center justify-between gap-3 border-b border-[var(--c-line)] pb-1.5">
                  {empresaId ? (
                    <button onClick={() => onSelectEmpresa(empresaId)} className="flex items-center gap-2 text-sm font-semibold text-[var(--c-text)] hover:text-[var(--c-accent)]">
                      <Building2 className="w-4 h-4 text-[var(--c-muted-2)]" />
                      {g.nombre}
                    </button>
                  ) : (
                    <span className="text-sm font-semibold text-[var(--c-muted)]">{g.nombre}</span>
                  )}
                  <span className="font-mono text-[11px] text-[var(--c-muted)]">{g.items.length} eventos</span>
                </header>
                <div className="space-y-2">{g.items.map((ev) => <React.Fragment key={ev.id}>{renderEvento(ev)}</React.Fragment>)}</div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};
