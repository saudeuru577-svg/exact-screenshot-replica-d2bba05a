// Hook de Motivos de Glosa: staleTime 30min (quase-estático).
// Lista ativos + mutation para criar novo motivo a partir do dialog.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type MotivoGlosa = { id: string; descricao: string };

const STALE = 30 * 60 * 1000;

export const motivosGlosaKeys = {
  all: ["motivos-glosa"] as const,
};

export function useMotivosGlosa() {
  return useQuery<MotivoGlosa[]>({
    queryKey: motivosGlosaKeys.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("motivos_glosa")
        .select("id, descricao")
        .eq("ativo", true)
        .order("descricao");
      if (error) throw error;
      return (data ?? []) as MotivoGlosa[];
    },
    staleTime: STALE,
  });
}

export function useMotivosGlosaMutations() {
  const qc = useQueryClient();
  const create = useMutation({
    mutationFn: async (descricao: string) => {
      const { data, error } = await supabase
        .from("motivos_glosa")
        .insert({ descricao })
        .select("id, descricao")
        .single();
      if (error) throw error;
      return data as MotivoGlosa;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: motivosGlosaKeys.all }),
  });
  return { create };
}
