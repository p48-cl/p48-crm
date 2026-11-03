import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Building2, User, Kanban, X, ArrowRight, Loader2 } from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { formatMoneda, sanitizarQueryBusqueda } from '../../lib/formatters';
import { supabase } from '../../lib/supabase';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOportunidad: (id: string) => void;
  onSelectEmpresa: (id: string) => void;
  onSelectContacto: (id: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectOportunidad,
  onSelectEmpresa,
  onSelectContacto,
}) => {
  const { empresas, contactos, oportunidades, etapas } = useCRM();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearchingServer, setIsSearchingServer] = useState(false);
  const [serverResults, setServerResults] = useState<Array<{
    id: string;
    tipo: 'empresa' | 'contacto' | 'oportunidad';
    titulo: string;
    subtitulo: string;
    metadato: string;
    rawId: string;
  }> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setDebouncedQuery('');
      setServerResults(null);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Debounce de 250ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 250);
    return () => clearTimeout(handler);
  }, [query]);

  // Atajos globales
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Búsqueda en Supabase con sanitización estricta (escapa %, _, comas y paréntesis)
  useEffect(() => {
    const sanitized = sanitizarQueryBusqueda(debouncedQuery);
    if (!sanitized) {
      setServerResults(null);
      return;
    }

    const client = supabase;
    if (!client) return;

    let cancel = false;
    setIsSearchingServer(true);

    const ejecutarBusquedaRemota = async () => {
      try {
        const [resEmp, resCon, resOp] = await Promise.all([
          client
            .from('empresas')
            .select('id, nombre, rut, dominio_web, estado')
            .eq('archivado', false)
            .or(`nombre.ilike.%${sanitized}%,rut.ilike.%${sanitized}%,dominio_web.ilike.%${sanitized}%`)
            .limit(5),
          client
            .from('contactos')
            .select('id, nombre, apellido, email, cargo, empresa_id')
            .eq('archivado', false)
            .or(`nombre.ilike.%${sanitized}%,apellido.ilike.%${sanitized}%,email.ilike.%${sanitized}%`)
            .limit(5),
          client
            .from('v_oportunidades')
            .select('id, nombre, valor_neto, moneda, empresa_id, etapa_id')
            .eq('archivado', false)
            .ilike('nombre', `%${sanitized}%`)
            .limit(5),
        ]);

        if (cancel) return;

        const items: Array<{
          id: string;
          tipo: 'empresa' | 'contacto' | 'oportunidad';
          titulo: string;
          subtitulo: string;
          metadato: string;
          rawId: string;
        }> = [];

        resEmp.data?.forEach((e) => {
          items.push({
            id: `server-emp-${e.id}`,
            tipo: 'empresa',
            titulo: e.nombre,
            subtitulo: e.dominio_web || e.rut || 'Empresa B2B',
            metadato: e.estado.toUpperCase(),
            rawId: e.id,
          });
        });

        resCon.data?.forEach((c) => {
          items.push({
            id: `server-con-${c.id}`,
            tipo: 'contacto',
            titulo: `${c.nombre} ${c.apellido || ''}`.trim(),
            subtitulo: c.cargo || 'Contacto',
            metadato: c.email,
            rawId: c.id,
          });
        });

        resOp.data?.forEach((o) => {
          items.push({
            id: `server-op-${o.id}`,
            tipo: 'oportunidad',
            titulo: o.nombre,
            subtitulo: 'Negocio en CRM',
            metadato: formatMoneda(o.valor_neto, o.moneda),
            rawId: o.id,
          });
        });

        setServerResults(items);
      } catch {
        // En caso de fallo o desconexión, fallback a memoria
        setServerResults(null);
      } finally {
        if (!cancel) setIsSearchingServer(false);
      }
    };

    ejecutarBusquedaRemota();

    return () => {
      cancel = true;
    };
  }, [debouncedQuery]);

  // Resultados combinados o fallback local
  const resultados = useMemo(() => {
    if (serverResults !== null) {
      return serverResults;
    }

    const sanitized = sanitizarQueryBusqueda(debouncedQuery).toLowerCase();
    if (!sanitized) return [];

    const items: Array<{
      id: string;
      tipo: 'empresa' | 'contacto' | 'oportunidad';
      titulo: string;
      subtitulo: string;
      metadato: string;
      rawId: string;
    }> = [];

    // Empresas
    empresas.forEach((emp) => {
      if (
        emp.nombre.toLowerCase().includes(sanitized) ||
        emp.rut?.toLowerCase().includes(sanitized) ||
        emp.dominio_web?.toLowerCase().includes(sanitized)
      ) {
        items.push({
          id: `emp-${emp.id}`,
          tipo: 'empresa',
          titulo: emp.nombre,
          subtitulo: emp.dominio_web || emp.rut || 'Empresa B2B',
          metadato: emp.estado.toUpperCase(),
          rawId: emp.id,
        });
      }
    });

    // Contactos
    contactos.forEach((con) => {
      const nomCompleto = `${con.nombre} ${con.apellido}`.toLowerCase();
      if (
        nomCompleto.includes(sanitized) ||
        con.email.toLowerCase().includes(sanitized) ||
        con.cargo?.toLowerCase().includes(sanitized)
      ) {
        const emp = empresas.find((e) => e.id === con.empresa_id);
        items.push({
          id: `con-${con.id}`,
          tipo: 'contacto',
          titulo: `${con.nombre} ${con.apellido}`,
          subtitulo: `${con.cargo ? con.cargo + ' · ' : ''}${emp?.nombre ?? ''}`,
          metadato: con.email,
          rawId: con.id,
        });
      }
    });

    // Oportunidades
    oportunidades.forEach((op) => {
      if (op.nombre.toLowerCase().includes(sanitized)) {
        const emp = empresas.find((e) => e.id === op.empresa_id);
        const et = etapas.find((e) => e.id === op.etapa_id);
        items.push({
          id: `op-${op.id}`,
          tipo: 'oportunidad',
          titulo: op.nombre,
          subtitulo: `${emp?.nombre ?? ''} · ${et?.nombre ?? ''}`,
          metadato: formatMoneda(op.valor_neto, op.moneda),
          rawId: op.id,
        });
      }
    });

    return items.slice(0, 8);
  }, [debouncedQuery, serverResults, empresas, contactos, oportunidades, etapas]);

  const handleSelect = (item: (typeof resultados)[0]) => {
    onClose();
    if (item.tipo === 'oportunidad') onSelectOportunidad(item.rawId);
    if (item.tipo === 'empresa') onSelectEmpresa(item.rawId);
    if (item.tipo === 'contacto') onSelectContacto(item.rawId);
  };

  const handleKeyDownList = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < resultados.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter' && resultados[selectedIndex]) {
      e.preventDefault();
      handleSelect(resultados[selectedIndex]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-100">
      <div className="bg-[var(--c-surface)] dark:bg-[var(--c-surface)] light:bg-white border border-[#2B2B2B] dark:border-[#2B2B2B] light:border-[var(--c-line)] rounded-xl max-w-xl w-full shadow-2xl overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--c-line)] dark:border-[var(--c-line)] light:border-[var(--c-text)]">
          <Search className="w-4 h-4 text-[var(--c-muted)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDownList}
            placeholder="Buscar por empresa, contacto, RUT o negocio..."
            className="w-full bg-transparent text-sm text-[var(--c-text)] dark:text-[var(--c-text)] light:text-[var(--c-text)] placeholder:text-[var(--c-muted-2)] focus:outline-none font-sans"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="text-[var(--c-muted-2)] hover:text-[var(--c-text-2)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="font-mono text-[10px] bg-[#222] dark:bg-[#222] light:bg-[var(--c-line)] px-1.5 py-0.5 rounded text-[var(--c-muted)]">
              ESC
            </kbd>
          )}
        </div>

        {/* Resultados */}
        <div className="max-h-80 overflow-y-auto p-2">
          {query.trim() === '' ? (
            <div className="py-8 text-center text-xs text-[var(--c-muted-2)]">
              <p>Escribe al menos una letra para buscar en CRM P48.</p>
              <p className="mt-1 font-mono text-[11px] text-[#555]">
                Atajos: ↑ ↓ para navegar · Enter para abrir
              </p>
            </div>
          ) : resultados.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--c-muted)]">
              No se encontraron coincidencias para &quot;{query}&quot;
            </div>
          ) : (
            <div className="space-y-1">
              {resultados.map((item, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-[var(--c-surface-3)] dark:bg-[var(--c-surface-3)] light:bg-[#EFEFEF] text-white'
                        : 'text-[var(--c-line)] hover:bg-[var(--c-surface-2)]'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div
                        className={`w-7 h-7 rounded flex items-center justify-center shrink-0 ${
                          item.tipo === 'empresa'
                            ? 'bg-[#1E293B] text-sky-400'
                            : item.tipo === 'contacto'
                            ? 'bg-[#292218] text-amber-400'
                            : 'bg-[#1E2E18] text-[var(--c-accent)]'
                        }`}
                      >
                        {item.tipo === 'empresa' && <Building2 className="w-4 h-4" />}
                        {item.tipo === 'contacto' && <User className="w-4 h-4" />}
                        {item.tipo === 'oportunidad' && <Kanban className="w-4 h-4" />}
                      </div>

                      <div className="truncate">
                        <p className="text-xs font-medium text-[var(--c-text)] dark:text-[var(--c-text)] light:text-[var(--c-text)] truncate">
                          {item.titulo}
                        </p>
                        <p className="text-[11px] text-[var(--c-muted)] truncate">{item.subtitulo}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 pl-2">
                      <span className="font-mono text-[11px] text-[var(--c-muted)]">
                        {item.metadato}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#555]" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[var(--c-surface-3)] dark:border-[var(--c-surface-3)] light:border-[var(--c-text)] flex items-center justify-between text-[11px] text-[var(--c-muted-2)] font-mono">
          <span>Búsqueda instantánea P48</span>
          <span>{resultados.length} resultados</span>
        </div>
      </div>
    </div>
  );
};
