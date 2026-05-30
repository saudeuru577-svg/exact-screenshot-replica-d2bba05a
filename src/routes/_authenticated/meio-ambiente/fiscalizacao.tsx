import { createFileRoute } from "@tanstack/react-router";
import { SecretariaShell } from "@/components/layout/secretaria-shell";

export const Route = createFileRoute("/_authenticated/meio-ambiente/fiscalizacao")({
  component: () => <SecretariaShell secretariaSlug="meio-ambiente" submoduloSlug="fiscalizacao" />,
});
