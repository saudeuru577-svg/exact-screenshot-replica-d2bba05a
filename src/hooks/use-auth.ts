import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type PerfilUsuario = "administrador" | "secretaria" | "atendente" | "financeiro";

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

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  usuario: null,
  loading: true,
  initialized: false,

  init: async () => {
    if (get().initialized) return;
    set({ initialized: true });

    // Listener primeiro
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null });
      if (session?.user) {
        // Defer to avoid deadlock
        setTimeout(() => get().refreshUsuario(), 0);
      } else {
        set({ usuario: null });
      }
    });
    unsub = () => sub.subscription.unsubscribe();

    const { data } = await supabase.auth.getSession();
    set({ session: data.session, user: data.session?.user ?? null });
    if (data.session?.user) {
      await get().refreshUsuario();
    }
    set({ loading: false });
  },

  refreshUsuario: async () => {
    const u = get().user;
    if (!u) return set({ usuario: null });
    const { data } = await supabase
      .from("usuarios")
      .select("id, nome, email, perfil, ativo")
      .eq("id", u.id)
      .maybeSingle();
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
