import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil, FileText, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { signedUrl, downloadBlobUrl } from "@/lib/autorizacao-storage";
import { PageHeader, PageBody } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { usePerfil } from "@/hooks/use-perfil";
import { useAuth } from "@/hooks/use-auth";
import { brl, dateBR, ageFromDob } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/autorizacoes/$id")({
  component: VisualizarAutorizacao,
});

const VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pendente: "secondary", aprovado: "default", bloqueado: "destructive",
  cancelado: "outline", faturado: "default",
};

type Item = {
  id: string; descricao: string; quantidade: number;
  valor_unitario: number; valor_total: number;
};

type AutFull = {
  id: string; num_aut: string; data_autorizacao: string;
  total_autorizado: number; status: string; sintomas: string | null;
  pdf_autorizacao: string | null; qr_code: string | null;
  assinatura_atendente: string | null; assinatura_paciente: string | null;
  foto_requisicao: string | null; criado_em: string; criado_por: string;
  paciente: { id: string; nome: string; nome_da_mae: string; dtn: string; cartao_sus: string | null } | null;
  empresa: { nome_fantasia: string; cnpj: string } | null;
  ubs: { nome_posto: string } | null;
  profissional: { nome_profissional: string; conselho: string; numero_conselho: string } | null;
};

function VisualizarAutorizacao() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { isAdmin, has } = usePerfil();
  const userId = useAuth((s) => s.user?.id);

  const { data: aut, isLoading, error } = useQuery({
    queryKey: ["autorizacao", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("autorizacoes")
        .select(`
          id, num_aut, data_autorizacao, total_autorizado, status, sintomas,
          pdf_autorizacao, qr_code, assinatura_atendente, assinatura_paciente,
          foto_requisicao, criado_em, criado_por,
          paciente:pacientes(id, nome, nome_da_mae, dtn, cartao_sus),
          empresa:empresas(nome_fantasia, cnpj),
          ubs:ubs(nome_posto),
          profissional:profissionais(nome_profissional, conselho, numero_conselho)
        `)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as unknown as AutFull;
    },
  });

  const { data: itens = [] } = useQuery({
    queryKey: ["autorizacao-itens", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itens_autorizacao")
        .select("id, descricao, quantidade, valor_unitario, valor_total")
        .eq("autorizacao_id", id)
        .order("criado_em", { ascending: true });
      if (error) throw error;
      return data as Item[];
    },
  });

  const podeEditar = !!aut && (
    isAdmin || (aut.status === "pendente" && has(["atendente"]) && aut.criado_por === userId)
  );

  const abrirArquivo = async (path: string | null, label: string) => {
    if (!path) { toast.error(`${label} indisponível`); return; }
    try {
      const url = await signedUrl(path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error((e as Error).message);
    }
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

  return (
    <>
      <PageHeader
        title={`Autorização ${aut.num_aut}`}
        description={`Emitida em ${dateBR(aut.data_autorizacao)}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate({ to: "/autorizacoes" })}>
              <ArrowLeft className="size-4" /> Voltar
            </Button>
            <Button variant="outline" onClick={() => abrirArquivo(aut.pdf_autorizacao, "PDF")}>
              <FileText className="size-4" /> Abrir PDF
            </Button>
            {podeEditar && (
              <Button asChild>
                <Link to="/autorizacoes/$id/editar" params={{ id: aut.id }}>
                  <Pencil className="size-4" /> Editar
                </Link>
              </Button>
            )}
          </div>
        }
      />
      <PageBody>
        <div className="max-w-5xl mx-auto space-y-4">
          {/* Status header */}
          <Card>
            <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <QrPreview path={aut.qr_code} fallback={aut.num_aut} />
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant={VARIANTS[aut.status] ?? "secondary"} className="capitalize text-xs">
                    {aut.status}
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total autorizado</p>
                <p className="text-2xl font-bold tabular-nums">{brl(Number(aut.total_autorizado))}</p>
              </div>
            </CardContent>
          </Card>

          {/* Paciente / Origem */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Paciente</p>
                <p className="font-semibold">{aut.paciente?.nome ?? "—"}</p>
                <Field label="Mãe" value={aut.paciente?.nome_da_mae ?? "—"} />
                <Field
                  label="Nascimento"
                  value={aut.paciente ? `${dateBR(aut.paciente.dtn)} · ${ageFromDob(aut.paciente.dtn)} anos` : "—"}
                />
                <Field label="Cartão SUS" value={aut.paciente?.cartao_sus ?? "—"} />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Origem</p>
                <Field label="UBS" value={aut.ubs?.nome_posto ?? "—"} />
                <Field
                  label="Profissional"
                  value={aut.profissional
                    ? `${aut.profissional.nome_profissional} (${aut.profissional.conselho} ${aut.profissional.numero_conselho})`
                    : "—"}
                />
                <Field label="Empresa executora" value={aut.empresa?.nome_fantasia ?? "—"} />
                <Field label="CNPJ" value={aut.empresa?.cnpj ?? "—"} />
              </CardContent>
            </Card>
          </div>

          {/* Sintomas */}
          {aut.sintomas && (
            <Card>
              <CardContent className="p-4 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sintomas / indicação</p>
                <p className="text-sm whitespace-pre-wrap">{aut.sintomas}</p>
              </CardContent>
            </Card>
          )}

          {/* Itens */}
          <Card>
            <CardContent className="p-0">
              <div className="px-4 pt-4 pb-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Procedimentos autorizados
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="p-3 font-medium">Descrição</th>
                      <th className="p-3 font-medium w-20 text-center">Qtd</th>
                      <th className="p-3 font-medium w-32 text-right">V. Unit.</th>
                      <th className="p-3 font-medium w-32 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.length === 0 && (
                      <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Sem itens.</td></tr>
                    )}
                    {itens.map((it) => (
                      <tr key={it.id} className="border-t">
                        <td className="p-3">{it.descricao}</td>
                        <td className="p-3 text-center tabular-nums">{it.quantidade}</td>
                        <td className="p-3 text-right tabular-nums">{brl(Number(it.valor_unitario))}</td>
                        <td className="p-3 text-right tabular-nums font-medium">{brl(Number(it.valor_total))}</td>
                      </tr>
                    ))}
                  </tbody>
                  {itens.length > 0 && (
                    <tfoot className="bg-muted/30 border-t">
                      <tr>
                        <td colSpan={3} className="p-3 text-right font-medium">Total</td>
                        <td className="p-3 text-right font-bold tabular-nums">{brl(Number(aut.total_autorizado))}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Anexos */}
          <Card>
            <CardContent className="p-4 grid sm:grid-cols-3 gap-3">
              <AnexoButton label="Assinatura atendente" path={aut.assinatura_atendente} onOpen={abrirArquivo} />
              <AnexoButton label="Assinatura paciente" path={aut.assinatura_paciente} onOpen={abrirArquivo} />
              <AnexoButton label="Foto da requisição" path={aut.foto_requisicao} onOpen={abrirArquivo} />
            </CardContent>
          </Card>
        </div>
      </PageBody>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm">
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function AnexoButton({
  label, path, onOpen,
}: { label: string; path: string | null; onOpen: (p: string | null, l: string) => void }) {
  const disabled = !path;
  return (
    <Button
      variant="outline" className="justify-between h-auto py-3"
      disabled={disabled} onClick={() => onOpen(path, label)}
    >
      <span className="text-sm">{label}</span>
      {disabled
        ? <span className="text-xs text-muted-foreground">indisponível</span>
        : <ExternalLink className="size-4" />}
    </Button>
  );
}

function QrPreview({ path, fallback }: { path: string | null; fallback: string }) {
  const [src, setSrc] = useState<string>("");
  useEffect(() => {
    let alive = true;
    if (!path) return;
    signedUrl(path).then((u) => { if (alive) setSrc(u); }).catch(() => {});
    return () => { alive = false; };
  }, [path]);
  return src
    ? <img src={src} alt={`QR ${fallback}`} className="size-16 rounded-sm border bg-white p-1" />
    : <div className="size-16 rounded-sm border bg-muted grid place-items-center text-[10px] text-muted-foreground font-mono">{fallback}</div>;
}
