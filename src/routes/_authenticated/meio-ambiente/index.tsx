import { createFileRoute } from "@tanstack/react-router";
import { SecretariaShell } from "@/components/layout/secretaria-shell";

export const Route = createFileRoute("/_authenticated/meio-ambiente/")({
  component: () => <SecretariaShell secretariaSlug="meio-ambiente" />,
});
