import { createFileRoute } from "@tanstack/react-router";
import { SecretariaShell } from "@/components/layout/secretaria-shell";

export const Route = createFileRoute("/_authenticated/cultura-esporte-turismo/inscricoes")({
  component: () => <SecretariaShell secretariaSlug="cultura-esporte-turismo" submoduloSlug="inscricoes" />,
});
