/**
 * Navegações repetidas atravessando a expiração do staleTime:
 * - Antes do staleTime expirar, navegações reaproveitam o cache (sem refetch).
 * - Após expirar, a próxima navegação dispara refetch e atualiza a tela.
 * - Em NENHUM momento o fallback "Carregando…" fica preso no DOM
 *   (cache prévio mantém a tela visível enquanto o refetch ocorre em background).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

function Loading() {
  return <div data-testid="loading">Carregando…</div>;
}

describe("Navegações atravessando o staleTime — refetch sem loading preso", () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ["Date", "setTimeout", "clearTimeout", "setInterval", "clearInterval"],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("refaz fetch após expirar e nunca prende o fallback 'Carregando…'", async () => {
    let chamada = 0;
    const loadA = vi.fn(async () => {
      chamada += 1;
      return { titulo: `Tela A v${chamada}` };
    });
    const loadB = vi.fn(async () => ({ titulo: "Tela B" }));

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

    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute, aRoute, bRoute]),
      context: { queryClient },
      history: createMemoryHistory({ initialEntries: ["/"] }),
      defaultPreloadStaleTime: 0,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    // Observador contínuo: o fallback NÃO pode ficar preso entre frames.
    let viuLoading = false;
    const observer = new MutationObserver(() => {
      if (document.querySelector('[data-testid="loading"]')) {
        viuLoading = true;
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // 1ª visita: priming do cache de A.
    await act(async () => {
      await router.navigate({ to: "/a" });
    });
    await waitFor(() =>
      expect(screen.getByTestId("tela-a").textContent).toBe("Tela A v1"),
    );
    expect(loadA).toHaveBeenCalledTimes(1);

    // Navegações repetidas DENTRO do staleTime: cache reaproveitado.
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        await router.navigate({ to: "/b" });
      });
      await waitFor(() =>
        expect(screen.getByTestId("tela-b").textContent).toBe("Tela B"),
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(Math.floor(STALE_TIME / 4));
      });

      await act(async () => {
        await router.navigate({ to: "/a" });
      });
      await waitFor(() =>
        expect(screen.getByTestId("tela-a").textContent).toBe("Tela A v1"),
      );
    }

    // Até aqui, loadA rodou exatamente 1x (cache reaproveitado).
    expect(loadA).toHaveBeenCalledTimes(1);

    // Avança o relógio para ALÉM do staleTime — cache fica stale.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(STALE_TIME + 1_000);
    });

    // Próxima navegação para /a dispara refetch em background.
    // Como já havia dado em cache, a tela exibe imediatamente o valor antigo
    // e atualiza para o novo — sem nunca cair no fallback "Carregando…".
    await act(async () => {
      await router.navigate({ to: "/b" });
    });
    await act(async () => {
      await router.navigate({ to: "/a" });
    });

    await waitFor(() => {
      expect(loadA).toHaveBeenCalledTimes(2);
    });
    await waitFor(() =>
      expect(screen.getByTestId("tela-a").textContent).toBe("Tela A v2"),
    );

    observer.disconnect();

    // O fallback nunca apareceu em nenhum frame do ciclo.
    expect(viuLoading).toBe(false);
    // E não está pendurado ao final.
    expect(screen.queryByTestId("loading")).toBeNull();

    // Cache atualizado — não mantém o valor obsoleto.
    expect(queryClient.getQueryData(["a"])).toEqual({ titulo: "Tela A v2" });
  });
});
