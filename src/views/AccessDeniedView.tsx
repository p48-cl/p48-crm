import React from 'react';
import { ShieldX, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AccessDeniedView: React.FC = () => {
  const { accessDeniedError, clearAccessDenied, switchDemoUser, loginWithGoogle } = useAuth();

  return (
    <div className="min-h-screen bg-[var(--c-bg)] text-[var(--c-text)] flex flex-col items-center justify-center p-6 selection:bg-[var(--c-accent)] selection:text-[var(--c-on-accent)]">
      <div className="max-w-md w-full bg-[var(--c-surface)] border border-[var(--c-line)] rounded-xl p-8 text-center shadow-2xl relative">
        <div className="w-14 h-14 bg-[var(--c-danger)]/15 border border-[var(--c-danger)]/30 text-[var(--c-danger)] rounded-full flex items-center justify-center mx-auto mb-5">
          <ShieldX className="w-7 h-7 stroke-[2]" />
        </div>

        <h1 className="text-xl font-bold font-sans text-[var(--c-text)] mb-2">
          Acceso Restringido
        </h1>

        {/* Mensaje exigido textualmente por las reglas */}
        <div className="p-4 bg-[#1E1216] border border-[var(--c-danger)]/40 rounded-lg text-sm text-[#FFB3C7] mb-6 font-medium">
          {accessDeniedError || 'No tienes acceso. Pide acceso a un admin.'}
        </div>

        <p className="text-xs text-[var(--c-muted)] mb-6 leading-relaxed">
          Este sistema es de uso interno exclusivo para el equipo autorizado de P48.
          Si eres colaborador de la agencia, solicita a un administrador que active tu cuenta en la tabla de miembros.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => {
              clearAccessDenied();
              loginWithGoogle();
            }}
            className="w-full bg-[var(--c-accent)] hover:bg-[var(--c-accent-hover)] text-[var(--c-on-accent)] font-semibold text-xs py-2.5 px-4 rounded transition-all flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>Reintentar con Google</span>
          </button>

          <div className="pt-4 border-t border-[var(--c-line)]">
            <p className="text-[11px] text-[var(--c-muted-2)] mb-2 font-mono">
              Opciones de entorno de prueba (AI Studio):
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => switchDemoUser?.('rodrigo@p48.cl')}
                className="px-2.5 py-1 text-[11px] bg-[#222] hover:bg-[#333] text-[var(--c-text-2)] rounded font-mono transition-colors"
              >
                Entrar como Admin
              </button>
              <button
                onClick={() => switchDemoUser?.('camila@p48.cl')}
                className="px-2.5 py-1 text-[11px] bg-[#222] hover:bg-[#333] text-[var(--c-text-2)] rounded font-mono transition-colors"
              >
                Entrar como Miembro
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
