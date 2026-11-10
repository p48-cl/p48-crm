import { JampMark } from '../components/brand/Jamp';
import React from 'react';
import { LogIn, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginView: React.FC = () => {
  const { loginWithGoogle, isLoading, isSupabaseLive, switchDemoUser } = useAuth();

  return (
    <div className="min-h-screen bg-[var(--c-bg)] text-[var(--c-text)] flex flex-col items-center justify-center p-6 selection:bg-[var(--c-accent)] selection:text-[var(--c-on-accent)]">
      <div className="max-w-sm w-full bg-[var(--c-surface)] border border-[var(--c-line)] rounded-xl p-8 shadow-2xl relative text-center">
        {/* Logo JAMP */}
        <JampMark size={56} className="mx-auto mb-4" />

        <h1 className="text-xl font-bold font-sans text-[var(--c-text)] mb-1">
          JAMP CRM
        </h1>
        <p className="text-xs text-[var(--c-muted)] mb-6 font-sans">
          Agencia de Performance Marketing B2B · Chile
        </p>

        <div className="space-y-4">
          <button
            onClick={() => loginWithGoogle()}
            disabled={isLoading}
            className="w-full bg-[var(--c-accent)] hover:bg-[var(--c-accent-hover)] active:scale-[0.99] text-[var(--c-on-accent)] font-semibold text-xs py-3 px-4 rounded transition-all flex items-center justify-center gap-2.5 shadow-md disabled:opacity-50"
          >
            <LogIn className="w-4 h-4 stroke-[2.5]" />
            <span>Continuar con Google</span>
          </button>

          <div className="flex items-center gap-2 text-[11px] text-[var(--c-muted)] justify-center font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--c-accent)]" />
            <span>Equipo y clientes con acceso autorizado</span>
          </div>

          {!isSupabaseLive && (
            <div className="pt-5 border-t border-[var(--c-line)] text-left">
              <p className="text-[11px] text-[var(--c-muted)] mb-2 font-mono">
                Accesos rápidos de demostración:
              </p>
              <div className="space-y-1.5">
                <button
                  onClick={() => switchDemoUser?.('rodrigo@p48.cl')}
                  className="w-full text-left px-2.5 py-1.5 rounded bg-[var(--c-surface-2)] hover:bg-[var(--c-line)] text-xs text-[var(--c-line)] flex items-center justify-between border border-[var(--c-line)] transition-colors"
                >
                  <span className="font-medium">Rodrigo Silva</span>
                  <span className="text-[10px] text-[var(--c-accent)] font-mono">Admin</span>
                </button>
                <button
                  onClick={() => switchDemoUser?.('camila@p48.cl')}
                  className="w-full text-left px-2.5 py-1.5 rounded bg-[var(--c-surface-2)] hover:bg-[var(--c-line)] text-xs text-[var(--c-line)] flex items-center justify-between border border-[var(--c-line)] transition-colors"
                >
                  <span className="font-medium">Camila Soto</span>
                  <span className="text-[10px] text-[var(--c-muted)] font-mono">Miembro</span>
                </button>
                <button
                  onClick={() => switchDemoUser?.('matias@p48.cl')}
                  className="w-full text-left px-2.5 py-1.5 rounded bg-[var(--c-surface-2)] hover:bg-[var(--c-line)] text-xs text-[var(--c-danger)] flex items-center justify-between border border-[var(--c-line)] transition-colors"
                >
                  <span>Matías Araya</span>
                  <span className="text-[10px] text-[var(--c-danger)] font-mono">Inactivo (Probar bloqueo)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
