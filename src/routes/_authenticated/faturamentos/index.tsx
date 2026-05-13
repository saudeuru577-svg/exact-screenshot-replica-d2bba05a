import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Search, Play, FileCheck2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageBody } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { usePerfil } from "@/hooks/use-perfil";

export const Route = createFileRoute("/_authenticated/faturamentos/")({
  component: FaturamentosList,
});

type Empresa = { id: string; nome_fantasia: string; ativa: boolean };
type FatRow = {
  id: string;
  empresa_id: string;
  status: string;
  total_itens: number;
  total_pendentes: number;
};

function mesAtual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function FaturamentosList() {
  const { has } = usePerfil();
  const podeConferir = has(["administrador", "financeiro"]);
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [mes, setMes] = useState(mesAtual());

  const { data: empresas = [], isLoading: loadingEmpresas } = useQuery({
    queryKey: ["faturamento-empresas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresas")
        .select("id, nome_fantasia, ativa")
        .eq("ativa", true)
        .order("nome_fantasia");
      if (error) throw error;
      return data as Empresa[];
    },
  });

  const { data: faturamentos = [] } = useQuery({
    queryKey: ["faturamentos", mes],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faturamentos")
        .select("id, empresa_id, status, total_itens, total_pendentes")
        .eq("mes_referencia", mes);
      if (error) throw error;
      return data as FatRow[];
    },
  });

  const fatPorEmpresa = useMemo(() => {
    const m = new Map<string, FatRow>();
    for (const f of faturamentos) {
      // se já existe um aberto, prioriza; caso contrário pega qualquer
      const cur = m.get(f.empresa_id);
      if (!cur || f.status === "aberto") m.set(f.empresa_id, f);
    }
    return m;
  }, [faturamentos]);

  const lista = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return empresas.filter((e) => !t || e.nome_fantasia.toLowerCase().includes(t));
  }, [empresas, busca]);

  const abrirMut = useMutation({
    mutationFn: async (empresaId: string) => {
      const { data, error } = await supabase.rpc("abrir_faturamento", {
        p_empresa: empresaId,
        p_mes: mes,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (_id, empresaId) => {
      navigate({ to: "/faturamentos/$empresaId", params: { empresaId }, search: { mes } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        title="Faturamento"
        description="Selecione uma empresa para iniciar a conferência do mês."
      />
      <PageBody>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar empresa…"
              className="pl-9"
            />
          </div>
          <Input
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="sm:w-48"
          />
        </div>

        {loadingEmpresas ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="size-5 animate-spin mr-2" /> Carregando…
          </div>
        ) : lista.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">Nenhuma empresa encontrada.</div>
        ) : (
          <div className="grid gap-3">
            {lista.map((e) => {
              const f = fatPorEmpresa.get(e.id);
              return (
                <Card key={e.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{e.nome_fantasia}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      {!f && <Badge variant="outline">Sem faturamento</Badge>}
                      {f?.status === "aberto" && (
                        <>
                          <Badge>Em conferência</Badge>
                          <span>
                            {f.total_pendentes} de {f.total_itens} pendentes
                          </span>
                        </>
                      )}
                      {f?.status === "finalizado" && (
                        <>
                          <Badge variant="secondary">
                            <FileCheck2 className="size-3 mr-1" />
                            Finalizado
                          </Badge>
                          <span>{f.total_itens} itens</span>
                        </>
                      )}
                    </div>
                  </div>
                  {podeConferir && (
                    <Button
                      onClick={() => abrirMut.mutate(e.id)}
                      disabled={abrirMut.isPending || f?.status === "finalizado"}
                    >
                      {abrirMut.isPending && abrirMut.variables === e.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Play className="size-4" />
                      )}
                      {f?.status === "aberto" ? "Continuar" : "Conferir"}
                    </Button>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </PageBody>
    </>
  );
}
