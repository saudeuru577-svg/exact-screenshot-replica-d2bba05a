import { createFileRoute } from "@tanstack/react-router";
import { SecretariaShell } from "@/components/layout/secretaria-shell";

export const Route = createFileRoute("/_authenticated/administracao/protocolo")({
  component: () => <SecretariaShell secretariaSlug="administracao" submoduloSlug="protocolo" />,
});
