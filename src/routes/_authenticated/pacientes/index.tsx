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
import { ageFromDob, dateBR, maskSUS } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/pacientes/")({
  component: PacientesList,
});

type Paciente = {
  id: string; nome: string; dtn: string; sexo: "masculino" | "feminino";
  nome_da_mae: string; cartao_sus: string | null; zona: "urbana" | "rural";
  bairro: { nome: string } | null; povoado: { nome: string } | null;
};

function PacientesList() {
  const { has } = usePerfil();
  const podeCriar = has(["administrador", "atendente"]);
  const [busca, setBusca] = useState("");
  const [zonaFiltro, setZonaFiltro] = useState("todas");

  const { data = [], isLoading } = useQuery({
    queryKey: ["pacientes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pacientes")
        .select("id, nome, dtn, sexo, nome_da_mae, cartao_sus, zona, bairro:bairros(nome), povoado:povoados(nome)")
        .order("nome").limit(500);
      if (error) throw error;
      return data as unknown as Paciente[];
    },
  });

  const filtered = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return data.filter((p) => {
      if (zonaFiltro !== "todas" && p.zona !== zonaFiltro) return false;
      if (t && !`${p.nome} ${p.nome_da_mae} ${p.cartao_sus ?? ""}`.toLowerCase().includes(t)) return false;
      return true;
    });
  }, [data, busca, zonaFiltro]);

  return (
    <>
      <PageHeader
        title="Pacientes" description="Cadastro municipal de pacientes."
        actions={podeCriar && (
          <Button asChild><Link to="/pacientes/novo"><Plus className="size-4" /> Novo paciente</Link></Button>
        )}
      />
      <PageBody>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, mãe ou cartão SUS" className="pl-9" />
          </div>
          <Select value={zonaFiltro} onValueChange={setZonaFiltro}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as zonas</SelectItem>
              <SelectItem value="urbana">Urbana</SelectItem>
              <SelectItem value="rural">Rural</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-lg bg-card overflow-hidden">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Nome</TableHead><TableHead>Idade</TableHead><TableHead>Sexo</TableHead>
              <TableHead>Mãe</TableHead><TableHead>Cartão SUS</TableHead>
              <TableHead>Zona</TableHead><TableHead>Bairro/Povoado</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={8} className="text-center py-10"><Loader2 className="size-5 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>}
              {!isLoading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">Nenhum paciente encontrado.</TableCell></TableRow>
              )}
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nome}</TableCell>
                  <TableCell className="text-sm">{ageFromDob(p.dtn)} anos</TableCell>
                  <TableCell className="capitalize text-sm">{p.sexo}</TableCell>
                  <TableCell className="text-sm">{p.nome_da_mae}</TableCell>
                  <TableCell className="font-mono text-xs">{p.cartao_sus ? maskSUS(p.cartao_sus) : "—"}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{p.zona}</Badge></TableCell>
                  <TableCell className="text-sm">{p.bairro?.nome ?? p.povoado?.nome ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/pacientes/$id" params={{ id: p.id }}><Eye className="size-4" /></Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Exibindo {filtered.length} de até 500 registros. Refine a busca para ver mais.</p>
        <p className="text-xs text-muted-foreground mt-1">Data atual: {dateBR(new Date().toISOString())}</p>
      </PageBody>
    </>
  );
}
