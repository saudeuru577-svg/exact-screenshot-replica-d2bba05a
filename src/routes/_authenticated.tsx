// Gate de autenticação puro: valida sessão e perfil, sem chrome de UI.
// O chrome (sidebar, header de módulo, breadcrumb) vive em
// src/routes/_authenticated/saude/regulacao/autorizacao-exames.tsx (layout do submódulo).
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ShieldAlert, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedGate,
});

function AuthenticatedGate() {
  const navigate = useNavigate();
  const { user, usuario, loading, initError, retry, signOut } = useAuth();

  useEffect(() => {
    if (!loading && !initError && !user) navigate({ to: "/login" });
  }, [loading, user, initError, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (initError) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="max-w-md text-center space-y-4">
          <AlertTriangle className="size-10 mx-auto text-destructive" />
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Não conseguimos carregar sua sessão</h2>
            <p className="text-sm text-muted-foreground">
              {initError}. Verifique sua conexão e tente novamente.
            </p>
          </div>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => retry()}>
              <RefreshCw className="size-4" /> Tentar novamente
            </Button>
            <Button
              variant="outline"
              onClick={() => signOut().then(() => navigate({ to: "/login" }))}
            >
              Ir para login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!usuario) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="max-w-md text-center space-y-3">
          <ShieldAlert className="size-10 mx-auto text-warning" />
          <h2 className="text-lg font-semibold">Conta não vinculada</h2>
          <p className="text-sm text-muted-foreground">
            Sua conta de autenticação ainda não foi associada a um perfil. Contate um administrador.
          </p>
          <Button variant="outline" onClick={() => signOut().then(() => navigate({ to: "/login" }))}>
            Sair
          </Button>
        </div>
      </div>
    );
  }

  if (!usuario.ativo) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="max-w-md text-center space-y-3">
          <ShieldAlert className="size-10 mx-auto text-destructive" />
          <h2 className="text-lg font-semibold">Conta inativa</h2>
          <p className="text-sm text-muted-foreground">
            Sua conta está desativada. Solicite reativação a um administrador.
          </p>
          <Button variant="outline" onClick={() => signOut().then(() => navigate({ to: "/login" }))}>
            Sair
          </Button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
