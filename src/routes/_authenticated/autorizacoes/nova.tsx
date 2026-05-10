import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/layout/coming-soon";

export const Route = createFileRoute("/_authenticated/autorizacoes/nova")({
  component: () => <ComingSoon title="Nova autorização" description="Emitir nova autorização." />,
});
