import { createFileRoute } from "@tanstack/react-router";
import { SecretariaShell } from "@/components/layout/secretaria-shell";

export const Route = createFileRoute("/_authenticated/educacao/transporte")({
  component: () => <SecretariaShell secretariaSlug="educacao" submoduloSlug="transporte" />,
});
