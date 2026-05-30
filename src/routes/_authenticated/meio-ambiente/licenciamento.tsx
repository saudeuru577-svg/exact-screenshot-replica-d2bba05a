import { createFileRoute } from "@tanstack/react-router";
import { SecretariaShell } from "@/components/layout/secretaria-shell";

export const Route = createFileRoute("/_authenticated/meio-ambiente/licenciamento")({
  component: () => <SecretariaShell secretariaSlug="meio-ambiente" submoduloSlug="licenciamento" />,
});
