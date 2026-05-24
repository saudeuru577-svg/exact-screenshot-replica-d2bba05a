// Hook de Limites mensais por empresa: staleTime 5min.
// Mutations: upsert (por empresa_id + mes_referencia) e remove por id.
// Invalida também chaves legadas usadas em outras telas (limite-emp, dashboard).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type LimiteEmpresaRow = Database["public"]["Tables"]["limites_empresa"]["Row"];
export type LimiteEmpresaLista = Pick<
  LimiteEmpresaRow,
  "id" | "mes_referencia" | "valor" | "atualizado_em"
>;

const STALE = 5 * 60 * 1000;

export const limitesEmpresaKeys = {
  all: ["limites-empresa"] as const,
  porEmpresa: (empresaId: string) => [...limitesEmpresaKeys.all, empresaId] as const,
};

export function useLimitesEmpresa(empresaId: string, opts?: { enabled?: boolean }) {
  return useQuery<LimiteEmpresaLista[]>({
    queryKey: limitesEmpresaKeys.porEmpresa(empresaId),
    enabled: (opts?.enabled ?? true) && !!empresaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("limites_empresa")
        .select("id, mes_referencia, valor, atualizado_em")
        .eq("empresa_id", empresaId)
        .order("mes_referencia", { ascending: false });
      if (error) throw error;
      return (data ?? []) as LimiteEmpresaLista[];
    },
    staleTime: STALE,
  });
}

export function useLimitesEmpresaMutations(empresaId: string) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: limitesEmpresaKeys.porEmpresa(empresaId) });
    // chaves usadas por outras telas que dependem do limite
    qc.invalidateQueries({ queryKey: ["limite-emp"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const upsert = useMutation({
    mutationFn: async ({ mes, valor }: { mes: string; valor: number }) => {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) throw new Error("Mês inválido");
      if (!(valor >= 0)) throw new Error("Valor inválido");
      const { error } = await supabase
        .from("limites_empresa")
        .upsert(
          { empresa_id: empresaId, mes_referencia: mes, valor },
          { onConflict: "empresa_id,mes_referencia" },
        );
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("limites_empresa").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { upsert, remove };
}
