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
  porEmpresa: (empresaId: string, mes?: string) =>
    [...faturamentosKeys.all, "empresa", empresaId, mes ?? "ultimo"] as const,
};

export type FaturamentoConferencia = {
  id: string;
  empresa_id: string;
  mes_referencia: string;
  status: string;
  total_itens: number;
  total_pendentes: number;
  valor_confirmado: number;
  valor_glosado: number;
  empresa: { nome_fantasia: string } | null;
};

const STALE_FAT_DETALHE = 60 * 1000;

export function useFaturamentoConferencia(empresaId: string, mes?: string) {
  return useQuery<FaturamentoConferencia | null>({
    queryKey: faturamentosKeys.porEmpresa(empresaId, mes),
    queryFn: async () => {
      let q = supabase
        .from("faturamentos")
        .select(
          "id, empresa_id, mes_referencia, status, total_itens, total_pendentes, valor_confirmado, valor_glosado, empresa:empresas(nome_fantasia)",
        )
        .eq("empresa_id", empresaId)
        .order("iniciado_em", { ascending: false })
        .limit(1);
      if (mes) q = q.eq("mes_referencia", mes);
      const { data, error } = await q.maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as FaturamentoConferencia | null;
    },
    staleTime: STALE_FAT_DETALHE,
  });
}

export function useFaturamentoFinalizarMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (faturamentoId: string) => {
      const { error } = await supabase
        .from("faturamentos")
        .update({
          status: "finalizado",
          finalizado_em: new Date().toISOString(),
        })
        .eq("id", faturamentoId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: faturamentosKeys.all }),
  });
}

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
