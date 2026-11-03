import React, { useState, useMemo } from 'react';
import {
  Clock,
  Phone,
  Video,
  FileText,
  Mail,
  Plus,
  Building2,
  Kanban,
  User,
  Filter,
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { TipoActividad } from '../types/crm';
import { formatFechaHora } from '../lib/formatters';

interface ActivitiesViewProps {
  onOpenNewActivity: () => void;
  onSelectEmpresa: (id: string) => void;
  onSelectOportunidad: (id: string) => void;
}

export const ActivitiesView: React.FC<ActivitiesViewProps> = ({
  onOpenNewActivity,
  onSelectEmpresa,
  onSelectOportunidad,
}) => {
  const { actividades, empresas, oportunidades, contactos, miembros } = useCRM();

  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroAutor, setFiltroAutor] = useState<string>('todos');

  // Orden cronológico inverso estricto (más recientes primero)
  const actividadesOrdenadas = useMemo(() => {
    return [...actividades]
      .filter((act) => {
        if (filtroTipo !== 'todos' && act.tipo !== filtroTipo) return false;
        if (filtroAutor !== 'todos' && act.autor_id !== filtroAutor) return false;
        return true;
      })
      .sort((a, b) => new Date(b.fecha_actividad).getTime() - new Date(a.fecha_actividad).getTime());
  }, [actividades, filtroTipo, filtroAutor]);

  const getIcono = (tipo: TipoActividad) => {
    switch (tipo) {
      case 'llamada':
        return <Phone className="w-3.5 h-3.5 text-sky-400" />;
      case 'reunion':
        return <Video className="w-3.5 h-3.5 text-[var(--c-accent)]" />;
      case 'nota':
        return <FileText className="w-3.5 h-3.5 text-amber-400" />;
      case 'correo_manual':
        return <Mail className="w-3.5 h-3.5 text-purple-400" />;
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-sans text-[var(--c-text)] dark:text-[var(--c-text)] light:text-[var(--c-text)]">
            Línea de Tiempo de Actividades
          </h1>
          <p className="text-xs text-[var(--c-muted)] mt-0.5">
            Registro cronológico de interacciones comerciales y operativas
          </p>
        </div>

        <button
          onClick={onOpenNewActivity}
          className="bg-[var(--c-accent)] hover:bg-[var(--c-accent-hover)] active:scale-[0.98] text-[var(--c-on-accent)] font-semibold text-xs py-2 px-3.5 rounded flex items-center gap-1.5 transition-all shadow-sm font-sans"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Registrar Actividad</span>
        </button>
      </div>

      {/* Barra de Filtros */}
      <div className="flex items-center gap-3 bg-[var(--c-surface)] dark:bg-[var(--c-surface)] light:bg-[var(--c-bg)] p-3 rounded-lg border border-[var(--c-line)]">
        <Filter className="w-3.5 h-3.5 text-[var(--c-muted)]" />
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)] focus:outline-none"
        >
          <option value="todos">Todos los tipos</option>
          <option value="llamada">Llamadas</option>
          <option value="reunion">Reuniones</option>
          <option value="nota">Notas internas</option>
          <option value="correo_manual">Correos manuales</option>
        </select>

        <select
          value={filtroAutor}
          onChange={(e) => setFiltroAutor(e.target.value)}
          className="bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)] focus:outline-none"
        >
          <option value="todos">Todos los autores</option>
          {miembros.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre}
            </option>
          ))}
        </select>

        <div className="ml-auto font-mono text-xs text-[var(--c-muted)]">
          {actividadesOrdenadas.length} actividades
        </div>
      </div>

      {/* Línea de tiempo cronológica */}
      <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2 before:top-3 before:bottom-3 before:w-[2px] before:bg-[#222]">
        {actividadesOrdenadas.length === 0 ? (
          <p className="text-xs text-[var(--c-muted)] py-8 text-center">No hay actividades registradas con estos filtros.</p>
        ) : (
          actividadesOrdenadas.map((act) => {
            const emp = empresas.find((e) => e.id === act.empresa_id);
            const op = oportunidades.find((o) => o.id === act.oportunidad_id);
            const con = contactos.find((c) => c.id === act.contacto_id);
            const autor = miembros.find((m) => m.id === act.autor_id);

            return (
              <div key={act.id} className="relative group">
                {/* Punto en la línea de tiempo */}
                <div className="absolute -left-6 top-3 w-4 h-4 rounded-full bg-[var(--c-surface-2)] border border-[#333] flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--c-accent)]" />
                </div>

                <div className="p-4 bg-[var(--c-surface)] dark:bg-[var(--c-surface)] light:bg-white rounded-lg border border-[var(--c-line)] space-y-2.5 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-[var(--c-surface-2)] flex items-center justify-center">
                        {getIcono(act.tipo)}
                      </div>
                      <span className="font-semibold text-xs text-[var(--c-text)] dark:text-[var(--c-text)] light:text-[var(--c-text)]">
                        {act.titulo}
                      </span>
                      <span className="text-[10px] uppercase font-mono text-[var(--c-muted)]">
                        ({act.tipo})
                      </span>
                    </div>

                    <span className="font-mono text-[11px] text-[var(--c-muted)]">
                      {formatFechaHora(act.fecha_actividad)}
                    </span>
                  </div>

                  {act.descripcion && (
                    <p className="text-xs text-[#BBB] leading-relaxed whitespace-pre-line pl-8">
                      {act.descripcion}
                    </p>
                  )}

                  {act.resultado && (
                    <div className="ml-8 p-2 bg-[#1B2217] border border-[#2D4521] rounded text-xs text-[var(--c-accent)]">
                      <span className="font-semibold">Acuerdo:</span> {act.resultado}
                    </div>
                  )}

                  {/* Vínculos a Empresa, Oportunidad, Contacto y Autor */}
                  <div className="pt-2 border-t border-[#222] flex flex-wrap items-center gap-3 text-[11px] text-[var(--c-muted)] font-mono pl-8">
                    {emp && (
                      <button
                        onClick={() => onSelectEmpresa(emp.id)}
                        className="hover:text-[var(--c-accent)] flex items-center gap-1 font-sans"
                      >
                        <Building2 className="w-3 h-3 text-[var(--c-muted-2)]" />
                        <span>{emp.nombre}</span>
                      </button>
                    )}

                    {op && (
                      <button
                        onClick={() => onSelectOportunidad(op.id)}
                        className="hover:text-[var(--c-accent)] flex items-center gap-1 font-sans"
                      >
                        <Kanban className="w-3 h-3 text-[var(--c-muted-2)]" />
                        <span>{op.nombre}</span>
                      </button>
                    )}

                    {con && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-[var(--c-muted-2)]" />
                        <span>
                          {con.nombre} {con.apellido}
                        </span>
                      </span>
                    )}

                    <span className="ml-auto text-[var(--c-muted-2)]">
                      Por {autor?.nombre ?? 'Equipo'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
