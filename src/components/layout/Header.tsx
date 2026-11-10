import { JampMark, JampWordmark } from '../brand/Jamp';
import React from 'react';
import { Search, Sun, Moon, LogOut, ShieldAlert, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCRM } from '../../context/CRMContext';

interface HeaderProps {
  onOpenSearch: () => void;
  onOpenNewDeal?: () => void;
  theme: 'dark' | 'light';
  setTheme: (t: 'dark' | 'light') => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSearch,
  theme,
  setTheme,
}) => {
  const { currentUser, logout, switchDemoUser, isSupabaseLive } = useAuth();
  const { miembros, filtroAlcance, setFiltroAlcance } = useCRM();
  const [showUserMenu, setShowUserMenu] = React.useState(false);

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-[var(--c-line)] bg-[var(--c-bg)]/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-6 transition-colors">
      {/* Zona 1: Marca JAMP CRM */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-2 lg:hidden">
          <JampMark size={28} />
          <JampWordmark className="text-sm" />
        </div>

        {/* Indicador de conexión / Modo */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-[var(--c-muted)] font-mono">
          <span className="font-semibold text-[var(--c-text-2)]">JAMP</span>
          <span className="text-[var(--c-muted-2)]">/</span>
          {isSupabaseLive ? (
            <span className="text-[var(--c-accent)]">Supabase Conectado</span>
          ) : (
            <span className="text-[var(--c-accent)]">Demo P48 Chile</span>
          )}
        </div>
      </div>

      {/* Zona 2: Búsqueda rápida Cmd+K y Selector de Alcance */}
      <div className="flex items-center gap-3 max-w-md min-w-0 flex-1 sm:w-full justify-end sm:justify-center">
        <button
          onClick={onOpenSearch}
          type="button"
          className="flex items-center justify-center sm:justify-between gap-3 w-9 sm:w-full max-w-xs shrink-0 px-2 sm:px-3 py-1.5 text-xs text-[var(--c-muted)] bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded hover:border-[var(--c-line)] transition-colors"
        >
          <span className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-[var(--c-muted)]" />
            <span className="hidden sm:inline truncate">Buscar empresas, contactos o negocios...</span>
          </span>
          <kbd className="hidden sm:inline-block font-mono text-[10px] bg-[var(--c-surface-2)] px-1.5 py-0.5 rounded text-[var(--c-text-2)]">
            ⌘K
          </kbd>
        </button>

        {/* Filtro Mis Datos / Todo el Equipo */}
        <div className="hidden lg:flex items-center p-0.5 bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded text-xs">
          <button
            onClick={() => setFiltroAlcance('todo_el_equipo')}
            className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
              filtroAlcance === 'todo_el_equipo'
                ? 'bg-[var(--c-surface-3)] text-[var(--c-text)] font-medium shadow-sm'
                : 'text-[var(--c-muted)] hover:text-[var(--c-text-2)]'
            }`}
          >
            Todo el equipo
          </button>
          <button
            onClick={() => setFiltroAlcance('mis_datos')}
            className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
              filtroAlcance === 'mis_datos'
                ? 'bg-[var(--c-surface-3)] text-[var(--c-text)] font-medium shadow-sm'
                : 'text-[var(--c-muted)] hover:text-[var(--c-text-2)]'
            }`}
          >
            Mis datos
          </button>
        </div>
      </div>

      {/* Zona 3: Modo oscuro/claro + Usuario y Conmutador de miembros */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-1.5 text-[var(--c-muted)] hover:text-[var(--c-text)] transition-colors rounded hover:bg-[var(--c-surface-2)]"
          title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Menú de Usuario */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded bg-[var(--c-surface-2)] border border-[var(--c-line)] text-xs text-[var(--c-text)] hover:border-[var(--c-line)] transition-colors"
          >
            <div className="w-5 h-5 rounded-full bg-[var(--c-accent)] text-[var(--c-on-accent)] font-bold text-[10px] flex items-center justify-center font-mono">
              {currentUser?.nombre ? currentUser.nombre.slice(0, 1) : 'U'}
            </div>
            <span className="hidden sm:inline font-medium truncate max-w-[110px]">
              {currentUser?.nombre ?? 'Usuario'}
            </span>
            <span className="text-[10px] font-mono uppercase text-[var(--c-muted)] hidden lg:inline">
              ({currentUser?.rol ?? 'miembro'})
            </span>
            <ChevronDown className="w-3 h-3 text-[var(--c-muted)]" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-1 w-64 bg-[var(--c-surface)] border border-[var(--c-line)] rounded shadow-xl py-2 z-50 text-xs">
              <div className="px-3 py-2 border-b border-[var(--c-line)]">
                <p className="font-medium text-[var(--c-text)] truncate">
                  {currentUser?.nombre}
                </p>
                <p className="text-[var(--c-muted)] font-mono text-[11px] truncate">{currentUser?.email}</p>
                <p className="text-[var(--c-accent)] font-mono text-[10px] mt-0.5 uppercase tracking-wider">
                  Rol: {currentUser?.rol}
                </p>
              </div>

              {/* Selector de miembro para pruebas en AI Studio */}
              <div className="px-3 py-2 border-b border-[var(--c-line)]">
                <p className="text-[11px] font-medium text-[var(--c-muted)] mb-1.5">
                  Probar con otro miembro (Demo):
                </p>
                <div className="space-y-1">
                  {miembros.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        switchDemoUser?.(m.email);
                        setShowUserMenu(false);
                      }}
                      className={`w-full text-left px-2 py-1 rounded text-xs flex items-center justify-between transition-colors ${
                        currentUser?.email === m.email
                          ? 'bg-[var(--c-surface-3)] text-[var(--c-accent)]'
                          : 'text-[var(--c-text-2)] hover:bg-[var(--c-surface-3)]'
                      }`}
                    >
                      <span className="truncate">{m.nombre}</span>
                      <span className="font-mono text-[10px] text-[var(--c-muted)]">
                        {m.rol} {m.activo ? '' : '(inactivo)'}
                      </span>
                    </button>
                  ))}
                  {/* Probar usuario no registrado para verificar gatekeeper */}
                  <button
                    onClick={() => {
                      switchDemoUser?.('ajeno@externo.cl');
                      setShowUserMenu(false);
                    }}
                    className="w-full text-left px-2 py-1 rounded text-xs flex items-center justify-between text-[var(--c-danger)] hover:bg-[var(--c-surface-3)] transition-colors"
                  >
                    <span>Probar cuenta sin acceso</span>
                    <ShieldAlert className="w-3 h-3 text-[var(--c-danger)]" />
                  </button>
                </div>
              </div>

              <div className="pt-1">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs text-[var(--c-danger)] hover:bg-[var(--c-surface-3)] flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
