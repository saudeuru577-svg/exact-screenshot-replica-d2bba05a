// Hook de Acréscimos de limite (acrescimos_gastos): staleTime 60s (volátil).
// Expõe total aprovado do mês (escopo "total"), histórico e mutation de insert.
// A mutation invalida acrescimos, orcamento e dashboard.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { orcamentoKeys } from "./use-orcamento";

export type AcrescimoRow = Database["public"]["Tables"]["acrescimos_gastos"]["Row"];
export type AcrescimoInsert = Database["public"]["Tables"]["acrescimos_gastos"]["Insert"];
export type AcrescimoHistorico = Pick<
  AcrescimoRow,
  "id" | "criado_em" | "novo_limite" | "limite_atual" | "escopo" | "empresa_id" | "justificativa"
>;

const STALE = 60 * 1000;

export const acrescimosKeys = {
  all: ["acrescimos"] as const,
  totalMes: (mes: string) => [...acrescimosKeys.all, "total-mes", mes] as const,
  historicoMes: (mes: string) => [...acrescimosKeys.all, "historico-mes", mes] as const,
};

/** Soma dos acréscimos aprovados (escopo=total) no mês. */
export function useAcrescimoTotalMes(mes: string) {
  return useQuery<number>({
    queryKey: acrescimosKeys.totalMes(mes),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("acrescimos_gastos")
        .select("novo_limite, limite_atual")
        .eq("mes_referencia", mes)
        .eq("status", "aprovado")
        .eq("escopo", "total");
      if (error) throw error;
      return (data ?? []).reduce(
        (s, a) => s + Math.max(0, Number(a.novo_limite ?? 0) - Number(a.limite_atual ?? 0)),
        0,
      );
    },
    staleTime: STALE,
  });
}

export function useAcrescimosHistoricoMes(mes: string) {
  return useQuery<AcrescimoHistorico[]>({
    queryKey: acrescimosKeys.historicoMes(mes),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("acrescimos_gastos")
        .select("id, criado_em, novo_limite, limite_atual, escopo, empresa_id, justificativa")
        .eq("mes_referencia", mes)
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AcrescimoHistorico[];
    },
    staleTime: STALE,
  });
}

export function useAcrescimosMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: acrescimosKeys.all });
    qc.invalidateQueries({ queryKey: orcamentoKeys.all });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const create = useMutation({
    mutationFn: async (payload: AcrescimoInsert) => {
      const { data, error } = await supabase
        .from("acrescimos_gastos")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });

  return { create };
}
