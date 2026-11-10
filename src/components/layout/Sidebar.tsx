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
  Radio,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCRM } from '../../context/CRMContext';
import { JampBrand } from '../brand/Jamp';

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

// 'resumen', 'cargar' o el id de plataforma del canal (google_ads, meta_ads, gsc, instagram...)
export type SeccionMarketing = string;

interface SidebarProps {
  currentView: ViewType;
  marketingSection: SeccionMarketing;
  onChangeView: (view: ViewType) => void;
  onOpenMarketing: (seccion: SeccionMarketing) => void;
  onOpenQuickActivity: () => void;
  onOpenNewDeal: () => void;
}

interface NavItem {
  key: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  onClick: () => void;
  badgeCount?: number;
}

const AGENTES = [
  { color: 'var(--sales)', label: 'JAMP/S · Sales' },
  { color: 'var(--media)', label: 'JAMP/M · Media' },
  { color: 'var(--organic)', label: 'JAMP/O · Organic' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  marketingSection,
  onChangeView,
  onOpenMarketing,
  onOpenQuickActivity,
  onOpenNewDeal,
}) => {
  const { isAdmin } = useAuth();
  const { kpis } = useCRM();

  const enMkt = currentView === 'marketing';

  const principales: NavItem[] = [
    { key: 'inicio', label: 'Overview', icon: LayoutDashboard, active: currentView === 'inicio', onClick: () => onChangeView('inicio') },
    { key: 'crm', label: 'Pipeline', icon: Kanban, active: currentView === 'crm', onClick: () => onChangeView('crm') },
    { key: 'marketing', label: 'Marketing', icon: Radio, active: enMkt, onClick: () => onOpenMarketing('resumen') },
    { key: 'empresas', label: 'Clientes', icon: Building2, active: currentView === 'empresas', onClick: () => onChangeView('empresas') },
  ];

  const operacion: NavItem[] = [
    { key: 'contactos', label: 'Contactos', icon: Users, active: currentView === 'contactos', onClick: () => onChangeView('contactos') },
    { key: 'cotizaciones', label: 'Cotizaciones', icon: FileText, active: currentView === 'cotizaciones', onClick: () => onChangeView('cotizaciones') },
    {
      key: 'tareas',
      label: 'Tareas',
      icon: CheckSquare,
      active: currentView === 'tareas',
      onClick: () => onChangeView('tareas'),
      badgeCount: kpis.tareas_hoy_count > 0 ? kpis.tareas_hoy_count : undefined,
    },
    { key: 'actividades', label: 'Actividades', icon: Clock, active: currentView === 'actividades', onClick: () => onChangeView('actividades') },
  ];

  const sistema: NavItem[] = [
    { key: 'importar', label: 'Importar CSV', icon: UploadCloud, active: currentView === 'importar', onClick: () => onChangeView('importar') },
    ...(isAdmin
      ? [{ key: 'administracion', label: 'Administración', icon: Sliders, active: currentView === 'administracion', onClick: () => onChangeView('administracion') }]
      : []),
  ];

  const grupo = (titulo: string, items: NavItem[]) => (
    <div>
      <p className="px-3 pb-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--c-muted-2)]">{titulo}</p>
      <div className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={item.onClick}
              aria-current={item.active ? 'page' : undefined}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                item.active
                  ? 'bg-[var(--sales-soft)] text-[var(--c-text)]'
                  : 'text-[var(--c-muted)] hover:text-[var(--c-text)] hover:bg-[var(--c-surface)]'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${item.active ? 'text-[var(--sales)]' : 'text-[var(--c-muted)]'}`} />
                {item.label}
              </span>
              {item.badgeCount !== undefined && (
                <span className="font-mono text-[10px] px-1.5 rounded bg-[var(--c-surface-3)] text-[var(--c-text-2)] font-bold">
                  {item.badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <aside className="hidden lg:flex w-[220px] shrink-0 border-r border-[var(--c-line)] bg-[var(--c-sidebar)] flex-col justify-between py-4 select-none">
      <div className="space-y-5 overflow-y-auto">
        <div className="px-4">
          <JampBrand size={36} subtitle />
        </div>

        <div className="px-3">
          <button
            onClick={onOpenNewDeal}
            className="w-full bg-[var(--c-accent)] hover:bg-[var(--c-accent-hover)] active:scale-[0.98] text-[var(--c-on-accent)] font-semibold text-xs py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all font-sans"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nueva Oportunidad</span>
          </button>
        </div>

        <nav className="px-2 space-y-5">
          {grupo('Centro de mando', principales)}
          {grupo('Operación', operacion)}
          {sistema.length > 0 && grupo('Sistema', sistema)}
        </nav>
      </div>

      <div className="px-3 pt-4 space-y-3 border-t border-[var(--c-line)]">
        <button
          onClick={onOpenQuickActivity}
          className="w-full bg-[var(--c-surface)] hover:bg-[var(--c-surface-2)] text-[var(--c-text-2)] hover:text-[var(--c-text)] border border-[var(--c-line)] text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors font-medium"
        >
          <Clock className="w-3.5 h-3.5 text-[var(--c-muted)]" />
          <span>Registrar Actividad</span>
        </button>

        <div className="px-1">
          <p className="pb-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--c-muted-2)]">Agentes</p>
          <ul className="space-y-1.5">
            {AGENTES.map((a) => (
              <li key={a.label} className="flex items-center gap-2 text-[11px] font-mono text-[var(--c-text-2)]">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: a.color }} aria-hidden />
                {a.label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
};
