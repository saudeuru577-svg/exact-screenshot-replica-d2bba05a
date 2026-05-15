import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export function usePermissoesUsuario(userId?: string) {
  return useQuery({
    queryKey: ["permissoes_usuario", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("permissoes_usuario")
        .select("tela, permitido")
        .eq("usuario_id", userId!);
      if (error) throw error;
      const map: Record<string, boolean> = {};
      (data ?? []).forEach((r) => { map[r.tela] = r.permitido; });
      return map;
    },
  });
}

/**
 * Overrides do usuário autenticado (cacheado).
 */
export function useMinhasPermissoes() {
  const uid = useAuth((s) => s.usuario?.id);
  return usePermissoesUsuario(uid);
}
