import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  LayoutDashboard, Users, FileText, Plus, Wallet, BarChart3,
  Building2, Stethoscope, MapPin, ListChecks, Settings, ShieldAlert,
  LogOut, ShieldCheck, Loader2, UserCog,
} from "lucide-react";
import { useAuth, type PerfilUsuario } from "@/hooks/use-auth";
import { useMinhasPermissoes } from "@/hooks/use-permissoes";
import { temAcessoFinal } from "@/lib/telas";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  perfis?: PerfilUsuario[];
};

type NavSection = { label?: string; items: NavItem[] };

const NAV: NavSection[] = [
  {
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Operacional",
    items: [
      { to: "/pacientes", label: "Pacientes", icon: Users, perfis: ["administrador", "secretaria", "atendente"] },
      { to: "/autorizacoes", label: "Autorizações", icon: FileText },
      { to: "/acrescimos/novo", label: "Solicitar acréscimo", icon: Plus, perfis: ["administrador", "secretaria"] },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { to: "/faturamentos", label: "Faturamentos", icon: Wallet, perfis: ["administrador", "financeiro"] },
      { to: "/relatorios", label: "Relatórios", icon: BarChart3, perfis: ["administrador", "secretaria", "financeiro"] },
    ],
  },
  {
    label: "Cadastros",
    items: [
      { to: "/cadastros/ubs", label: "UBS", icon: Building2, perfis: ["administrador"] },
      { to: "/cadastros/profissionais", label: "Profissionais", icon: Stethoscope, perfis: ["administrador"] },
      { to: "/cadastros/empresas", label: "Empresas", icon: Building2, perfis: ["administrador"] },
      { to: "/cadastros/procedimentos", label: "Procedimentos", icon: ListChecks, perfis: ["administrador"] },
      { to: "/cadastros/territorio", label: "Bairros e Povoados", icon: MapPin, perfis: ["administrador"] },
    ],
  },
  {
    label: "Administração",
    items: [
      { to: "/admin/usuarios", label: "Usuários", icon: UserCog, perfis: ["administrador"] },
      { to: "/admin/logs", label: "Logs de auditoria", icon: ShieldAlert, perfis: ["administrador"] },
    ],
  },
];

const PERFIL_LABEL: Record<PerfilUsuario, string> = {
  administrador: "Administrador",
  secretaria: "Secretaria",
  atendente: "Atendente",
  financeiro: "Financeiro",
};

function AuthenticatedLayout() {
  const navigate = useNavigate();
  const { user, usuario, loading, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: overrides } = useMinhasPermissoes();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  if (loading || !user) {
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

  const sections = NAV.map((s) => ({
    ...s,
    items: s.items.filter((i) => !i.perfis || i.perfis.includes(usuario.perfil)),
  })).filter((s) => s.items.length > 0);

  return (
    <div className="min-h-screen grid grid-cols-[260px_1fr] bg-muted/30">
      <aside className="border-r bg-sidebar text-sidebar-foreground flex flex-col h-screen sticky top-0">
        <div className="px-5 py-5 flex items-center gap-2 border-b border-sidebar-border">
          <div className="size-8 rounded-md bg-primary text-primary-foreground grid place-items-center">
            <ShieldCheck className="size-4" />
          </div>
          <div className="leading-tight">
            <div className="font-semibold text-sm">SISMUNA</div>
            <div className="text-[11px] text-muted-foreground">Autorização de Exames</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {sections.map((sec, i) => (
            <div key={i}>
              {sec.label && (
                <div className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {sec.label}
                </div>
              )}
              <ul className="space-y-0.5">
                {sec.items.map((item) => {
                  const active = pathname === item.to || pathname.startsWith(item.to + "/");
                  const Icon = item.icon;
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        className={cn(
                          "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <Icon className="size-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
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

      <main className="min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
