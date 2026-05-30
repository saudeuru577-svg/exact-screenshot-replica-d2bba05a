import { createFileRoute } from "@tanstack/react-router";
import { SecretariaShell } from "@/components/layout/secretaria-shell";

export const Route = createFileRoute("/_authenticated/fazenda/divida-ativa")({
  component: () => <SecretariaShell secretariaSlug="fazenda" submoduloSlug="divida-ativa" />,
});
