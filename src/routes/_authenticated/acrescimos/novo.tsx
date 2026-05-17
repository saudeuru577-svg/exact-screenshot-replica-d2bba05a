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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SignaturePad, type SignaturePadHandle } from "@/components/autorizacoes/signature-pad";

export const Route = createFileRoute("/_authenticated/acrescimos/novo")({
  component: NovoAcrescimo,
});

const LIMITE_BASE = 130000;

type Escopo = "total" | "empresa";

function NovoAcrescimo() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { has } = usePerfil();
  const userId = useAuth((s) => s.user?.id);
  const podeCriar = has(["administrador", "secretaria"]);

  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));
  const [escopo, setEscopo] = useState<Escopo>("total");
  const [empresaId, setEmpresaId] = useState<string>("");
  const [novoLimiteStr, setNovoLimiteStr] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const sigRef = useRef<SignaturePadHandle>(null);

  const { data: empresas = [] } = useQuery({
    queryKey: ["empresas-ativas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("empresas")
        .select("id, nome_fantasia").eq("ativa", true).order("nome_fantasia");
      if (error) throw error;
      return data as { id: string; nome_fantasia: string }[];
    },
  });

  // Limite total do mês
  const { data: acrescTotal = 0 } = useQuery({
    queryKey: ["acresc-total", mes],
    queryFn: async () => {
      const { data, error } = await supabase.from("acrescimos_gastos")
        .select("novo_limite, limite_atual")
        .eq("mes_referencia", mes).eq("status", "aprovado").eq("escopo", "total");
      if (error) throw error;
      return (data ?? []).reduce((s, a) => s + Math.max(0, Number(a.novo_limite ?? 0) - Number(a.limite_atual ?? 0)), 0);
    },
  });
  const limiteTotal = LIMITE_BASE + acrescTotal;

  // Total gasto no mês (geral ou por empresa)
  const { data: gastoTotalMes = 0 } = useQuery({
    queryKey: ["gasto-mes", mes],
    queryFn: async () => {
      const inicio = `${mes}-01`;
      const [y, m] = mes.split("-").map(Number);
      const last = new Date(y, m, 0).getDate();
      const fim = `${mes}-${String(last).padStart(2, "0")}`;
      const { data, error } = await supabase.from("autorizacoes")
        .select("total_autorizado")
        .gte("data_autorizacao", inicio).lte("data_autorizacao", fim)
        .in("status", ["pendente", "aprovado", "faturado"]);
      if (error) throw error;
      return (data ?? []).reduce((s, a) => s + Number(a.total_autorizado ?? 0), 0);
    },
  });

  // Limite da empresa no mês
  const { data: limiteEmp = 0 } = useQuery({
    queryKey: ["limite-emp", mes, empresaId],
    enabled: escopo === "empresa" && !!empresaId,
    queryFn: async () => {
      const [base, acres] = await Promise.all([
        supabase.from("limites_empresa").select("valor")
          .eq("empresa_id", empresaId).eq("mes_referencia", mes).maybeSingle(),
        supabase.from("acrescimos_gastos").select("novo_limite, limite_atual")
          .eq("mes_referencia", mes).eq("status", "aprovado")
          .eq("escopo", "empresa").eq("empresa_id", empresaId),
      ]);
      if (base.error) throw base.error;
      if (acres.error) throw acres.error;
      const acrescimos = (acres.data ?? []).reduce(
        (s, a) => s + Math.max(0, Number(a.novo_limite ?? 0) - Number(a.limite_atual ?? 0)), 0);
      return Number(base.data?.valor ?? 0) + acrescimos;
    },
  });

  const { data: gastoEmpMes = 0 } = useQuery({
    queryKey: ["gasto-emp-mes", mes, empresaId],
    enabled: escopo === "empresa" && !!empresaId,
    queryFn: async () => {
      const inicio = `${mes}-01`;
      const [y, m] = mes.split("-").map(Number);
      const last = new Date(y, m, 0).getDate();
      const fim = `${mes}-${String(last).padStart(2, "0")}`;
      const { data, error } = await supabase.from("autorizacoes")
        .select("total_autorizado")
        .eq("empresa_id", empresaId)
        .gte("data_autorizacao", inicio).lte("data_autorizacao", fim)
        .in("status", ["pendente", "aprovado", "faturado"]);
      if (error) throw error;
      return (data ?? []).reduce((s, a) => s + Number(a.total_autorizado ?? 0), 0);
    },
  });

  const limiteAtual = escopo === "total" ? limiteTotal : limiteEmp;
  const gastoAtual = escopo === "total" ? gastoTotalMes : gastoEmpMes;
  const novoLimite = parseFloat(novoLimiteStr) || 0;
  const acrescimo = useMemo(() => Math.max(0, novoLimite - limiteAtual), [novoLimite, limiteAtual]);

  const { data: historico = [] } = useQuery({
    queryKey: ["acrescimos-mes", mes],
    queryFn: async () => {
      const { data, error } = await supabase.from("acrescimos_gastos")
        .select("id, criado_em, novo_limite, limite_atual, escopo, empresa_id, justificativa")
        .eq("mes_referencia", mes).order("criado_em", { ascending: false });
      if (error) throw error;
      return data as Array<{ id: string; criado_em: string; novo_limite: number; limite_atual: number; escopo: Escopo; empresa_id: string | null; justificativa: string }>;
    },
  });

  const empresaNome = (id: string | null) =>
    empresas.find((e) => e.id === id)?.nome_fantasia ?? "—";

  const podeEnviar =
    novoLimite > limiteAtual &&
    justificativa.trim().length >= 20 &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(mes) &&
    (escopo === "total" || !!empresaId);

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
          total_gasto: gastoAtual,
          novo_limite: novoLimite,
          escopo,
          empresa_id: escopo === "empresa" ? empresaId : null,
          status: "aprovado",
        }).select("id").single();
        if (error) throw error;
        return data;
      } catch (e) {
        await removeFiles([path]).catch(() => {});
        throw e;
      }
    },
    onSuccess: () => {
      toast.success("Acréscimo registrado — novo limite em vigor");
      qc.invalidateQueries({ queryKey: ["orcamento"] });
      qc.invalidateQueries({ queryKey: ["acresc-total"] });
      qc.invalidateQueries({ queryKey: ["limite-emp"] });
      qc.invalidateQueries({ queryKey: ["acrescimos-mes"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      navigate({ to: "/dashboard" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!podeCriar) {
    return <PageBody><p className="text-muted-foreground">Sem permissão para registrar acréscimo.</p></PageBody>;
  }

  return (
    <>
      <PageHeader title="Registrar acréscimo de limite" description="O novo limite entra em vigor imediatamente." />
      <PageBody>
        <div className="max-w-3xl mx-auto space-y-6">
          <Card><CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mês de referência</Label>
                <Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Escopo</Label>
                <RadioGroup value={escopo} onValueChange={(v) => setEscopo(v as Escopo)} className="flex gap-4 pt-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <RadioGroupItem value="total" /> Total geral
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <RadioGroupItem value="empresa" /> Empresa específica
                  </label>
                </RadioGroup>
              </div>
              {escopo === "empresa" && (
                <div className="space-y-2 col-span-2">
                  <Label>Empresa</Label>
                  <Select value={empresaId} onValueChange={setEmpresaId}>
                    <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
                    <SelectContent>
                      {empresas.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome_fantasia}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {(escopo === "total" || empresaId) && (
              <div className="grid grid-cols-3 gap-4 text-sm pt-2 border-t">
                <div><p className="text-muted-foreground text-xs">Limite vigente</p><p className="font-semibold tabular-nums">{brl(limiteAtual)}</p></div>
                <div><p className="text-muted-foreground text-xs">Gasto até agora</p><p className="font-semibold tabular-nums">{brl(gastoAtual)}</p></div>
                <div><p className="text-muted-foreground text-xs">Saldo</p><p className={`font-semibold tabular-nums ${(limiteAtual - gastoAtual) < 0 ? "text-destructive" : ""}`}>{brl(limiteAtual - gastoAtual)}</p></div>
              </div>
            )}
          </CardContent></Card>

          <Card><CardContent className="p-6 grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Novo limite (R$)</Label>
              <Input type="number" min={0} step="0.01" value={novoLimiteStr}
                onChange={(e) => setNovoLimiteStr(e.target.value)}
                placeholder={`Maior que ${brl(limiteAtual)}`} />
              {acrescimo > 0 && <p className="text-xs text-muted-foreground">Acréscimo de <b className="tabular-nums">{brl(acrescimo)}</b>.</p>}
              {novoLimiteStr && novoLimite <= limiteAtual && <p className="text-xs text-destructive">Novo limite deve ser maior que o atual.</p>}
            </div>
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <p className="text-xs text-muted-foreground pt-2">O acréscimo já entra ativo. Mantenha justificativa clara para auditoria.</p>
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Justificativa</Label>
              <Textarea rows={4} value={justificativa} onChange={(e) => setJustificativa(e.target.value)} maxLength={1000}
                placeholder="Explique por que o aumento é necessário (mínimo 20 caracteres)" />
              <p className="text-xs text-muted-foreground">{justificativa.length}/1000</p>
            </div>
            <div className="col-span-2">
              <SignaturePad ref={sigRef} label="Assinatura do responsável" />
            </div>
          </CardContent></Card>

          {historico.length > 0 && (
            <Card><CardContent className="p-6">
              <h3 className="font-semibold mb-3 text-sm">Acréscimos do mês</h3>
              <ul className="space-y-2 text-sm">
                {historico.map((h) => (
                  <li key={h.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div>
                      <p className="text-xs text-muted-foreground">{new Date(h.criado_em).toLocaleString("pt-BR")}</p>
                      <p>
                        <Badge variant="outline" className="mr-2 capitalize">{h.escopo === "total" ? "Total" : empresaNome(h.empresa_id)}</Badge>
                        {brl(Number(h.limite_atual ?? 0))} → <span className="tabular-nums font-medium">{brl(Number(h.novo_limite ?? 0))}</span>
                      </p>
                    </div>
                    <Badge>Ativo</Badge>
                  </li>
                ))}
              </ul>
            </CardContent></Card>
          )}

          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={() => navigate({ to: "/dashboard" })}>Cancelar</Button>
            <Button onClick={() => m.mutate()} disabled={!podeEnviar || m.isPending}>
              {m.isPending && <Loader2 className="size-4 animate-spin" />} Registrar acréscimo
            </Button>
          </div>
        </div>
      </PageBody>
    </>
  );
}
