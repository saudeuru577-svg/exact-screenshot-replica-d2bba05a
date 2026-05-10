import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/layout/coming-soon";

export const Route = createFileRoute("/_authenticated/cadastros/territorio")({
  component: () => <ComingSoon title="Bairros e Povoados" description="Áreas urbanas e rurais." />,
});
