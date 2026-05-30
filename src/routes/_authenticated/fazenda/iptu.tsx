import { createFileRoute } from "@tanstack/react-router";
import { SecretariaShell } from "@/components/layout/secretaria-shell";

export const Route = createFileRoute("/_authenticated/fazenda/iptu")({
  component: () => <SecretariaShell secretariaSlug="fazenda" submoduloSlug="iptu" />,
});
