import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type PerfilUsuario =
  | "administrador"
  | "secretaria"
  | "atendente"
  | "financeiro"
  | "regulador"
  | "profissional_ubs"
  | "agente_saude"
  | "enfermeiro_ubs"
  | "farmaceutico"
  | "agendador"
  | "vigilancia_sanitaria"
  | "gestor_saude";

export type Usuario = {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  ativo: boolean;
};

type AuthState = {
  user: User | null;
  session: Session | null;
  usuario: Usuario | null;
  loading: boolean;
  initialized: boolean;
  initError: string | null;
  init: () => Promise<void>;
  retry: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshUsuario: () => Promise<void>;
};

let unsub: (() => void) | null = null;
let lastLoadedUserId: string | null = null;
let initPromise: Promise<void> | null = null;

async function withTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} demorou demais`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  usuario: null,
  loading: true,
  initialized: false,

  init: async () => {
    if (initPromise) return initPromise;
    if (get().initialized && !get().loading) return;

    initPromise = (async () => {
    set({ initialized: true, loading: true });

    try {
      if (unsub) {
        unsub();
        unsub = null;
      }
      // Listener: só recarrega o usuário quando o id mudar de fato.
      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        const nextUser = session?.user ?? null;
        set({ session, user: nextUser });
        if (!nextUser) {
          lastLoadedUserId = null;
          set({ usuario: null });
          return;
        }
        if (nextUser.id !== lastLoadedUserId) {
          setTimeout(() => {
            get().refreshUsuario().catch((e) => console.error("[auth] refreshUsuario", e));
          }, 0);
        }
      });
      unsub = () => sub.subscription.unsubscribe();

      const { data } = await withTimeout(supabase.auth.getSession(), 8_000, "getSession");
      set({ session: data.session, user: data.session?.user ?? null });
      if (data.session?.user) {
        await get().refreshUsuario();
      }
    } catch (e) {
      console.error("[auth] init falhou", e);
    } finally {
      // Garante que o gate nunca fique preso em "Carregando…".
      set({ loading: false });
      initPromise = null;
    }
    })();

    return initPromise;
  },


  refreshUsuario: async () => {
    const u = get().user;
    if (!u) {
      lastLoadedUserId = null;
      return set({ usuario: null });
    }
    try {
      const { data, error } = await withTimeout(
        supabase
          .from("usuarios")
          .select("id, nome, email, perfil, ativo")
          .eq("id", u.id)
          .maybeSingle(),
        8_000,
        "refreshUsuario",
      );
      if (error) throw error;
      lastLoadedUserId = u.id;
      set({ usuario: data as Usuario | null });
    } catch (e) {
      console.error("[auth] refreshUsuario falhou", e);
      lastLoadedUserId = u.id;
      set({ usuario: null });
    }
  },

  signIn: async (email, password) => {
    try {
      const { error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        12_000,
        "signIn",
      );
      if (error) return { error: error.message };
      return { error: null };
    } catch (e) {
      console.error("[auth] signIn falhou", e);
      return { error: "Falha ao entrar. Tente novamente." };
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, usuario: null });
    if (unsub) {
      unsub();
      unsub = null;
    }
    set({ initialized: false });
  },
}));
