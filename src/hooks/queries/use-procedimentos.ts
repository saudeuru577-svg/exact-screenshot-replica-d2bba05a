// Hook centralizado de Procedimentos: staleTime 30min (quase-estático).
// Expõe variantes por projeção (lista com join, busca para combobox,
// existentes para validação de importação) + mutations CRUD/toggle.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ProcedimentoRow = Database["public"]["Tables"]["procedimentos"]["Row"];
export type ProcedimentoInsert = Database["public"]["Tables"]["procedimentos"]["Insert"];
export type ProcedimentoUpdate = Database["public"]["Tables"]["procedimentos"]["Update"];
export type ProcedimentoComEmpresa = ProcedimentoRow & {
  empresa: { nome_fantasia: string } | null;
};
export type ProcedimentoBusca = Pick<ProcedimentoRow, "id" | "nome" | "sigla">;
export type ProcedimentoExistente = Pick<ProcedimentoRow, "sigla" | "empresa_id">;

const STALE = 30 * 60 * 1000;

export const procedimentosKeys = {
  all: ["procedimentos"] as const,
  lista: () => [...procedimentosKeys.all, "lista"] as const,
  busca: (q: string) => [...procedimentosKeys.all, "busca", q] as const,
  existentes: () => [...procedimentosKeys.all, "existentes"] as const,
  porEmpresa: (empresaId: string) =>
    [...procedimentosKeys.all, "empresa", empresaId] as const,
};

export type ProcedimentoOpcao = Pick<
  ProcedimentoRow,
  "id" | "sigla" | "nome" | "valor_unitario"
>;

/** Procedimentos ativos de uma empresa (combobox de edição/criação). */
export function useProcedimentosPorEmpresa(
  empresaId: string | undefined,
  opts?: { enabled?: boolean },
) {
  return useQuery<ProcedimentoOpcao[]>({
    queryKey: procedimentosKeys.porEmpresa(empresaId ?? ""),
    enabled: (opts?.enabled ?? true) && !!empresaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("procedimentos")
        .select("id, sigla, nome, valor_unitario")
        .eq("empresa_id", empresaId!)
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return (data ?? []) as ProcedimentoOpcao[];
    },
    staleTime: STALE,
  });
}

/** Lista completa com join em empresas (tela de cadastro). */
export function useProcedimentos() {
  return useQuery<ProcedimentoComEmpresa[]>({
    queryKey: procedimentosKeys.lista(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("procedimentos")
        .select("*, empresa:empresas(nome_fantasia)")
        .order("nome");
      if (error) throw error;
      return (data ?? []) as unknown as ProcedimentoComEmpresa[];
    },
    staleTime: STALE,
  });
}

/** Combobox de procedimentos ativos com busca (id, nome, sigla). */
export function useProcedimentosBusca(q: string, options?: { enabled?: boolean }) {
  return useQuery<ProcedimentoBusca[]>({
    queryKey: procedimentosKeys.busca(q.trim()),
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      let query = supabase
        .from("procedimentos")
        .select("id, nome, sigla")
        .eq("ativo", true)
        .order("nome")
        .limit(30);
      const term = q.trim();
      if (term) query = query.or(`nome.ilike.%${term}%,sigla.ilike.%${term}%`);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ProcedimentoBusca[];
    },
    staleTime: STALE,
  });
}

/** Lista enxuta (sigla+empresa) usada pela importação para checar duplicados. */
export function useProcedimentosExistentes(options?: { enabled?: boolean }) {
  return useQuery<ProcedimentoExistente[]>({
    queryKey: procedimentosKeys.existentes(),
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("procedimentos")
        .select("sigla, empresa_id");
      if (error) throw error;
      return (data ?? []) as ProcedimentoExistente[];
    },
    staleTime: STALE,
  });
}

export function useProcedimentosMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: procedimentosKeys.all });

  const create = useMutation({
    mutationFn: async (payload: ProcedimentoInsert) => {
      const { error } = await supabase.from("procedimentos").insert(payload);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const createMany = useMutation({
    mutationFn: async (payload: ProcedimentoInsert[]) => {
      if (payload.length === 0) return;
      const { error } = await supabase.from("procedimentos").insert(payload);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: ProcedimentoUpdate }) => {
      const { error } = await supabase.from("procedimentos").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const toggleAtivo = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from("procedimentos").update({ ativo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { create, createMany, update, toggleAtivo };
}
