// Hook de Povoados: staleTime 30min. Mesma forma do use-bairros.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type PovoadoRow = Database["public"]["Tables"]["povoados"]["Row"];
export type PovoadoInsert = Database["public"]["Tables"]["povoados"]["Insert"];
export type PovoadoUpdate = Database["public"]["Tables"]["povoados"]["Update"];
export type PovoadoOpcao = Pick<PovoadoRow, "id" | "nome">;

const STALE = 30 * 60 * 1000;

export const povoadosKeys = {
  all: ["povoados"] as const,
  lista: () => [...povoadosKeys.all, "lista"] as const,
  ativos: () => [...povoadosKeys.all, "ativos"] as const,
};

export function usePovoados() {
  return useQuery<PovoadoRow[]>({
    queryKey: povoadosKeys.lista(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("povoados")
        .select("id,nome,ativo,criado_por,criado_em,atualizado_em")
        .order("nome");
      if (error) throw error;
      return (data ?? []) as PovoadoRow[];
    },
    staleTime: STALE,
  });
}

export function usePovoadosAtivos() {
  return useQuery<PovoadoOpcao[]>({
    queryKey: povoadosKeys.ativos(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("povoados")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return (data ?? []) as PovoadoOpcao[];
    },
    staleTime: STALE,
  });
}

export function usePovoadosMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: povoadosKeys.all });

  const create = useMutation({
    mutationFn: async (payload: PovoadoInsert) => {
      const { error } = await supabase.from("povoados").insert(payload);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: PovoadoUpdate }) => {
      const { error } = await supabase.from("povoados").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { create, update };
}
