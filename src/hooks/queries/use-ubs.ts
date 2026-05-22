// Hook centralizado de UBS: substitui as useQuery inline com queryKeys padronizadas,
// staleTime de 30min (dado quase-estático) e mutations com invalidação automática.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type UbsRow = Database["public"]["Tables"]["ubs"]["Row"];
export type UbsInsert = Database["public"]["Tables"]["ubs"]["Insert"];
export type UbsUpdate = Database["public"]["Tables"]["ubs"]["Update"];
export type UbsResumo = Pick<UbsRow, "id" | "nome_posto">;

const STALE = 30 * 60 * 1000; // 30 min

export const ubsKeys = {
  all: ["ubs"] as const,
  list: () => [...ubsKeys.all, "list"] as const,
  resumo: () => [...ubsKeys.all, "resumo"] as const,
};

/** Lista completa de UBS (todos os campos), ordenada por nome_posto. */
export function useUbs() {
  return useQuery<UbsRow[]>({
    queryKey: ubsKeys.list(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ubs")
        .select("*")
        .order("nome_posto");
      if (error) throw error;
      return (data ?? []) as UbsRow[];
    },
    staleTime: STALE,
  });
}

/** Projeção leve (id, nome_posto) usada por selects. */
export function useUbsResumo() {
  return useQuery<UbsResumo[]>({
    queryKey: ubsKeys.resumo(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ubs")
        .select("id, nome_posto")
        .order("nome_posto");
      if (error) throw error;
      return (data ?? []) as UbsResumo[];
    },
    staleTime: STALE,
  });
}

/** Mutations CRUD com invalidação de todas as keys de UBS. */
export function useUbsMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ubsKeys.all });

  const create = useMutation({
    mutationFn: async (payload: UbsInsert) => {
      const { error } = await supabase.from("ubs").insert(payload);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UbsUpdate }) => {
      const { error } = await supabase.from("ubs").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ubs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { create, update, remove };
}
