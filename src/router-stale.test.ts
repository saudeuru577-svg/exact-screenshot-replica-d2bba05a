/**
 * Valida o comportamento de staleTime do QueryClient da aplicação:
 * - Dentro do staleTime, navegações reaproveitam o cache (sem refetch).
 * - Após a expiração do staleTime, a próxima navegação dispara refetch
 *   e os dados em cache são atualizados (sem manter conteúdo obsoleto).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createAppQueryClient, QUERY_CLIENT_OPTIONS } from "./router";

const STALE_TIME = QUERY_CLIENT_OPTIONS.defaultOptions.queries.staleTime;

describe("QueryClient — expiração do staleTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("refaz fetch e atualiza os dados após o staleTime expirar", async () => {
    const qc = createAppQueryClient();

    let chamada = 0;
    const fn = vi.fn(async () => {
      chamada += 1;
      return { versao: chamada };
    });

    const opts = { queryKey: ["relatorio", "mensal"] as const, queryFn: fn };

    // 1ª "navegação": popula o cache.
    await qc.ensureQueryData(opts);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(qc.getQueryData(opts.queryKey)).toEqual({ versao: 1 });

    // 2ª "navegação" dentro do staleTime: NÃO deve refazer fetch.
    await vi.advanceTimersByTimeAsync(STALE_TIME - 1);
    await qc.ensureQueryData(opts);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(qc.getQueryData(opts.queryKey)).toEqual({ versao: 1 });

    // Avança o relógio para além do staleTime.
    await vi.advanceTimersByTimeAsync(2);

    // 3ª "navegação" após expiração: deve refazer fetch e ATUALIZAR os dados.
    await qc.ensureQueryData(opts);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(qc.getQueryData(opts.queryKey)).toEqual({ versao: 2 });

    // Garantia anti-stale: o cache NÃO mantém o valor antigo após o refetch.
    expect(qc.getQueryData(opts.queryKey)).not.toEqual({ versao: 1 });
  });
});
