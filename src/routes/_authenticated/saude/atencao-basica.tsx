import { createFileRoute } from "@tanstack/react-router";
import { SubmoduloShell } from "@/components/layout/submodulo-shell";

export const Route = createFileRoute("/_authenticated/saude/atencao-basica")({
  component: () => <SubmoduloShell slug="atencao-basica" />,
});
