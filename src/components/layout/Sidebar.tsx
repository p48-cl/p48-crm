import React from 'react';
import {
  LayoutDashboard,
  Kanban,
  Building2,
  Users,
  CheckSquare,
  Clock,
  UploadCloud,
  Sliders,
  Plus,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCRM } from '../../context/CRMContext';

export type ViewType =
  | 'inicio'
  | 'crm'
  | 'empresas'
  | 'contactos'
  | 'tareas'
  | 'actividades'
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
    { id: 'tareas', label: 'Tareas', icon: CheckSquare, badgeCount: kpis.tareas_hoy_count > 0 ? kpis.tareas_hoy_count : undefined },
    { id: 'actividades', label: 'Actividades', icon: Clock },
    { id: 'importar', label: 'Importar CSV', icon: UploadCloud },
  ];

  if (isAdmin) {
    navItems.push({ id: 'administracion', label: 'Administración', icon: Sliders });
  }

  return (
    <aside className="hidden md:flex w-56 shrink-0 border-r border-[#262626] bg-[#0E0E0E] dark:bg-[#0E0E0E] light:bg-[#FAFAFA] flex-col justify-between py-4 select-none">
      <div className="space-y-6">
        {/* Botón Principal (Lima P48: #BEFF00) */}
        <div className="px-3">
          <button
            onClick={onOpenNewDeal}
            className="w-full bg-[#BEFF00] hover:bg-[#aee600] active:scale-[0.98] text-[#0A0A0A] font-semibold text-xs py-2.5 px-3 rounded flex items-center justify-center gap-1.5 transition-all shadow-sm font-sans"
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
                    ? 'bg-[#1C1C1C] dark:bg-[#1C1C1C] light:bg-[#EAEAEA] text-[#F5F5F5] dark:text-[#F5F5F5] light:text-[#111111]'
                    : 'text-[#8E8E93] hover:text-[#F5F5F5] hover:bg-[#151515] dark:hover:bg-[#151515] light:hover:bg-[#F2F2F2]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#BEFF00]' : 'text-[#8E8E93]'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badgeCount !== undefined && item.badgeCount > 0 && (
                  <span
                    className={`font-mono text-[10px] px-1.5 py-0.2 rounded font-bold ${
                      item.badgeAlert
                        ? 'bg-[#E8005A]/20 text-[#E8005A]'
                        : 'bg-[#2A2A2A] text-[#BBB]'
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
      <div className="px-3 pt-4 border-t border-[#222]">
        <button
          onClick={onOpenQuickActivity}
          className="w-full bg-[#1A1A1A] hover:bg-[#242424] text-[#CCC] hover:text-white border border-[#2E2E2E] text-xs py-2 px-3 rounded flex items-center justify-center gap-1.5 transition-colors font-medium"
        >
          <Clock className="w-3.5 h-3.5 text-[#8E8E93]" />
          <span>Registrar Actividad</span>
        </button>

        <div className="mt-3 text-center">
          <p className="text-[10px] text-[#555] font-mono">
            P48 · Performance Agency
          </p>
        </div>
      </div>
    </aside>
  );
};
