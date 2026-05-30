import { createFileRoute } from "@tanstack/react-router";
import { SecretariaShell } from "@/components/layout/secretaria-shell";

export const Route = createFileRoute("/_authenticated/obras/manutencao-viaria")({
  component: () => <SecretariaShell secretariaSlug="obras" submoduloSlug="manutencao-viaria" />,
});
