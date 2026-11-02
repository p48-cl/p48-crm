import React from 'react';
import { ShieldX, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AccessDeniedView: React.FC = () => {
  const { accessDeniedError, clearAccessDenied, switchDemoUser, loginWithGoogle } = useAuth();

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] flex flex-col items-center justify-center p-6 selection:bg-[#BEFF00] selection:text-[#0A0A0A]">
      <div className="max-w-md w-full bg-[#141414] border border-[#2E2E2E] rounded-xl p-8 text-center shadow-2xl relative">
        <div className="w-14 h-14 bg-[#E8005A]/15 border border-[#E8005A]/30 text-[#E8005A] rounded-full flex items-center justify-center mx-auto mb-5">
          <ShieldX className="w-7 h-7 stroke-[2]" />
        </div>

        <h1 className="text-xl font-bold font-sans text-[#F5F5F5] mb-2">
          Acceso Restringido
        </h1>

        {/* Mensaje exigido textualmente por las reglas */}
        <div className="p-4 bg-[#1E1216] border border-[#E8005A]/40 rounded-lg text-sm text-[#FFB3C7] mb-6 font-medium">
          {accessDeniedError || 'No tienes acceso. Pide acceso a un admin.'}
        </div>

        <p className="text-xs text-[#8E8E93] mb-6 leading-relaxed">
          Este sistema es de uso interno exclusivo para el equipo autorizado de P48.
          Si eres colaborador de la agencia, solicita a un administrador que active tu cuenta en la tabla de miembros.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => {
              clearAccessDenied();
              loginWithGoogle();
            }}
            className="w-full bg-[#BEFF00] hover:bg-[#aee600] text-[#0A0A0A] font-semibold text-xs py-2.5 px-4 rounded transition-all flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>Reintentar con Google</span>
          </button>

          <div className="pt-4 border-t border-[#242424]">
            <p className="text-[11px] text-[#666] mb-2 font-mono">
              Opciones de entorno de prueba (AI Studio):
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => switchDemoUser?.('rodrigo@p48.cl')}
                className="px-2.5 py-1 text-[11px] bg-[#222] hover:bg-[#333] text-[#CCC] rounded font-mono transition-colors"
              >
                Entrar como Admin
              </button>
              <button
                onClick={() => switchDemoUser?.('camila@p48.cl')}
                className="px-2.5 py-1 text-[11px] bg-[#222] hover:bg-[#333] text-[#CCC] rounded font-mono transition-colors"
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
