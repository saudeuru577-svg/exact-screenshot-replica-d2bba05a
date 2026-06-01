/**
 * Valida o contrato do QueryClient da aplicação:
 * - cache reaproveitado entre navegações (ensureQueryData não dispara novo fetch dentro do staleTime)
 * - refetchOnWindowFocus/Reconnect desligados
 * - retry desabilitado para erros estruturais Postgres/PostgREST (5 chars maiúsculos/dígitos)
 */
import { describe, it, expect, vi } from "vitest";
import { createAppQueryClient } from "./router";

describe("QueryClient — cache & retry", () => {
  it("ensureQueryData reaproveita o cache entre chamadas (sem refetch)", async () => {
    const qc = createAppQueryClient();
    const fn = vi.fn().mockResolvedValue({ id: 1 });

    const opts = { queryKey: ["pacientes", "lista"] as const, queryFn: fn };

    // Simula múltiplas "navegações" entrando em rotas que primam o mesmo cache
    await qc.ensureQueryData(opts);
    await qc.ensureQueryData(opts);
    await qc.ensureQueryData(opts);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(qc.getQueryData(["pacientes", "lista"])).toEqual({ id: 1 });
  });

  it("não refaz fetch ao reganhar foco da janela / reconectar", () => {
    const qc = createAppQueryClient();
    const defs = qc.getDefaultOptions().queries!;
    expect(defs.refetchOnWindowFocus).toBe(false);
    expect(defs.refetchOnReconnect).toBe(false);
    expect(defs.staleTime).toBeGreaterThan(0);
  });

  it("retry: não insiste em erros Postgres/PostgREST (code 5 chars)", () => {
    const qc = createAppQueryClient();
    const retry = qc.getDefaultOptions().queries!.retry as (
      n: number,
      e: unknown,
    ) => boolean;

    // Erro estrutural — não deve repetir
    expect(retry(0, { code: "54001", message: "stack depth" })).toBe(false);
    expect(retry(0, { code: "42P01" })).toBe(false);

    // Erro transitório — permite 1 retry
    expect(retry(0, new Error("network"))).toBe(true);
    expect(retry(1, new Error("network"))).toBe(false);
  });
});
