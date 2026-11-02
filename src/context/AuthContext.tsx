import React, { createContext, useContext, useState, useEffect } from 'react';
import { Miembro, RolUsuario } from '../types/crm';
import { supabase, isSupabaseConfigured, isModoDemo } from '../lib/supabase';
import { parseSupabaseError } from '../lib/errorHandler';
import { INITIAL_MIEMBROS } from '../lib/mockData';

interface AuthContextType {
  currentUser: Miembro | null;
  rol: RolUsuario | null;
  isAdmin: boolean;
  isLoggedIn: boolean;
  isLoading: boolean;
  accessDeniedError: string | null;
  isSupabaseLive: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  switchDemoUser?: (email: string) => void;
  clearAccessDenied: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<Miembro | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [accessDeniedError, setAccessDeniedError] = useState<string | null>(null);

  // Inicializar sesión y escuchar eventos auth
  useEffect(() => {
    let mounted = true;

    async function initSession() {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            await vincularMiembroDesdeSupabase();
          } else if (isModoDemo) {
            // Solo en modo demo explícito
            setCurrentUser(INITIAL_MIEMBROS[0]);
          } else {
            setCurrentUser(null);
          }
        } catch (err) {
          console.error(parseSupabaseError(err));
          if (isModoDemo) {
            setCurrentUser(INITIAL_MIEMBROS[0]);
          } else {
            setCurrentUser(null);
          }
        }
      } else if (isModoDemo) {
        // Modo demo local activado explícitamente
        setCurrentUser(INITIAL_MIEMBROS[0]);
      } else {
        setCurrentUser(null);
      }

      if (mounted) setIsLoading(false);
    }

    initSession();

    if (isSupabaseConfigured && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await vincularMiembroDesdeSupabase();
        } else if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
        }
      });

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    }

    return () => {
      mounted = false;
    };
  }, []);

  // Invocar RPC vincular_miembro()
  // "Al obtener sesión, llama a la RPC vincular_miembro(). Si devuelve null, cierra sesión y muestra 'No tienes acceso. Pide acceso a un admin.'"
  async function vincularMiembroDesdeSupabase() {
    if (!supabase) return;

    try {
      const { data, error } = await supabase.rpc('vincular_miembro');

      if (error || !data) {
        // Bloquear acceso inmediatamente y cerrar sesión
        await supabase.auth.signOut();
        setCurrentUser(null);
        setAccessDeniedError('No tienes acceso. Pide acceso a un admin.');
        return;
      }

      const miembro = data as Miembro;
      if (!miembro.activo) {
        await supabase.auth.signOut();
        setCurrentUser(null);
        setAccessDeniedError('No tienes acceso. Pide acceso a un admin.');
        return;
      }

      setAccessDeniedError(null);
      setCurrentUser(miembro);
    } catch {
      await supabase?.auth.signOut();
      setCurrentUser(null);
      setAccessDeniedError('No tienes acceso. Pide acceso a un admin.');
    }
  }

  const loginWithGoogle = async () => {
    setIsLoading(true);
    setAccessDeniedError(null);

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });

      if (error) {
        setAccessDeniedError(parseSupabaseError(error));
        setIsLoading(false);
      }
    } else if (isModoDemo) {
      setTimeout(() => {
        setCurrentUser(INITIAL_MIEMBROS[0]);
        setIsLoading(false);
      }, 200);
    } else {
      setAccessDeniedError('Supabase no está configurado. Revisa las variables de entorno.');
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setCurrentUser(null);
    setIsLoading(false);
  };

  const switchDemoUser = isModoDemo
    ? (email: string) => {
        const found = INITIAL_MIEMBROS.find((m) => m.email.toLowerCase() === email.toLowerCase());
        if (!found || !found.activo) {
          setCurrentUser(null);
          setAccessDeniedError('No tienes acceso. Pide acceso a un admin.');
        } else {
          setAccessDeniedError(null);
          setCurrentUser(found);
        }
      }
    : undefined;

  const clearAccessDenied = () => {
    setAccessDeniedError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        rol: currentUser?.rol ?? null,
        isAdmin: currentUser?.rol === 'admin',
        isLoggedIn: Boolean(currentUser),
        isLoading,
        accessDeniedError,
        isSupabaseLive: isSupabaseConfigured,
        loginWithGoogle,
        logout,
        switchDemoUser,
        clearAccessDenied,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};
