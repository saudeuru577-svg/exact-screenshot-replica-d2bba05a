import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, PageBody } from "@/components/layout/page-header";
import {
  PacienteFormFields, usePacienteForm, type PacienteForm,
} from "@/components/pacientes/paciente-form";

export const Route = createFileRoute("/_authenticated/pacientes/novo")({
  component: NovoPaciente,
});

function NovoPaciente() {
  const navigate = useNavigate();
  const userId = useAuth((s) => s.user?.id);
  const form = usePacienteForm();

  const create = useMutation({
    mutationFn: async (v: PacienteForm) => {
      if (!userId) throw new Error("Sessão inválida");
      const payload = {
        nome: v.nome, nome_da_mae: v.nome_da_mae, dtn: v.dtn, sexo: v.sexo,
        cartao_sus: v.cartao_sus ? v.cartao_sus.replace(/\D/g, "") : null,
        naturalidade: v.naturalidade || null,
        zona: v.zona,
        bairro_id: v.zona === "urbana" ? v.bairro_id : null,
        povoado_id: v.zona === "rural" ? v.povoado_id : null,
        rua: v.rua || null, numero: v.numero || null,
        ponto_referencia: v.ponto_referencia || null,
        criado_por: userId,
      };
      const { data, error } = await supabase.from("pacientes").insert(payload).select("id").single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      toast.success("Paciente cadastrado");
      navigate({ to: "/pacientes/$id", params: { id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader title="Novo paciente" description="Preencha os dados do novo paciente." />
      <PageBody>
        <div className="max-w-3xl">
          <PacienteFormFields form={form} onSubmit={(v) => create.mutate(v)} saving={create.isPending} submitLabel="Cadastrar" />
        </div>
      </PageBody>
    </>
  );
}
