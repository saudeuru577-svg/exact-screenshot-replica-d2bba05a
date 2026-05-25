// Hook de Autorizações: dado volátil (staleTime 60s).
// Lista, detalhe e mutations (delete, update parcial). Itens da autorização
// vivem em use-itens-autorizacao.ts. Toasts e regras de UX permanecem nas telas.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AutorizacaoRow = Database["public"]["Tables"]["autorizacoes"]["Row"];
export type AutorizacaoUpdate = Database["public"]["Tables"]["autorizacoes"]["Update"];

export type AutorizacaoLista = {
  id: string;
  num_aut: string;
  data_autorizacao: string;
  total_autorizado: number;
  status: string;
  pdf_autorizacao: string | null;
  paciente: { nome: string } | null;
  empresa: { nome_fantasia: string } | null;
  ubs: { nome_posto: string } | null;
};

export type AutorizacaoDetalhe = {
  id: string;
  num_aut: string;
  data_autorizacao: string;
  total_autorizado: number;
  status: string;
  sintomas: string | null;
  pdf_autorizacao: string | null;
  qr_code: string | null;
  assinatura_atendente: string | null;
  assinatura_paciente: string | null;
  foto_requisicao: string | null;
  criado_em: string;
  criado_por: string;
  paciente: {
    id: string; nome: string; nome_da_mae: string; dtn: string; cartao_sus: string | null;
  } | null;
  empresa: { nome_fantasia: string; cnpj: string } | null;
  ubs: { nome_posto: string } | null;
  profissional: {
    nome_profissional: string; conselho: string; numero_conselho: string;
  } | null;
};

export type AutorizacaoEdicao = {
  id: string;
  num_aut: string;
  status: string;
  data_autorizacao: string;
  sintomas: string | null;
  total_autorizado: number;
  criado_por: string;
  empresa_id: string;
  paciente: { nome: string } | null;
  empresa: { nome_fantasia: string } | null;
};

const STALE = 60 * 1000;

export const autorizacoesKeys = {
  all: ["autorizacoes"] as const,
  lista: () => [...autorizacoesKeys.all, "lista"] as const,
  detalhe: (id: string) => [...autorizacoesKeys.all, "detalhe", id] as const,
  edicao: (id: string) => [...autorizacoesKeys.all, "edicao", id] as const,
};

export function useAutorizacoesLista() {
  return useQuery<AutorizacaoLista[]>({
    queryKey: autorizacoesKeys.lista(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("autorizacoes")
        .select(
          "id, num_aut, data_autorizacao, total_autorizado, status, pdf_autorizacao, paciente:pacientes(nome), empresa:empresas(nome_fantasia), ubs:ubs(nome_posto)",
        )
        .order("data_autorizacao", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as AutorizacaoLista[];
    },
    staleTime: STALE,
  });
}

export function useAutorizacaoDetalhe(id: string) {
  return useQuery<AutorizacaoDetalhe>({
    queryKey: autorizacoesKeys.detalhe(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("autorizacoes")
        .select(`
          id, num_aut, data_autorizacao, total_autorizado, status, sintomas,
          pdf_autorizacao, qr_code, assinatura_atendente, assinatura_paciente,
          foto_requisicao, criado_em, criado_por,
          paciente:pacientes(id, nome, nome_da_mae, dtn, cartao_sus),
          empresa:empresas(nome_fantasia, cnpj),
          ubs:ubs(nome_posto),
          profissional:profissionais(nome_profissional, conselho, numero_conselho)
        `)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as unknown as AutorizacaoDetalhe;
    },
    staleTime: STALE,
  });
}

export function useAutorizacaoEdicao(id: string) {
  return useQuery<AutorizacaoEdicao>({
    queryKey: autorizacoesKeys.edicao(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("autorizacoes")
        .select(`
          id, num_aut, status, data_autorizacao, sintomas, total_autorizado, criado_por, empresa_id,
          paciente:pacientes(nome),
          empresa:empresas(nome_fantasia)
        `)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as unknown as AutorizacaoEdicao;
    },
    staleTime: STALE,
  });
}

export function useAutorizacoesMutations() {
  const qc = useQueryClient();
  const invalidate = (id?: string) => {
    qc.invalidateQueries({ queryKey: autorizacoesKeys.all });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    if (id) {
      qc.invalidateQueries({ queryKey: autorizacoesKeys.detalhe(id) });
      qc.invalidateQueries({ queryKey: autorizacoesKeys.edicao(id) });
    }
  };

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("autorizacoes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
  });

  const update = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: AutorizacaoUpdate }) => {
      const { data, error } = await supabase
        .from("autorizacoes")
        .update(payload)
        .eq("id", id)
        .select("id, status, num_aut, motivo_bloqueio")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => invalidate(v.id),
  });

  return { remove, update, invalidate };
}
