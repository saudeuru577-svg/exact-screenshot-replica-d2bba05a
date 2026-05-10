import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/layout/coming-soon";

export const Route = createFileRoute("/_authenticated/relatorios/")({
  component: () => <ComingSoon title="Relatórios" description="Indicadores e exportações." />,
});
