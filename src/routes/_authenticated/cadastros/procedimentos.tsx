import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/layout/coming-soon";

export const Route = createFileRoute("/_authenticated/cadastros/procedimentos")({
  component: () => <ComingSoon title="Procedimentos" description="Exames e consultas vinculados a empresas." />,
});
