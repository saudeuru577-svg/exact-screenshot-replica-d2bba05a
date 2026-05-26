// Layout institucional do submódulo "Autorização de Exames" — Cidade Presente · SIGESA.
// Contém header do módulo Saúde, breadcrumb, sidebar adaptada (Central de Regulação)
// e gate de perfis. NÃO altera nenhuma tela interna.
import {
  createFileRoute,
  Outlet,
  Link,
  useNavigate,
  useRouterState,
  redirect,
} from "@tanstack/react-router";
import {
  LayoutDashboard, Users, FileText, Plus, Wallet, BarChart3,
  Building2, Stethoscope, MapPin, ListChecks, ShieldAlert,
  LogOut, HeartPulse, UserCog, ChevronRight,
} from "lucide-react";
import { useAuth, type PerfilUsuario } from "@/hooks/use-auth";
import { useMinhasPermissoes } from "@/hooks/use-permissoes";
import { temAcessoFinal, PERFIS_SUBMODULO } from "@/lib/telas";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const BASE = "/saude/regulacao/autorizacao-exames" as const;

export const Route = createFileRoute("/_authenticated/saude/regulacao/autorizacao-exames")({
  beforeLoad: () => {
    // Redireciona o índice do submódulo direto para o Dashboard.
    if (
      typeof window !== "undefined" &&
      window.location.pathname.replace(/\/$/, "") === BASE
    ) {
      throw redirect({ to: `${BASE}/dashboard` });
    }
  },
  component: SubmoduloLayout,
});

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

type NavSection = { label: string; items: NavItem[] };

const NAV: NavSection[] = [
  {
    label: "Central de Regulação",
    items: [
      { to: `${BASE}/dashboard`, label: "Dashboard", icon: LayoutDashboard },
      { to: `${BASE}/pacientes`, label: "Pacientes", icon: Users },
      { to: `${BASE}/autorizacoes`, label: "Autorizações", icon: FileText },
      { to: `${BASE}/acrescimos/novo`, label: "Solicitar acréscimo", icon: Plus },
    ],
  },
  {
    label: "Apoio",
    items: [
      { to: `${BASE}/faturamentos`, label: "Faturamentos", icon: Wallet },
      { to: `${BASE}/relatorios`, label: "Relatórios", icon: BarChart3 },
    ],
  },
  {
    label: "Cadastros",
    items: [
      { to: `${BASE}/cadastros/ubs`, label: "UBS", icon: Building2 },
      { to: `${BASE}/cadastros/profissionais`, label: "Profissionais", icon: Stethoscope },
      { to: `${BASE}/cadastros/empresas`, label: "Empresas", icon: Building2 },
      { to: `${BASE}/cadastros/procedimentos`, label: "Procedimentos", icon: ListChecks },
      { to: `${BASE}/cadastros/territorio`, label: "Bairros e Povoados", icon: MapPin },
    ],
  },
  {
    label: "Administração",
    items: [
      { to: `${BASE}/admin/usuarios`, label: "Usuários", icon: UserCog },
      { to: `${BASE}/admin/logs`, label: "Logs de auditoria", icon: ShieldAlert },
    ],
  },
];

const PERFIL_LABEL: Record<PerfilUsuario, string> = {
  administrador: "Administrador",
  secretaria: "Secretaria",
  atendente: "Atendente",
  financeiro: "Financeiro",
  regulador: "Regulador",
  profissional_ubs: "Profissional de UBS",
};

function SubmoduloLayout() {
  const navigate = useNavigate();
  const { usuario, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: overrides } = useMinhasPermissoes();

  // Gate de submódulo: somente perfis autorizados.
  if (usuario && !PERFIS_SUBMODULO.includes(usuario.perfil)) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="max-w-md text-center space-y-3">
          <ShieldAlert className="size-10 mx-auto text-warning" />
          <h2 className="text-lg font-semibold">Acesso restrito</h2>
          <p className="text-sm text-muted-foreground">
            O submódulo <strong>Autorização de Exames</strong> está disponível apenas para os
            perfis Regulador e Profissional de UBS. Caso precise de acesso, contate um administrador.
          </p>
          <Button variant="outline" onClick={() => signOut().then(() => navigate({ to: "/login" }))}>
            Sair
          </Button>
        </div>
      </div>
    );
  }

  if (!usuario) return null;

  const ov = overrides ?? {};
  const sections = NAV.map((s) => ({
    ...s,
    items: s.items.filter((i) => temAcessoFinal(i.to, usuario.perfil, ov)),
  })).filter((s) => s.items.length > 0);

  return (
    <div className="min-h-screen grid grid-cols-[260px_1fr] bg-muted/30">
      {/* Sidebar */}
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

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {sections.map((sec, i) => (
            <div key={i}>
              <div className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {sec.label}
              </div>
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

      {/* Conteúdo */}
      <main className="min-w-0 flex flex-col">
        {/* Header institucional do módulo Saúde */}
        <div className="border-b bg-primary text-primary-foreground">
          <div className="px-6 lg:px-8 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-80">
              Cidade Presente · SIGESA
            </div>
            <div className="text-sm font-semibold mt-0.5">Saúde · Central de Regulação</div>
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="border-b bg-background">
          <nav
            aria-label="breadcrumb"
            className="px-6 lg:px-8 py-2.5 text-xs text-muted-foreground flex items-center gap-1.5"
          >
            <span>Saúde</span>
            <ChevronRight className="size-3.5 opacity-60" />
            <span>Central de Regulação</span>
            <ChevronRight className="size-3.5 opacity-60" />
            <span className="text-foreground font-medium">Autorização de Exames</span>
          </nav>
        </div>

        <Outlet />
      </main>
    </div>
  );
}
