import React, { useState, useMemo } from 'react';
import { Users, Search, Plus, Mail, Phone, Linkedin, Building2 } from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { formatFecha } from '../lib/formatters';

interface ContactsViewProps {
  onSelectEmpresa: (id: string) => void;
}

export const ContactsView: React.FC<ContactsViewProps> = ({ onSelectEmpresa }) => {
  const { contactos, empresas, crearContacto } = useCRM();

  const [searchQuery, setSearchQuery] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [newContact, setNewContact] = useState<{
    empresa_id: string;
    nombre: string;
    apellido: string;
    cargo: string;
    email: string;
    telefono: string;
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
    linkedin_url: '',
    rol_decision: 'decisor',
    es_principal: false,
  });

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

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.nombre || !newContact.email || !newContact.empresa_id) return;

    await crearContacto(newContact);
    setShowNewModal(false);
    setNewContact({
      empresa_id: '',
      nombre: '',
      apellido: '',
      cargo: '',
      email: '',
      telefono: '',
      linkedin_url: '',
      rol_decision: 'decisor',
      es_principal: false,
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-sans text-[#F5F5F5] dark:text-[#F5F5F5] light:text-[#111]">
            Directorio de Contactos
          </h1>
          <p className="text-xs text-[#8E8E93] mt-0.5">
            {filteredContactos.length} contactos comerciales y decisores técnicos
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="bg-[#BEFF00] hover:bg-[#aee600] active:scale-[0.98] text-[#0A0A0A] font-semibold text-xs py-2 px-3.5 rounded flex items-center gap-1.5 transition-all shadow-sm font-sans"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Nuevo Contacto</span>
        </button>
      </div>

      {/* Barra de búsqueda */}
      <div className="bg-[#141414] dark:bg-[#141414] light:bg-[#FAFAFA] p-3 rounded-lg border border-[#262626]">
        <div className="relative max-w-md">
          <Search className="w-3.5 h-3.5 text-[#777] absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, email o cargo..."
            className="w-full bg-[#1C1C1C] dark:bg-[#1C1C1C] light:bg-white border border-[#2E2E2E] rounded pl-8 pr-3 py-1.5 text-xs text-[#EEE] placeholder:text-[#666] focus:outline-none focus:border-[#BEFF00]"
          />
        </div>
      </div>

      {/* Tabla densa de contactos */}
      <div className="bg-[#141414] dark:bg-[#141414] light:bg-white border border-[#262626] rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0E0E0E] dark:bg-[#0E0E0E] light:bg-[#F2F2F2] border-b border-[#262626] text-[#8E8E93] uppercase font-mono text-[11px]">
              <tr>
                <th className="py-2.5 px-4 font-medium">Nombre</th>
                <th className="py-2.5 px-3 font-medium">Empresa</th>
                <th className="py-2.5 px-3 font-medium">Cargo</th>
                <th className="py-2.5 px-3 font-medium">Rol Decisión</th>
                <th className="py-2.5 px-3 font-medium">Email</th>
                <th className="py-2.5 px-3 font-medium">Teléfono</th>
                <th className="py-2.5 px-3 font-medium text-center">LinkedIn</th>
                <th className="py-2.5 px-4 font-medium text-right">Registrado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222]">
              {filteredContactos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-[#777]">
                    No se encontraron contactos.
                  </td>
                </tr>
              ) : (
                filteredContactos.map((con) => {
                  const emp = empresas.find((e) => e.id === con.empresa_id);
                  return (
                    <tr
                      key={con.id}
                      className="hover:bg-[#1C1C1C] transition-colors"
                    >
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#F5F5F5] dark:text-[#F5F5F5] light:text-[#111]">
                            {con.nombre} {con.apellido}
                          </span>
                          {con.es_principal && (
                            <span className="text-[10px] text-[#BEFF00] font-mono">
                              Principal
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        {emp ? (
                          <button
                            onClick={() => onSelectEmpresa(emp.id)}
                            className="text-[#BEFF00] hover:underline flex items-center gap-1 font-medium text-left"
                          >
                            <Building2 className="w-3 h-3 text-[#777]" />
                            <span className="truncate max-w-[160px]">{emp.nombre}</span>
                          </button>
                        ) : (
                          <span className="text-[#555]">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-[#BBB]">{con.cargo || '—'}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`font-mono text-[10px] px-2 py-0.5 rounded capitalize ${
                            con.rol_decision === 'decisor'
                              ? 'bg-[#BEFF00]/15 text-[#BEFF00]'
                              : con.rol_decision === 'influenciador'
                              ? 'bg-sky-950/60 text-sky-400'
                              : 'bg-[#222] text-[#AAA]'
                          }`}
                        >
                          {con.rol_decision || 'decisor'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-[#AAA]">
                        <a href={`mailto:${con.email}`} className="hover:text-white flex items-center gap-1">
                          <Mail className="w-3 h-3 text-[#666]" />
                          <span>{con.email}</span>
                        </a>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-[#AAA]">
                        {con.telefono ? (
                          <a href={`tel:${con.telefono}`} className="hover:text-white flex items-center gap-1">
                            <Phone className="w-3 h-3 text-[#666]" />
                            <span>{con.telefono}</span>
                          </a>
                        ) : (
                          <span className="text-[#555]">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {con.linkedin_url ? (
                          <a
                            href={con.linkedin_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#888] hover:text-[#BEFF00] inline-block"
                          >
                            <Linkedin className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <span className="text-[#444]">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-[#777] text-right">
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

      {/* Modal Nuevo Contacto */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#141414] border border-[#2E2E2E] rounded-lg max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-base font-bold text-[#F5F5F5] mb-3">Nuevo Contacto</h2>
            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#CCC] mb-1">Empresa *</label>
                <select
                  required
                  value={newContact.empresa_id}
                  onChange={(e) => setNewContact({ ...newContact, empresa_id: e.target.value })}
                  className="w-full bg-[#1C1C1C] border border-[#2E2E2E] rounded px-3 py-2 text-xs text-white"
                >
                  <option value="">Selecciona la empresa...</option>
                  {empresas.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  placeholder="Nombre *"
                  value={newContact.nombre}
                  onChange={(e) => setNewContact({ ...newContact, nombre: e.target.value })}
                  className="bg-[#1C1C1C] border border-[#2E2E2E] rounded px-2.5 py-1.5 text-xs text-white"
                />
                <input
                  type="text"
                  placeholder="Apellido"
                  value={newContact.apellido}
                  onChange={(e) => setNewContact({ ...newContact, apellido: e.target.value })}
                  className="bg-[#1C1C1C] border border-[#2E2E2E] rounded px-2.5 py-1.5 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="email"
                  required
                  placeholder="Email *"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  className="bg-[#1C1C1C] border border-[#2E2E2E] rounded px-2.5 py-1.5 text-xs text-white"
                />
                <input
                  type="text"
                  placeholder="Cargo"
                  value={newContact.cargo}
                  onChange={(e) => setNewContact({ ...newContact, cargo: e.target.value })}
                  className="bg-[#1C1C1C] border border-[#2E2E2E] rounded px-2.5 py-1.5 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Teléfono"
                  value={newContact.telefono}
                  onChange={(e) => setNewContact({ ...newContact, telefono: e.target.value })}
                  className="bg-[#1C1C1C] border border-[#2E2E2E] rounded px-2.5 py-1.5 text-xs text-white"
                />
                <input
                  type="text"
                  placeholder="LinkedIn URL"
                  value={newContact.linkedin_url}
                  onChange={(e) => setNewContact({ ...newContact, linkedin_url: e.target.value })}
                  className="bg-[#1C1C1C] border border-[#2E2E2E] rounded px-2.5 py-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#AAA] mb-1">
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
                  className="w-full bg-[#1C1C1C] border border-[#2E2E2E] rounded px-2.5 py-1.5 text-xs text-white"
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
                  className="rounded border-[#444] bg-[#222] text-[#BEFF00]"
                />
                <label htmlFor="es_principal_chk" className="text-xs text-[#AAA]">
                  Contacto principal para decisiones
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#222]">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-3 py-1.5 text-xs text-[#888] hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-semibold bg-[#BEFF00] text-black rounded"
                >
                  Guardar Contacto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
