import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/layout/coming-soon";

export const Route = createFileRoute("/_authenticated/cadastros/ubs")({
  component: () => <ComingSoon title="UBS" description="Unidades Básicas de Saúde." />,
});
