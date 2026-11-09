import React from 'react';
import {
  FileText,
  LayoutDashboard,
  Kanban,
  Building2,
  Users,
  CheckSquare,
  Clock,
  UploadCloud,
  Sliders,
  Plus,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCRM } from '../../context/CRMContext';

export type ViewType =
  | 'inicio'
  | 'crm'
  | 'empresas'
  | 'contactos'
  | 'cotizaciones'
  | 'tareas'
  | 'actividades'
  | 'marketing'
  | 'importar'
  | 'administracion';

interface SidebarProps {
  currentView: ViewType;
  onChangeView: (view: ViewType) => void;
  onOpenQuickActivity: () => void;
  onOpenNewDeal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onChangeView,
  onOpenQuickActivity,
  onOpenNewDeal,
}) => {
  const { isAdmin } = useAuth();
  const { kpis } = useCRM();

  const navItems: Array<{ id: ViewType; label: string; icon: React.ElementType; badgeCount?: number; badgeAlert?: boolean }> = [
    { id: 'inicio', label: 'Inicio', icon: LayoutDashboard },
    { id: 'crm', label: 'CRM', icon: Kanban },
    { id: 'empresas', label: 'Empresas', icon: Building2 },
    { id: 'contactos', label: 'Contactos', icon: Users },
    { id: 'cotizaciones', label: 'Cotizaciones', icon: FileText },
    { id: 'tareas', label: 'Tareas', icon: CheckSquare, badgeCount: kpis.tareas_hoy_count > 0 ? kpis.tareas_hoy_count : undefined },
    { id: 'actividades', label: 'Actividades', icon: Clock },
    { id: 'marketing', label: 'Mkt Inteligence', icon: BarChart3 },
    { id: 'importar', label: 'Importar CSV', icon: UploadCloud },
  ];

  if (isAdmin) {
    navItems.push({ id: 'administracion', label: 'Administración', icon: Sliders });
  }

  return (
    <aside className="hidden md:flex w-56 shrink-0 border-r border-[var(--c-line)] bg-[var(--c-surface-2)] dark:bg-[var(--c-surface-2)] light:bg-[var(--c-bg)] flex-col justify-between py-4 select-none">
      <div className="space-y-6">
        {/* Botón Principal (acento JAMP) */}
        <div className="px-3">
          <button
            onClick={onOpenNewDeal}
            className="w-full bg-[var(--c-accent)] hover:bg-[var(--c-accent-hover)] active:scale-[0.98] text-[var(--c-on-accent)] font-semibold text-xs py-2.5 px-3 rounded flex items-center justify-center gap-1.5 transition-all shadow-sm font-sans"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nueva Oportunidad</span>
          </button>
        </div>

        {/* Navegación Principal */}
        <nav className="px-2 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onChangeView(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-[var(--c-surface-2)] dark:bg-[var(--c-surface-2)] light:bg-[var(--c-surface-3)] text-[var(--c-text)] dark:text-[var(--c-text)] light:text-[var(--c-surface)]'
                    : 'text-[var(--c-muted)] hover:text-[var(--c-text)] hover:bg-[var(--c-surface)] dark:hover:bg-[var(--c-surface)] light:hover:bg-[var(--c-surface-2)]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[var(--c-accent)]' : 'text-[var(--c-muted)]'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badgeCount !== undefined && item.badgeCount > 0 && (
                  <span
                    className={`font-mono text-[10px] px-1.5 py-0.2 rounded font-bold ${
                      item.badgeAlert
                        ? 'bg-[var(--c-danger)]/20 text-[var(--c-danger)]'
                        : 'bg-[var(--c-surface-3)] text-[var(--c-text-2)]'
                    }`}
                  >
                    {item.badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Acción rápida de registro de actividad */}
      <div className="px-3 pt-4 border-t border-[var(--c-line)]">
        <button
          onClick={onOpenQuickActivity}
          className="w-full bg-[var(--c-surface-2)] hover:bg-[var(--c-line)] text-[var(--c-text-2)] hover:text-[var(--c-text)] border border-[var(--c-line)] text-xs py-2 px-3 rounded flex items-center justify-center gap-1.5 transition-colors font-medium"
        >
          <Clock className="w-3.5 h-3.5 text-[var(--c-muted)]" />
          <span>Registrar Actividad</span>
        </button>

        <div className="mt-3 text-center">
          <p className="text-[10px] text-[var(--c-muted-2)] font-mono">
            JAMP CRM · Multi-agente
          </p>
        </div>
      </div>
    </aside>
  );
};
