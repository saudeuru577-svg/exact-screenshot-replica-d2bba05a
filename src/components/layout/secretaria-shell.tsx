import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, LogOut, ChevronRight, ShieldAlert, Lock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ComingSoon } from "@/components/layout/coming-soon";
import { getSecretaria, getSubmodulo, temAcessoSecretaria } from "@/lib/secretarias";
import { cn } from "@/lib/utils";

export function SecretariaShell({
  secretariaSlug,
  submoduloSlug,
}: {
  secretariaSlug: string;
  submoduloSlug?: string;
}) {
  const navigate = useNavigate();
  const { usuario, signOut } = useAuth();
  const sec = getSecretaria(secretariaSlug);

  if (!usuario || !sec) return null;

  if (!temAcessoSecretaria(sec, usuario.perfil)) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="max-w-md text-center space-y-3">
          <ShieldAlert className="size-10 mx-auto text-warning" />
          <h2 className="text-lg font-semibold">Acesso restrito</h2>
          <p className="text-sm text-muted-foreground">
            A secretaria <strong>{sec.label}</strong> ainda não está liberada para o seu perfil.
          </p>
          <Button variant="outline" onClick={() => navigate({ to: "/inicio" })}>
            Voltar ao Cidade Presente
          </Button>
        </div>
      </div>
    );
  }

  const SecIcon = sec.icon;
  const sub = submoduloSlug ? getSubmodulo(secretariaSlug, submoduloSlug) : undefined;

  return (
    <div className="min-h-screen grid grid-cols-[260px_1fr] bg-muted/30">
      <aside className="border-r bg-sidebar text-sidebar-foreground flex flex-col h-screen sticky top-0">
        <div className="px-5 py-5 flex items-center gap-2.5 border-b border-sidebar-border">
          <div className="size-9 rounded-md bg-primary text-primary-foreground grid place-items-center">
            <SecIcon className="size-5" />
          </div>
          <div className="leading-tight">
            <div className="font-semibold text-sm">{sec.label}</div>
            <div className="text-[11px] text-muted-foreground">Cidade Presente</div>
          </div>
        </div>

        <div className="px-3 pt-3">
          <Link
            to="/inicio"
            className="flex items-center gap-2 px-2.5 py-2 rounded-md text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
          >
            <ArrowLeft className="size-3.5" /> Outras secretarias
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3">
          <div className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Submódulos
          </div>
          <ul className="space-y-0.5">
            <li>
              <Link
                to={sec.to}
                activeOptions={{ exact: true }}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm hover:bg-sidebar-accent/60 data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-accent-foreground data-[status=active]:font-medium"
              >
                <span className="size-1.5 rounded-full bg-muted-foreground/40" />
                <span className="truncate">Visão geral</span>
              </Link>
            </li>
            {sec.submodulos.map((s) => {
              const Icon = s.icon;
              const active = sub?.slug === s.slug;
              return (
                <li key={s.slug}>
                  <Link
                    to={`${sec.to}/${s.slug}`}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm hover:bg-sidebar-accent/60",
                      active && "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="truncate">{s.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <div className="px-2 py-2 mb-2">
            <div className="text-sm font-medium truncate">{usuario.nome}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                {usuario.perfil}
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost" size="sm"
            className="w-full justify-start gap-2"
            onClick={() => signOut().then(() => navigate({ to: "/login" }))}
          >
            <LogOut className="size-4" /> Sair
          </Button>
        </div>
      </aside>

      <main className="min-w-0 flex flex-col">
        <div className="border-b bg-primary text-primary-foreground">
          <div className="px-6 lg:px-8 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-80">
              Cidade Presente
            </div>
            <div className="text-sm font-semibold mt-0.5">
              {sec.label}{sub ? ` · ${sub.label}` : ""}
            </div>
          </div>
        </div>

        <div className="border-b bg-background">
          <nav
            aria-label="breadcrumb"
            className="px-6 lg:px-8 py-2.5 text-xs text-muted-foreground flex items-center gap-1.5"
          >
            <Link to="/inicio" className="hover:underline">Cidade Presente</Link>
            <ChevronRight className="size-3.5 opacity-60" />
            {sub ? (
              <>
                <Link to={sec.to} className="hover:underline">{sec.label}</Link>
                <ChevronRight className="size-3.5 opacity-60" />
                <span className="text-foreground font-medium">{sub.label}</span>
              </>
            ) : (
              <span className="text-foreground font-medium">{sec.label}</span>
            )}
          </nav>
        </div>

        {sub ? (
          <ComingSoon title={sub.label} description={sub.descricao} />
        ) : (
          <SecretariaHub secretariaSlug={secretariaSlug} />
        )}
      </main>
    </div>
  );
}

function SecretariaHub({ secretariaSlug }: { secretariaSlug: string }) {
  const sec = getSecretaria(secretariaSlug);
  if (!sec) return null;
  return (
    <div className="px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">{sec.label}</h1>
        <p className="text-sm text-muted-foreground mt-1">{sec.descricao}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sec.submodulos.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.slug}
              to={`${sec.to}/${s.slug}`}
              className="group rounded-xl border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="size-10 rounded-md grid place-items-center bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <Badge variant="secondary" className="text-[10px] uppercase tracking-wider gap-1">
                  <Lock className="size-3" /> Em breve
                </Badge>
              </div>
              <h2 className="text-base font-semibold">{s.label}</h2>
              <p className="text-sm text-muted-foreground mt-1 leading-snug">{s.descricao}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
