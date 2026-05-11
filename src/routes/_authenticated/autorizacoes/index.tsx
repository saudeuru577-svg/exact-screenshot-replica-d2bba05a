import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Loader2, Eye } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageBody } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { usePerfil } from "@/hooks/use-perfil";
import { brl, dateBR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/autorizacoes/")({
  component: AutorizacoesList,
});

const STATUSES = ["pendente", "aprovado", "bloqueado", "cancelado", "faturado"] as const;
const VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pendente: "secondary", aprovado: "default", bloqueado: "destructive",
  cancelado: "outline", faturado: "default",
};

type Aut = {
  id: string; num_aut: string; data_autorizacao: string;
  total_autorizado: number; status: string;
  paciente: { nome: string } | null;
  empresa: { nome_fantasia: string } | null;
  ubs: { nome_posto: string } | null;
};

function AutorizacoesList() {
  const { has } = usePerfil();
  const podeCriar = has(["administrador", "atendente"]);
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("todos");

  const { data = [], isLoading } = useQuery({
    queryKey: ["autorizacoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("autorizacoes")
        .select("id, num_aut, data_autorizacao, total_autorizado, status, paciente:pacientes(nome), empresa:empresas(nome_fantasia), ubs:ubs(nome_posto)")
        .order("data_autorizacao", { ascending: false }).limit(500);
      if (error) throw error;
      return data as unknown as Aut[];
    },
  });

  const filtered = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return data.filter((a) => {
      if (status !== "todos" && a.status !== status) return false;
      if (t && !`${a.num_aut} ${a.paciente?.nome ?? ""}`.toLowerCase().includes(t)) return false;
      return true;
    });
  }, [data, busca, status]);

  return (
    <>
      <PageHeader
        title="Autorizações" description="Histórico e emissão de autorizações de exames e consultas."
        actions={podeCriar && (
          <Button asChild><Link to="/autorizacoes/nova"><Plus className="size-4" /> Nova autorização</Link></Button>
        )}
      />
      <PageBody>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por número ou paciente" className="pl-9" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-lg bg-card overflow-hidden">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Nº</TableHead><TableHead>Data</TableHead><TableHead>Paciente</TableHead>
              <TableHead>Empresa</TableHead><TableHead>UBS</TableHead>
              <TableHead className="text-right">Total</TableHead><TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={8} className="text-center py-10"><Loader2 className="size-5 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>}
              {!isLoading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">Nenhuma autorização encontrada.</TableCell></TableRow>
              )}
              {filtered.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-xs">{a.num_aut}</TableCell>
                  <TableCell>{dateBR(a.data_autorizacao)}</TableCell>
                  <TableCell className="font-medium">{a.paciente?.nome ?? "—"}</TableCell>
                  <TableCell className="text-sm">{a.empresa?.nome_fantasia ?? "—"}</TableCell>
                  <TableCell className="text-sm">{a.ubs?.nome_posto ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{brl(Number(a.total_autorizado))}</TableCell>
                  <TableCell><Badge variant={VARIANTS[a.status] ?? "secondary"} className="capitalize">{a.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/autorizacoes/$id" params={{ id: a.id }}><Eye className="size-4" /></Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </PageBody>
    </>
  );
}
