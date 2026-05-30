import { createFileRoute } from "@tanstack/react-router";
import { SecretariaShell } from "@/components/layout/secretaria-shell";

export const Route = createFileRoute("/_authenticated/administracao/patrimonio")({
  component: () => <SecretariaShell secretariaSlug="administracao" submoduloSlug="patrimonio" />,
});
