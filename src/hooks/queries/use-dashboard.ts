// Hook do Dashboard: agrega autorizações do mês, acréscimos aprovados,
// últimas autorizações e o limite global vigente. staleTime 60s.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const LIMITE_FALLBACK = 130000;
const STALE = 60 * 1000;

export type DashboardData = {
  totalMes: number;
  acrescimos: number;
  limiteAtual: number;
  limiteBase: number;
  saldo: number;
  ultimas: Array<{
    id: string;
    num_aut: string;
    data_autorizacao: string;
    total_autorizado: number;
    status: string;
  }>;
};

export const dashboardKeys = {
  all: ["dashboard"] as const,
};

async function fetchDashboard(): Promise<DashboardData> {
  const now = new Date();
  const ano = now.getFullYear();
  const mes = String(now.getMonth() + 1).padStart(2, "0");
  const inicio = `${ano}-${mes}-01`;
  const fimDate = new Date(ano, now.getMonth() + 1, 0);
  const fim = `${ano}-${mes}-${String(fimDate.getDate()).padStart(2, "0")}`;
  const mesRef = `${ano}-${mes}`;

  const [autoMes, acres, ultimas, limiteRow] = await Promise.all([
    supabase
      .from("autorizacoes")
      .select("total_autorizado, status")
      .gte("data_autorizacao", inicio)
      .lte("data_autorizacao", fim)
      .in("status", ["pendente", "aprovado", "faturado"]),
    supabase
      .from("acrescimos_gastos")
      .select("novo_limite, limite_atual")
      .eq("mes_referencia", mesRef)
      .eq("status", "aprovado"),
    supabase
      .from("autorizacoes")
      .select("id, num_aut, data_autorizacao, total_autorizado, status")
      .order("criado_em", { ascending: false })
      .limit(8),
    supabase
      .from("limites_globais")
      .select("valor, mes_referencia")
      .in("mes_referencia", [mesRef, "default"]),
  ]);

  const limiteRows = (limiteRow.data ?? []) as Array<{
    valor: number | string;
    mes_referencia: string;
  }>;
  const mesEspecifico = limiteRows.find((r) => r.mes_referencia === mesRef);
  const padrao = limiteRows.find((r) => r.mes_referencia === "default");
  const limiteBase = Number(mesEspecifico?.valor ?? padrao?.valor ?? LIMITE_FALLBACK);

  const totalMes = (autoMes.data ?? []).reduce(
    (s, a) => s + Number(a.total_autorizado ?? 0), 0,
  );
  const acrescimos = (acres.data ?? []).reduce(
    (s, a) => s + Math.max(0, Number(a.novo_limite ?? 0) - Number(a.limite_atual ?? 0)),
    0,
  );
  const limiteAtual = limiteBase + acrescimos;
  const saldo = limiteAtual - totalMes;

  return {
    totalMes,
    acrescimos,
    limiteAtual,
    limiteBase,
    saldo,
    ultimas: (ultimas.data ?? []) as DashboardData["ultimas"],
  };
}

export function useDashboard() {
  return useQuery<DashboardData>({
    queryKey: dashboardKeys.all,
    queryFn: fetchDashboard,
    staleTime: STALE,
  });
}
