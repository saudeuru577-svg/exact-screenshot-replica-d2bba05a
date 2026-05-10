import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/layout/coming-soon";

export const Route = createFileRoute("/_authenticated/cadastros/empresas")({
  component: () => <ComingSoon title="Empresas" description="Laboratórios, clínicas e hospitais conveniados." />,
});
