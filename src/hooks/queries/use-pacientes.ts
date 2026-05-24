// Hook de Pacientes: staleTime 5min.
// - usePacientesLista(): listagem com join de bairro/povoado (limit 500)
// - usePaciente(id): detalhe com join de bairro/povoado
// - usePacienteAutorizacoes(id): autorizações do paciente
// - usePacientesMutations(): insert/update padrão
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type PacienteRow = Database["public"]["Tables"]["pacientes"]["Row"];
export type PacienteInsert = Database["public"]["Tables"]["pacientes"]["Insert"];
export type PacienteUpdate = Database["public"]["Tables"]["pacientes"]["Update"];

export type PacienteLista = Pick<
  PacienteRow,
  "id" | "nome" | "dtn" | "sexo" | "nome_da_mae" | "cartao_sus" | "zona"
> & {
  bairro: { nome: string } | null;
  povoado: { nome: string } | null;
};

export type PacienteDetalhe = PacienteRow & {
  bairro: { nome: string } | null;
  povoado: { nome: string } | null;
};

export type PacienteAutorizacao = {
  id: string;
  num_aut: string;
  data_autorizacao: string;
  total_autorizado: number;
  status: Database["public"]["Tables"]["autorizacoes"]["Row"]["status"];
};

const STALE = 5 * 60 * 1000;

export const pacientesKeys = {
  all: ["pacientes"] as const,
  lista: () => [...pacientesKeys.all, "lista"] as const,
  detalhe: (id: string) => [...pacientesKeys.all, "detalhe", id] as const,
  autorizacoes: (id: string) => [...pacientesKeys.all, "autorizacoes", id] as const,
};

export function usePacientesLista() {
  return useQuery<PacienteLista[]>({
    queryKey: pacientesKeys.lista(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pacientes")
        .select("id, nome, dtn, sexo, nome_da_mae, cartao_sus, zona, bairro:bairros(nome), povoado:povoados(nome)")
        .order("nome")
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as PacienteLista[];
    },
    staleTime: STALE,
  });
}

export function usePaciente(id: string) {
  return useQuery<PacienteDetalhe | null>({
    queryKey: pacientesKeys.detalhe(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pacientes")
        .select("*, bairro:bairros(nome), povoado:povoados(nome)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as unknown as PacienteDetalhe;
    },
    staleTime: STALE,
  });
}

export function usePacienteAutorizacoes(id: string) {
  return useQuery<PacienteAutorizacao[]>({
    queryKey: pacientesKeys.autorizacoes(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("autorizacoes")
        .select("id, num_aut, data_autorizacao, total_autorizado, status")
        .eq("paciente_id", id)
        .order("data_autorizacao", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PacienteAutorizacao[];
    },
    // Autorizações são voláteis, mas como aqui é histórico do paciente mantemos 5min.
    staleTime: STALE,
  });
}

export function usePacientesMutations() {
  const qc = useQueryClient();
  const invalidateAll = () => qc.invalidateQueries({ queryKey: pacientesKeys.all });

  const create = useMutation({
    mutationFn: async (payload: PacienteInsert) => {
      const { data, error } = await supabase
        .from("pacientes").insert(payload).select("id").single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: invalidateAll,
  });

  const update = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: PacienteUpdate }) => {
      const { error } = await supabase.from("pacientes").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: pacientesKeys.lista() });
      qc.invalidateQueries({ queryKey: pacientesKeys.detalhe(vars.id) });
    },
  });

  return { create, update };
}
