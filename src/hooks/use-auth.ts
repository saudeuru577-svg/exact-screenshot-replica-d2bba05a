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
  init: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshUsuario: () => Promise<void>;
};

let unsub: (() => void) | null = null;
let lastLoadedUserId: string | null = null;

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  usuario: null,
  loading: true,
  initialized: false,

  init: async () => {
    if (get().initialized) return;
    set({ initialized: true });

    try {
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

      const { data } = await supabase.auth.getSession();
      set({ session: data.session, user: data.session?.user ?? null });
      if (data.session?.user) {
        await get().refreshUsuario();
      }
    } catch (e) {
      console.error("[auth] init falhou", e);
    } finally {
      // Garante que o gate nunca fique preso em "Carregando…".
      set({ loading: false });
    }
  },


  refreshUsuario: async () => {
    const u = get().user;
    if (!u) {
      lastLoadedUserId = null;
      return set({ usuario: null });
    }
    const { data } = await supabase
      .from("usuarios")
      .select("id, nome, email, perfil, ativo")
      .eq("id", u.id)
      .maybeSingle();
    lastLoadedUserId = u.id;
    set({ usuario: data as Usuario | null });
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
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
