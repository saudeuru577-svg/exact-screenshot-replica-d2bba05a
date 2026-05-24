// Hook de Usuários: staleTime 5min. Lista ordenada por criação desc + toggle ativo.
// Criação de usuário continua via edge function (admin-create-user) — fora deste hook.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type UsuarioRow = Database["public"]["Tables"]["usuarios"]["Row"];
export type UsuarioLista = Pick<
  UsuarioRow,
  "id" | "nome" | "email" | "perfil" | "ativo" | "criado_em"
>;

const STALE = 5 * 60 * 1000;

export const usuariosKeys = {
  all: ["usuarios"] as const,
  lista: () => [...usuariosKeys.all, "lista"] as const,
};

export function useUsuarios() {
  return useQuery<UsuarioLista[]>({
    queryKey: usuariosKeys.lista(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usuarios")
        .select("id, nome, email, perfil, ativo, criado_em")
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return (data ?? []) as UsuarioLista[];
    },
    staleTime: STALE,
  });
}

export function useUsuariosMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: usuariosKeys.all });

  const toggleAtivo = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from("usuarios").update({ ativo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { toggleAtivo, invalidate };
}
