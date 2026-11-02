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
import { ImportView } from './views/ImportView';
import { AdminView } from './views/AdminView';
import { LoginView } from './views/LoginView';
import { AccessDeniedView } from './views/AccessDeniedView';
import { GlobalSearchModal } from './components/common/GlobalSearchModal';
import { OpportunityDetailModal } from './views/OpportunityDetailModal';
import { CompanyDetailDrawer } from './views/CompanyDetailDrawer';
import { NewDealModal } from './components/common/NewDealModal';
import { ActivityModal } from './components/common/ActivityModal';
import { CheckSquare, Kanban, Clock, Building2, LayoutDashboard } from 'lucide-react';
import { NewTaskModal } from './components/common/NewTaskModal';

const CRMAppContent: React.FC = () => {
  const { isLoggedIn, isLoading, accessDeniedError, isAdmin } = useAuth();
  const { empresas } = useCRM();

  const [currentView, setCurrentView] = useState<ViewType>('inicio');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

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
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center text-[#F5F5F5] font-sans">
        <div className="w-10 h-10 bg-[#BEFF00] text-[#0A0A0A] font-black flex items-center justify-center text-sm font-mono rounded animate-pulse">
          P48
        </div>
        <p className="mt-3 text-xs text-[#8E8E93] font-mono">Cargando CRM P48...</p>
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
    <div className="min-h-screen bg-[#0A0A0A] dark:bg-[#0A0A0A] light:bg-[#F8F9FA] text-[#F5F5F5] dark:text-[#F5F5F5] light:text-[#111111] flex flex-col font-sans transition-colors">
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
        <main className="flex-1 overflow-y-auto bg-[#0A0A0A] dark:bg-[#0A0A0A] light:bg-[#F8F9FA]">
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
      <nav className="md:hidden sticky bottom-0 z-30 bg-[#0E0E0E] dark:bg-[#0E0E0E] light:bg-[#FAFAFA] border-t border-[#262626] dark:border-[#262626] light:border-[#DDD] flex items-center justify-around py-2 px-2 text-[10px] font-sans">
        <button
          onClick={() => setCurrentView('tareas')}
          className={`flex flex-col items-center gap-1 ${
            currentView === 'tareas' ? 'text-[#BEFF00] font-semibold' : 'text-[#888]'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>Tareas</span>
        </button>

        <button
          onClick={() => setCurrentView('crm')}
          className={`flex flex-col items-center gap-1 ${
            currentView === 'crm' ? 'text-[#BEFF00] font-semibold' : 'text-[#888]'
          }`}
        >
          <Kanban className="w-4 h-4" />
          <span>CRM / Fichas</span>
        </button>

        <button
          onClick={() => setActivityModalState({ isOpen: true })}
          className="flex items-center justify-center w-11 h-11 -mt-5 bg-[#BEFF00] hover:bg-[#aee600] text-[#0A0A0A] rounded-full shadow-lg font-bold transition-transform active:scale-95"
          title="Registrar Actividad"
        >
          <Clock className="w-5 h-5 stroke-[2.5]" />
        </button>

        <button
          onClick={() => setCurrentView('empresas')}
          className={`flex flex-col items-center gap-1 ${
            currentView === 'empresas' ? 'text-[#BEFF00] font-semibold' : 'text-[#888]'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Empresas</span>
        </button>

        <button
          onClick={() => setCurrentView('inicio')}
          className={`flex flex-col items-center gap-1 ${
            currentView === 'inicio' ? 'text-[#BEFF00] font-semibold' : 'text-[#888]'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Inicio</span>
        </button>
      </nav>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <CRMProvider>
        <CRMAppContent />
      </CRMProvider>
    </AuthProvider>
  );
}
