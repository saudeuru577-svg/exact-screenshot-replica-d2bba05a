import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { usePerfil } from "@/hooks/use-perfil";
import { brl } from "@/lib/format";
import { uploadFile, removeFiles } from "@/lib/autorizacao-storage";
import { PageHeader, PageBody } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SignaturePad, type SignaturePadHandle } from "@/components/autorizacoes/signature-pad";

export const Route = createFileRoute("/_authenticated/acrescimos/novo")({
  component: NovoAcrescimo,
});

function NovoAcrescimo() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { has } = usePerfil();
  const userId = useAuth((s) => s.user?.id);
  const podeCriar = has(["administrador", "secretaria"]);

  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));
  const [novoLimiteStr, setNovoLimiteStr] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const sigRef = useRef<SignaturePadHandle>(null);

  const { data: orcamento } = useQuery({
    queryKey: ["orcamento-mes", mes],
    queryFn: async () => {
      const { data, error } = await supabase.from("vw_orcamento_mes_atual").select("*").maybeSingle();
      if (error) throw error;
      return data as { limite_base: number; acrescimos_aprovados: number; limite_atual: number; total_autorizado_mes: number; saldo_disponivel: number } | null;
    },
  });

  const { data: historico = [] } = useQuery({
    queryKey: ["acrescimos-mes", mes],
    queryFn: async () => {
      const { data, error } = await supabase.from("acrescimos_gastos")
        .select("id, criado_em, novo_limite, status, justificativa")
        .eq("mes_referencia", mes).order("criado_em", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const limiteAtual = orcamento?.limite_atual ?? 130000;
  const totalGasto = orcamento?.total_autorizado_mes ?? 0;
  const novoLimite = parseFloat(novoLimiteStr) || 0;
  const acrescimo = useMemo(() => Math.max(0, novoLimite - limiteAtual), [novoLimite, limiteAtual]);

  const podeEnviar =
    novoLimite > limiteAtual &&
    justificativa.trim().length >= 20 &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(mes);

  const m = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Não autenticado");
      if (sigRef.current?.isEmpty()) throw new Error("Assinatura é obrigatória");
      const sigBlob = await sigRef.current!.toBlob();
      if (!sigBlob) throw new Error("Falha ao capturar assinatura");

      const path = `acrescimos/${userId}/${Date.now()}.png`;
      await uploadFile(path, sigBlob, "image/png");
      try {
        const { data, error } = await supabase.from("acrescimos_gastos").insert({
          mes_referencia: mes,
          justificativa: justificativa.trim(),
          assinatura: path,
          limite_atual: limiteAtual,
          total_gasto: totalGasto,
          novo_limite: novoLimite,
        }).select("id").single();
        if (error) throw error;
        return data;
      } catch (e) {
        await removeFiles([path]).catch(() => {});
        throw e;
      }
    },
    onSuccess: () => {
      toast.success("Solicitação enviada — aguardando aprovação do administrador");
      qc.invalidateQueries({ queryKey: ["orcamento"] });
      qc.invalidateQueries({ queryKey: ["acrescimos-mes"] });
      navigate({ to: "/dashboard" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!podeCriar) {
    return <PageBody><p className="text-muted-foreground">Sem permissão para solicitar acréscimo.</p></PageBody>;
  }

  const pendenteExistente = historico.find((h) => h.status === "pendente");

  return (
    <>
      <PageHeader title="Solicitar acréscimo de gastos" description="Pedir aumento do limite mensal de R$ 130.000,00." />
      <PageBody>
        <div className="max-w-3xl mx-auto space-y-6">
          <Card><CardContent className="p-6 space-y-3">
            <h3 className="font-semibold">Situação do mês {mes}</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div><p className="text-muted-foreground text-xs">Limite vigente</p><p className="font-semibold tabular-nums">{brl(limiteAtual)}</p></div>
              <div><p className="text-muted-foreground text-xs">Gasto até agora</p><p className="font-semibold tabular-nums">{brl(totalGasto)}</p></div>
              <div><p className="text-muted-foreground text-xs">Saldo</p><p className={`font-semibold tabular-nums ${(orcamento?.saldo_disponivel ?? 0) < 0 ? "text-destructive" : ""}`}>{brl(orcamento?.saldo_disponivel ?? 0)}</p></div>
            </div>
            {pendenteExistente && (
              <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3 text-sm">
                Já existe uma solicitação <b>pendente</b> neste mês.
              </div>
            )}
          </CardContent></Card>

          <Card><CardContent className="p-6 grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mês de referência</Label>
              <Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Novo limite proposto (R$)</Label>
              <Input type="number" min={0} step="0.01" value={novoLimiteStr}
                onChange={(e) => setNovoLimiteStr(e.target.value)}
                placeholder={`Maior que ${brl(limiteAtual)}`} />
              {acrescimo > 0 && <p className="text-xs text-muted-foreground">Acréscimo de <b className="tabular-nums">{brl(acrescimo)}</b> sobre o limite atual.</p>}
              {novoLimiteStr && novoLimite <= limiteAtual && <p className="text-xs text-destructive">Novo limite deve ser maior que o atual.</p>}
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Justificativa</Label>
              <Textarea rows={4} value={justificativa} onChange={(e) => setJustificativa(e.target.value)} maxLength={1000}
                placeholder="Explique por que o aumento é necessário (mínimo 20 caracteres)" />
              <p className="text-xs text-muted-foreground">{justificativa.length}/1000</p>
            </div>
            <div className="col-span-2">
              <SignaturePad ref={sigRef} label="Assinatura do solicitante" />
            </div>
          </CardContent></Card>

          {historico.length > 0 && (
            <Card><CardContent className="p-6">
              <h3 className="font-semibold mb-3 text-sm">Histórico do mês</h3>
              <ul className="space-y-2 text-sm">
                {historico.map((h) => (
                  <li key={h.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div>
                      <p className="text-xs text-muted-foreground">{new Date(h.criado_em).toLocaleString("pt-BR")}</p>
                      <p>Novo limite: <span className="tabular-nums font-medium">{brl(Number(h.novo_limite ?? 0))}</span></p>
                    </div>
                    <Badge variant={h.status === "aprovado" ? "default" : h.status === "recusado" ? "destructive" : "secondary"} className="capitalize">{h.status}</Badge>
                  </li>
                ))}
              </ul>
            </CardContent></Card>
          )}

          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={() => navigate({ to: "/dashboard" })}>Cancelar</Button>
            <Button onClick={() => m.mutate()} disabled={!podeEnviar || m.isPending}>
              {m.isPending && <Loader2 className="size-4 animate-spin" />} Enviar solicitação
            </Button>
          </div>
        </div>
      </PageBody>
    </>
  );
}
