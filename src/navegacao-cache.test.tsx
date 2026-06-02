/**
 * Navegações repetidas DENTRO do staleTime:
 * - O loader/queryFn deve ser executado apenas 1x por rota (cache reaproveitado).
 * - A tela exibe o mesmo dado em todas as visitas, sem refetch e sem flicker
 *   de "carregando".
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

const loadA = vi.fn(async () => ({ titulo: "Tela A v1" }));
const loadB = vi.fn(async () => ({ titulo: "Tela B v1" }));

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
    component: () => <div>inicio</div>,
  });

  const aRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/a",
    loader: ({ context }) =>
      context.queryClient.ensureQueryData({ queryKey: ["a"], queryFn: loadA }),
    component: function A() {
      const { data } = useSuspenseQuery({ queryKey: ["a"], queryFn: loadA });
      return <h1 data-testid="tela-a">{data.titulo}</h1>;
    },
  });

  const bRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/b",
    loader: ({ context }) =>
      context.queryClient.ensureQueryData({ queryKey: ["b"], queryFn: loadB }),
    component: function B() {
      const { data } = useSuspenseQuery({ queryKey: ["b"], queryFn: loadB });
      return <h1 data-testid="tela-b">{data.titulo}</h1>;
    },
  });

  const routeTree = rootRoute.addChildren([indexRoute, aRoute, bRoute]);

  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: ["/"] }),
    defaultPreloadStaleTime: 0,
  });

  return { router, queryClient };
}

describe("Navegações repetidas dentro do staleTime", () => {
  afterEach(() => {
    cleanup();
    loadA.mockClear();
    loadB.mockClear();
  });

  it("reaproveita o cache: loader roda 1x por rota e a tela não fica obsoleta", async () => {
    // Sanidade: o staleTime configurado é maior que zero — caso contrário,
    // este teste perde o sentido (cache sempre considerado stale).
    expect(STALE_TIME).toBeGreaterThan(0);

    const { router, queryClient } = makeRouter();

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    // Alterna A <-> B várias vezes dentro do staleTime.
    for (let i = 0; i < 4; i++) {
      await act(async () => {
        await router.navigate({ to: "/a" });
      });
      await waitFor(() =>
        expect(screen.getByTestId("tela-a").textContent).toBe("Tela A v1"),
      );

      await act(async () => {
        await router.navigate({ to: "/b" });
      });
      await waitFor(() =>
        expect(screen.getByTestId("tela-b").textContent).toBe("Tela B v1"),
      );
    }

    // Cada loader roda apenas 1x apesar das múltiplas visitas.
    expect(loadA).toHaveBeenCalledTimes(1);
    expect(loadB).toHaveBeenCalledTimes(1);

    // Nenhum fallback de loading pendurado após o ciclo.
    expect(screen.queryByTestId("loading")).toBeNull();

    // Mesmo que a "fonte" passasse a devolver dados novos, dentro do
    // staleTime o cache NÃO é atualizado — a tela continua estável.
    loadA.mockImplementationOnce(async () => ({ titulo: "Tela A v2" }));

    await act(async () => {
      await router.navigate({ to: "/" });
    });
    await act(async () => {
      await router.navigate({ to: "/a" });
    });
    await waitFor(() =>
      expect(screen.getByTestId("tela-a").textContent).toBe("Tela A v1"),
    );

    // Continua 1x — a nova implementação NÃO foi chamada.
    expect(loadA).toHaveBeenCalledTimes(1);

    // E o cache permanece com o valor original (não obsoleto, pois ainda é fresh).
    expect(queryClient.getQueryData(["a"])).toEqual({ titulo: "Tela A v1" });
  });
});
