/**
 * Navegações repetidas atravessando o staleTime VÁRIAS vezes:
 * - A cada ciclo, o cache é invalidado (equivalente a aguardar staleTime).
 * - A navegação seguinte para /a deve sempre exibir o valor MAIS RECENTE
 *   produzido pela fonte (vN). Em NENHUM momento o DOM pode mostrar um
 *   valor obsoleto (v anterior) após o refetch ter resolvido.
 * - O fallback "Carregando…" nunca deve ficar preso.
 *
 * Estratégia para detectar "valor obsoleto exibido":
 * - Um MutationObserver registra todo texto que passa por [data-testid="tela-a"].
 * - Ao final, validamos que cada versão vN observada NÃO reaparece depois
 *   que uma versão posterior vN+1 já apareceu (sem "voltar no tempo").
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

describe("Navegações após múltiplas expirações de staleTime — sempre o valor mais novo", () => {
  afterEach(() => {
    cleanup();
  });

  it("após cada expiração, /a exibe o valor mais recente e nunca regride para um obsoleto", async () => {
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

    // Histórico de TODOS os textos vistos em [data-testid="tela-a"].
    const textosVistos: string[] = [];
    let viuLoading = false;

    const capturar = () => {
      const el = document.querySelector('[data-testid="tela-a"]');
      if (el && el.textContent) {
        const t = el.textContent;
        if (textosVistos[textosVistos.length - 1] !== t) {
          textosVistos.push(t);
        }
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

    // 1ª visita: priming → v1.
    await act(async () => {
      await router.navigate({ to: "/a" });
    });
    await waitFor(() =>
      expect(screen.getByTestId("tela-a").textContent).toBe("Tela A v1"),
    );

    const CICLOS = 4;
    for (let i = 0; i < CICLOS; i++) {
      // Sai de /a.
      await act(async () => {
        await router.navigate({ to: "/b" });
      });
      await waitFor(() =>
        expect(screen.getByTestId("tela-b").textContent).toBe("Tela B"),
      );

      // Simula a expiração natural do staleTime: marca como stale, sem refetch imediato.
      await act(async () => {
        await queryClient.invalidateQueries({
          queryKey: ["a"],
          refetchType: "none",
        });
      });

      const proximaVersao = `Tela A v${i + 2}`;

      // Navega para /a: o cache está stale → refetch em background, mas
      // o usuário NÃO deve ver um valor obsoleto persistir no final.
      await act(async () => {
        await router.navigate({ to: "/a" });
      });

      // Eventualmente a tela mostra a NOVA versão.
      await waitFor(() =>
        expect(screen.getByTestId("tela-a").textContent).toBe(proximaVersao),
      );

      // Captura final do ciclo.
      capturar();

      // Estado terminal do ciclo: nunca há loading preso.
      expect(screen.queryByTestId("loading")).toBeNull();
    }

    observer.disconnect();
    capturar();

    // Nenhum fallback em momento algum (cache prévio mantém a tela visível).
    expect(viuLoading).toBe(false);

    // loadA foi chamado uma vez para cada versão (1 priming + CICLOS refetches).
    expect(loadA).toHaveBeenCalledTimes(CICLOS + 1);

    // Cache final reflete a última versão produzida — não obsoleto.
    expect(queryClient.getQueryData(["a"])).toEqual({
      titulo: `Tela A v${CICLOS + 1}`,
    });

    // Garante que a sequência de textos exibidos é MONOTÔNICA crescente:
    // uma vez que vN apareceu, vK com K<N nunca pode reaparecer.
    const numeros = textosVistos
      .filter((t) => /^Tela A v\d+$/.test(t))
      .map((t) => Number(t.replace("Tela A v", "")));

    expect(numeros.length).toBeGreaterThanOrEqual(CICLOS + 1);
    for (let i = 1; i < numeros.length; i++) {
      // Nunca regride: cada novo render é >= ao anterior.
      expect(numeros[i]).toBeGreaterThanOrEqual(numeros[i - 1]);
    }
    // E a última versão observada bate com a versão mais recente da fonte.
    expect(numeros[numeros.length - 1]).toBe(CICLOS + 1);
  });
});
