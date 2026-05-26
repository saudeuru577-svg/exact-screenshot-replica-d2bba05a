// Refatorado para usar usePacientesMutations (insert via hook centralizado).
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { formatSupabaseError } from "@/lib/format-error";

import { useAuth } from "@/hooks/use-auth";
import { usePacientesMutations } from "@/hooks/queries/use-pacientes";
import { PageHeader, PageBody } from "@/components/layout/page-header";
import {
  PacienteFormFields, usePacienteForm, type PacienteForm,
} from "@/components/pacientes/paciente-form";

export const Route = createFileRoute("/_authenticated/saude/regulacao/autorizacao-exames/saude/regulacao/autorizacao-exames/pacientes/novo")({
  component: NovoPaciente,
});

function NovoPaciente() {
  const navigate = useNavigate();
  const userId = useAuth((s) => s.user?.id);
  const form = usePacienteForm();
  const { create } = usePacientesMutations();

  const handleSubmit = (v: PacienteForm) => {
    if (!userId) {
      toast.error("Sessão inválida");
      return;
    }
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
    create.mutate(payload, {
      onSuccess: (id) => {
        toast.success("Paciente cadastrado");
        navigate({ to: "/saude/regulacao/autorizacao-exames/pacientes/$id", params: { id } });
      },
      onError: (e: Error) => toast.error(formatSupabaseError(e)),
    });
  };


  return (
    <>
      <PageHeader title="Novo paciente" description="Preencha os dados do novo paciente." />
      <PageBody>
        <div className="max-w-3xl">
          <PacienteFormFields form={form} onSubmit={handleSubmit} saving={create.isPending} submitLabel="Cadastrar" />
        </div>
      </PageBody>
    </>
  );
}
