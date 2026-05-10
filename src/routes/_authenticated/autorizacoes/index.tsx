import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/layout/coming-soon";

export const Route = createFileRoute("/_authenticated/autorizacoes/")({
  component: () => <ComingSoon title="Autorizações" description="Guias de autorização emitidas." />,
});
