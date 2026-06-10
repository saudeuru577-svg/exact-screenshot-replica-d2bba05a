import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Evita refetch ao reganhar foco — sensação de "recarregando" ao trocar de aba.
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        // Não insistir em erros estruturais (Postgres/PostgREST: code 5 chars).
        retry: (failureCount, error: unknown) => {
          const code = (error as { code?: string } | null)?.code;
          if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) return false;
          return failureCount < 1;
        },
      },
    },
  });



  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
