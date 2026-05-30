import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LogOut, HeartPulse, Lock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SUBMODULOS_SAUDE, temAcessoSubmodulo } from "@/lib/modulos-saude";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/saude/")({
  component: SaudeHub,
});

function SaudeHub() {
  const navigate = useNavigate();
  const { usuario, signOut } = useAuth();
  if (!usuario) return null;

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <header className="bg-primary text-primary-foreground border-b">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-md bg-primary-foreground/15 grid place-items-center">
              <HeartPulse className="size-5" />
            </div>
            <div className="leading-tight">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-80">
                Cidade Presente · SIGESA
              </div>
              <div className="text-lg font-semibold">Módulo Saúde</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right leading-tight hidden sm:block">
              <div className="text-sm font-medium">{usuario.nome}</div>
              <div className="text-[11px] opacity-80 uppercase tracking-wider">{usuario.perfil}</div>
            </div>
            <Button
              variant="secondary" size="sm"
              onClick={() => signOut().then(() => navigate({ to: "/login" }))}
            >
              <LogOut className="size-4" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-10">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight">Selecione um submódulo</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Acesse as áreas operacionais da Secretaria de Saúde.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SUBMODULOS_SAUDE.map((sub) => {
              const Icon = sub.icon;
              const acesso = temAcessoSubmodulo(sub, usuario.perfil);
              const ativo = sub.status === "ativo";
              const habilitado = acesso && ativo;
              const cardClasses = cn(
                "group relative rounded-xl border bg-card p-5 transition-all",
                habilitado
                  ? "hover:border-primary/40 hover:shadow-md cursor-pointer"
                  : "opacity-60"
              );

              const inner = (
                <>
                  <div className="flex items-start justify-between mb-3">
                    <div className={cn(
                      "size-10 rounded-md grid place-items-center",
                      habilitado ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      <Icon className="size-5" />
                    </div>
                    {!ativo && (
                      <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                        Em breve
                      </Badge>
                    )}
                    {ativo && !acesso && (
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wider gap-1">
                        <Lock className="size-3" /> Sem acesso
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-base font-semibold">{sub.label}</h2>
                  <p className="text-sm text-muted-foreground mt-1 leading-snug">
                    {sub.descricao}
                  </p>
                </>
              );

              if (habilitado) {
                return (
                  <Link key={sub.key} to={sub.to} className={cardClasses}>
                    {inner}
                  </Link>
                );
              }
              return (
                <div key={sub.key} className={cardClasses} aria-disabled>
                  {inner}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
