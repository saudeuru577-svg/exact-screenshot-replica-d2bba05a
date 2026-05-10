import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/layout/coming-soon";

export const Route = createFileRoute("/_authenticated/acrescimos/novo")({
  component: () => <ComingSoon title="Solicitar acréscimo de gastos" description="Pedir aumento do limite mensal." />,
});
