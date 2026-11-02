import React from 'react';
import { Search, Sun, Moon, LogOut, ShieldAlert, User, ChevronDown } from 'lucide-react';
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
  const { currentUser, isAdmin, logout, switchDemoUser, isSupabaseLive } = useAuth();
  const { miembros, filtroAlcance, setFiltroAlcance } = useCRM();
  const [showUserMenu, setShowUserMenu] = React.useState(false);

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-[#262626] bg-[#0A0A0A]/95 dark:bg-[#0A0A0A]/95 light:bg-white/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-6 transition-colors">
      {/* Zona 1: Marca P48 */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#BEFF00] text-[#0A0A0A] font-black flex items-center justify-center text-xs tracking-tighter rounded-sm font-mono">
            P48
          </div>
          <span className="font-semibold text-sm tracking-tight text-[#F5F5F5] dark:text-[#F5F5F5] light:text-[#111111] font-sans">
            CRM Performance
          </span>
        </div>

        {/* Indicador de conexión / Modo */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-[#8E8E93] font-mono">
          <span className="text-[#555]">/</span>
          {isSupabaseLive ? (
            <span className="text-[#BEFF00]">Supabase Conectado</span>
          ) : (
            <span className="text-[#BEFF00]">Demo P48 Chile</span>
          )}
        </div>
      </div>

      {/* Zona 2: Búsqueda rápida Cmd+K y Selector de Alcance */}
      <div className="flex items-center gap-3 max-w-md w-full justify-center">
        <button
          onClick={onOpenSearch}
          type="button"
          className="flex items-center justify-between gap-3 w-full max-w-xs px-3 py-1.5 text-xs text-[#8E8E93] bg-[#161616] dark:bg-[#161616] light:bg-[#F2F2F2] border border-[#2E2E2E] dark:border-[#2E2E2E] light:border-[#E5E5E5] rounded hover:border-[#444] transition-colors"
        >
          <span className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-[#8E8E93]" />
            <span className="truncate">Buscar empresas, contactos o negocios...</span>
          </span>
          <kbd className="hidden sm:inline-block font-mono text-[10px] bg-[#222] dark:bg-[#222] light:bg-[#DDD] px-1.5 py-0.5 rounded text-[#AAA]">
            ⌘K
          </kbd>
        </button>

        {/* Filtro Mis Datos / Todo el Equipo */}
        <div className="hidden lg:flex items-center p-0.5 bg-[#161616] dark:bg-[#161616] light:bg-[#EAEAEA] border border-[#2E2E2E] dark:border-[#2E2E2E] light:border-[#D5D5D5] rounded text-xs">
          <button
            onClick={() => setFiltroAlcance('todo_el_equipo')}
            className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
              filtroAlcance === 'todo_el_equipo'
                ? 'bg-[#2A2A2A] dark:bg-[#2A2A2A] light:bg-white text-[#F5F5F5] dark:text-[#F5F5F5] light:text-[#111] font-medium shadow-sm'
                : 'text-[#8E8E93] hover:text-[#CCC]'
            }`}
          >
            Todo el equipo
          </button>
          <button
            onClick={() => setFiltroAlcance('mis_datos')}
            className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
              filtroAlcance === 'mis_datos'
                ? 'bg-[#2A2A2A] dark:bg-[#2A2A2A] light:bg-white text-[#F5F5F5] dark:text-[#F5F5F5] light:text-[#111] font-medium shadow-sm'
                : 'text-[#8E8E93] hover:text-[#CCC]'
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
          className="p-1.5 text-[#8E8E93] hover:text-[#F5F5F5] transition-colors rounded hover:bg-[#1A1A1A]"
          title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Menú de Usuario */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded bg-[#161616] dark:bg-[#161616] light:bg-[#F2F2F2] border border-[#262626] dark:border-[#262626] light:border-[#E5E5E5] text-xs text-[#F5F5F5] dark:text-[#F5F5F5] light:text-[#111] hover:border-[#444] transition-colors"
          >
            <div className="w-5 h-5 rounded-full bg-[#BEFF00] text-[#0A0A0A] font-bold text-[10px] flex items-center justify-center font-mono">
              {currentUser?.nombre ? currentUser.nombre.slice(0, 1) : 'U'}
            </div>
            <span className="hidden sm:inline font-medium truncate max-w-[110px]">
              {currentUser?.nombre ?? 'Usuario'}
            </span>
            <span className="text-[10px] font-mono uppercase text-[#8E8E93] hidden md:inline">
              ({currentUser?.rol ?? 'miembro'})
            </span>
            <ChevronDown className="w-3 h-3 text-[#8E8E93]" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-1 w-64 bg-[#141414] dark:bg-[#141414] light:bg-white border border-[#2E2E2E] dark:border-[#2E2E2E] light:border-[#DDD] rounded shadow-xl py-2 z-50 text-xs">
              <div className="px-3 py-2 border-b border-[#262626] dark:border-[#262626] light:border-[#EEE]">
                <p className="font-medium text-[#F5F5F5] dark:text-[#F5F5F5] light:text-[#111] truncate">
                  {currentUser?.nombre}
                </p>
                <p className="text-[#8E8E93] font-mono text-[11px] truncate">{currentUser?.email}</p>
                <p className="text-[#BEFF00] font-mono text-[10px] mt-0.5 uppercase tracking-wider">
                  Rol: {currentUser?.rol}
                </p>
              </div>

              {/* Selector de miembro para pruebas en AI Studio */}
              <div className="px-3 py-2 border-b border-[#262626] dark:border-[#262626] light:border-[#EEE]">
                <p className="text-[11px] font-medium text-[#8E8E93] mb-1.5">
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
                          ? 'bg-[#2A2A2A] text-[#BEFF00]'
                          : 'text-[#BBB] hover:bg-[#202020]'
                      }`}
                    >
                      <span className="truncate">{m.nombre}</span>
                      <span className="font-mono text-[10px] text-[#888]">
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
                    className="w-full text-left px-2 py-1 rounded text-xs flex items-center justify-between text-[#E8005A] hover:bg-[#202020] transition-colors"
                  >
                    <span>Probar cuenta sin acceso</span>
                    <ShieldAlert className="w-3 h-3 text-[#E8005A]" />
                  </button>
                </div>
              </div>

              <div className="pt-1">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs text-[#E8005A] hover:bg-[#202020] flex items-center gap-2 transition-colors"
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
