/**
 * Navegações repetidas atravessando a expiração do staleTime:
 * - Antes de expirar, navegações reaproveitam o cache (sem refetch).
 * - Após expirar (simulado via invalidateQueries — mesmo efeito visível
 *   para o usuário que ficar parado tempo suficiente), a próxima navegação
 *   dispara refetch e atualiza a tela.
 * - Em NENHUM momento o fallback "Carregando…" fica preso no DOM, porque
 *   o cache prévio mantém a tela visível enquanto o refetch acontece em
 *   background.
 *
 * Observação: não usamos fake timers porque eles entram em conflito com
 * o agendamento interno do React/Query/testing-library. A invalidação
 * manual produz exatamente o mesmo sinal interno ("query is stale") que
 * a expiração natural do staleTime — é o mecanismo que a aplicação usa
 * quando precisa forçar refetch após mutações.
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

function Loading() {
  return <div data-testid="loading">Carregando…</div>;
}

describe("Navegações atravessando o staleTime — refetch sem loading preso", () => {
  afterEach(() => {
    cleanup();
  });

  it("refaz fetch após o cache ficar stale e nunca prende o fallback 'Carregando…'", async () => {
    // Sanidade: só faz sentido testar se o app realmente usa staleTime > 0.
    expect(STALE_TIME).toBeGreaterThan(0);

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

    // Observador contínuo: o fallback NÃO pode aparecer em nenhum frame.
    let viuLoading = false;
    const observer = new MutationObserver(() => {
      if (document.querySelector('[data-testid="loading"]')) {
        viuLoading = true;
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // 1ª visita: priming do cache.
    await act(async () => {
      await router.navigate({ to: "/a" });
    });
    await waitFor(() =>
      expect(screen.getByTestId("tela-a").textContent).toBe("Tela A v1"),
    );
    expect(loadA).toHaveBeenCalledTimes(1);

    // Várias navegações DENTRO do staleTime — cache reaproveitado.
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        await router.navigate({ to: "/b" });
      });
      await waitFor(() =>
        expect(screen.getByTestId("tela-b").textContent).toBe("Tela B"),
      );

      await act(async () => {
        await router.navigate({ to: "/a" });
      });
      await waitFor(() =>
        expect(screen.getByTestId("tela-a").textContent).toBe("Tela A v1"),
      );
    }
    expect(loadA).toHaveBeenCalledTimes(1);

    // Simula a passagem do staleTime: marca o cache como stale.
    // É o mesmo estado que a query alcançaria depois de STALE_TIME ms parado.
    await act(async () => {
      await queryClient.invalidateQueries({
        queryKey: ["a"],
        refetchType: "none", // não dispara refetch agora; só marca stale
      });
    });

    // Próxima navegação para /a: como o cache existe, a tela aparece
    // imediatamente com o valor antigo e o refetch roda em background.
    await act(async () => {
      await router.navigate({ to: "/b" });
    });
    await act(async () => {
      await router.navigate({ to: "/a" });
    });

    // O refetch ocorre e a tela atualiza para a nova versão.
    await waitFor(() => {
      expect(loadA).toHaveBeenCalledTimes(2);
    });
    await waitFor(() =>
      expect(screen.getByTestId("tela-a").textContent).toBe("Tela A v2"),
    );

    observer.disconnect();

    // Em nenhum frame o fallback apareceu.
    expect(viuLoading).toBe(false);
    expect(screen.queryByTestId("loading")).toBeNull();

    // Cache foi atualizado — não mantém valor obsoleto.
    expect(queryClient.getQueryData(["a"])).toEqual({ titulo: "Tela A v2" });
  });
});
