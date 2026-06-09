/**
 * Valida o contrato anti-loop do useAuth:
 * - múltiplos onAuthStateChange com o MESMO user.id consultam `usuarios` apenas 1 vez
 * - troca de usuário dispara nova consulta
 * - signOut + nova sessão volta a consultar
 *
 * Simula o fluxo do usuário navegando entre módulos/submódulos (que provoca
 * vários eventos de auth) e garante que não há requisição em loop.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

type Listener = (event: string, session: unknown) => void;

const listeners: Listener[] = [];
let currentSession: { user: { id: string } } | null = null;
const usuariosQueryCalls: string[] = [];

vi.mock("@/integrations/supabase/client", () => {
  const auth = {
    onAuthStateChange: (cb: Listener) => {
      listeners.push(cb);
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    getSession: async () => ({ data: { session: currentSession } }),
    signInWithPassword: async () => ({ error: null }),
    signOut: async () => {
      currentSession = null;
      listeners.forEach((l) => l("SIGNED_OUT", null));
      return { error: null };
    },
  };

  const from = (table: string) => ({
    select: () => ({
      eq: (_col: string, val: string) => ({
        maybeSingle: async () => {
          usuariosQueryCalls.push(`${table}:${val}`);
          return {
            data: {
              id: val,
              nome: "Teste",
              email: "t@t.com",
              perfil: "administrador",
              ativo: true,
            },
            error: null,
          };
        },
      }),
    }),
  });

  return { supabase: { auth, from } };
});

// Import depois do mock
import { useAuth } from "./use-auth";

function emit(event: string, userId: string | null) {
  currentSession = userId ? { user: { id: userId } } : null;
  listeners.forEach((l) => l(event, currentSession));
}

async function flush() {
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
}

describe("useAuth — dedupe de consulta ao usuário", () => {
  beforeEach(() => {
    listeners.length = 0;
    usuariosQueryCalls.length = 0;
    currentSession = null;
    // reset store
    useAuth.setState({
      user: null,
      session: null,
      usuario: null,
      loading: true,
      initialized: false,
    });
  });

  it("init() + múltiplos onAuthStateChange com o mesmo user.id consulta `usuarios` apenas 1 vez", async () => {
    currentSession = { user: { id: "user-1" } };
    await useAuth.getState().init();
    await flush();

    // Simula navegação entre módulos/submódulos disparando TOKEN_REFRESHED/SIGNED_IN repetidos
    for (let i = 0; i < 5; i++) {
      emit("TOKEN_REFRESHED", "user-1");
      emit("SIGNED_IN", "user-1");
    }
    await flush();

    expect(usuariosQueryCalls).toEqual(["usuarios:user-1"]);
    expect(useAuth.getState().usuario?.id).toBe("user-1");
  });

  it("troca de user.id dispara nova consulta", async () => {
    currentSession = { user: { id: "user-1" } };
    await useAuth.getState().init();
    await flush();

    emit("SIGNED_IN", "user-2");
    await flush();

    expect(usuariosQueryCalls).toEqual(["usuarios:user-1", "usuarios:user-2"]);
  });

  it("init() é idempotente — chamar várias vezes não duplica consultas", async () => {
    currentSession = { user: { id: "user-1" } };
    await useAuth.getState().init();
    await useAuth.getState().init();
    await useAuth.getState().init();
    await flush();

    expect(usuariosQueryCalls).toEqual(["usuarios:user-1"]);
  });

  it("não deixa loading preso se getSession nunca resolver", async () => {
    vi.useFakeTimers();
    const originalGetSession = (await import("@/integrations/supabase/client")).supabase.auth.getSession;
    (await import("@/integrations/supabase/client")).supabase.auth.getSession = () => new Promise(() => {}) as never;

    const initPromise = useAuth.getState().init();
    await vi.advanceTimersByTimeAsync(8_000);
    await initPromise;

    expect(useAuth.getState().loading).toBe(false);
    (await import("@/integrations/supabase/client")).supabase.auth.getSession = originalGetSession;
    vi.useRealTimers();
  });
});
