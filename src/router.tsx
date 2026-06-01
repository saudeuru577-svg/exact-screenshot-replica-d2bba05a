import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// Configuração central do QueryClient — exportada para ser exercitada em testes.
export const QUERY_CLIENT_OPTIONS = {
  defaultOptions: {
    queries: {
      // Evita refetch ao reganhar foco — sensação de "recarregando" ao trocar de aba.
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      // Cache reaproveitado entre navegações por 30s; sem refetch automático nesse intervalo.
      staleTime: 30_000,
      // Não insistir em erros estruturais (Postgres/PostgREST: code 5 chars).
      retry: (failureCount: number, error: unknown) => {
        const code = (error as { code?: string } | null)?.code;
        if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) return false;
        return failureCount < 1;
      },
    },
  },
} as const;

export const createAppQueryClient = () => new QueryClient(QUERY_CLIENT_OPTIONS);

export const getRouter = () => {
  const queryClient = createAppQueryClient();



  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
