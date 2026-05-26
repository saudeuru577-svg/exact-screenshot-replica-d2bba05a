// Refatorado para usar usePaciente, usePacienteAutorizacoes e usePacientesMutations.
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Pencil, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { formatSupabaseError } from "@/lib/format-error";

import { useAuth } from "@/hooks/use-auth";
import { usePerfil } from "@/hooks/use-perfil";
import {
  usePaciente, usePacienteAutorizacoes, usePacientesMutations,
} from "@/hooks/queries/use-pacientes";
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

export const Route = createFileRoute("/_authenticated/saude/regulacao/autorizacao-exames/pacientes/$id")({
  component: PacienteDetalhe,
});

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pendente: "secondary", aprovado: "default", bloqueado: "destructive",
  cancelado: "outline", faturado: "default",
};

function PacienteDetalhe() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const userId = useAuth((s) => s.user?.id);
  const { isAdmin, has } = usePerfil();
  const [editMode, setEditMode] = useState(false);

  const { data: p, isLoading } = usePaciente(id);
  const { data: autorizacoes = [] } = usePacienteAutorizacoes(id);
  const { update } = usePacientesMutations();

  const podeEditar = !!p && (isAdmin || (has(["atendente"]) && p.criado_por === userId));

  const form = usePacienteForm(p ? {
    nome: p.nome, nome_da_mae: p.nome_da_mae, dtn: p.dtn, sexo: p.sexo,
    cartao_sus: p.cartao_sus ?? "", naturalidade: p.naturalidade ?? "",
    zona: p.zona, bairro_id: p.bairro_id, povoado_id: p.povoado_id,
    rua: p.rua ?? "", numero: p.numero ?? "", ponto_referencia: p.ponto_referencia ?? "",
  } : {});

  const handleUpdate = (v: PacienteForm) => {
    update.mutate(
      {
        id,
        payload: {
          nome: v.nome, nome_da_mae: v.nome_da_mae, dtn: v.dtn, sexo: v.sexo,
          cartao_sus: v.cartao_sus ? v.cartao_sus.replace(/\D/g, "") : null,
          naturalidade: v.naturalidade || null, zona: v.zona,
          bairro_id: v.zona === "urbana" ? v.bairro_id : null,
          povoado_id: v.zona === "rural" ? v.povoado_id : null,
          rua: v.rua || null, numero: v.numero || null,
          ponto_referencia: v.ponto_referencia || null,
        },
      },
      {
        onSuccess: () => {
          toast.success("Paciente atualizado");
          setEditMode(false);
        },
        onError: (e: Error) => toast.error(formatSupabaseError(e)),
      },
    );
  };

  if (isLoading) return <div className="p-10 text-center"><Loader2 className="size-5 animate-spin mx-auto text-muted-foreground" /></div>;
  if (!p) return <PageBody><div className="text-center text-muted-foreground py-10">Paciente não encontrado.</div></PageBody>;


  return (
    <>
      <PageHeader
        title={p.nome}
        description={`Nascimento: ${dateBR(p.dtn)} • ${ageFromDob(p.dtn)} anos • ${p.sexo}`}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate({ to: "/saude/regulacao/autorizacao-exames/pacientes" })}><ArrowLeft className="size-4" /> Voltar</Button>
            {podeEditar && !editMode && (
              <Button onClick={() => setEditMode(true)}><Pencil className="size-4" /> Editar</Button>
            )}
          </div>
        }
      />
      <PageBody>
        {editMode ? (
          <div className="max-w-3xl space-y-4">
            <PacienteFormFields form={form} onSubmit={handleUpdate} saving={update.isPending} submitLabel="Salvar alterações" />
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
                              <Link to="/saude/regulacao/autorizacao-exames/autorizacoes/$id" params={{ id: a.id }}>Ver</Link>
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
