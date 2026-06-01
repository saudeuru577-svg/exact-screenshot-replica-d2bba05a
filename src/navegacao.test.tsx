/**
 * Teste de integração de navegação:
 * - Monta um router em memória com hub de módulos -> hub de submódulos -> tela final
 * - Cada tela usa useSuspenseQuery (mesmo padrão do app)
 * - Alterna módulo <-> submódulo várias vezes e valida:
 *    1. Nenhuma tela fica em "carregando" infinito (texto de loading some)
 *    2. Cache do QueryClient é reaproveitado (cada queryFn roda no máximo 1x)
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
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

const loadSaude = vi.fn(async () => ({ titulo: "Hub Saúde" }));
const loadRegulacao = vi.fn(async () => ({ titulo: "Regulação" }));
const loadFazenda = vi.fn(async () => ({ titulo: "Hub Fazenda" }));

function Loading({ id }: { id: string }) {
  return <div data-testid={`loading-${id}`}>Carregando…</div>;
}

function makeRouter() {
  const queryClient = createAppQueryClient();

  const rootRoute = createRootRouteWithContext<{ queryClient: typeof queryClient }>()({
    component: () => (
      <>
        <nav>
          <Link to="/saude">ir-saude</Link>
          <Link to="/saude/regulacao">ir-regulacao</Link>
          <Link to="/fazenda">ir-fazenda</Link>
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

  const saudeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/saude",
    loader: ({ context }) =>
      context.queryClient.ensureQueryData({
        queryKey: ["saude"],
        queryFn: loadSaude,
      }),
    component: function SaudeHub() {
      const { data } = useSuspenseQuery({ queryKey: ["saude"], queryFn: loadSaude });
      return (
        <div>
          <h1 data-testid="tela-saude">{data.titulo}</h1>
          <Outlet />
        </div>
      );
    },
  });

  const regulacaoRoute = createRoute({
    getParentRoute: () => saudeRoute,
    path: "regulacao",
    loader: ({ context }) =>
      context.queryClient.ensureQueryData({
        queryKey: ["regulacao"],
        queryFn: loadRegulacao,
      }),
    component: function Regulacao() {
      const { data } = useSuspenseQuery({
        queryKey: ["regulacao"],
        queryFn: loadRegulacao,
      });
      return <h2 data-testid="tela-regulacao">{data.titulo}</h2>;
    },
  });

  const fazendaRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/fazenda",
    loader: ({ context }) =>
      context.queryClient.ensureQueryData({
        queryKey: ["fazenda"],
        queryFn: loadFazenda,
      }),
    component: function FazendaHub() {
      const { data } = useSuspenseQuery({ queryKey: ["fazenda"], queryFn: loadFazenda });
      return <h1 data-testid="tela-fazenda">{data.titulo}</h1>;
    },
  });

  const routeTree = rootRoute.addChildren([
    indexRoute,
    saudeRoute.addChildren([regulacaoRoute]),
    fazendaRoute,
  ]);

  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: ["/"] }),
    defaultPreloadStaleTime: 0,
  });

  return { router, queryClient };
}

describe("Navegação entre módulos e submódulos", () => {
  it("alterna módulo/submódulo várias vezes sem loop infinito e reaproveita o cache", async () => {
    loadSaude.mockClear();
    loadRegulacao.mockClear();
    loadFazenda.mockClear();

    const { router, queryClient } = makeRouter();

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    // Saúde
    await act(async () => {
      await router.navigate({ to: "/saude" });
    });
    await waitFor(() =>
      expect(screen.getByTestId("tela-saude")).toHaveTextContent("Hub Saúde"),
    );
    expect(screen.queryByTestId("loading-root")).toBeNull();

    // Submódulo Regulação
    await act(async () => {
      await router.navigate({ to: "/saude/regulacao" });
    });
    await waitFor(() =>
      expect(screen.getByTestId("tela-regulacao")).toHaveTextContent("Regulação"),
    );

    // Outro módulo: Fazenda
    await act(async () => {
      await router.navigate({ to: "/fazenda" });
    });
    await waitFor(() =>
      expect(screen.getByTestId("tela-fazenda")).toHaveTextContent("Hub Fazenda"),
    );

    // Volta para Saúde -> Regulação -> Fazenda novamente
    await act(async () => {
      await router.navigate({ to: "/saude" });
    });
    await waitFor(() => expect(screen.getByTestId("tela-saude")).toBeInTheDocument());

    await act(async () => {
      await router.navigate({ to: "/saude/regulacao" });
    });
    await waitFor(() =>
      expect(screen.getByTestId("tela-regulacao")).toBeInTheDocument(),
    );

    await act(async () => {
      await router.navigate({ to: "/fazenda" });
    });
    await waitFor(() => expect(screen.getByTestId("tela-fazenda")).toBeInTheDocument());

    // Nenhum fallback de loading deve estar pendurado
    expect(screen.queryByTestId("loading-root")).toBeNull();

    // Cache reaproveitado: cada loader rodou apenas 1x apesar das múltiplas visitas
    expect(loadSaude).toHaveBeenCalledTimes(1);
    expect(loadRegulacao).toHaveBeenCalledTimes(1);
    expect(loadFazenda).toHaveBeenCalledTimes(1);
  });
});
