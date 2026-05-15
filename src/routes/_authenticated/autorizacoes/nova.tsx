import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Loader2, Plus, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { usePerfil } from "@/hooks/use-perfil";
import { brl, dateBR, ageFromDob } from "@/lib/format";
import { uploadFile, removeFiles } from "@/lib/autorizacao-storage";
import { buildAutorizacaoPdf, buildQrPng } from "@/lib/autorizacao-pdf";
import { PageHeader, PageBody } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SignaturePad, type SignaturePadHandle } from "@/components/autorizacoes/signature-pad";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PacienteFormFields, pacienteSchema, usePacienteForm, type PacienteForm } from "@/components/pacientes/paciente-form";

export const Route = createFileRoute("/_authenticated/autorizacoes/nova")({
  component: NovaAutorizacao,
});

type Paciente = { id: string; nome: string; nome_da_mae: string; dtn: string; cartao_sus: string | null };
type Item = { procedimento_id: string; descricao: string; quantidade: number; valor_unitario: number };
type ExameSel = { key: string; sigla: string; nome: string; quantidade: number };

function NovaAutorizacao() {
  const navigate = useNavigate();
  const { has } = usePerfil();
  const userId = useAuth((s) => s.user?.id);
  const podeCriar = has(["administrador", "atendente"]);

  const [step, setStep] = useState(0);
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [ubsId, setUbsId] = useState<string>("");
  const [profissionalId, setProfissionalId] = useState<string>("");
  const [dataAut, setDataAut] = useState(new Date().toISOString().slice(0, 10));
  const [sintomas, setSintomas] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [selecao, setSelecao] = useState<ExameSel[]>([]);
  const [empresaId, setEmpresaId] = useState<string>("");
  const [itens, setItens] = useState<Item[]>([]);
  const sigAtendRef = useRef<SignaturePadHandle>(null);
  const sigPacRef = useRef<SignaturePadHandle>(null);

  const total = useMemo(() => itens.reduce((s, i) => s + i.quantidade * i.valor_unitario, 0), [itens]);

  if (!podeCriar) {
    return (
      <PageBody>
        <p className="text-muted-foreground">Sem permissão para emitir autorizações.</p>
      </PageBody>
    );
  }

  const steps = ["Paciente", "Origem", "Exames", "Empresa", "Confirmação"];

  const canNext = () => {
    if (step === 0) return !!paciente;
    if (step === 1) return !!ubsId && !!profissionalId && !!dataAut && dataAut <= new Date().toISOString().slice(0, 10);
    if (step === 2) return selecao.length > 0 && selecao.every((s) => s.quantidade > 0);
    if (step === 3) return !!empresaId && itens.length > 0 && itens.length === selecao.length;
    return false;
  };

  return (
    <>
      <PageHeader title="Nova autorização" description={`Etapa ${step + 1} de ${steps.length} — ${steps[step]}`} />
      <PageBody>
        <div className="max-w-4xl mx-auto space-y-6">
          <Stepper steps={steps} current={step} />

          {step === 0 && <StepPaciente value={paciente} onChange={setPaciente} />}
          {step === 1 && (
            <StepOrigem
              ubsId={ubsId} setUbsId={setUbsId}
              profissionalId={profissionalId} setProfissionalId={setProfissionalId}
              data={dataAut} setData={setDataAut}
              sintomas={sintomas} setSintomas={setSintomas}
              foto={foto} setFoto={setFoto}
            />
          )}
          {step === 2 && (
            <StepExames selecao={selecao} setSelecao={(s) => { setSelecao(s); setEmpresaId(""); setItens([]); }} />
          )}
          {step === 3 && (
            <StepEmpresa
              selecao={selecao}
              empresaId={empresaId} setEmpresaId={setEmpresaId}
              itens={itens} setItens={setItens} dataAut={dataAut}
            />
          )}
          {step === 4 && (
            <StepConfirmacao
              paciente={paciente!} dataAut={dataAut} total={total} itens={itens}
              sigAtendRef={sigAtendRef} sigPacRef={sigPacRef}
            />
          )}

          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={() => (step === 0 ? navigate({ to: "/autorizacoes" }) : setStep(step - 1))}>
              <ArrowLeft className="size-4" /> {step === 0 ? "Cancelar" : "Voltar"}
            </Button>
            {step < 4 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canNext()}>
                Continuar <ArrowRight className="size-4" />
              </Button>
            ) : (
              <SubmitButton
                userId={userId}
                paciente={paciente!} ubsId={ubsId} profissionalId={profissionalId}
                dataAut={dataAut} sintomas={sintomas} foto={foto}
                empresaId={empresaId} itens={itens} total={total}
                sigAtendRef={sigAtendRef} sigPacRef={sigPacRef}
              />
            )}
          </div>
        </div>
      </PageBody>
    </>
  );
}

