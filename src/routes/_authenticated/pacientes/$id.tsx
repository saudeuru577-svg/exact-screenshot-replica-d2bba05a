import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { usePerfil } from "@/hooks/use-perfil";
import { PageHeader, PageBody } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  PacienteFormFields, usePacienteForm, type PacienteForm,
} from "@/components/pacientes/paciente-form";
import { ageFromDob, brl, dateBR, maskSUS } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/pacientes/$id")({
  component: PacienteDetalhe,
});

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pendente: "secondary", aprovado: "default", bloqueado: "destructive",
  cancelado: "outline", faturado: "default",
};

function PacienteDetalhe() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const userId = useAuth((s) => s.user?.id);
  const { isAdmin, has } = usePerfil();
  const [editMode, setEditMode] = useState(false);

  const { data: p, isLoading } = useQuery({
    queryKey: ["paciente", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pacientes").select("*, bairro:bairros(nome), povoado:povoados(nome)")
        .eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: autorizacoes = [] } = useQuery({
    queryKey: ["paciente-aut", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("autorizacoes")
        .select("id, num_aut, data_autorizacao, total_autorizado, status")
        .eq("paciente_id", id).order("data_autorizacao", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const podeEditar = !!p && (isAdmin || (has(["atendente"]) && p.criado_por === userId));

  const form = usePacienteForm(p ? {
    nome: p.nome, nome_da_mae: p.nome_da_mae, dtn: p.dtn, sexo: p.sexo,
    cartao_sus: p.cartao_sus ?? "", naturalidade: p.naturalidade ?? "",
    zona: p.zona, bairro_id: p.bairro_id, povoado_id: p.povoado_id,
    rua: p.rua ?? "", numero: p.numero ?? "", ponto_referencia: p.ponto_referencia ?? "",
  } : {});

  const update = useMutation({
    mutationFn: async (v: PacienteForm) => {
      const { error } = await supabase.from("pacientes").update({
        nome: v.nome, nome_da_mae: v.nome_da_mae, dtn: v.dtn, sexo: v.sexo,
        cartao_sus: v.cartao_sus ? v.cartao_sus.replace(/\D/g, "") : null,
        naturalidade: v.naturalidade || null, zona: v.zona,
        bairro_id: v.zona === "urbana" ? v.bairro_id : null,
        povoado_id: v.zona === "rural" ? v.povoado_id : null,
        rua: v.rua || null, numero: v.numero || null,
        ponto_referencia: v.ponto_referencia || null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Paciente atualizado");
      qc.invalidateQueries({ queryKey: ["paciente", id] });
      qc.invalidateQueries({ queryKey: ["pacientes"] });
      setEditMode(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="p-10 text-center"><Loader2 className="size-5 animate-spin mx-auto text-muted-foreground" /></div>;
  if (!p) return <PageBody><div className="text-center text-muted-foreground py-10">Paciente não encontrado.</div></PageBody>;

  return (
    <>
      <PageHeader
        title={p.nome}
        description={`Nascimento: ${dateBR(p.dtn)} • ${ageFromDob(p.dtn)} anos • ${p.sexo}`}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate({ to: "/pacientes" })}><ArrowLeft className="size-4" /> Voltar</Button>
            {podeEditar && !editMode && (
              <Button onClick={() => setEditMode(true)}><Pencil className="size-4" /> Editar</Button>
            )}
          </div>
        }
      />
      <PageBody>
        {editMode ? (
          <div className="max-w-3xl space-y-4">
            <PacienteFormFields form={form} onSubmit={(v) => update.mutate(v)} saving={update.isPending} submitLabel="Salvar alterações" />
            <Button variant="ghost" onClick={() => setEditMode(false)}>Cancelar edição</Button>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Identificação</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-2">
                <Field label="Nome da mãe" value={p.nome_da_mae} />
                <Field label="Cartão SUS" value={p.cartao_sus ? maskSUS(p.cartao_sus) : "—"} mono />
                <Field label="Naturalidade" value={p.naturalidade ?? "—"} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Endereço</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-2">
                <Field label="Zona" value={<Badge variant="outline" className="capitalize">{p.zona}</Badge>} />
                <Field label={p.zona === "urbana" ? "Bairro" : "Povoado"} value={p.bairro?.nome ?? p.povoado?.nome ?? "—"} />
                <Field label="Rua" value={p.rua ?? "—"} />
                <Field label="Número" value={p.numero ?? "—"} />
                <Field label="Ponto de referência" value={p.ponto_referencia ?? "—"} />
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-base">Histórico de autorizações</CardTitle></CardHeader>
              <CardContent>
                {autorizacoes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma autorização emitida ainda.</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Nº</TableHead><TableHead>Data</TableHead>
                      <TableHead>Status</TableHead><TableHead className="text-right">Total</TableHead>
                      <TableHead></TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {autorizacoes.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="font-mono text-xs">{a.num_aut}</TableCell>
                          <TableCell>{dateBR(a.data_autorizacao)}</TableCell>
                          <TableCell><Badge variant={STATUS_VARIANTS[a.status] ?? "secondary"} className="capitalize">{a.status}</Badge></TableCell>
                          <TableCell className="text-right tabular-nums">{brl(Number(a.total_autorizado))}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" asChild>
                              <Link to="/autorizacoes/$id" params={{ id: a.id }}>Ver</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </PageBody>
    </>
  );
}

function Field({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono text-xs" : ""}>{value}</span>
    </div>
  );
}
