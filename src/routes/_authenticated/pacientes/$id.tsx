import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/layout/coming-soon";

export const Route = createFileRoute("/_authenticated/pacientes/$id")({
  component: () => <ComingSoon title="Detalhes do paciente" />,
});
