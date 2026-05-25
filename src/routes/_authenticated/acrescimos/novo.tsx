// Refatorado: queries voláteis (acrescimos_gastos, autorizacoes/gasto-mes e
// limite-empresa) movidas para os hooks use-acrescimos e use-orcamento (60s).
// Empresas vêm de useEmpresasAtivas. A mutation centralizada cuida da invalidação.
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatSupabaseError } from "@/lib/format-error";

import { useAuth } from "@/hooks/use-auth";
import { usePerfil } from "@/hooks/use-perfil";
import { brl } from "@/lib/format";
import { uploadFile, removeFiles } from "@/lib/autorizacao-storage";
import { useEmpresasAtivas } from "@/hooks/queries/use-empresas";
import {
  useAcrescimoTotalMes,
  useAcrescimosHistoricoMes,
  useAcrescimosMutations,
} from "@/hooks/queries/use-acrescimos";
import { useGastoMes, useLimiteEmpresaMes } from "@/hooks/queries/use-orcamento";
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
  const { has } = usePerfil();
  const userId = useAuth((s) => s.user?.id);
  const podeCriar = has(["administrador", "secretaria"]);

  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));
  const [escopo, setEscopo] = useState<Escopo>("total");
  const [empresaId, setEmpresaId] = useState<string>("");
  const [novoLimiteStr, setNovoLimiteStr] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const sigRef = useRef<SignaturePadHandle>(null);

  const { data: empresas = [] } = useEmpresasAtivas();

  // Limite total do mês = base + acréscimos aprovados (escopo total)
  const { data: acrescTotal = 0 } = useAcrescimoTotalMes(mes);
  const limiteTotal = LIMITE_BASE + acrescTotal;

  // Total gasto no mês (geral ou por empresa)
  const { data: gastoTotalMes = 0 } = useGastoMes(mes);

  // Limite da empresa no mês
  const { data: limiteEmp = 0 } = useLimiteEmpresaMes(mes, empresaId, {
    enabled: escopo === "empresa" && !!empresaId,
  });

  const { data: gastoEmpMes = 0 } = useGastoMes(mes, empresaId, {
    enabled: escopo === "empresa" && !!empresaId,
  });

  const limiteAtual = escopo === "total" ? limiteTotal : limiteEmp;
  const gastoAtual = escopo === "total" ? gastoTotalMes : gastoEmpMes;
  const novoLimite = parseFloat(novoLimiteStr) || 0;
  const acrescimo = useMemo(() => Math.max(0, novoLimite - limiteAtual), [novoLimite, limiteAtual]);

  const { data: historico = [] } = useAcrescimosHistoricoMes(mes);

  const empresaNome = (id: string | null) =>
    empresas.find((e) => e.id === id)?.nome_fantasia ?? "—";

  const podeEnviar =
    novoLimite > limiteAtual &&
    justificativa.trim().length >= 20 &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(mes) &&
    (escopo === "total" || !!empresaId);

  const { create } = useAcrescimosMutations();
  const m = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Não autenticado");
      if (sigRef.current?.isEmpty()) throw new Error("Assinatura é obrigatória");
      const sigBlob = await sigRef.current!.toBlob();
      if (!sigBlob) throw new Error("Falha ao capturar assinatura");

      const path = `acrescimos/${userId}/${Date.now()}.png`;
      await uploadFile(path, sigBlob, "image/png");
      try {
        return await create.mutateAsync({
          mes_referencia: mes,
          justificativa: justificativa.trim(),
          assinatura: path,
          limite_atual: limiteAtual,
          total_gasto: gastoAtual,
          novo_limite: novoLimite,
          escopo,
          empresa_id: escopo === "empresa" ? empresaId : null,
          status: "aprovado",
        });
      } catch (e) {
        await removeFiles([path]).catch(() => {});
        throw e;
      }
    },
    onSuccess: () => {
      toast.success("Acréscimo registrado — novo limite em vigor");
      navigate({ to: "/dashboard" });
    },
    onError: (e: Error) => toast.error(formatSupabaseError(e)),
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
