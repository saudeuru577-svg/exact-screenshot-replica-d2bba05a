// Hook de Faturamentos: dado volátil (staleTime 60s).
// Lista os faturamentos do mês para o quadro de empresas e expõe a mutation
// que dispara a RPC abrir_faturamento.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type FaturamentoRow = Database["public"]["Tables"]["faturamentos"]["Row"];
export type FaturamentoLista = Pick<
  FaturamentoRow,
  "id" | "empresa_id" | "status" | "total_itens" | "total_pendentes"
>;

const STALE = 60 * 1000;

export const faturamentosKeys = {
  all: ["faturamentos"] as const,
  porMes: (mes: string) => [...faturamentosKeys.all, "mes", mes] as const,
};

export function useFaturamentosMes(mes: string) {
  return useQuery<FaturamentoLista[]>({
    queryKey: faturamentosKeys.porMes(mes),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faturamentos")
        .select("id, empresa_id, status, total_itens, total_pendentes")
        .eq("mes_referencia", mes);
      if (error) throw error;
      return (data ?? []) as FaturamentoLista[];
    },
    staleTime: STALE,
  });
}

export function useFaturamentoAbrirMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ empresaId, mes }: { empresaId: string; mes: string }) => {
      const { data, error } = await supabase.rpc("abrir_faturamento", {
        p_empresa: empresaId,
        p_mes: mes,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: faturamentosKeys.all }),
  });
}
