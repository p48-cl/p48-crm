import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CRMProvider, useCRM } from './context/CRMContext';
import { Header } from './components/layout/Header';
import { Sidebar, ViewType, SeccionMarketing } from './components/layout/Sidebar';
import { JampMark } from './components/brand/Jamp';
import { DashboardView } from './views/DashboardView';
import { KanbanView } from './views/KanbanView';
import { CompaniesView } from './views/CompaniesView';
import { ContactsView } from './views/ContactsView';
import { TasksView } from './views/TasksView';
import { ProjectsView } from './views/ProjectsView';
import { AgenciaView } from './views/AgenciaView';
import { ActivitiesView } from './views/ActivitiesView';
import { MarketingView } from './views/MarketingView';
import { canalDe } from './components/marketing/canales';
import { ImportView } from './views/ImportView';
import { AdminView } from './views/AdminView';
import { LoginView } from './views/LoginView';
import { PortalView } from './views/PortalView';
import { AccessDeniedView } from './views/AccessDeniedView';
import { GlobalSearchModal } from './components/common/GlobalSearchModal';
import { OpportunityDetailModal } from './views/OpportunityDetailModal';
import { CompanyDetailDrawer } from './views/CompanyDetailDrawer';
import { NewDealModal } from './components/common/NewDealModal';
import { CotizacionesView } from './views/CotizacionesView';
import { FacturasView } from './views/FacturasView';
import { ActivityModal } from './components/common/ActivityModal';
import { CheckSquare, Kanban, Clock, Building2, LayoutDashboard, MoreHorizontal, Users, Upload, Settings, Activity, BarChart3, FileText, FolderKanban, Receipt } from 'lucide-react';
import { NewTaskModal } from './components/common/NewTaskModal';
import { Actividad, Tarea } from './types/crm';
import { useConfiguracionCRM } from './lib/configuracion';

