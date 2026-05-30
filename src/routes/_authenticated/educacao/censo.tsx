import { createFileRoute } from "@tanstack/react-router";
import { SecretariaShell } from "@/components/layout/secretaria-shell";

export const Route = createFileRoute("/_authenticated/educacao/censo")({
  component: () => <SecretariaShell secretariaSlug="educacao" submoduloSlug="censo" />,
});
