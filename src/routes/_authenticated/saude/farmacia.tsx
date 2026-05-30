import { createFileRoute } from "@tanstack/react-router";
import { SubmoduloShell } from "@/components/layout/submodulo-shell";

export const Route = createFileRoute("/_authenticated/saude/farmacia")({
  component: () => <SubmoduloShell slug="farmacia" />,
});