function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => (
        <div key={s} className="flex-1 flex items-center gap-2">
          <div className={`size-8 rounded-full flex items-center justify-center text-xs font-semibold border ${
            i < current ? "bg-primary text-primary-foreground border-primary"
            : i === current ? "bg-background border-primary text-primary"
            : "bg-muted text-muted-foreground border-border"
          }`}>{i + 1}</div>
          <span className={`text-sm ${i === current ? "font-medium" : "text-muted-foreground"}`}>{s}</span>
          {i < steps.length - 1 && <div className="flex-1 h-px bg-border" />}
        </div>
      ))}
    </div>
  );
}

/* ---------------- Step 1 — Paciente ---------------- */
function StepPaciente({ value, onChange }: { value: Paciente | null; onChange: (p: Paciente | null) => void }) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [openNew, setOpenNew] = useState(false);
  useEffect(() => { const t = setTimeout(() => setDebounced(q), 300); return () => clearTimeout(t); }, [q]);

  const { data = [], isFetching } = useQuery({
    queryKey: ["paciente-search", debounced],
    queryFn: async () => {
      if (!debounced.trim()) return [];
      const term = `%${debounced.trim()}%`;
      const { data, error } = await supabase
        .from("pacientes")
        .select("id, nome, nome_da_mae, dtn, cartao_sus")
        .or(`nome.ilike.${term},nome_da_mae.ilike.${term},cartao_sus.ilike.${term}`)
        .limit(20);
      if (error) throw error;
      return data as Paciente[];
    },
  });

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        {value ? (
          <div className="flex items-start justify-between gap-4 p-4 border rounded-lg bg-muted/30">
            <div className="space-y-1">
              <p className="font-semibold">{value.nome}</p>
              <p className="text-sm text-muted-foreground">Mãe: {value.nome_da_mae}</p>
              <p className="text-sm text-muted-foreground">
                DN: {dateBR(value.dtn)} · {ageFromDob(value.dtn)} anos · SUS: {value.cartao_sus ?? "—"}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => onChange(null)}>Trocar</Button>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, mãe ou cartão SUS" className="pl-9" />
            </div>
            <div className="border rounded-md divide-y max-h-72 overflow-auto">
              {isFetching && <div className="p-4 text-center text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin mx-auto" /></div>}
              {!isFetching && debounced && data.length === 0 && <div className="p-4 text-center text-sm text-muted-foreground">Nenhum paciente encontrado.</div>}
              {!debounced && <div className="p-4 text-center text-sm text-muted-foreground">Digite para buscar pacientes.</div>}
              {data.map((p) => (
                <button key={p.id} type="button" onClick={() => onChange(p)} className="w-full text-left p-3 hover:bg-muted/50 transition">
                  <p className="font-medium">{p.nome}</p>
                  <p className="text-xs text-muted-foreground">Mãe: {p.nome_da_mae} · DN {dateBR(p.dtn)}</p>
                </button>
              ))}
            </div>
            <Button variant="outline" onClick={() => setOpenNew(true)}><Plus className="size-4" /> Cadastrar novo paciente</Button>
            <NewPacienteSheet open={openNew} onOpenChange={setOpenNew} onCreated={(p) => { onChange(p); setOpenNew(false); }} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function NewPacienteSheet({ open, onOpenChange, onCreated }: {
  open: boolean; onOpenChange: (v: boolean) => void; onCreated: (p: Paciente) => void;
}) {
  const userId = useAuth((s) => s.user?.id);
  const form = usePacienteForm();
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: async (v: PacienteForm) => {
      const parsed = pacienteSchema.parse(v);
      const payload = {
        nome: parsed.nome, nome_da_mae: parsed.nome_da_mae, dtn: parsed.dtn,
        sexo: parsed.sexo, zona: parsed.zona,
        cartao_sus: parsed.cartao_sus || null, naturalidade: parsed.naturalidade || null,
        bairro_id: parsed.bairro_id || null, povoado_id: parsed.povoado_id || null,
        rua: parsed.rua || null, numero: parsed.numero || null, ponto_referencia: parsed.ponto_referencia || null,
        criado_por: userId!,
      };
      const { data, error } = await supabase.from("pacientes").insert(payload).select("id, nome, nome_da_mae, dtn, cartao_sus").single();
      if (error) throw error;
      return data as Paciente;
    },
    onSuccess: (p) => {
      toast.success("Paciente cadastrado");
      qc.invalidateQueries({ queryKey: ["paciente-search"] });
      onCreated(p);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader><SheetTitle>Novo paciente</SheetTitle></SheetHeader>
        <div className="mt-6">
          <PacienteFormFields form={form} onSubmit={(v) => m.mutate(v)} saving={m.isPending} submitLabel="Cadastrar" />
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ---------------- Step 2 — Origem ---------------- */
function StepOrigem({
  ubsId, setUbsId, profissionalId, setProfissionalId,
  data, setData, sintomas, setSintomas, foto, setFoto,
}: {
  ubsId: string; setUbsId: (v: string) => void;
  profissionalId: string; setProfissionalId: (v: string) => void;
  data: string; setData: (v: string) => void;
  sintomas: string; setSintomas: (v: string) => void;
  foto: File | null; setFoto: (v: File | null) => void;
}) {
  const { data: ubsList = [] } = useQuery({
    queryKey: ["ubs-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ubs").select("id, nome_posto").order("nome_posto");
      if (error) throw error; return data;
    },
  });
  const { data: profs = [] } = useQuery({
    queryKey: ["profs-by-ubs", ubsId],
    queryFn: async () => {
      if (!ubsId) return [];
      const { data, error } = await supabase.from("profissionais")
        .select("id, nome_profissional, conselho, numero_conselho").eq("ubs_id", ubsId).order("nome_profissional");
      if (error) throw error; return data;
    },
    enabled: !!ubsId,
  });

  return (
    <Card><CardContent className="p-6 grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>UBS</Label>
        <Select value={ubsId} onValueChange={(v) => { setUbsId(v); setProfissionalId(""); }}>
          <SelectTrigger><SelectValue placeholder="Selecione a UBS" /></SelectTrigger>
          <SelectContent>{ubsList.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome_posto}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Profissional solicitante</Label>
        <Select value={profissionalId} onValueChange={setProfissionalId} disabled={!ubsId}>
          <SelectTrigger><SelectValue placeholder={ubsId ? "Selecione" : "Escolha a UBS antes"} /></SelectTrigger>
          <SelectContent>{profs.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome_profissional} — {p.conselho} {p.numero_conselho}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Data da autorização</Label>
        <Input type="date" value={data} onChange={(e) => setData(e.target.value)} max={new Date().toISOString().slice(0, 10)} />
      </div>
      <div className="space-y-2">
        <Label>Foto da requisição (opcional)</Label>
        <Input type="file" accept="image/*,application/pdf" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
        {foto && <p className="text-xs text-muted-foreground">{foto.name}</p>}
      </div>
      <div className="space-y-2 col-span-2">
        <Label>Sintomas / indicação clínica</Label>
        <Textarea value={sintomas} onChange={(e) => setSintomas(e.target.value)} maxLength={500} rows={3} />
      </div>
    </CardContent></Card>
  );
}

/* ---------------- Step 3 — Exames (busca agrupada por sigla) ---------------- */
function StepExames({
  selecao, setSelecao,
}: {
  selecao: ExameSel[]; setSelecao: (v: ExameSel[]) => void;
}) {
  const [q, setQ] = useState("");

  const { data: procs = [], isLoading } = useQuery({
    queryKey: ["procs-todos-ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("procedimentos")
        .select("id, sigla, nome")
        .eq("ativo", true)
        .order("sigla");
      if (error) throw error;
      return data as { id: string; sigla: string; nome: string }[];
    },
  });

  const grupos = useMemo(() => {
    const map = new Map<string, { key: string; sigla: string; nome: string }>();
    for (const p of procs) {
      const key = p.sigla.toUpperCase();
      if (!map.has(key)) map.set(key, { key, sigla: p.sigla, nome: p.nome });
    }
    return [...map.values()];
  }, [procs]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return grupos;
    return grupos.filter((g) => `${g.sigla} ${g.nome}`.toLowerCase().includes(t));
  }, [grupos, q]);

  const toggle = (g: { key: string; sigla: string; nome: string }) => {
    if (selecao.some((s) => s.key === g.key)) {
      setSelecao(selecao.filter((s) => s.key !== g.key));
    } else {
      setSelecao([...selecao, { ...g, quantidade: 1 }]);
    }
  };

  const updateQtd = (key: string, qtd: number) =>
    setSelecao(selecao.map((s) => (s.key === key ? { ...s, quantidade: qtd } : s)));

  return (
    <Card><CardContent className="p-6 space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar exame por sigla ou nome" className="pl-9"
        />
      </div>

      <div className="border rounded-md divide-y max-h-72 overflow-auto">
        {isLoading && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin mx-auto" />
          </div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="p-4 text-center text-sm text-muted-foreground">Nenhum exame encontrado.</div>
        )}
        {filtered.map((g) => {
          const sel = selecao.some((s) => s.key === g.key);
          return (
            <button
              key={g.key} type="button" onClick={() => toggle(g)}
              className={`w-full text-left p-3 hover:bg-muted/50 transition flex items-center justify-between gap-3 ${sel ? "bg-primary/5" : ""}`}
            >
              <div className="min-w-0">
                <p className="font-medium text-sm">{g.sigla}</p>
                <p className="text-xs text-muted-foreground truncate">{g.nome}</p>
              </div>
              {sel && <Badge variant="default" className="shrink-0">Selecionado</Badge>}
            </button>
          );
        })}
      </div>

      {selecao.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-2">Exame selecionado</th>
                <th className="p-2 w-24">Qtd</th>
                <th className="p-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {selecao.map((s) => (
                <tr key={s.key} className="border-t">
                  <td className="p-2">
                    <span className="font-medium">{s.sigla}</span>
                    <span className="text-muted-foreground"> — {s.nome}</span>
                  </td>
                  <td className="p-2">
                    <Input
                      type="number" min={1} value={s.quantidade} className="h-8"
                      onChange={(e) => updateQtd(s.key, Math.max(1, parseInt(e.target.value) || 1))}
                    />
                  </td>
                  <td className="p-2">
                    <Button size="icon" variant="ghost" onClick={() => toggle(s)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CardContent></Card>
  );
}

/* ---------------- Step 4 — Empresa executora ---------------- */
type ProcEmp = {
  id: string; sigla: string; nome: string; valor_unitario: number; empresa_id: string;
  empresa: { id: string; nome_fantasia: string; ativa: boolean } | null;
};

function StepEmpresa({
  selecao, empresaId, setEmpresaId, itens, setItens, dataAut,
}: {
  selecao: ExameSel[];
  empresaId: string; setEmpresaId: (v: string) => void;
  itens: Item[]; setItens: (v: Item[]) => void; dataAut: string;
}) {
  const siglas = useMemo(() => selecao.map((s) => s.sigla), [selecao]);

  const { data: procs = [] } = useQuery({
    queryKey: ["procs-by-siglas", siglas.join("|")],
    queryFn: async () => {
      if (siglas.length === 0) return [];
      const { data, error } = await supabase
        .from("procedimentos")
        .select("id, sigla, nome, valor_unitario, empresa_id, empresa:empresas(id, nome_fantasia, ativa)")
        .in("sigla", siglas).eq("ativo", true);
      if (error) throw error;
      return (data ?? []) as unknown as ProcEmp[];
    },
    enabled: siglas.length > 0,
  });

  const empresasDisponiveis = useMemo(() => {
    const want = new Set(selecao.map((s) => s.sigla.toUpperCase()));
    const byEmp = new Map<string, { id: string; nome: string; procs: ProcEmp[] }>();
    for (const p of procs) {
      if (!p.empresa?.ativa) continue;
      const e = byEmp.get(p.empresa_id) ?? { id: p.empresa_id, nome: p.empresa.nome_fantasia, procs: [] };
      e.procs.push(p);
      byEmp.set(p.empresa_id, e);
    }
    return [...byEmp.values()].filter((e) => {
      const have = new Set(e.procs.map((x) => x.sigla.toUpperCase()));
      for (const w of want) if (!have.has(w)) return false;
      return true;
    });
  }, [procs, selecao]);

  useEffect(() => {
    if (!empresaId) { setItens([]); return; }
    const emp = empresasDisponiveis.find((e) => e.id === empresaId);
    if (!emp) { setItens([]); return; }
    const computed: Item[] = selecao.map((s) => {
      const p = emp.procs.find((x) => x.sigla.toUpperCase() === s.sigla.toUpperCase())!;
      return {
        procedimento_id: p.id,
        descricao: p.nome,
        quantidade: s.quantidade,
        valor_unitario: Number(p.valor_unitario),
      };
    });
    setItens(computed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId, empresasDisponiveis]);

  const total = itens.reduce((s, i) => s + i.quantidade * i.valor_unitario, 0);
  const orcamento = useOrcamento(dataAut);
  const saldoApos = orcamento ? orcamento.saldo_disponivel - total : 0;

  return (
    <Card><CardContent className="p-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Empresa executora</Label>
          <Select value={empresaId} onValueChange={setEmpresaId}>
            <SelectTrigger>
              <SelectValue placeholder={empresasDisponiveis.length ? "Selecione" : "Nenhuma empresa oferece todos os exames"} />
            </SelectTrigger>
            <SelectContent>
              {empresasDisponiveis.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          {empresasDisponiveis.length === 0 && procs.length > 0 && (
            <p className="text-xs text-destructive">
              Nenhuma empresa ativa oferece todos os exames selecionados. Volte e ajuste a seleção.
            </p>
          )}
        </div>
        {orcamento && (
          <div className="rounded-md border p-3 text-xs space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Limite mensal:</span><span className="tabular-nums">{brl(orcamento.limite_atual)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Já gasto:</span><span className="tabular-nums">{brl(orcamento.total_autorizado_mes)}</span></div>
            <div className="flex justify-between font-medium"><span>Saldo após esta:</span><span className={`tabular-nums ${saldoApos < 0 ? "text-destructive" : ""}`}>{brl(saldoApos)}</span></div>
          </div>
        )}
      </div>

      {itens.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-2">Procedimento</th>
                <th className="p-2 w-20">Qtd</th>
                <th className="p-2 w-32">V. Unit.</th>
                <th className="p-2 w-32 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((it, idx) => (
                <tr key={idx} className="border-t">
                  <td className="p-2">{it.descricao}</td>
                  <td className="p-2 tabular-nums">{it.quantidade}</td>
                  <td className="p-2 tabular-nums">{brl(it.valor_unitario)}</td>
                  <td className="p-2 text-right tabular-nums">{brl(it.quantidade * it.valor_unitario)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {itens.length > 0 && (
        <div className="flex items-center justify-end">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total autorizado</p>
            <p className="text-2xl font-bold tabular-nums">{brl(total)}</p>
          </div>
        </div>
      )}

      {saldoApos < 0 && (
        <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3 text-sm">
          ⚠️ Total excede o saldo mensal — a autorização será criada como <b>bloqueada</b>. Solicite um acréscimo de gastos.
        </div>
      )}
    </CardContent></Card>
  );
}

function useOrcamento(dataAut: string) {
  const mes = dataAut.slice(0, 7);
  const { data } = useQuery({
    queryKey: ["orcamento", mes],
    queryFn: async () => {
      const { data, error } = await supabase.from("vw_orcamento_mes_atual").select("*").maybeSingle();
      if (error) throw error;
      return data as { limite_atual: number; total_autorizado_mes: number; saldo_disponivel: number } | null;
    },
  });
  return data;
}

/* ---------------- Step 4 — Confirmação ---------------- */
function StepConfirmacao({
  paciente, dataAut, total, itens, sigAtendRef, sigPacRef,
}: {
  paciente: Paciente; dataAut: string; total: number; itens: Item[];
  sigAtendRef: React.RefObject<SignaturePadHandle | null>; sigPacRef: React.RefObject<SignaturePadHandle | null>;
}) {
  return (
    <Card><CardContent className="p-6 space-y-6">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div><p className="text-muted-foreground text-xs">Paciente</p><p className="font-medium">{paciente.nome}</p></div>
        <div><p className="text-muted-foreground text-xs">Data</p><p className="font-medium">{dateBR(dataAut)}</p></div>
        <div className="col-span-2"><p className="text-muted-foreground text-xs">Itens</p><p className="font-medium">{itens.length} procedimento(s) — {brl(total)}</p></div>
      </div>
      <div className="grid grid-cols-2 gap-6 pt-4 border-t">
        <SignaturePad ref={sigAtendRef} label="Assinatura do atendente" />
        <SignaturePad ref={sigPacRef} label="Assinatura do paciente" />
      </div>
    </CardContent></Card>
  );
}

/* ---------------- Submit ---------------- */
function SubmitButton(props: {
  userId: string | undefined;
  paciente: Paciente; ubsId: string; profissionalId: string;
  dataAut: string; sintomas: string; foto: File | null;
  empresaId: string; itens: Item[]; total: number;
  sigAtendRef: React.RefObject<SignaturePadHandle | null>; sigPacRef: React.RefObject<SignaturePadHandle | null>;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: async () => {
      const { paciente, ubsId, profissionalId, dataAut, sintomas, foto, empresaId, itens, total, userId } = props;
      if (!userId) throw new Error("Usuário não autenticado");
      if (props.sigAtendRef.current?.isEmpty() || props.sigPacRef.current?.isEmpty()) {
        throw new Error("As duas assinaturas são obrigatórias");
      }
      const sigA = await props.sigAtendRef.current!.toBlob();
      const sigP = await props.sigPacRef.current!.toBlob();
      if (!sigA || !sigP) throw new Error("Falha ao capturar assinatura");

      const tempId = crypto.randomUUID();
      const uploaded: string[] = [];
      try {
        // Upload signatures + foto
        const sigAPath = `${tempId}/sig_atendente.png`;
        const sigPPath = `${tempId}/sig_paciente.png`;
        await uploadFile(sigAPath, sigA, "image/png"); uploaded.push(sigAPath);
        await uploadFile(sigPPath, sigP, "image/png"); uploaded.push(sigPPath);
        let fotoPath: string | null = null;
        if (foto) {
          const ext = foto.name.split(".").pop() || "bin";
          fotoPath = `${tempId}/req.${ext}`;
          await uploadFile(fotoPath, foto); uploaded.push(fotoPath);
        }

        // num_aut
        const { data: numData, error: numErr } = await supabase.rpc("gerar_num_aut");
        if (numErr) throw numErr;
        const num_aut = numData as string;

        // Insert autorizacao with provisional pdf/qr paths and pre-filled total (for trigger)
        const tmpPdf = `${tempId}/aut.pdf`;
        const tmpQr = `${tempId}/qr.png`;
        const { data: ins, error: insErr } = await supabase.from("autorizacoes").insert({
          paciente_id: paciente.id, empresa_id: empresaId, ubs_id: ubsId, profissional_id: profissionalId,
          data_autorizacao: dataAut, sintomas: sintomas || null,
          num_aut, criado_por: userId, total_autorizado: total,
          assinatura_atendente: sigAPath, assinatura_paciente: sigPPath,
          foto_requisicao: fotoPath, pdf_autorizacao: tmpPdf, qr_code: tmpQr,
        }).select("id, status").single();
        if (insErr) throw insErr;
        const autId = ins.id;

        // Insert itens
        const { error: itErr } = await supabase.from("itens_autorizacao").insert(
          itens.map((it) => ({
            autorizacao_id: autId, procedimento_id: it.procedimento_id,
            descricao: it.descricao, quantidade: it.quantidade,
            valor_unitario: it.valor_unitario, valor_total: it.quantidade * it.valor_unitario,
          })),
        );
        if (itErr) throw itErr;

        // Fetch lookups for PDF
        const [empresaRes, ubsRes, profRes] = await Promise.all([
          supabase.from("empresas").select("nome_fantasia, cnpj").eq("id", empresaId).single(),
          supabase.from("ubs").select("nome_posto").eq("id", ubsId).single(),
          supabase.from("profissionais").select("nome_profissional, conselho, numero_conselho").eq("id", profissionalId).single(),
        ]);

        // Build PDF + QR with real id
        const qrUrl = `${window.location.origin}/autorizacoes/${autId}`;
        const pdfBytes = await buildAutorizacaoPdf({
          num_aut, data_autorizacao: dataAut,
          paciente: { nome: paciente.nome, dtn: paciente.dtn, cartao_sus: paciente.cartao_sus, nome_da_mae: paciente.nome_da_mae },
          ubs: { nome_posto: ubsRes.data!.nome_posto },
          empresa: { nome_fantasia: empresaRes.data!.nome_fantasia, cnpj: empresaRes.data!.cnpj },
          profissional: profRes.data!,
          itens: itens.map((it) => ({ descricao: it.descricao, quantidade: it.quantidade, valor_unitario: it.valor_unitario, valor_total: it.quantidade * it.valor_unitario })),
          total, sintomas: sintomas || null,
          sigAtendentePng: new Uint8Array(await sigA.arrayBuffer()),
          sigPacientePng: new Uint8Array(await sigP.arrayBuffer()),
          qrTargetUrl: qrUrl,
        });
        const qrBytes = await buildQrPng(qrUrl);

        const pdfPath = `${autId}/aut.pdf`;
        const qrPath = `${autId}/qr.png`;
        await uploadFile(pdfPath, new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" }), "application/pdf");
        uploaded.push(pdfPath);
        await uploadFile(qrPath, new Blob([new Uint8Array(qrBytes)], { type: "image/png" }), "image/png");
        uploaded.push(qrPath);

        const { error: upErr } = await supabase.from("autorizacoes").update({ pdf_autorizacao: pdfPath, qr_code: qrPath }).eq("id", autId);
        if (upErr) throw upErr;

        // Re-read for status (trigger may have set 'bloqueado')
        const { data: final } = await supabase.from("autorizacoes").select("id, status, num_aut").eq("id", autId).single();
        return final!;
      } catch (e) {
        await removeFiles(uploaded).catch(() => {});
        throw e;
      }
    },
    onSuccess: (a) => {
      qc.invalidateQueries({ queryKey: ["autorizacoes"] });
      if (a.status === "bloqueado") {
        toast.warning(`${a.num_aut} criada como BLOQUEADA — limite mensal excedido.`);
      } else {
        toast.success(`Autorização ${a.num_aut} emitida`);
      }
      navigate({ to: "/autorizacoes/$id", params: { id: a.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Button onClick={() => m.mutate()} disabled={m.isPending}>
      {m.isPending && <Loader2 className="size-4 animate-spin" />} Emitir autorização
    </Button>
  );
}
