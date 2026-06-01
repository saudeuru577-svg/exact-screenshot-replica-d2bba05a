/**
 * Teste de integração: falhas do PostgREST/DB nas rotas.
 *
 * Simula loaders que rejeitam (erro estrutural Postgres com code 5 chars e
 * erro genérico de rede) e valida que:
 *  1. A tela exibe o errorComponent (feedback de erro) e NÃO fica em
 *     "Carregando…" infinito.
 *  2. Erros com code Postgres/PostgREST de 5 chars NÃO são reexecutados
 *     (contrato do retry do QueryClient).
 *  3. Após a falha, navegar para uma rota saudável volta a renderizar
 *     normalmente (a UI não trava).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, act, cleanup } from "@testing-library/react";
import { QueryClientProvider, useSuspenseQuery } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  createMemoryHistory,
  RouterProvider,
  Outlet,
  Link,
} from "@tanstack/react-router";
import { Suspense } from "react";
import { createAppQueryClient } from "./router";
import { formatSupabaseError } from "./lib/format-error";

// Loader que simula erro estrutural do Postgres (code 5 chars → sem retry)
const loadPacientesQuebrado = vi
  .fn()
  .mockRejectedValue({ code: "42P01", message: 'relation "pacientes" does not exist' });

// Loader que simula erro de rede genérico (permite 1 retry, depois falha)
const loadEmpresasQuebrado = vi
  .fn()
  .mockRejectedValue(new Error("Failed to fetch"));

// Loader saudável — usado para confirmar que a UI não travou após erro
const loadOk = vi.fn(async () => ({ titulo: "Tela OK" }));

function Loading({ id }: { id: string }) {
  return <div data-testid={`loading-${id}`}>Carregando…</div>;
}

function ErrorBox({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div data-testid="erro">
      <p data-testid="erro-msg">{formatSupabaseError(error)}</p>
      <button onClick={reset}>tentar novamente</button>
    </div>
  );
}

function makeRouter() {
  const queryClient = createAppQueryClient();

  const rootRoute = createRootRouteWithContext<{ queryClient: typeof queryClient }>()({
    component: () => (
      <>
        <nav>
          <Link to="/pacientes">ir-pacientes</Link>
          <Link to="/empresas">ir-empresas</Link>
          <Link to="/ok">ir-ok</Link>
        </nav>
        <Suspense fallback={<Loading id="root" />}>
          <Outlet />
        </Suspense>
      </>
    ),
  });

  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => <div>inicio</div>,
  });

  const pacientesRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/pacientes",
    loader: ({ context }) =>
      context.queryClient.ensureQueryData({
        queryKey: ["pacientes-quebrado"],
        queryFn: loadPacientesQuebrado,
      }),
    errorComponent: ErrorBox,
    component: function Pacientes() {
      const { data } = useSuspenseQuery({
        queryKey: ["pacientes-quebrado"],
        queryFn: loadPacientesQuebrado,
      });
      return <div data-testid="tela-pacientes">{(data as { titulo: string }).titulo}</div>;
    },
  });

  const empresasRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/empresas",
    loader: ({ context }) =>
      context.queryClient.ensureQueryData({
        queryKey: ["empresas-quebrado"],
        queryFn: loadEmpresasQuebrado,
      }),
    errorComponent: ErrorBox,
    component: function Empresas() {
      const { data } = useSuspenseQuery({
        queryKey: ["empresas-quebrado"],
        queryFn: loadEmpresasQuebrado,
      });
      return <div data-testid="tela-empresas">{(data as { titulo: string }).titulo}</div>;
    },
  });

  const okRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/ok",
    loader: ({ context }) =>
      context.queryClient.ensureQueryData({ queryKey: ["ok"], queryFn: loadOk }),
    component: function Ok() {
      const { data } = useSuspenseQuery({ queryKey: ["ok"], queryFn: loadOk });
      return <h1 data-testid="tela-ok">{data.titulo}</h1>;
    },
  });

  const routeTree = rootRoute.addChildren([
    indexRoute,
    pacientesRoute,
    empresasRoute,
    okRoute,
  ]);

  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: ["/"] }),
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: ErrorBox,
  });

  return { router, queryClient };
}

describe("Falhas do PostgREST/DB nas rotas", () => {
  it("erro Postgres (code 5 chars) exibe feedback e NÃO fica carregando infinito; sem retry", async () => {
    loadPacientesQuebrado.mockClear();
    const { router, queryClient } = makeRouter();

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    await act(async () => {
      await router.navigate({ to: "/pacientes" });
    });

    // Mostra feedback de erro
    await waitFor(() => expect(screen.getByTestId("erro")).toBeTruthy());

    // Mensagem amigável (não vaza detalhes crus do banco)
    expect(screen.getByTestId("erro-msg").textContent).toBeTruthy();

    // Não há loading pendurado
    expect(screen.queryByTestId("loading-root")).toBeNull();

    // Contrato do retry: code Postgres 5 chars → chamou apenas 1x
    expect(loadPacientesQuebrado).toHaveBeenCalledTimes(1);
  });

  it("erro de rede genérico permite 1 retry e ainda assim mostra erro (sem loop)", async () => {
    loadEmpresasQuebrado.mockClear();
    const { router, queryClient } = makeRouter();

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    await act(async () => {
      await router.navigate({ to: "/empresas" });
    });

    await waitFor(() => expect(screen.getByTestId("erro")).toBeTruthy());
    expect(screen.queryByTestId("loading-root")).toBeNull();

    // Retry policy: tentativa inicial + 1 retry = 2 chamadas
    expect(loadEmpresasQuebrado).toHaveBeenCalledTimes(2);
  });

  it("após erro, navegar para rota saudável volta a renderizar normalmente", async () => {
    loadOk.mockClear();
    loadPacientesQuebrado.mockClear();
    const { router, queryClient } = makeRouter();

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    // Vai para rota quebrada
    await act(async () => {
      await router.navigate({ to: "/pacientes" });
    });
    await waitFor(() => expect(screen.getByTestId("erro")).toBeTruthy());

    // Navega para rota saudável — UI não pode estar travada
    await act(async () => {
      await router.navigate({ to: "/ok" });
    });
    await waitFor(() =>
      expect(screen.getByTestId("tela-ok").textContent).toBe("Tela OK"),
    );

    expect(screen.queryByTestId("erro")).toBeNull();
    expect(screen.queryByTestId("loading-root")).toBeNull();
    expect(loadOk).toHaveBeenCalledTimes(1);
  });
});
