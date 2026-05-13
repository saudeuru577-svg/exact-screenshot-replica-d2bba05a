import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ArrowLeft, Check, XCircle, StopCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageBody } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { brl, dateBR } from "@/lib/format";
import { usePerfil } from "@/hooks/use-perfil";

const search = z.object({ mes: z.string().regex(/^\d{4}-\d{2}$/).optional() });

export const Route = createFileRoute("/_authenticated/faturamentos/$empresaId")({
  validateSearch: search,
  component: ConferenciaFaturamento,
});

type Item = {
  id: string;
  autorizacao_id: string;
  descricao: string;
  valor_total: number;
  status_faturamento: "pendente" | "confirmado" | "glosado";
  motivo_glosa_id: string | null;
  observacao_glosa: string | null;
  procedimentos: { nome: string } | null;
  autorizacoes: {
    num_aut: string;
    data_autorizacao: string;
    pacientes: { nome: string } | null;
  } | null;
};

type Faturamento = {
  id: string;
  empresa_id: string;
  mes_referencia: string;
  status: string;
  total_itens: number;
  total_pendentes: number;
  valor_confirmado: number;
  valor_glosado: number;
  empresa: { nome_fantasia: string } | null;
};

function ConferenciaFaturamento() {
  const { empresaId } = Route.useParams();
  const { mes } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { has } = usePerfil();
  const podeEditar = has(["administrador", "financeiro"]);

  const { data: faturamento, isLoading: loadingFat } = useQuery({
    queryKey: ["faturamento", empresaId, mes],
    queryFn: async () => {
      let q = supabase
        .from("faturamentos")
        .select("id, empresa_id, mes_referencia, status, total_itens, total_pendentes, valor_confirmado, valor_glosado, empresa:empresas(nome_fantasia)")
        .eq("empresa_id", empresaId)
        .order("iniciado_em", { ascending: false })
        .limit(1);
      if (mes) q = q.eq("mes_referencia", mes);
      const { data, error } = await q.maybeSingle();
      if (error) throw error;
      return data as unknown as Faturamento | null;
    },
  });

  const fatId = faturamento?.id;

  const { data: itens = [], isLoading: loadingItens } = useQuery({
    enabled: !!fatId,
    queryKey: ["faturamento-itens", fatId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itens_autorizacao")
        .select("id, autorizacao_id, descricao, valor_total, status_faturamento, motivo_glosa_id, observacao_glosa, procedimentos(nome), autorizacoes(num_aut, data_autorizacao, pacientes(nome))")
        .eq("faturamento_id", fatId!)
        .order("autorizacao_id");
      if (error) throw error;
      return data as unknown as Item[];
    },
  });

  const grupos = useMemo(() => {
    const m = new Map<string, { aut: Item["autorizacoes"]; itens: Item[] }>();
    for (const it of itens) {
      const g = m.get(it.autorizacao_id) ?? { aut: it.autorizacoes, itens: [] };
      g.itens.push(it);
      m.set(it.autorizacao_id, g);
    }
    return Array.from(m.entries()).map(([autorizacao_id, g]) => ({ autorizacao_id, ...g }));
  }, [itens]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["faturamento", empresaId] });
    qc.invalidateQueries({ queryKey: ["faturamento-itens", fatId] });
  };

  const confirmarMut = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("itens_autorizacao")
        .update({
          status_faturamento: "confirmado",
          motivo_glosa_id: null,
          observacao_glosa: null,
          data_conferencia: new Date().toISOString(),
        })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const glosarMut = useMutation({
    mutationFn: async (p: { id: string; motivo_glosa_id: string; observacao: string }) => {
      const { error } = await supabase
        .from("itens_autorizacao")
        .update({
          status_faturamento: "glosado",
          motivo_glosa_id: p.motivo_glosa_id,
          observacao_glosa: p.observacao || null,
          data_conferencia: new Date().toISOString(),
        })
        .eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Glosa registrada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const finalizarMut = useMutation({
    mutationFn: async () => {
      if (!fatId) return;
      const { error } = await supabase
        .from("faturamentos")
        .update({
          status: "finalizado",
          finalizado_em: new Date().toISOString(),
        })
        .eq("id", fatId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Faturamento finalizado");
      navigate({ to: "/faturamentos" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [glosaItem, setGlosaItem] = useState<Item | null>(null);

  if (loadingFat) {
    return (
      <PageBody>
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="size-5 animate-spin mr-2" /> Carregando…
        </div>
      </PageBody>
    );
  }

  if (!faturamento) {
    return (
      <>
        <PageHeader title="Conferência" actions={<Link to="/faturamentos"><Button variant="outline"><ArrowLeft className="size-4" /> Voltar</Button></Link>} />
        <PageBody>
          <Card className="p-8 text-center text-muted-foreground">
            Nenhum faturamento encontrado para esta empresa.
          </Card>
        </PageBody>
      </>
    );
  }

  const finalizado = faturamento.status !== "aberto";
  const conferidos = faturamento.total_itens - faturamento.total_pendentes;

  return (
    <>
      <PageHeader
        title={faturamento.empresa?.nome_fantasia ?? "Conferência"}
        description={`Mês de referência: ${faturamento.mes_referencia}`}
        actions={
          <Link to="/faturamentos">
            <Button variant="outline" size="sm"><ArrowLeft className="size-4" /> Voltar</Button>
          </Link>
        }
      />
      <PageBody>
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Centro */}
          <div className="space-y-4">
            {loadingItens ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="size-5 animate-spin mr-2" /> Carregando itens…
              </div>
            ) : grupos.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                Nenhum item vinculado a este faturamento.
              </Card>
            ) : grupos.map((g) => {
              const pendentes = g.itens.filter((i) => i.status_faturamento === "pendente");
              return (
                <Card key={g.autorizacao_id} className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3 pb-3 border-b">
                    <div className="min-w-0">
                      <div className="font-medium">{g.aut?.num_aut}</div>
                      <div className="text-sm text-muted-foreground">
                        {g.aut?.pacientes?.nome} · {dateBR(g.aut?.data_autorizacao)}
                      </div>
                    </div>
                    {podeEditar && !finalizado && pendentes.length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => confirmarMut.mutate(pendentes.map((p) => p.id))}
                        disabled={confirmarMut.isPending}
                      >
                        Confirmar todos
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {g.itens.map((it) => (
                      <div key={it.id} className="flex items-center gap-3 py-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{it.procedimentos?.nome ?? it.descricao}</div>
                          <div className="text-sm text-muted-foreground truncate">
                            {g.aut?.pacientes?.nome}
                          </div>
                        </div>
                        <div className="text-sm font-medium tabular-nums">{brl(it.valor_total)}</div>
                        <StatusBadge status={it.status_faturamento} />
                        {podeEditar && !finalizado && it.status_faturamento === "pendente" && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => confirmarMut.mutate([it.id])}
                              disabled={confirmarMut.isPending}
                            >
                              <Check className="size-4" /> Confirmar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setGlosaItem(it)}
                            >
                              <XCircle className="size-4" /> Glosar
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Painel lateral */}
          <aside className="lg:sticky lg:top-4 self-start">
            <Card className="p-5 space-y-4">
              <div>
                <div className="text-xs text-muted-foreground">Empresa</div>
                <div className="font-medium">{faturamento.empresa?.nome_fantasia}</div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <Stat label="Itens" value={faturamento.total_itens} />
                <Stat label="Conferidos" value={conferidos} />
                <Stat label="Pendentes" value={faturamento.total_pendentes} />
              </div>

              <div className="border-t pt-3 space-y-2">
                <Row label="Confirmado" value={brl(faturamento.valor_confirmado)} positive />
                <Row label="Glosado" value={brl(faturamento.valor_glosado)} negative />
              </div>

              {podeEditar && !finalizado && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="w-full" disabled={faturamento.total_pendentes > 0}>
                      <StopCircle className="size-4" /> Parar e finalizar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Finalizar faturamento?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Após finalizado, não será mais possível alterar a conferência deste mês.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => finalizarMut.mutate()}>
                        Finalizar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {faturamento.total_pendentes > 0 && podeEditar && !finalizado && (
                <p className="text-xs text-muted-foreground text-center">
                  Confira ou glose todos os itens para finalizar.
                </p>
              )}

              {finalizado && (
                <Badge variant="secondary" className="w-full justify-center">
                  Faturamento {faturamento.status}
                </Badge>
              )}
            </Card>
          </aside>
        </div>
      </PageBody>

      <GlosaDialog
        item={glosaItem}
        onClose={() => setGlosaItem(null)}
        onSave={(motivo, observacao) => {
          if (!glosaItem) return;
          glosarMut.mutate(
            { id: glosaItem.id, motivo_glosa_id: motivo, observacao },
            { onSuccess: () => setGlosaItem(null) },
          );
        }}
        saving={glosarMut.isPending}
      />
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function Row({ label, value, positive, negative }: { label: string; value: string; positive?: boolean; negative?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium tabular-nums ${positive ? "text-emerald-600" : ""} ${negative ? "text-destructive" : ""}`}>{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: Item["status_faturamento"] }) {
  if (status === "confirmado") return <Badge>Confirmado</Badge>;
  if (status === "glosado") return <Badge variant="destructive">Glosado</Badge>;
  return <Badge variant="outline">Pendente</Badge>;
}

/* ----------------- Glosa Dialog ----------------- */

type Motivo = { id: string; descricao: string };

function GlosaDialog({
  item, onClose, onSave, saving,
}: {
  item: Item | null;
  onClose: () => void;
  onSave: (motivoId: string, observacao: string) => void;
  saving: boolean;
}) {
  const open = !!item;
  const qc = useQueryClient();
  const [motivoId, setMotivoId] = useState<string>("");
  const [obs, setObs] = useState("");
  const [popOpen, setPopOpen] = useState(false);
  const [novo, setNovo] = useState<string | null>(null);

  const { data: motivos = [] } = useQuery({
    queryKey: ["motivos-glosa"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("motivos_glosa")
        .select("id, descricao")
        .eq("ativo", true)
        .order("descricao");
      if (error) throw error;
      return data as Motivo[];
    },
  });

  const criarMotivoMut = useMutation({
    mutationFn: async (descricao: string) => {
      const { data, error } = await supabase
        .from("motivos_glosa")
        .insert({ descricao })
        .select("id, descricao")
        .single();
      if (error) throw error;
      return data as Motivo;
    },
    onSuccess: (m) => {
      qc.invalidateQueries({ queryKey: ["motivos-glosa"] });
      setMotivoId(m.id);
      setNovo(null);
      setPopOpen(false);
      toast.success("Motivo cadastrado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const motivoLabel = motivos.find((m) => m.id === motivoId)?.descricao;

  const handleClose = () => {
    setMotivoId("");
    setObs("");
    setNovo(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar glosa</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Motivo da glosa</label>
            <Popover open={popOpen} onOpenChange={setPopOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {motivoLabel ?? "Selecionar motivo…"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput
                    placeholder="Buscar motivo…"
                    onValueChange={(v) => setNovo(v.length > 0 ? v : null)}
                  />
                  <CommandList>
                    <CommandEmpty>Nenhum motivo encontrado.</CommandEmpty>
                    <CommandGroup>
                      {motivos.map((m) => (
                        <CommandItem
                          key={m.id}
                          value={m.descricao}
                          onSelect={() => {
                            setMotivoId(m.id);
                            setPopOpen(false);
                          }}
                        >
                          {m.descricao}
                        </CommandItem>
                      ))}
                      {novo && !motivos.some((m) => m.descricao.toLowerCase() === novo.toLowerCase()) && (
                        <CommandItem
                          onSelect={() => criarMotivoMut.mutate(novo)}
                          disabled={criarMotivoMut.isPending}
                        >
                          <Plus className="size-4 mr-2" />
                          Adicionar “{novo}”
                        </CommandItem>
                      )}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Observação</label>
            <Textarea
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              placeholder="Detalhes adicionais (opcional)"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button onClick={() => onSave(motivoId, obs)} disabled={!motivoId || saving}>
            {saving && <Loader2 className="size-4 animate-spin" />} Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
