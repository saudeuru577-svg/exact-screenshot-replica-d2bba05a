// Hook de Itens de Autorização: dado volátil (staleTime 60s).
// Variantes por contexto: por autorização (visualização/edição) e por faturamento
// (conferência). Mutations: batch save (insert/update/delete) e conferência
// (confirmar/glosar). Invalida chaves de autorização e faturamento.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ItemAutorizacaoRow = Database["public"]["Tables"]["itens_autorizacao"]["Row"];
export type ItemAutorizacaoInsert = Database["public"]["Tables"]["itens_autorizacao"]["Insert"];

export type ItemVisualizacao = Pick<
  ItemAutorizacaoRow,
  "id" | "descricao" | "quantidade" | "valor_unitario" | "valor_total"
>;

export type ItemEdicao = Pick<
  ItemAutorizacaoRow,
  "id" | "procedimento_id" | "descricao" | "quantidade" | "valor_unitario"
>;

export type ItemFaturamento = {
  id: string;
  autorizacao_id: string;
  descricao: string;
  valor_total: number;
  status_faturamento: "pendente" | "confirmado" | "glosado";
  motivo_glosa_id: string | null;
  observacao_glosa: string | null;
  procedimentos: { nome: string } | null;
  autorizacoes: {
    num_aut: string;
    data_autorizacao: string;
    pacientes: { nome: string } | null;
  } | null;
};

const STALE = 60 * 1000;

export const itensAutorizacaoKeys = {
  all: ["itens-autorizacao"] as const,
  porAutorizacao: (autorizacaoId: string) =>
    [...itensAutorizacaoKeys.all, "autorizacao", autorizacaoId] as const,
  porFaturamento: (faturamentoId: string) =>
    [...itensAutorizacaoKeys.all, "faturamento", faturamentoId] as const,
};

export function useItensPorAutorizacaoVisualizacao(autorizacaoId: string) {
  return useQuery<ItemVisualizacao[]>({
    queryKey: [...itensAutorizacaoKeys.porAutorizacao(autorizacaoId), "view"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itens_autorizacao")
        .select("id, descricao, quantidade, valor_unitario, valor_total")
        .eq("autorizacao_id", autorizacaoId)
        .order("criado_em", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ItemVisualizacao[];
    },
    staleTime: STALE,
  });
}

export function useItensPorAutorizacaoEdicao(autorizacaoId: string) {
  return useQuery<ItemEdicao[]>({
    queryKey: [...itensAutorizacaoKeys.porAutorizacao(autorizacaoId), "edit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itens_autorizacao")
        .select("id, procedimento_id, descricao, quantidade, valor_unitario")
        .eq("autorizacao_id", autorizacaoId)
        .order("criado_em", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ItemEdicao[];
    },
    staleTime: STALE,
  });
}

export function useItensPorFaturamento(
  faturamentoId: string | undefined,
  opts?: { enabled?: boolean },
) {
  return useQuery<ItemFaturamento[]>({
    queryKey: itensAutorizacaoKeys.porFaturamento(faturamentoId ?? ""),
    enabled: (opts?.enabled ?? true) && !!faturamentoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itens_autorizacao")
        .select(
          "id, autorizacao_id, descricao, valor_total, status_faturamento, motivo_glosa_id, observacao_glosa, procedimentos(nome), autorizacoes(num_aut, data_autorizacao, pacientes(nome))",
        )
        .eq("faturamento_id", faturamentoId!)
        .order("autorizacao_id");
      if (error) throw error;
      return (data ?? []) as unknown as ItemFaturamento[];
    },
    staleTime: STALE,
  });
}

export type SaveItemsPayload = {
  autorizacaoId: string;
  removerIds: string[];
  atualizar: Array<{
    id: string;
    procedimento_id: string;
    descricao: string;
    quantidade: number;
    valor_unitario: number;
  }>;
  inserir: Array<{
    procedimento_id: string;
    descricao: string;
    quantidade: number;
    valor_unitario: number;
  }>;
};

export function useItensAutorizacaoMutations() {
  const qc = useQueryClient();

  const saveBatch = useMutation({
    mutationFn: async (p: SaveItemsPayload) => {
      if (p.removerIds.length > 0) {
        const { error } = await supabase
          .from("itens_autorizacao").delete().in("id", p.removerIds);
        if (error) throw error;
      }
      for (const it of p.atualizar) {
        const { error } = await supabase.from("itens_autorizacao").update({
          quantidade: it.quantidade,
          valor_unitario: it.valor_unitario,
          valor_total: it.quantidade * it.valor_unitario,
          procedimento_id: it.procedimento_id,
          descricao: it.descricao,
        }).eq("id", it.id);
        if (error) throw error;
      }
      if (p.inserir.length > 0) {
        const { error } = await supabase.from("itens_autorizacao").insert(
          p.inserir.map((it) => ({
            autorizacao_id: p.autorizacaoId,
            procedimento_id: it.procedimento_id,
            descricao: it.descricao,
            quantidade: it.quantidade,
            valor_unitario: it.valor_unitario,
            valor_total: it.quantidade * it.valor_unitario,
          })),
        );
        if (error) throw error;
      }
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({
        queryKey: itensAutorizacaoKeys.porAutorizacao(v.autorizacaoId),
      });
    },
  });

  const confirmar = useMutation({
    mutationFn: async ({ ids }: { ids: string[]; faturamentoId: string }) => {
      const { error } = await supabase
        .from("itens_autorizacao")
        .update({
          status_faturamento: "confirmado",
          motivo_glosa_id: null,
          observacao_glosa: null,
          data_conferencia: new Date().toISOString(),
        })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({
        queryKey: itensAutorizacaoKeys.porFaturamento(v.faturamentoId),
      });
      qc.invalidateQueries({ queryKey: ["faturamentos"] });
      qc.invalidateQueries({ queryKey: ["faturamento"] });
    },
  });

  const glosar = useMutation({
    mutationFn: async (p: {
      id: string;
      motivo_glosa_id: string;
      observacao: string;
      faturamentoId: string;
    }) => {
      const { error } = await supabase
        .from("itens_autorizacao")
        .update({
          status_faturamento: "glosado",
          motivo_glosa_id: p.motivo_glosa_id,
          observacao_glosa: p.observacao || null,
          data_conferencia: new Date().toISOString(),
        })
        .eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({
        queryKey: itensAutorizacaoKeys.porFaturamento(v.faturamentoId),
      });
      qc.invalidateQueries({ queryKey: ["faturamentos"] });
      qc.invalidateQueries({ queryKey: ["faturamento"] });
    },
  });

  return { saveBatch, confirmar, glosar };
}
