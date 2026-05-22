// Hook de Bairros: staleTime 30min (quase-estático).
// useBairros = lista completa (admin); useBairrosAtivos = selects de formulário.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type BairroRow = Database["public"]["Tables"]["bairros"]["Row"];
export type BairroInsert = Database["public"]["Tables"]["bairros"]["Insert"];
export type BairroUpdate = Database["public"]["Tables"]["bairros"]["Update"];
export type BairroOpcao = Pick<BairroRow, "id" | "nome">;

const STALE = 30 * 60 * 1000;

export const bairrosKeys = {
  all: ["bairros"] as const,
  lista: () => [...bairrosKeys.all, "lista"] as const,
  ativos: () => [...bairrosKeys.all, "ativos"] as const,
};

export function useBairros() {
  return useQuery<BairroRow[]>({
    queryKey: bairrosKeys.lista(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bairros")
        .select("id,nome,ativo,criado_por,criado_em,atualizado_em")
        .order("nome");
      if (error) throw error;
      return (data ?? []) as BairroRow[];
    },
    staleTime: STALE,
  });
}

export function useBairrosAtivos() {
  return useQuery<BairroOpcao[]>({
    queryKey: bairrosKeys.ativos(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bairros")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return (data ?? []) as BairroOpcao[];
    },
    staleTime: STALE,
  });
}

export function useBairrosMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: bairrosKeys.all });

  const create = useMutation({
    mutationFn: async (payload: BairroInsert) => {
      const { error } = await supabase.from("bairros").insert(payload);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: BairroUpdate }) => {
      const { error } = await supabase.from("bairros").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { create, update };
}
