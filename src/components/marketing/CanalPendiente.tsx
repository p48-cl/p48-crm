import React from 'react';
import { Plug } from 'lucide-react';
import type { Canal } from './canales';

const CONECTOR: Record<string, string> = {
  mcp_meta: 'MCP de Meta',
  mcp_tiktok: 'MCP de TikTok',
  mcp_linkedin: 'MCP de LinkedIn',
  mcp_google: 'MCP de Google',
};

// Canal aún sin conector: muestra qué traerá y cómo cargar datos mientras tanto.
export const CanalPendiente: React.FC<{ canal: Canal; onCargar: () => void }> = ({ canal, onCargar }) => (
  <div className="surface p-6 sm:p-8 text-center space-y-3">
    <div className="mx-auto w-11 h-11 rounded-xl grid place-items-center bg-[var(--c-surface-2)] text-[var(--c-muted)]">
      <Plug className="w-5 h-5" />
    </div>
    <div>
      <p className="text-sm font-semibold text-[var(--c-text)]">{canal.nombre}</p>
      <p className="text-[11px] font-mono uppercase tracking-wider text-[var(--c-warn)] mt-0.5">
        {canal.estado === 'pausado' ? 'Conector pausado' : `Conector en construcción · ${CONECTOR[canal.conector] ?? canal.conector}`}
      </p>
    </div>
    <p className="text-xs text-[var(--c-text-2)] max-w-md mx-auto">Cuando esté activo mostrará: {canal.muestra}</p>
    <button
      onClick={onCargar}
      className="px-3 py-1.5 text-xs font-semibold rounded border border-[var(--c-line)] text-[var(--c-text)] hover:bg-[var(--c-surface-2)]"
    >
      Mientras tanto, cargar CSV o manual
    </button>
  </div>
);
