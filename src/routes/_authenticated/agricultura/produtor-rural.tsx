import { createFileRoute } from "@tanstack/react-router";
import { SecretariaShell } from "@/components/layout/secretaria-shell";

export const Route = createFileRoute("/_authenticated/agricultura/produtor-rural")({
  component: () => <SecretariaShell secretariaSlug="agricultura" submoduloSlug="produtor-rural" />,
});
