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

let lastLoadedUserId: string | null = null;
let inflightRefresh: Promise<void> | null = null;
let inflightUserId: string | null = null;

// Lê a sessão diretamente do localStorage como fallback caso
// supabase.auth.getSession() trave por causa do Web Lock compartilhado.
function readSessionFromStorage(): Session | null {
  try {
    if (typeof window === "undefined") return null;
    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    if (!url) return null;
    const ref = url.match(/https?:\/\/([^.]+)\./)?.[1];
    if (!ref) return null;
    const raw = window.localStorage.getItem(`sb-${ref}-auth-token`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const session: Session | null = parsed?.currentSession ?? parsed ?? null;
    if (!session || !session.access_token) return null;
    // valida expiração (expires_at em segundos epoch)
    if (session.expires_at && session.expires_at * 1000 < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(null), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }).catch(() => { clearTimeout(t); resolve(null); });
  });
}

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
      supabase.auth.onAuthStateChange((_event, session) => {
        const nextUser = session?.user ?? null;
        set({ session, user: nextUser, loading: false });
        if (!nextUser) {
          lastLoadedUserId = null;
          set({ usuario: null });
          return;
        }
        if (nextUser.id !== lastLoadedUserId) {
          setTimeout(() => { void get().refreshUsuario(); }, 0);
        }
      });

      // getSession pode travar (Web Lock compartilhado entre abas/iframes).
      // Usa timeout + fallback ao localStorage para nunca prender a UI.
      const result = await withTimeout(supabase.auth.getSession(), 1500);
      const session = result?.data?.session ?? readSessionFromStorage();
      set({ session: session ?? null, user: session?.user ?? null, loading: false });

      // perfil carrega em paralelo (não bloqueia a tela)
      if (session?.user) {
        void get().refreshUsuario();
      }
    } catch (err) {
      console.error("[auth] init falhou", err);
      set({ loading: false });
    }
  },

  refreshUsuario: async () => {
    const u = get().user;
    if (!u) {
      lastLoadedUserId = null;
      return set({ usuario: null });
    }
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
    // mantém listener ativo e initialized=true; o onAuthStateChange
    // já vai limpar user/session quando o SIGNED_OUT chegar.
    set({ user: null, session: null, usuario: null });
  },
}));
