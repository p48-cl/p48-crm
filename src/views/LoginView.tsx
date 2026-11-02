import React from 'react';
import { LogIn, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginView: React.FC = () => {
  const { loginWithGoogle, isLoading, isSupabaseLive, switchDemoUser } = useAuth();

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] flex flex-col items-center justify-center p-6 selection:bg-[#BEFF00] selection:text-[#0A0A0A]">
      <div className="max-w-sm w-full bg-[#141414] border border-[#262626] rounded-xl p-8 shadow-2xl relative text-center">
        {/* Logo P48 */}
        <div className="w-12 h-12 bg-[#BEFF00] text-[#0A0A0A] font-black flex items-center justify-center text-lg tracking-tighter rounded mx-auto mb-4 font-mono shadow-lg">
          P48
        </div>

        <h1 className="text-xl font-bold font-sans text-[#F5F5F5] mb-1">
          CRM P48
        </h1>
        <p className="text-xs text-[#8E8E93] mb-6 font-sans">
          Agencia de Performance Marketing B2B · Chile
        </p>

        <div className="space-y-4">
          <button
            onClick={() => loginWithGoogle()}
            disabled={isLoading}
            className="w-full bg-[#BEFF00] hover:bg-[#aee600] active:scale-[0.99] text-[#0A0A0A] font-semibold text-xs py-3 px-4 rounded transition-all flex items-center justify-center gap-2.5 shadow-md disabled:opacity-50"
          >
            <LogIn className="w-4 h-4 stroke-[2.5]" />
            <span>Continuar con Google Workspace</span>
          </button>

          <div className="flex items-center gap-2 text-[11px] text-[#777] justify-center font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-[#BEFF00]" />
            <span>Acceso restringido a miembros @p48.cl</span>
          </div>

          {!isSupabaseLive && (
            <div className="pt-5 border-t border-[#222] text-left">
              <p className="text-[11px] text-[#8E8E93] mb-2 font-mono">
                Accesos rápidos de demostración:
              </p>
              <div className="space-y-1.5">
                <button
                  onClick={() => switchDemoUser?.('rodrigo@p48.cl')}
                  className="w-full text-left px-2.5 py-1.5 rounded bg-[#1C1C1C] hover:bg-[#252525] text-xs text-[#DDD] flex items-center justify-between border border-[#2C2C2C] transition-colors"
                >
                  <span className="font-medium">Rodrigo Silva</span>
                  <span className="text-[10px] text-[#BEFF00] font-mono">Admin</span>
                </button>
                <button
                  onClick={() => switchDemoUser?.('camila@p48.cl')}
                  className="w-full text-left px-2.5 py-1.5 rounded bg-[#1C1C1C] hover:bg-[#252525] text-xs text-[#DDD] flex items-center justify-between border border-[#2C2C2C] transition-colors"
                >
                  <span className="font-medium">Camila Soto</span>
                  <span className="text-[10px] text-[#8E8E93] font-mono">Miembro</span>
                </button>
                <button
                  onClick={() => switchDemoUser?.('matias@p48.cl')}
                  className="w-full text-left px-2.5 py-1.5 rounded bg-[#1C1C1C] hover:bg-[#252525] text-xs text-[#E8005A] flex items-center justify-between border border-[#2C2C2C] transition-colors"
                >
                  <span>Matías Araya</span>
                  <span className="text-[10px] text-[#E8005A] font-mono">Inactivo (Probar bloqueo)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
