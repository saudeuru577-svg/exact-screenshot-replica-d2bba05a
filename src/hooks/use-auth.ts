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
let inflightRefresh: Promise<void> | null = null;
let inflightUserId: string | null = null;

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
          // fire-and-forget; refreshUsuario é dedupado por id
          setTimeout(() => { void get().refreshUsuario(); }, 0);
        }
      });
      unsub = () => sub.subscription.unsubscribe();

      const { data } = await supabase.auth.getSession();
      set({ session: data.session, user: data.session?.user ?? null });
      if (data.session?.user) {
        await get().refreshUsuario();
      }
    } catch (err) {
      console.error("[auth] init falhou", err);
    } finally {
      set({ loading: false });
    }
  },

  refreshUsuario: async () => {
    const u = get().user;
    if (!u) {
      lastLoadedUserId = null;
      return set({ usuario: null });
    }
    // Dedupe: se já existe uma busca em andamento para o mesmo user, reusa.
    if (inflightRefresh && inflightUserId === u.id) {
      return inflightRefresh;
    }
    inflightUserId = u.id;
    inflightRefresh = (async () => {
      try {
        const { data, error } = await supabase
          .from("usuarios")
          .select("id, nome, email, perfil, ativo")
          .eq("id", u.id)
          .maybeSingle();
        if (error) {
          console.error("[auth] refreshUsuario erro", error);
          // não limpa usuario para não derrubar sessão por erro transitório
          return;
        }
        lastLoadedUserId = u.id;
        set({ usuario: (data as Usuario | null) ?? null });
      } finally {
        inflightRefresh = null;
        inflightUserId = null;
      }
    })();
    return inflightRefresh;
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    lastLoadedUserId = null;
    inflightRefresh = null;
    inflightUserId = null;
    set({ user: null, session: null, usuario: null });
    if (unsub) {
      unsub();
      unsub = null;
    }
    set({ initialized: false });
  },
}));
