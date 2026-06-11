// Gate de autenticação puro: valida sessão e perfil, sem chrome de UI.
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldAlert, Loader2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedGate,
});

function AuthenticatedGate() {
  const navigate = useNavigate();
  const { user, usuario, loading, signOut, refreshUsuario } = useAuth();
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  // Se algo travar (sessão demorada, perfil sem chegar), oferece escape.
  useEffect(() => {
    if (!loading && user && usuario) {
      setStuck(false);
      return;
    }
    const t = setTimeout(() => setStuck(true), 8000);
    return () => clearTimeout(t);
  }, [loading, user, usuario]);

  if (stuck && (loading || (user && !usuario))) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="max-w-md text-center space-y-4">
          <AlertTriangle className="size-10 mx-auto text-warning" />
          <h2 className="text-lg font-semibold">Demorando mais que o esperado</h2>
          <p className="text-sm text-muted-foreground">
            Não foi possível concluir o carregamento da sessão. Tente novamente ou refaça o login.
          </p>
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setStuck(false);
                void refreshUsuario();
                if (typeof window !== "undefined") window.location.reload();
              }}
            >
              Tentar novamente
            </Button>
            <Button
              variant="secondary"
              onClick={() => signOut().then(() => navigate({ to: "/login" }))}
            >
              Ir para login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !user || (user && !usuario)) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!usuario!.ativo) {
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
