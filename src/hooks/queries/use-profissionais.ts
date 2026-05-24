// Hook de Profissionais: staleTime 5min. Variante com join de ubs para a tela de cadastro.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ProfissionalRow = Database["public"]["Tables"]["profissionais"]["Row"];
export type ProfissionalInsert = Database["public"]["Tables"]["profissionais"]["Insert"];
export type ProfissionalUpdate = Database["public"]["Tables"]["profissionais"]["Update"];
export type ProfissionalComUbs = ProfissionalRow & { ubs?: { nome_posto: string } | null };

const STALE = 5 * 60 * 1000;

export const profissionaisKeys = {
  all: ["profissionais"] as const,
  lista: () => [...profissionaisKeys.all, "lista"] as const,
  comUbs: () => [...profissionaisKeys.all, "com-ubs"] as const,
};

export function useProfissionaisComUbs() {
  return useQuery<ProfissionalComUbs[]>({
    queryKey: profissionaisKeys.comUbs(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profissionais")
        .select("*, ubs:ubs(nome_posto)")
        .order("nome_profissional");
      if (error) throw error;
      return (data ?? []) as unknown as ProfissionalComUbs[];
    },
    staleTime: STALE,
  });
}

export function useProfissionaisMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: profissionaisKeys.all });

  const create = useMutation({
    mutationFn: async (payload: ProfissionalInsert) => {
      const { error } = await supabase.from("profissionais").insert(payload);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: ProfissionalUpdate }) => {
      const { error } = await supabase.from("profissionais").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { create, update };
}
