// Hook de Empresas: staleTime 5min (semi-estática).
// Variantes: completa (*), resumo (id, nome_fantasia), ativas (filtra ativa=true),
// e comCnpj (para import). Mutations cobrem insert/update e toggleAtiva.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type EmpresaRow = Database["public"]["Tables"]["empresas"]["Row"];
export type EmpresaInsert = Database["public"]["Tables"]["empresas"]["Insert"];
export type EmpresaUpdate = Database["public"]["Tables"]["empresas"]["Update"];
export type EmpresaResumo = Pick<EmpresaRow, "id" | "nome_fantasia">;
export type EmpresaResumoAtiva = Pick<EmpresaRow, "id" | "nome_fantasia" | "ativa">;
export type EmpresaImport = Pick<EmpresaRow, "id" | "cnpj" | "nome_fantasia" | "ativa">;

const STALE = 5 * 60 * 1000;

export const empresasKeys = {
  all: ["empresas"] as const,
  lista: () => [...empresasKeys.all, "lista"] as const,
  resumo: () => [...empresasKeys.all, "resumo"] as const,
  ativas: () => [...empresasKeys.all, "ativas"] as const,
  ativasResumo: () => [...empresasKeys.all, "ativas-resumo"] as const,
  import: () => [...empresasKeys.all, "import"] as const,
};

export function useEmpresas() {
  return useQuery<EmpresaRow[]>({
    queryKey: empresasKeys.lista(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresas").select("*").order("nome_fantasia");
      if (error) throw error;
      return (data ?? []) as EmpresaRow[];
    },
    staleTime: STALE,
  });
}

export function useEmpresasResumo() {
  return useQuery<EmpresaResumoAtiva[]>({
    queryKey: empresasKeys.resumo(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresas").select("id, nome_fantasia, ativa").order("nome_fantasia");
      if (error) throw error;
      return (data ?? []) as EmpresaResumoAtiva[];
    },
    staleTime: STALE,
  });
}

export function useEmpresasAtivas() {
  return useQuery<EmpresaResumo[]>({
    queryKey: empresasKeys.ativas(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresas").select("id, nome_fantasia").eq("ativa", true).order("nome_fantasia");
      if (error) throw error;
      return (data ?? []) as EmpresaResumo[];
    },
    staleTime: STALE,
  });
}

export function useEmpresasAtivasResumo() {
  return useQuery<EmpresaResumoAtiva[]>({
    queryKey: empresasKeys.ativasResumo(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresas").select("id, nome_fantasia, ativa").eq("ativa", true).order("nome_fantasia");
      if (error) throw error;
      return (data ?? []) as EmpresaResumoAtiva[];
    },
    staleTime: STALE,
  });
}

export function useEmpresasImport(opts?: { enabled?: boolean }) {
  return useQuery<EmpresaImport[]>({
    queryKey: empresasKeys.import(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresas").select("id, cnpj, nome_fantasia, ativa");
      if (error) throw error;
      return (data ?? []) as EmpresaImport[];
    },
    enabled: opts?.enabled ?? true,
    staleTime: STALE,
  });
}

export function useEmpresasMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: empresasKeys.all });

  const create = useMutation({
    mutationFn: async (payload: EmpresaInsert) => {
      const { error } = await supabase.from("empresas").insert(payload);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: EmpresaUpdate }) => {
      const { error } = await supabase.from("empresas").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const toggleAtiva = useMutation({
    mutationFn: async ({ id, ativa }: { id: string; ativa: boolean }) => {
      const { error } = await supabase.from("empresas").update({ ativa }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { create, update, toggleAtiva };
}
