// Hook de Orçamento (dados voláteis, staleTime 60s).
// Agrega gasto do mês (autorizacoes pendentes/aprovadas/faturadas) e o
// limite vigente de uma empresa (limites_empresa + acréscimos aprovados).
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const STALE = 60 * 1000;

export const orcamentoKeys = {
  all: ["orcamento"] as const,
  gastoMes: (mes: string, empresaId?: string) =>
    [...orcamentoKeys.all, "gasto", mes, empresaId ?? "total"] as const,
  limiteEmpresaMes: (mes: string, empresaId: string) =>
    [...orcamentoKeys.all, "limite-emp", mes, empresaId] as const,
};

function periodoMes(mes: string) {
  const [y, m] = mes.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return { inicio: `${mes}-01`, fim: `${mes}-${String(last).padStart(2, "0")}` };
}

export function useGastoMes(
  mes: string,
  empresaId?: string,
  opts?: { enabled?: boolean },
) {
  return useQuery<number>({
    queryKey: orcamentoKeys.gastoMes(mes, empresaId),
    enabled: opts?.enabled ?? true,
    queryFn: async () => {
      const { inicio, fim } = periodoMes(mes);
      let query = supabase
        .from("autorizacoes")
        .select("total_autorizado")
        .gte("data_autorizacao", inicio)
        .lte("data_autorizacao", fim)
        .in("status", ["pendente", "aprovado", "faturado"]);
      if (empresaId) query = query.eq("empresa_id", empresaId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).reduce((s, a) => s + Number(a.total_autorizado ?? 0), 0);
    },
    staleTime: STALE,
  });
}

export function useLimiteEmpresaMes(
  mes: string,
  empresaId: string,
  opts?: { enabled?: boolean },
) {
  return useQuery<number>({
    queryKey: orcamentoKeys.limiteEmpresaMes(mes, empresaId),
    enabled: (opts?.enabled ?? true) && !!empresaId,
    queryFn: async () => {
      const [base, acres] = await Promise.all([
        supabase
          .from("limites_empresa")
          .select("valor")
          .eq("empresa_id", empresaId)
          .eq("mes_referencia", mes)
          .maybeSingle(),
        supabase
          .from("acrescimos_gastos")
          .select("novo_limite, limite_atual")
          .eq("mes_referencia", mes)
          .eq("status", "aprovado")
          .eq("escopo", "empresa")
          .eq("empresa_id", empresaId),
      ]);
      if (base.error) throw base.error;
      if (acres.error) throw acres.error;
      const acrescimos = (acres.data ?? []).reduce(
        (s, a) => s + Math.max(0, Number(a.novo_limite ?? 0) - Number(a.limite_atual ?? 0)),
        0,
      );
      return Number(base.data?.valor ?? 0) + acrescimos;
    },
    staleTime: STALE,
  });
}
