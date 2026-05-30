import { createFileRoute } from "@tanstack/react-router";
import { SecretariaShell } from "@/components/layout/secretaria-shell";

export const Route = createFileRoute("/_authenticated/obras/ordens-servico")({
  component: () => <SecretariaShell secretariaSlug="obras" submoduloSlug="ordens-servico" />,
});
