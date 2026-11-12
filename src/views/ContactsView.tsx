import { fondoCerrable } from '../lib/fondo';
import React, { useState, useMemo } from 'react';
import { Search, Plus, Mail, Phone, Linkedin, Building2, Archive, PhoneCall } from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { SelectorCliente } from '../components/common/SelectorCliente';
import { formatFecha, formatTelefonoCL } from '../lib/formatters';
import { ThOrdenable } from '../components/common/ThOrdenable';
import { useOrden } from '../lib/orden';

type ClaveOrdenContacto = 'nombre' | 'cliente' | 'cargo' | 'rol' | 'email' | 'telefono' | 'linkedin' | 'registrado';

interface ContactsViewProps {
  onSelectEmpresa: (id: string) => void;
}

export const ContactsView: React.FC<ContactsViewProps> = ({ onSelectEmpresa }) => {
  const { contactos, empresas, crearContacto, actualizarContacto, archivarContacto, crearEmpresa } = useCRM();
  const cabecera = (clave: ClaveOrdenContacto, etiqueta: string, alinear: 'left' | 'right' | 'center' = 'left', extra = 'px-3') => (
    <ThOrdenable
      key={clave}
      etiqueta={etiqueta}
      activa={sortKey === clave}
      dir={sortDir}
      onClick={() => alternarOrden(clave)}
      alinear={alinear}
      className={`py-2.5 ${extra} font-medium`}
    />
  );
  const [selectorCliente, setSelectorCliente] = useState(false);
  const clientesActivos = useMemo(
    () => empresas.filter((e) => !e.archivado).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [empresas]
  );
  const [editId, setEditId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [newContact, setNewContact] = useState<{
    empresa_id: string;
    nombre: string;
    apellido: string;
    cargo: string;
    email: string;
    telefono: string;
    telefono_fijo: string;
    linkedin_url: string;
    rol_decision: 'decisor' | 'influenciador' | 'usuario';
    es_principal: boolean;
  }>({
    empresa_id: '',
    nombre: '',
    apellido: '',
    cargo: '',
    email: '',
    telefono: '',
    telefono_fijo: '',
    linkedin_url: '',
    rol_decision: 'decisor',
    es_principal: false,
  });

  const [intentoGuardar, setIntentoGuardar] = useState(false);

  const filteredContactos = useMemo(() => {
    return contactos.filter((con) => {
      if (con.archivado) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const nomCompleto = `${con.nombre} ${con.apellido || ''}`.toLowerCase();
      const email = con.email.toLowerCase();
      const cargo = con.cargo?.toLowerCase() || '';
      return nomCompleto.includes(q) || email.includes(q) || cargo.includes(q);
    });
  }, [contactos, searchQuery]);

  const { clave: sortKey, dir: sortDir, alternar: alternarOrden, ordenar } = useOrden<ClaveOrdenContacto>('registrado', 'desc');
  const contactosOrdenados = useMemo(
    () =>
      ordenar(filteredContactos, (con, clave) => {
        switch (clave) {
          case 'nombre': return `${con.nombre} ${con.apellido || ''}`.trim();
          case 'cliente': return empresas.find((e) => e.id === con.empresa_id)?.nombre ?? '';
          case 'cargo': return con.cargo ?? '';
          case 'rol': return con.rol_decision ?? '';
          case 'email': return con.email ?? '';
          case 'telefono': return con.telefono ?? '';
          case 'linkedin': return con.linkedin_url ? 1 : 0;
          case 'registrado': return con.created_at ?? '';
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredContactos, empresas, sortKey, sortDir]
  );

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIntentoGuardar(true);
    if (!newContact.nombre || !newContact.email || !newContact.telefono.trim()) return;
    if (!newContact.empresa_id) {
      setSelectorCliente(true);
      return;
    }

    if (editId) {
      await actualizarContacto(editId, newContact);
    } else {
      await crearContacto(newContact);
    }
    setEditId(null);
    setShowNewModal(false);
    setNewContact({
      empresa_id: '',
      nombre: '',
      apellido: '',
      cargo: '',
      email: '',
      telefono: '',
      telefono_fijo: '',
      linkedin_url: '',
      rol_decision: 'decisor',
      es_principal: false,
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-sans text-[var(--c-text)]">
            Directorio de Contactos
          </h1>
          <p className="text-xs text-[var(--c-muted)] mt-0.5">
            {filteredContactos.length} contactos comerciales y decisores técnicos
          </p>
        </div>

        <button
          onClick={() => { setEditId(null); setNewContact({ empresa_id: '', nombre: '', apellido: '', cargo: '', email: '', telefono: '', telefono_fijo: '', linkedin_url: '', rol_decision: 'decisor', es_principal: false }); setShowNewModal(true); }}
          className="bg-[var(--c-accent)] hover:bg-[var(--c-accent-hover)] active:scale-[0.98] text-[var(--c-on-accent)] font-semibold text-xs py-2 px-3.5 rounded flex items-center gap-1.5 transition-all shadow-sm font-sans"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Nuevo Contacto</span>
        </button>
      </div>

      {/* Barra de búsqueda */}
      <div className="bg-[var(--c-surface)] p-3 rounded-lg border border-[var(--c-line)]">
        <div className="relative max-w-md">
          <Search className="w-3.5 h-3.5 text-[var(--c-muted)] absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, email o cargo..."
            className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded pl-8 pr-3 py-1.5 text-xs text-[var(--c-text)] placeholder:text-[var(--c-muted-2)] focus:outline-none focus:border-[var(--c-accent)]"
          />
        </div>
      </div>

      {/* Tabla densa de contactos */}
      <div className="bg-[var(--c-surface)] border border-[var(--c-line)] rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--c-surface-2)] border-b border-[var(--c-line)] text-[var(--c-muted)] uppercase font-mono text-[11px]">
              <tr>
                {cabecera('nombre', 'Nombre', 'left', 'px-4')}
                {cabecera('cliente', 'Cliente')}
                {cabecera('cargo', 'Cargo')}
                {cabecera('rol', 'Rol Decisión')}
                {cabecera('email', 'Email')}
                {cabecera('telefono', 'Teléfono')}
                {cabecera('linkedin', 'LinkedIn', 'center')}
                {cabecera('registrado', 'Registrado', 'right', 'px-4')}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--c-line)]">
              {filteredContactos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-[var(--c-muted)]">
                    No se encontraron contactos.
                  </td>
                </tr>
              ) : (
                contactosOrdenados.map((con) => {
                  const emp = empresas.find((e) => e.id === con.empresa_id);
                  return (
                    <tr
                      key={con.id}
                      className="hover:bg-[var(--c-surface-2)] transition-colors cursor-pointer"
                      onClick={() => {
                        setEditId(con.id);
                        setNewContact({
                          empresa_id: con.empresa_id,
                          nombre: con.nombre,
                          apellido: con.apellido || '',
                          cargo: con.cargo || '',
                          email: con.email,
                          telefono: con.telefono || '',
                          telefono_fijo: con.telefono_fijo || '',
                          linkedin_url: con.linkedin_url || '',
                          rol_decision: (con.rol_decision as 'decisor' | 'influenciador' | 'usuario') || 'decisor',
                          es_principal: con.es_principal,
                        });
                        setShowNewModal(true);
                      }}
                    >
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[var(--c-text)]">
                            {con.nombre} {con.apellido}
                          </span>
                          {con.es_principal && (
                            <span className="text-[10px] text-[var(--c-accent)] font-mono">
                              Principal
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        {emp ? (
                          <button
                            onClick={() => onSelectEmpresa(emp.id)}
                            className="text-[var(--c-accent)] hover:underline flex items-center gap-1 font-medium text-left"
                          >
                            <Building2 className="w-3 h-3 text-[var(--c-muted)]" />
                            <span className="truncate max-w-[160px]">{emp.nombre}</span>
                          </button>
                        ) : (
                          <span className="text-[var(--c-muted-2)]">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-[var(--c-text-2)]">{con.cargo || '—'}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`font-mono text-[10px] px-2 py-0.5 rounded capitalize ${
                            con.rol_decision === 'decisor'
                              ? 'bg-[var(--c-accent)]/15 text-[var(--c-accent)]'
                              : con.rol_decision === 'influenciador'
                              ? 'bg-[var(--c-info)]/10 text-[var(--c-info)]'
                              : 'bg-[var(--c-surface-2)] text-[var(--c-text-2)]'
                          }`}
                        >
                          {con.rol_decision || 'decisor'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-[var(--c-text-2)] whitespace-nowrap">
                        <a href={`mailto:${con.email}`} title={con.email} className="hover:text-[var(--c-text)] inline-flex items-center gap-1 max-w-[220px]">
                          <Mail className="w-3 h-3 shrink-0 text-[var(--c-muted-2)]" />
                          <span className="truncate">{con.email}</span>
                        </a>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-[var(--c-text-2)] whitespace-nowrap">
                        {con.telefono ? (
                          <span className="inline-flex items-center gap-2">
                            <a href={`tel:${(con.telefono ?? '').replace(/\s/g, '')}`} className="hover:text-[var(--c-text)] inline-flex items-center gap-1" title="Celular">
                              <Phone className="w-3 h-3 shrink-0 text-[var(--c-muted-2)]" />
                              <span>{con.telefono}</span>
                            </a>
                            {con.telefono_fijo && (
                              <a href={`tel:${con.telefono_fijo.replace(/\s/g, '')}`} className="hover:text-[var(--c-text)] inline-flex items-center gap-1 text-[var(--c-muted)]" title="Fijo">
                                <PhoneCall className="w-3 h-3 shrink-0" />
                                <span>{con.telefono_fijo}</span>
                              </a>
                            )}
                          </span>
                        ) : (
                          <span className="text-[var(--c-muted-2)]">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {con.linkedin_url ? (
                          <a
                            href={con.linkedin_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[var(--c-muted)] hover:text-[var(--c-accent)] inline-block"
                          >
                            <Linkedin className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <span className="text-[var(--c-muted-2)]">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-[var(--c-muted)] text-right">
                        {formatFecha(con.created_at)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectorCliente && (
        <SelectorCliente
          titulo="Cliente del contacto"
          etiquetaBoton="Usar este cliente"
          clientes={clientesActivos}
          onCrear={async (nombre) => {
            const creada = await crearEmpresa({ nombre, estado: 'prospecto' });
            if (creada) setNewContact((c) => ({ ...c, empresa_id: creada.id }));
            return creada?.id ?? null;
          }}
          onCerrar={() => setSelectorCliente(false)}
          onElegir={(id) => {
            setNewContact((c) => ({ ...c, empresa_id: id }));
            setSelectorCliente(false);
          }}
        />
      )}

      {/* Modal Nuevo Contacto */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" {...fondoCerrable(() => setShowNewModal(false))}>
          <div className="bg-[var(--c-surface)] border border-[var(--c-line)] rounded-lg max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-base font-bold text-[var(--c-text)] mb-3">{editId ? 'Editar contacto' : 'Nuevo Contacto'}</h2>
            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--c-text-2)] mb-1">Cliente *</label>
                <button
                  type="button"
                  onClick={() => setSelectorCliente(true)}
                  className={`w-full flex items-center justify-between gap-2 text-left bg-[var(--c-surface-2)] border rounded px-3 py-2 text-xs ${
                    newContact.empresa_id ? 'border-[var(--c-line)] text-[var(--c-text)]' : 'border-[var(--c-accent)] text-[var(--c-muted)]'
                  }`}
                >
                  <span className="truncate">
                    {empresas.find((e) => e.id === newContact.empresa_id)?.nombre ?? 'Elegir o crear cliente…'}
                  </span>
                  <span className="text-[var(--c-accent)] shrink-0">{newContact.empresa_id ? 'Cambiar' : 'Elegir'}</span>
                </button>
                {!newContact.empresa_id && (
                  <p className="text-[11px] text-[var(--c-muted)] mt-1">Un contacto siempre pertenece a un cliente.</p>
                )}
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)] sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  placeholder="Nombre *"
                  value={newContact.nombre}
                  onChange={(e) => setNewContact({ ...newContact, nombre: e.target.value })}
                  className="bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)]"
                />
                <input
                  type="text"
                  placeholder="Apellido"
                  value={newContact.apellido}
                  onChange={(e) => setNewContact({ ...newContact, apellido: e.target.value })}
                  className="bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)]"
                />
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)] sm:grid-cols-2 gap-2">
                <input
                  type="email"
                  required
                  placeholder="Email *"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  className="bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)]"
                />
                <input
                  type="text"
                  placeholder="Cargo"
                  value={newContact.cargo}
                  onChange={(e) => setNewContact({ ...newContact, cargo: e.target.value })}
                  className="bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)]"
                />
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)] sm:grid-cols-3 gap-2">
                <div>
                  <input
                    type="text"
                    placeholder="Celular +569 *"
                    value={newContact.telefono}
                    onChange={(e) => setNewContact({ ...newContact, telefono: formatTelefonoCL(e.target.value) })}
                    className={`w-full bg-[var(--c-surface-2)] border rounded px-2.5 py-1.5 text-xs text-[var(--c-text)] ${intentoGuardar && !newContact.telefono.trim() ? 'border-[var(--c-danger)]' : 'border-[var(--c-line)]'}`}
                  />
                  {intentoGuardar && !newContact.telefono.trim() && <p className="text-[10px] text-[var(--c-danger)] mt-1">El celular es obligatorio</p>}
                </div>
                <input
                  type="text"
                  placeholder="Fijo (opcional)"
                  value={newContact.telefono_fijo}
                  onChange={(e) => setNewContact({ ...newContact, telefono_fijo: formatTelefonoCL(e.target.value) })}
                  className="bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)] h-fit"
                />
                <input
                  type="text"
                  placeholder="LinkedIn URL"
                  value={newContact.linkedin_url}
                  onChange={(e) => setNewContact({ ...newContact, linkedin_url: e.target.value })}
                  className="bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[var(--c-text-2)] mb-1">
                  Rol de Decisión Comercial
                </label>
                <select
                  value={newContact.rol_decision}
                  onChange={(e) =>
                    setNewContact({
                      ...newContact,
                      rol_decision: e.target.value as 'decisor' | 'influenciador' | 'usuario',
                    })
                  }
                  className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)]"
                >
                  <option value="decisor">Decisor (Toma de decisión y presupuesto)</option>
                  <option value="influenciador">Influenciador (Líder técnico o de área)</option>
                  <option value="usuario">Usuario (Operativo de performance)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="es_principal_chk"
                  checked={newContact.es_principal}
                  onChange={(e) => setNewContact({ ...newContact, es_principal: e.target.checked })}
                  className="rounded border-[var(--c-line)] bg-[var(--c-surface-2)] text-[var(--c-accent)]"
                />
                <label htmlFor="es_principal_chk" className="text-xs text-[var(--c-text-2)]">
                  Contacto principal para decisiones
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--c-line)]">
                {editId && (
                  <button
                    type="button"
                    onClick={async () => {
                      await archivarContacto(editId);
                      setEditId(null);
                      setShowNewModal(false);
                    }}
                    className="mr-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-[var(--c-danger)] hover:underline"
                  >
                    <Archive className="w-3.5 h-3.5" /> Archivar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setEditId(null);
                    setShowNewModal(false);
                  }}
                  className="px-3 py-1.5 text-xs text-[var(--c-muted)] hover:text-[var(--c-text)]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-semibold bg-[var(--c-accent)] text-[var(--c-on-accent)] rounded"
                >
                  {editId ? 'Guardar cambios' : 'Guardar Contacto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
