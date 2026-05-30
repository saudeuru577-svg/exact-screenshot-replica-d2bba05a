import { createFileRoute } from "@tanstack/react-router";
import { SecretariaShell } from "@/components/layout/secretaria-shell";

export const Route = createFileRoute("/_authenticated/obras/")({
  component: () => <SecretariaShell secretariaSlug="obras" />,
});
