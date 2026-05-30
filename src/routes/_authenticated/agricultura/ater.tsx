import { createFileRoute } from "@tanstack/react-router";
import { SecretariaShell } from "@/components/layout/secretaria-shell";

export const Route = createFileRoute("/_authenticated/agricultura/ater")({
  component: () => <SecretariaShell secretariaSlug="agricultura" submoduloSlug="ater" />,
});
