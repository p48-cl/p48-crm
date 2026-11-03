import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CRMProvider, useCRM } from './context/CRMContext';
import { Header } from './components/layout/Header';
import { Sidebar, ViewType } from './components/layout/Sidebar';
import { DashboardView } from './views/DashboardView';
import { KanbanView } from './views/KanbanView';
import { CompaniesView } from './views/CompaniesView';
import { ContactsView } from './views/ContactsView';
import { TasksView } from './views/TasksView';
import { ActivitiesView } from './views/ActivitiesView';
import { MarketingView } from './views/MarketingView';
import { ImportView } from './views/ImportView';
import { AdminView } from './views/AdminView';
import { LoginView } from './views/LoginView';
import { PortalView } from './views/PortalView';
import { AccessDeniedView } from './views/AccessDeniedView';
import { GlobalSearchModal } from './components/common/GlobalSearchModal';
import { OpportunityDetailModal } from './views/OpportunityDetailModal';
import { CompanyDetailDrawer } from './views/CompanyDetailDrawer';
import { NewDealModal } from './components/common/NewDealModal';
import { ActivityModal } from './components/common/ActivityModal';
import { CheckSquare, Kanban, Clock, Building2, LayoutDashboard, MoreHorizontal, Users, Upload, Settings, Activity, BarChart3 } from 'lucide-react';
import { NewTaskModal } from './components/common/NewTaskModal';

