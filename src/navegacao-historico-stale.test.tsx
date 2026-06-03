/**
 * Navegações repetidas usando VOLTAR/AVANÇAR do histórico após o staleTime expirar:
 * - O usuário entra em /a, depois /b, e usa history.back() / history.forward()
 *   para alternar entre as telas.
 * - Entre cada ciclo invalidamos o cache de "a" (equivalente ao staleTime expirar).
 * - A tela /a deve SEMPRE exibir, ao final, o valor mais novo produzido pela fonte.
 * - Em nenhum frame o DOM pode regredir para uma versão obsoleta nem prender
 *   o fallback "Carregando…".
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

describe("Voltar/avançar após staleTime — nunca exibe valor obsoleto", () => {
  afterEach(() => {
    cleanup();
  });

  it("history.back()/forward() sempre mostram a versão mais nova de /a após invalidação", async () => {
    expect(STALE_TIME).toBeGreaterThan(0);

    let versao = 0;
    const loadA = vi.fn(async () => {
      versao += 1;
      return { titulo: `Tela A v${versao}` };
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

    const textosA: string[] = [];
    let viuLoading = false;

    const capturar = () => {
      const el = document.querySelector('[data-testid="tela-a"]');
      if (el && el.textContent) {
        const t = el.textContent;
        if (textosA[textosA.length - 1] !== t) textosA.push(t);
      }
      if (document.querySelector('[data-testid="loading"]')) {
        viuLoading = true;
      }
    };

    const observer = new MutationObserver(capturar);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // Empilha histórico: / → /a (v1) → /b.
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
      expect(screen.getByTestId("tela-b").textContent).toBe("Tela B"),
    );

    const CICLOS = 4;
    for (let i = 0; i < CICLOS; i++) {
      // Invalida /a — equivalente ao staleTime expirar.
      await act(async () => {
        await queryClient.invalidateQueries({
          queryKey: ["a"],
          refetchType: "none",
        });
      });

      const proximaVersao = `Tela A v${i + 2}`;

      // VOLTA no histórico: /b → /a. Cache stale → refetch em background.
      await act(async () => {
        router.history.back();
      });
      await waitFor(() =>
        expect(screen.getByTestId("tela-a").textContent).toBe(proximaVersao),
      );
      capturar();
      expect(screen.queryByTestId("loading")).toBeNull();

      // AVANÇA de volta para /b para preparar o próximo ciclo.
      await act(async () => {
        router.history.forward();
      });
      await waitFor(() =>
        expect(screen.getByTestId("tela-b").textContent).toBe("Tela B"),
      );
    }

    observer.disconnect();
    capturar();

    // Sem fallback preso em nenhum frame.
    expect(viuLoading).toBe(false);

    // 1 priming + um refetch por ciclo.
    expect(loadA).toHaveBeenCalledTimes(CICLOS + 1);

    // Cache reflete a versão mais recente — sem obsoleto.
    expect(queryClient.getQueryData(["a"])).toEqual({
      titulo: `Tela A v${CICLOS + 1}`,
    });

    // Sequência de textos exibidos em /a é monotônica crescente:
    // nunca regride para uma versão anterior entre transições.
    const numeros = textosA
      .filter((t) => /^Tela A v\d+$/.test(t))
      .map((t) => Number(t.replace("Tela A v", "")));

    expect(numeros.length).toBeGreaterThanOrEqual(CICLOS + 1);
    for (let i = 1; i < numeros.length; i++) {
      expect(numeros[i]).toBeGreaterThanOrEqual(numeros[i - 1]);
    }
    expect(numeros[numeros.length - 1]).toBe(CICLOS + 1);
  });
});
