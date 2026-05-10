import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/layout/coming-soon";

export const Route = createFileRoute("/_authenticated/pacientes/novo")({
  component: () => <ComingSoon title="Novo paciente" description="Cadastrar novo paciente." />,
});
