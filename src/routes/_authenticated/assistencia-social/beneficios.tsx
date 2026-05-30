import { createFileRoute } from "@tanstack/react-router";
import { SecretariaShell } from "@/components/layout/secretaria-shell";

export const Route = createFileRoute("/_authenticated/assistencia-social/beneficios")({
  component: () => <SecretariaShell secretariaSlug="assistencia-social" submoduloSlug="beneficios" />,
});
