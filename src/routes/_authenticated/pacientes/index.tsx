import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/layout/coming-soon";

export const Route = createFileRoute("/_authenticated/pacientes/")({
  component: () => <ComingSoon title="Pacientes" description="Lista e gestão de pacientes da rede municipal." />,
});
