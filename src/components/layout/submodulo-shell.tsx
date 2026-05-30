import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, HeartPulse, LogOut, ChevronRight } from "lucide-react";
import { useAuth, type PerfilUsuario } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ComingSoon } from "@/components/layout/coming-soon";
import { SUBMODULOS_SAUDE, temAcessoSubmodulo } from "@/lib/modulos-saude";
import { ShieldAlert } from "lucide-react";

const PERFIL_LABEL: Record<PerfilUsuario, string> = {
  administrador: "Administrador",
  secretaria: "Secretaria",
  atendente: "Atendente",
  financeiro: "Financeiro",
  regulador: "Regulador",
  profissional_ubs: "Profissional de UBS",
  agente_saude: "Agente de Saúde",
  enfermeiro_ubs: "Enfermeiro(a) UBS",
  farmaceutico: "Farmacêutico(a)",
  agendador: "Agendador(a)",
  vigilancia_sanitaria: "Vigilância Sanitária",
  gestor_saude: "Gestor(a) de Saúde",
};

export function SubmoduloShell({
  slug,
  description,
}: {
  slug: string;
  description?: string;
}) {
  const navigate = useNavigate();
  const { usuario, signOut } = useAuth();
  const sub = SUBMODULOS_SAUDE.find((s) => s.slug === slug);

  if (!usuario || !sub) return null;

  if (!temAcessoSubmodulo(sub, usuario.perfil)) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="max-w-md text-center space-y-3">
          <ShieldAlert className="size-10 mx-auto text-warning" />
          <h2 className="text-lg font-semibold">Acesso restrito</h2>
          <p className="text-sm text-muted-foreground">
            O submódulo <strong>{sub.label}</strong> não está disponível para o seu perfil.
          </p>
          <Button variant="outline" onClick={() => navigate({ to: "/saude" })}>
            Voltar para Saúde
          </Button>
        </div>
      </div>
    );
  }

  const Icon = sub.icon;

  return (
    <div className="min-h-screen grid grid-cols-[260px_1fr] bg-muted/30">
      <aside className="border-r bg-sidebar text-sidebar-foreground flex flex-col h-screen sticky top-0">
        <div className="px-5 py-5 flex items-center gap-2.5 border-b border-sidebar-border">
          <div className="size-9 rounded-md bg-primary text-primary-foreground grid place-items-center">
            <HeartPulse className="size-5" />
          </div>
          <div className="leading-tight">
            <div className="font-semibold text-sm">SIGESA · Saúde</div>
            <div className="text-[11px] text-muted-foreground">Cidade Presente</div>
          </div>
        </div>

        <div className="px-3 pt-3">
          <Link
            to="/saude"
            className="flex items-center gap-2 px-2.5 py-2 rounded-md text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
          >
            <ArrowLeft className="size-3.5" /> Outros módulos de Saúde
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3">
          <div className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {sub.label}
          </div>
          <ul>
            <li>
              <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm bg-sidebar-accent text-sidebar-accent-foreground font-medium">
                <Icon className="size-4 shrink-0" />
                <span className="truncate">Visão geral</span>
              </div>
            </li>
          </ul>
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <div className="px-2 py-2 mb-2">
            <div className="text-sm font-medium truncate">{usuario.nome}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                {PERFIL_LABEL[usuario.perfil]}
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
              Cidade Presente · SIGESA
            </div>
            <div className="text-sm font-semibold mt-0.5">Saúde · {sub.label}</div>
          </div>
        </div>

        <div className="border-b bg-background">
          <nav
            aria-label="breadcrumb"
            className="px-6 lg:px-8 py-2.5 text-xs text-muted-foreground flex items-center gap-1.5"
          >
            <Link to="/saude" className="hover:underline">Saúde</Link>
            <ChevronRight className="size-3.5 opacity-60" />
            <span className="text-foreground font-medium">{sub.label}</span>
          </nav>
        </div>

        <ComingSoon
          title={sub.label}
          description={description ?? sub.descricao}
        />
      </main>
    </div>
  );
}
