import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/layout/coming-soon";

export const Route = createFileRoute("/_authenticated/cadastros/profissionais")({
  component: () => <ComingSoon title="Profissionais" description="Médicos e enfermeiros vinculados às UBS." />,
});
