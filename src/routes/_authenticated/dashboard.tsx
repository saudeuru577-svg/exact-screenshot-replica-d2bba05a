import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Wallet, TrendingUp, AlertTriangle, FileCheck, ArrowUpRight, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageBody } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

const LIMITE_BASE = 130000;
const fmtMoney = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

async function fetchDashboard() {
  const now = new Date();
  const ano = now.getFullYear();
  const mes = String(now.getMonth() + 1).padStart(2, "0");
  const inicio = `${ano}-${mes}-01`;
  const fimDate = new Date(ano, now.getMonth() + 1, 0);
  const fim = `${ano}-${mes}-${String(fimDate.getDate()).padStart(2, "0")}`;
  const mesRef = `${ano}-${mes}`;

  const [autoMes, acres, ultimas] = await Promise.all([
    supabase
      .from("autorizacoes")
      .select("total_autorizado, status")
      .gte("data_autorizacao", inicio)
      .lte("data_autorizacao", fim)
      .in("status", ["pendente", "aprovado", "faturado"]),
    supabase
      .from("acrescimos_gastos")
      .select("novo_limite, limite_atual")
      .eq("mes_referencia", mesRef)
      .eq("status", "aprovado"),
    supabase
      .from("autorizacoes")
      .select("id, num_aut, data_autorizacao, total_autorizado, status")
      .order("criado_em", { ascending: false })
      .limit(8),
  ]);

  const totalMes = (autoMes.data ?? []).reduce(
    (s, a) => s + Number(a.total_autorizado ?? 0), 0
  );
  const acrescimos = (acres.data ?? []).reduce(
    (s, a) => s + Math.max(0, Number(a.novo_limite ?? 0) - Number(a.limite_atual ?? 0)), 0
  );
  const limiteAtual = LIMITE_BASE + acrescimos;
  const saldo = limiteAtual - totalMes;

  return { totalMes, acrescimos, limiteAtual, saldo, ultimas: ultimas.data ?? [] };
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  aprovado: "default",
  pendente: "secondary",
  faturado: "outline",
  bloqueado: "destructive",
  cancelado: "destructive",
  negado: "destructive",
};

function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
  });

  const saldoCritico = data ? data.saldo <= data.limiteAtual * 0.1 : false;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Visão geral do orçamento mensal e atividades recentes."
      />
      <PageBody>
        {isLoading || !data ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                label="Limite atual"
                value={fmtMoney(data.limiteAtual)}
                hint={`Base ${fmtMoney(LIMITE_BASE)} + acréscimos`}
                icon={Wallet}
              />
              <KpiCard
                label="Acréscimos no mês"
                value={fmtMoney(data.acrescimos)}
                hint="Aprovados pelo administrador"
                icon={TrendingUp}
              />
              <KpiCard
                label="Total autorizado"
                value={fmtMoney(data.totalMes)}
                hint="Pendentes, aprovadas e faturadas"
                icon={FileCheck}
              />
              <KpiCard
                label="Saldo disponível"
                value={fmtMoney(data.saldo)}
                hint={saldoCritico ? "≤ 10% do limite — atenção!" : "Disponível para novas autorizações"}
                icon={AlertTriangle}
                tone={saldoCritico ? "danger" : "default"}
              />
            </div>

            <Card className="mt-6">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Últimas autorizações</CardTitle>
                <Link
                  to="/autorizacoes"
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                >
                  Ver todas <ArrowUpRight className="size-3.5" />
                </Link>
              </CardHeader>
              <CardContent>
                {data.ultimas.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    Nenhuma autorização emitida ainda.
                  </p>
                ) : (
                  <div className="overflow-hidden rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40 text-muted-foreground">
                        <tr className="text-left">
                          <th className="px-3 py-2 font-medium">Número</th>
                          <th className="px-3 py-2 font-medium">Data</th>
                          <th className="px-3 py-2 font-medium">Status</th>
                          <th className="px-3 py-2 font-medium text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.ultimas.map((a) => (
                          <tr key={a.id} className="border-t">
                            <td className="px-3 py-2 font-mono text-xs">{a.num_aut}</td>
                            <td className="px-3 py-2">
                              {new Date(a.data_autorizacao).toLocaleDateString("pt-BR")}
                            </td>
                            <td className="px-3 py-2">
                              <Badge variant={STATUS_VARIANT[a.status] ?? "secondary"}>
                                {a.status}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-right font-medium">
                              {fmtMoney(Number(a.total_autorizado ?? 0))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </PageBody>
    </>
  );
}

function KpiCard({
  label, value, hint, icon: Icon, tone = "default",
}: {
  label: string; value: string; hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "danger";
}) {
  return (
    <Card className={cn(tone === "danger" && "border-destructive/40 bg-destructive/5")}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {label}
            </div>
            <div className={cn(
              "text-2xl font-semibold tabular-nums",
              tone === "danger" && "text-destructive"
            )}>
              {value}
            </div>
            {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
          </div>
          <div className={cn(
            "size-9 rounded-md grid place-items-center",
            tone === "danger" ? "bg-destructive/10 text-destructive" : "bg-primary-soft text-primary"
          )}>
            <Icon className="size-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
