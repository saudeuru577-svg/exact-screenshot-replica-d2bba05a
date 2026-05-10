import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/layout/coming-soon";

export const Route = createFileRoute("/_authenticated/faturamentos/")({
  component: () => <ComingSoon title="Faturamentos" description="Fechamentos financeiros por empresa." />,
});
