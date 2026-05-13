import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageBody } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { confirm } from "@/components/ui/confirm";
import { usePerfil } from "@/hooks/use-perfil";
import { useAuth } from "@/hooks/use-auth";
import { brl, dateBR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/autorizacoes/$id/editar")({
  component: EditarAutorizacao,
});

const STATUSES = ["pendente", "aprovado", "bloqueado", "cancelado", "faturado"] as const;

type ItemRow = {
  id?: string; // existing item id (undefined for new)
  procedimento_id: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
};

type Aut = {
  id: string; num_aut: string; status: string;
  data_autorizacao: string; sintomas: string | null;
  total_autorizado: number; criado_por: string;
  empresa_id: string;
  paciente: { nome: string } | null;
  empresa: { nome_fantasia: string } | null;
};

function EditarAutorizacao() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isAdmin, has } = usePerfil();
  const userId = useAuth((s) => s.user?.id);

  const [dataAut, setDataAut] = useState("");
  const [sintomas, setSintomas] = useState("");
  const [status, setStatus] = useState<string>("pendente");
  const [itens, setItens] = useState<ItemRow[]>([]);
  const [removidos, setRemovidos] = useState<string[]>([]);
  const [hidratado, setHidratado] = useState(false);

  const { data: aut, isLoading, error } = useQuery({
    queryKey: ["autorizacao", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("autorizacoes")
        .select(`
          id, num_aut, status, data_autorizacao, sintomas, total_autorizado, criado_por, empresa_id,
          paciente:pacientes(nome),
          empresa:empresas(nome_fantasia)
        `)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as unknown as Aut;
    },
  });

  const { data: itensDb = [] } = useQuery({
    queryKey: ["autorizacao-itens", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itens_autorizacao")
        .select("id, procedimento_id, descricao, quantidade, valor_unitario")
        .eq("autorizacao_id", id)
        .order("criado_em", { ascending: true });
      if (error) throw error;
      return data as ItemRow[];
    },
  });

  const { data: procs = [] } = useQuery({
    queryKey: ["procs-empresa", aut?.empresa_id],
    queryFn: async () => {
      if (!aut?.empresa_id) return [];
      const { data, error } = await supabase
        .from("procedimentos")
        .select("id, sigla, nome, valor_unitario")
        .eq("empresa_id", aut.empresa_id).eq("ativo", true)
        .order("nome");
      if (error) throw error; return data;
    },
    enabled: !!aut?.empresa_id,
  });

  // hydrate state once
  useEffect(() => {
    if (!aut || hidratado) return;
    setDataAut(aut.data_autorizacao.slice(0, 10));
    setSintomas(aut.sintomas ?? "");
    setStatus(aut.status);
    setHidratado(true);
  }, [aut, hidratado]);

  useEffect(() => {
    if (hidratado && itens.length === 0 && itensDb.length > 0) {
      setItens(itensDb.map((i) => ({
        id: i.id, procedimento_id: i.procedimento_id, descricao: i.descricao,
        quantidade: Number(i.quantidade), valor_unitario: Number(i.valor_unitario),
      })));
    }
  }, [itensDb, hidratado, itens.length]);

  const total = useMemo(
    () => itens.reduce((s, i) => s + Number(i.quantidade) * Number(i.valor_unitario), 0),
    [itens],
  );

  const podeEditar = !!aut && (
    isAdmin || (aut.status === "pendente" && has(["atendente"]) && aut.criado_por === userId)
  );

  const updateItem = (idx: number, patch: Partial<ItemRow>) =>
    setItens(itens.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const removeItem = (idx: number) => {
    const it = itens[idx];
    if (it.id) setRemovidos([...removidos, it.id]);
    setItens(itens.filter((_, i) => i !== idx));
  };

  const addItem = () =>
    setItens([...itens, { procedimento_id: "", descricao: "", quantidade: 1, valor_unitario: 0 }]);

  const onProcedimento = (idx: number, procId: string) => {
    const p = procs.find((x) => x.id === procId);
    updateItem(idx, {
      procedimento_id: procId,
      descricao: p?.nome ?? "",
      valor_unitario: p ? Number(p.valor_unitario) : 0,
    });
  };

  const salvar = useMutation({
    mutationFn: async () => {
      if (!aut) throw new Error("Autorização não carregada");
      if (itens.length === 0) throw new Error("Adicione ao menos um item");
      if (itens.some((i) => !i.procedimento_id || i.quantidade < 1)) {
        throw new Error("Preencha procedimento e quantidade em todos os itens");
      }
      if (dataAut > new Date().toISOString().slice(0, 10)) {
        throw new Error("Data não pode ser futura");
      }

      // Delete removed items
      if (removidos.length > 0) {
        const { error } = await supabase.from("itens_autorizacao").delete().in("id", removidos);
        if (error) throw error;
      }

      // Update existing items
      for (const it of itens.filter((x) => x.id)) {
        const { error } = await supabase.from("itens_autorizacao").update({
          quantidade: it.quantidade,
          valor_unitario: it.valor_unitario,
          valor_total: it.quantidade * it.valor_unitario,
          procedimento_id: it.procedimento_id,
          descricao: it.descricao,
        }).eq("id", it.id!);
        if (error) throw error;
      }

      // Insert new items
      const novos = itens.filter((x) => !x.id);
      if (novos.length > 0) {
        const { error } = await supabase.from("itens_autorizacao").insert(
          novos.map((it) => ({
            autorizacao_id: aut.id, procedimento_id: it.procedimento_id,
            descricao: it.descricao, quantidade: it.quantidade,
            valor_unitario: it.valor_unitario,
            valor_total: it.quantidade * it.valor_unitario,
          })),
        );
        if (error) throw error;
      }

      // Update autorizacao
      const patch: Record<string, unknown> = {
        data_autorizacao: dataAut,
        sintomas: sintomas.trim() || null,
        total_autorizado: total,
      };
      if (isAdmin && status !== aut.status) patch.status = status;

      const { data: updated, error: upErr } = await supabase
        .from("autorizacoes").update(patch).eq("id", aut.id)
        .select("id, status, num_aut").single();
      if (upErr) throw upErr;
      return updated;
    },
    onSuccess: (a) => {
      qc.invalidateQueries({ queryKey: ["autorizacoes"] });
      qc.invalidateQueries({ queryKey: ["autorizacao", id] });
      qc.invalidateQueries({ queryKey: ["autorizacao-itens", id] });
      if (a.status === "bloqueado") {
        toast.warning(`${a.num_aut} agora está BLOQUEADA — limite mensal excedido.`);
      } else {
        toast.success("Alterações salvas");
      }
      navigate({ to: "/autorizacoes/$id", params: { id: a.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSalvar = async () => {
    const ok = await confirm({
      title: "Salvar alterações?",
      description: "O PDF original não será regenerado. O total e o status podem mudar conforme as regras de limite mensal.",
      confirmLabel: "Salvar",
    });
    if (ok) salvar.mutate();
  };

  if (isLoading) {
    return (
      <PageBody>
        <div className="grid place-items-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </PageBody>
    );
  }

  if (error || !aut) {
    return (
      <PageBody>
        <div className="max-w-xl mx-auto text-center space-y-3 py-20">
          <p className="text-destructive font-medium">Autorização não encontrada.</p>
          <Button variant="outline" asChild>
            <Link to="/autorizacoes"><ArrowLeft className="size-4" /> Voltar</Link>
          </Button>
        </div>
      </PageBody>
    );
  }

  if (!podeEditar) {
    return (
      <>
        <PageHeader title={`Editar ${aut.num_aut}`} />
        <PageBody>
          <Card>
            <CardContent className="p-6 space-y-3">
              <p className="text-sm text-muted-foreground">
                Você não tem permissão para editar esta autorização.
                Atendentes só podem editar autorizações pendentes que eles próprios emitiram.
              </p>
              <Button variant="outline" asChild>
                <Link to="/autorizacoes/$id" params={{ id: aut.id }}>
                  <ArrowLeft className="size-4" /> Voltar à visualização
                </Link>
              </Button>
            </CardContent>
          </Card>
        </PageBody>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`Editar ${aut.num_aut}`}
        description={`${aut.paciente?.nome ?? "—"} · ${aut.empresa?.nome_fantasia ?? "—"}`}
        actions={
          <Button variant="outline" asChild>
            <Link to="/autorizacoes/$id" params={{ id: aut.id }}>
              <ArrowLeft className="size-4" /> Cancelar
            </Link>
          </Button>
        }
      />
      <PageBody>
        <div className="max-w-4xl mx-auto space-y-4">
          <Card>
            <CardContent className="p-6 grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Data da autorização</Label>
                <Input type="date" value={dataAut} onChange={(e) => setDataAut(e.target.value)}
                  max={new Date().toISOString().slice(0, 10)} />
                <p className="text-xs text-muted-foreground">Original: {dateBR(aut.data_autorizacao)}</p>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                {isAdmin ? (
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="h-9 px-3 flex items-center">
                    <Badge variant="secondary" className="capitalize">{status}</Badge>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Total atual</Label>
                <div className="h-9 px-3 flex items-center font-semibold tabular-nums">
                  {brl(total)}
                </div>
              </div>
              <div className="md:col-span-3 space-y-2">
                <Label>Sintomas / indicação</Label>
                <Textarea value={sintomas} onChange={(e) => setSintomas(e.target.value)}
                  maxLength={500} rows={3} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Procedimentos
                </p>
                <Button size="sm" variant="outline" onClick={addItem}>
                  <Plus className="size-4" /> Adicionar item
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="p-2">Procedimento</th>
                      <th className="p-2 w-20">Qtd</th>
                      <th className="p-2 w-32">V. Unit.</th>
                      <th className="p-2 w-32 text-right">Total</th>
                      <th className="p-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.length === 0 && (
                      <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">
                        Nenhum item. Adicione ao menos um.
                      </td></tr>
                    )}
                    {itens.map((it, idx) => (
                      <tr key={it.id ?? `new-${idx}`} className="border-t">
                        <td className="p-2">
                          <Select value={it.procedimento_id} onValueChange={(v) => onProcedimento(idx, v)}>
                            <SelectTrigger className="h-8"><SelectValue placeholder="Selecione" /></SelectTrigger>
                            <SelectContent>
                              {procs.map((p) => (
                                <SelectItem key={p.id} value={p.id}>{p.sigla} — {p.nome}</SelectItem>
                              ))}
                              {/* Garante que procedimentos antigos/desativados continuam visíveis */}
                              {it.procedimento_id && !procs.find((p) => p.id === it.procedimento_id) && (
                                <SelectItem value={it.procedimento_id}>{it.descricao} (atual)</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2">
                          <Input type="number" min={1} value={it.quantidade} className="h-8"
                            onChange={(e) => updateItem(idx, { quantidade: Math.max(1, parseInt(e.target.value) || 1) })} />
                        </td>
                        <td className="p-2">
                          <Input type="number" min={0} step="0.01" value={it.valor_unitario} className="h-8"
                            onChange={(e) => updateItem(idx, { valor_unitario: Math.max(0, parseFloat(e.target.value) || 0) })} />
                        </td>
                        <td className="p-2 text-right tabular-nums">
                          {brl(it.quantidade * it.valor_unitario)}
                        </td>
                        <td className="p-2">
                          <Button size="icon" variant="ghost" onClick={() => removeItem(idx)} aria-label="Remover">
                            <Trash2 className="size-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" asChild>
              <Link to="/autorizacoes/$id" params={{ id: aut.id }}>Cancelar</Link>
            </Button>
            <Button onClick={handleSalvar} disabled={salvar.isPending}>
              {salvar.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Salvar alterações
            </Button>
          </div>
        </div>
      </PageBody>
    </>
  );
}