const CRMAppContent: React.FC = () => {
  const { isLoggedIn, isLoading, accessDeniedError, isAdmin } = useAuth();
  const { empresasTodas: empresas } = useCRM();

  const [currentView, setCurrentView] = useState<ViewType>('inicio');
  const [masAbierto, setMasAbierto] = useState(false);
  const [mktSeccion, setMktSeccion] = useState<SeccionMarketing>('resumen');
  const abrirMarketing = (s: SeccionMarketing) => { setMktSeccion(s); setCurrentView('marketing'); };
  const { config: configCRM, lista: configLista } = useConfiguracionCRM(isLoggedIn);
  // El tema parte del último guardado en este navegador (lo aplica index.html antes de pintar), sin pasar por claro
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem('jamp-tema') === 'light' ? 'light' : 'dark'));
  useEffect(() => {
    // La elección personal (botón del encabezado) manda sobre el tema por defecto del equipo
    if (configLista && !localStorage.getItem('jamp-tema-personal')) setTheme(configCRM.tema_defecto === 'oscuro' ? 'dark' : 'light');
  }, [configCRM.tema_defecto, configLista]);

  // Modales y Drawers globales
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNewDealOpen, setIsNewDealOpen] = useState(false);
  const [selectedOpId, setSelectedOpId] = useState<string | null>(null);
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);
  const [fichaTab, setFichaTab] = useState<'marketing' | 'facturacion' | undefined>(undefined);
  const [fichaNuevaCotizacion, setFichaNuevaCotizacion] = useState(false);
  // Sube al cerrar la ficha de un cliente para que la vista de Cotizaciones recargue sus datos
  const [cotizacionesVersion, setCotizacionesVersion] = useState(0);

  // Modales rápidos de creación
  const [activityModalState, setActivityModalState] = useState<{
    isOpen: boolean;
    empresaId?: string;
    oportunidadId?: string;
    actividad?: Actividad | null;
    k?: number;
  }>({ isOpen: false });

  const [taskModalState, setTaskModalState] = useState<{
    isOpen: boolean;
    empresaId?: string;
    oportunidadId?: string;
    tarea?: Tarea | null;
    k?: number;
  }>({ isOpen: false });

  // Manejo de tema claro/oscuro en documento HTML
  useEffect(() => {
    const root = document.documentElement;
    try { localStorage.setItem('jamp-tema', theme); } catch { /* ignorar */ }
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
        <JampMark size={48} className="animate-pulse" />
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
    <div className="h-dvh overflow-hidden bg-[var(--c-bg)] text-[var(--c-text)] flex flex-col font-sans transition-colors">
      {/* Top Bar Header */}
      <Header
        onOpenSearch={() => setIsSearchOpen(true)}
        theme={theme}
        setTheme={(t) => { try { localStorage.setItem('jamp-tema-personal', '1'); } catch { /* ignorar */ } setTheme(t); }}
      />

      {/* Workspace: Sidebar + Main View */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Barra lateral de navegación */}
        <Sidebar
          currentView={currentView}
          onChangeView={(v) => {
            if (v === 'administracion' && !isAdmin) return;
            setCurrentView(v);
          }}
          marketingSection={mktSeccion}
          onOpenMarketing={abrirMarketing}
          onOpenQuickActivity={() => setActivityModalState({ isOpen: true })}
          onOpenNewDeal={() => setIsNewDealOpen(true)}
        />

        {/* Viewport Principal */}
        <main
          data-module={currentView === 'marketing' ? (canalDe(mktSeccion)?.tipo === 'organico' ? 'organic' : canalDe(mktSeccion)?.tipo === 'pago' ? 'media' : 'sales') : 'sales'}
          className="flex-1 min-h-0 overflow-y-auto pb-24 lg:pb-0 bg-[var(--c-bg)] border-t-2 border-[var(--module)]"
        >
          {currentView === 'inicio' && (
            <DashboardView onNavigate={setCurrentView} />
          )}

          {currentView === 'crm' && (
            <KanbanView
              pipeline="captacion"
              onSelectOportunidad={(id) => setSelectedOpId(id)}
              onOpenNewDeal={() => setIsNewDealOpen(true)}
            />
          )}

          {currentView === 'negocios' && (
            <KanbanView
              pipeline="expansion"
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

          {currentView === 'cotizaciones' && (
            <CotizacionesView version={cotizacionesVersion} onAbrirFicha={(id, nueva) => { setFichaTab('facturacion'); setFichaNuevaCotizacion(!!nueva); setSelectedEmpId(id); }} />
          )}

          {currentView === 'facturas' && (
            <FacturasView onAbrirFicha={(id) => { setFichaTab('facturacion'); setFichaNuevaCotizacion(false); setSelectedEmpId(id); }} />
          )}

          {currentView === 'contactos' && (
            <ContactsView
              onSelectEmpresa={(id) => setSelectedEmpId(id)}
            />
          )}

          {currentView === 'tareas' && (
            <TasksView
              onOpenNewTask={() => setTaskModalState({ isOpen: true, k: Date.now() })}
              onEditTask={(t) => setTaskModalState({ isOpen: true, tarea: t, k: Date.now() })}
              onSelectEmpresa={(id) => setSelectedEmpId(id)}
              onSelectOportunidad={(id) => setSelectedOpId(id)}
              onSelectProyecto={() => setCurrentView('proyectos')}
            />
          )}

          {currentView === 'proyectos' && (
            <ProjectsView ambito="clientes" onEditTask={(t) => setTaskModalState({ isOpen: true, tarea: t, k: Date.now() })} />
          )}

          {currentView === 'agencia' && (
            <AgenciaView
              onNuevaTarea={(empId) => setTaskModalState({ isOpen: true, empresaId: empId, k: Date.now() })}
              onEditTask={(t) => setTaskModalState({ isOpen: true, tarea: t, k: Date.now() })}
            />
          )}

          {currentView === 'actividades' && (
            <ActivitiesView
              onOpenNewActivity={() => setActivityModalState({ isOpen: true, k: Date.now() })}
              onEditActividad={(a) => setActivityModalState({ isOpen: true, actividad: a, k: Date.now() })}
              onSelectEmpresa={(id) => setSelectedEmpId(id)}
              onSelectOportunidad={(id) => setSelectedOpId(id)}
            />
          )}

          {currentView === 'marketing' && <MarketingView seccion={mktSeccion} onSeccion={setMktSeccion} />}

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
        onSelectContacto={() => {
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
          setTaskModalState({ isOpen: true, empresaId: empId, oportunidadId: opId, k: Date.now() })
        }
      />

      {/* Ficha de Empresa (Drawer con Looker, Drive & Checklist de accesos) */}
      <CompanyDetailDrawer
        empresa={selectedEmpresaObj}
        isOpen={Boolean(selectedEmpId)}
        onClose={() => { setSelectedEmpId(null); setFichaTab(undefined); setFichaNuevaCotizacion(false); setCotizacionesVersion((v) => v + 1); }}
        tabInicial={fichaTab}
        iniciarNuevaCotizacion={fichaNuevaCotizacion}
        onNuevaCotizacionUsada={() => setFichaNuevaCotizacion(false)}
        onSelectOportunidad={(opId) => setSelectedOpId(opId)}
        onOpenNewActivity={(empId) =>
          setActivityModalState({ isOpen: true, empresaId: empId })
        }
        onOpenNewTask={(empId) =>
          setTaskModalState({ isOpen: true, empresaId: empId, k: Date.now() })
        }
        onEditTask={(t) => setTaskModalState({ isOpen: true, tarea: t, k: Date.now() })}
      />

      {/* Modal Nueva Oportunidad */}
      <NewDealModal
        isOpen={isNewDealOpen}
        onClose={() => setIsNewDealOpen(false)}
        onCreated={(id) => setSelectedOpId(id)}
      />

      {/* Modal Registrar Actividad Rápida */}
      <ActivityModal
        key={activityModalState.k ?? 0}
        actividadEditar={activityModalState.actividad}
        isOpen={activityModalState.isOpen}
        empresaIdInicial={activityModalState.empresaId}
        oportunidadIdInicial={activityModalState.oportunidadId}
        onClose={() => setActivityModalState({ isOpen: false })}
      />

      {/* Modal Nueva Tarea Rápida */}
      <NewTaskModal
        key={taskModalState.k ?? 0}
        tareaEditar={taskModalState.tarea}
        isOpen={taskModalState.isOpen}
        empresaIdInicial={taskModalState.empresaId}
        oportunidadIdInicial={taskModalState.oportunidadId}
        onClose={() => setTaskModalState({ isOpen: false })}
      />

      {/* Barra de navegación inferior móvil: prioriza tareas, fichas y registro rápido */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 material-bar flex items-center justify-around py-1.5 px-1 pb-[max(0.375rem,env(safe-area-inset-bottom))] text-[10px] font-sans">
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
          <span>Leads</span>
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
            ['empresas', 'contactos', 'actividades', 'marketing', 'agencia', 'importar', 'administracion'].includes(currentView)
              ? 'text-[var(--c-accent)] font-semibold'
              : 'text-[var(--c-muted)]'
          }`}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span>Más</span>
        </button>
      </nav>

      {masAbierto && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end bg-black/60" onClick={() => setMasAbierto(false)}>
          <div
            className="w-full bg-[var(--c-surface)] border-t border-[var(--c-line)] rounded-t-xl p-4 pb-8 space-y-1"
            onClick={(ev) => ev.stopPropagation()}
            role="dialog"
            aria-label="Más secciones"
          >
            <p className="text-[10px] font-mono uppercase text-[var(--c-muted)] px-2 pb-2">Más secciones</p>
            {[
              { id: 'empresas' as const, label: 'Clientes', icon: Building2 },
              { id: 'contactos' as const, label: 'Contactos', icon: Users },
              { id: 'cotizaciones' as const, label: 'Cotizaciones', icon: FileText },
              { id: 'facturas' as const, label: 'Facturas', icon: Receipt },
              { id: 'proyectos' as const, label: 'Proyectos', icon: FolderKanban },
              { id: 'agencia' as const, label: 'P48 · Agencia', icon: Building2 },
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
                  currentView === item.id ? 'text-[var(--c-accent)] bg-[var(--c-surface-2)]' : 'text-[var(--c-text-2)] hover:bg-[var(--c-surface-2)]'
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
