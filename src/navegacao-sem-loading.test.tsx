/**
 * Múltiplas navegações em sequência DENTRO do staleTime:
 * - Após o primeiro priming do cache, nenhuma navegação subsequente
 *   deve exibir o fallback "Carregando…".
 * - Nenhum estado de carregamento fica preso ao final do ciclo.
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
} from "@tanstack/react-router";
import { Suspense } from "react";
import { createAppQueryClient, QUERY_CLIENT_OPTIONS } from "./router";

const STALE_TIME = QUERY_CLIENT_OPTIONS.defaultOptions.queries.staleTime;

const loadX = vi.fn(async () => ({ titulo: "Tela X" }));
const loadY = vi.fn(async () => ({ titulo: "Tela Y" }));
const loadZ = vi.fn(async () => ({ titulo: "Tela Z" }));

function Loading() {
  return <div data-testid="loading">Carregando…</div>;
}

function makeRouter() {
  const queryClient = createAppQueryClient();

  const rootRoute = createRootRouteWithContext<{ queryClient: typeof queryClient }>()({
    component: () => (
      <Suspense fallback={<Loading />}>
        <Outlet />
      </Suspense>
    ),
  });

  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => <div data-testid="inicio">inicio</div>,
  });

  const mk = (path: string, key: string, fn: typeof loadX, testid: string) =>
    createRoute({
      getParentRoute: () => rootRoute,
      path,
      loader: ({ context }) =>
        context.queryClient.ensureQueryData({ queryKey: [key], queryFn: fn }),
      component: function Tela() {
        const { data } = useSuspenseQuery({ queryKey: [key], queryFn: fn });
        return <h1 data-testid={testid}>{data.titulo}</h1>;
      },
    });

  const xRoute = mk("/x", "x", loadX, "tela-x");
  const yRoute = mk("/y", "y", loadY, "tela-y");
  const zRoute = mk("/z", "z", loadZ, "tela-z");

  const routeTree = rootRoute.addChildren([indexRoute, xRoute, yRoute, zRoute]);

  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: ["/"] }),
    defaultPreloadStaleTime: 0,
  });

  return { router, queryClient };
}

describe("Sequência de navegações dentro do staleTime — sem fallback de loading", () => {
  afterEach(() => {
    cleanup();
    loadX.mockClear();
    loadY.mockClear();
    loadZ.mockClear();
  });

  it("após priming, nenhuma navegação subsequente exibe 'Carregando…'", async () => {
    expect(STALE_TIME).toBeGreaterThan(0);

    const { router, queryClient } = makeRouter();

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    // Priming: visita cada rota uma vez para popular o cache.
    for (const [to, testid, titulo] of [
      ["/x", "tela-x", "Tela X"],
      ["/y", "tela-y", "Tela Y"],
      ["/z", "tela-z", "Tela Z"],
    ] as const) {
      await act(async () => {
        await router.navigate({ to });
      });
      await waitFor(() =>
        expect(screen.getByTestId(testid).textContent).toBe(titulo),
      );
    }

    // A partir daqui, observa o DOM continuamente: o fallback "Carregando…"
    // NÃO pode aparecer em nenhum frame durante navegações dentro do staleTime.
    let viuLoading = false;
    const observer = new MutationObserver(() => {
      if (document.querySelector('[data-testid="loading"]')) {
        viuLoading = true;
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const sequencia = [
      ["/x", "tela-x", "Tela X"],
      ["/y", "tela-y", "Tela Y"],
      ["/z", "tela-z", "Tela Z"],
      ["/x", "tela-x", "Tela X"],
      ["/z", "tela-z", "Tela Z"],
      ["/y", "tela-y", "Tela Y"],
      ["/x", "tela-x", "Tela X"],
      ["/y", "tela-y", "Tela Y"],
    ] as const;

    for (const [to, testid, titulo] of sequencia) {
      await act(async () => {
        await router.navigate({ to });
      });
      // Tela alvo aparece sem passar por fallback.
      await waitFor(() =>
        expect(screen.getByTestId(testid).textContent).toBe(titulo),
      );
      // E o fallback não está preso no DOM neste ponto.
      expect(screen.queryByTestId("loading")).toBeNull();
    }

    observer.disconnect();

    // Nenhum frame do ciclo exibiu o fallback.
    expect(viuLoading).toBe(false);

    // Cache reaproveitado: cada loader rodou exatamente 1x.
    expect(loadX).toHaveBeenCalledTimes(1);
    expect(loadY).toHaveBeenCalledTimes(1);
    expect(loadZ).toHaveBeenCalledTimes(1);

    // Nada preso ao final.
    expect(screen.queryByTestId("loading")).toBeNull();
  });
});
