import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/layout/coming-soon";

export const Route = createFileRoute("/_authenticated/admin/logs")({
  component: () => <ComingSoon title="Logs de auditoria" description="Registro de todas as ações críticas." />,
});