const CRMAppContent: React.FC = () => {
  const { isLoggedIn, isLoading, accessDeniedError, isAdmin } = useAuth();
  const { empresas } = useCRM();

  const [currentView, setCurrentView] = useState<ViewType>('inicio');
  const [masAbierto, setMasAbierto] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

  // Modales y Drawers globales
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNewDealOpen, setIsNewDealOpen] = useState(false);
  const [selectedOpId, setSelectedOpId] = useState<string | null>(null);
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);

  // Modales rápidos de creación
  const [activityModalState, setActivityModalState] = useState<{
    isOpen: boolean;
    empresaId?: string;
    oportunidadId?: string;
  }>({ isOpen: false });

  const [taskModalState, setTaskModalState] = useState<{
    isOpen: boolean;
    empresaId?: string;
    oportunidadId?: string;
  }>({ isOpen: false });

  // Manejo de tema claro/oscuro en documento HTML
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, [theme]);

  // Atajo de teclado global Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 1. Estado de carga inicial
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--c-bg)] flex flex-col items-center justify-center text-[var(--c-text)] font-sans">
        <div className="w-10 h-10 bg-[var(--c-accent)] text-[var(--c-on-accent)] font-black flex items-center justify-center text-sm font-mono rounded animate-pulse">
          J
        </div>
        <p className="mt-3 text-xs text-[var(--c-muted)] font-mono">Cargando JAMP CRM...</p>
      </div>
    );
  }

  // 2. Control de acceso: Si no está en miembros o está inactivo
  if (accessDeniedError) {
    return <AccessDeniedView />;
  }

  // 3. Si no ha iniciado sesión
  if (!isLoggedIn) {
    return <LoginView />;
  }

  const selectedEmpresaObj = empresas.find((e) => e.id === selectedEmpId) || null;

  return (
    <div className="min-h-screen bg-[var(--c-bg)] dark:bg-[var(--c-bg)] light:bg-[var(--c-bg)] text-[var(--c-text)] dark:text-[var(--c-text)] light:text-[var(--c-surface)] flex flex-col font-sans transition-colors">
      {/* Top Bar Header */}
      <Header
        onOpenSearch={() => setIsSearchOpen(true)}
        theme={theme}
        setTheme={setTheme}
      />

      {/* Workspace: Sidebar + Main View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Barra lateral de navegación */}
        <Sidebar
          currentView={currentView}
          onChangeView={(v) => {
            if (v === 'administracion' && !isAdmin) return;
            setCurrentView(v);
          }}
          onOpenQuickActivity={() => setActivityModalState({ isOpen: true })}
          onOpenNewDeal={() => setIsNewDealOpen(true)}
        />

        {/* Viewport Principal */}
        <main className="flex-1 overflow-y-auto pb-24 md:pb-0 bg-[var(--c-bg)] dark:bg-[var(--c-bg)] light:bg-[var(--c-bg)]">
          {currentView === 'inicio' && (
            <DashboardView
              onNavigateKanban={() => setCurrentView('crm')}
              onNavigateTasks={() => setCurrentView('tareas')}
              onSelectOportunidad={(id) => setSelectedOpId(id)}
            />
          )}

          {currentView === 'crm' && (
            <KanbanView
              onSelectOportunidad={(id) => setSelectedOpId(id)}
              onOpenNewDeal={() => setIsNewDealOpen(true)}
            />
          )}

          {currentView === 'empresas' && (
            <CompaniesView
              onSelectEmpresa={(id) => setSelectedEmpId(id)}
              onSelectOportunidad={(id) => setSelectedOpId(id)}
            />
          )}

          {currentView === 'contactos' && (
            <ContactsView
              onSelectEmpresa={(id) => setSelectedEmpId(id)}
            />
          )}

          {currentView === 'tareas' && (
            <TasksView
              onOpenNewTask={() => setTaskModalState({ isOpen: true })}
              onSelectEmpresa={(id) => setSelectedEmpId(id)}
              onSelectOportunidad={(id) => setSelectedOpId(id)}
            />
          )}

          {currentView === 'actividades' && (
            <ActivitiesView
              onOpenNewActivity={() => setActivityModalState({ isOpen: true })}
              onSelectEmpresa={(id) => setSelectedEmpId(id)}
              onSelectOportunidad={(id) => setSelectedOpId(id)}
            />
          )}

          {currentView === 'marketing' && <MarketingView />}

          {currentView === 'importar' && <ImportView />}

          {currentView === 'administracion' && <AdminView />}
        </main>
      </div>

      {/* Búsqueda Global Cmd+K */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectOportunidad={(id) => setSelectedOpId(id)}
        onSelectEmpresa={(id) => setSelectedEmpId(id)}
        onSelectContacto={(id) => {
          setCurrentView('contactos');
        }}
      />

      {/* Ficha de Oportunidad & Calificación */}
      <OpportunityDetailModal
        oportunidadId={selectedOpId}
        isOpen={Boolean(selectedOpId)}
        onClose={() => setSelectedOpId(null)}
        onSelectEmpresa={(empId) => setSelectedEmpId(empId)}
        onOpenNewActivity={(empId, opId) =>
          setActivityModalState({ isOpen: true, empresaId: empId, oportunidadId: opId })
        }
        onOpenNewTask={(empId, opId) =>
          setTaskModalState({ isOpen: true, empresaId: empId, oportunidadId: opId })
        }
      />

      {/* Ficha de Empresa (Drawer con Looker, Drive & Checklist de accesos) */}
      <CompanyDetailDrawer
        empresa={selectedEmpresaObj}
        isOpen={Boolean(selectedEmpId)}
        onClose={() => setSelectedEmpId(null)}
        onSelectOportunidad={(opId) => setSelectedOpId(opId)}
        onOpenNewActivity={(empId) =>
          setActivityModalState({ isOpen: true, empresaId: empId })
        }
        onOpenNewTask={(empId) =>
          setTaskModalState({ isOpen: true, empresaId: empId })
        }
      />

      {/* Modal Nueva Oportunidad */}
      <NewDealModal
        isOpen={isNewDealOpen}
        onClose={() => setIsNewDealOpen(false)}
        onCreated={(id) => setSelectedOpId(id)}
      />

      {/* Modal Registrar Actividad Rápida */}
      <ActivityModal
        isOpen={activityModalState.isOpen}
        empresaIdInicial={activityModalState.empresaId}
        oportunidadIdInicial={activityModalState.oportunidadId}
        onClose={() => setActivityModalState({ isOpen: false })}
      />

      {/* Modal Nueva Tarea Rápida */}
      <NewTaskModal
        isOpen={taskModalState.isOpen}
        empresaIdInicial={taskModalState.empresaId}
        oportunidadIdInicial={taskModalState.oportunidadId}
        onClose={() => setTaskModalState({ isOpen: false })}
      />

      {/* Barra de navegación inferior móvil: prioriza tareas, fichas y registro rápido */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 material-bar flex items-center justify-around py-1.5 px-1 pb-[max(0.375rem,env(safe-area-inset-bottom))] text-[10px] font-sans">
        <button
          onClick={() => setCurrentView('inicio')}
          className={`min-w-[56px] min-h-[52px] flex flex-col items-center justify-center gap-1 ${
            currentView === 'inicio' ? 'text-[var(--c-accent)] font-semibold' : 'text-[var(--c-muted)]'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Inicio</span>
        </button>

        <button
          onClick={() => setCurrentView('crm')}
          className={`min-w-[56px] min-h-[52px] flex flex-col items-center justify-center gap-1 ${
            currentView === 'crm' ? 'text-[var(--c-accent)] font-semibold' : 'text-[var(--c-muted)]'
          }`}
        >
          <Kanban className="w-5 h-5" />
          <span>Negocios</span>
        </button>

        <button
          onClick={() => setActivityModalState({ isOpen: true })}
          className="flex items-center justify-center w-12 h-12 -mt-5 bg-[var(--c-accent)] hover:bg-[var(--c-accent-hover)] text-[var(--c-on-accent)] rounded-full shadow-lg transition-transform active:scale-95"
          title="Registrar Actividad"
        >
          <Clock className="w-5 h-5 stroke-[2.5]" />
        </button>

        <button
          onClick={() => setCurrentView('tareas')}
          className={`min-w-[56px] min-h-[52px] flex flex-col items-center justify-center gap-1 ${
            currentView === 'tareas' ? 'text-[var(--c-accent)] font-semibold' : 'text-[var(--c-muted)]'
          }`}
        >
          <CheckSquare className="w-5 h-5" />
          <span>Tareas</span>
        </button>

        <button
          onClick={() => setMasAbierto(true)}
          className={`min-w-[56px] min-h-[52px] flex flex-col items-center justify-center gap-1 ${
            ['empresas', 'contactos', 'actividades', 'marketing', 'importar', 'administracion'].includes(currentView)
              ? 'text-[var(--c-accent)] font-semibold'
              : 'text-[var(--c-muted)]'
          }`}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span>Más</span>
        </button>
      </nav>

      {masAbierto && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end bg-black/60" onClick={() => setMasAbierto(false)}>
          <div
            className="w-full bg-[var(--c-surface)] border-t border-[var(--c-line)] rounded-t-xl p-4 pb-8 space-y-1"
            onClick={(ev) => ev.stopPropagation()}
            role="dialog"
            aria-label="Más secciones"
          >
            <p className="text-[10px] font-mono uppercase text-[var(--c-muted)] px-2 pb-2">Más secciones</p>
            {[
              { id: 'empresas' as const, label: 'Empresas y clientes', icon: Building2 },
              { id: 'contactos' as const, label: 'Contactos', icon: Users },
              { id: 'actividades' as const, label: 'Actividades', icon: Activity },
              { id: 'marketing' as const, label: 'Marketing', icon: BarChart3 },
              { id: 'importar' as const, label: 'Importar CSV', icon: Upload },
              { id: 'administracion' as const, label: 'Administración', icon: Settings },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentView(item.id);
                  setMasAbierto(false);
                }}
                className={`w-full min-h-[52px] flex items-center gap-3 px-3 rounded-lg text-sm ${
                  currentView === item.id ? 'text-[var(--c-accent)] bg-[var(--c-surface-2)]' : 'text-[var(--c-line)] hover:bg-[var(--c-surface-2)]'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Separa las dos capas: el equipo entra al CRM interno; los clientes, al portal de solo lectura.
// El CRMProvider (datos internos) nunca se monta para un cliente.
const CapaRouter: React.FC = () => {
  const { isCliente } = useAuth();
  if (isCliente) return <PortalView />;
  return (
    <CRMProvider>
      <CRMAppContent />
    </CRMProvider>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <CapaRouter />
    </AuthProvider>
  );
}
