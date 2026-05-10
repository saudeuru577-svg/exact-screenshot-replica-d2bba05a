import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/layout/coming-soon";

export const Route = createFileRoute("/_authenticated/autorizacoes/$id")({
  component: () => <ComingSoon title="Detalhes da autorização" />,
});
