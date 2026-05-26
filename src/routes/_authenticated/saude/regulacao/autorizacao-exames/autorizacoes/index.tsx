// Refatorado: lista e exclusão via use-autorizacoes (staleTime 60s).
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Loader2, Eye, Pencil, FileText, Trash2 } from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { formatSupabaseError } from "@/lib/format-error";

import { PageHeader, PageBody } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { confirm } from "@/components/ui/confirm";
import { downloadBlobUrl } from "@/lib/autorizacao-storage";
import { usePerfil } from "@/hooks/use-perfil";
import { brl, dateBR } from "@/lib/format";
import {
  useAutorizacoesLista,
  useAutorizacoesMutations,
  type AutorizacaoLista,
} from "@/hooks/queries/use-autorizacoes";

function QrThumb({ value }: { value: string }) {
  const [src, setSrc] = useState<string>("");
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(value, { width: 96, margin: 0 }).then((d) => { if (alive) setSrc(d); });
    return () => { alive = false; };
  }, [value]);
  return src
    ? <img src={src} alt={`QR ${value}`} className="size-14 rounded-sm border bg-white p-0.5" />
    : <div className="size-14 rounded-sm border bg-muted animate-pulse" />;
}

export const Route = createFileRoute("/_authenticated/saude/regulacao/autorizacao-exames/autorizacoes/")({
  component: AutorizacoesList,
});

const STATUSES = ["pendente", "aprovado", "bloqueado", "cancelado", "faturado"] as const;
const VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pendente: "secondary", aprovado: "default", bloqueado: "destructive",
  cancelado: "outline", faturado: "default",
};

type Aut = AutorizacaoLista;

function AutorizacoesList() {
  const { has, isAdmin } = usePerfil();
  const podeCriar = has(["administrador", "atendente"]);
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("todos");

  const { data = [], isLoading } = useAutorizacoesLista();
  const { remove: removeMut } = useAutorizacoesMutations();

  const handleDelete = async (a: Aut) => {
    const ok = await confirm({
      title: "Excluir autorização?",
      description: `Esta ação não pode ser desfeita. ${a.num_aut} será removida permanentemente.`,
      variant: "destructive",
      confirmLabel: "Excluir",
    });
    if (ok) {
      removeMut.mutate(a.id, {
        onSuccess: () => toast.success("Autorização excluída"),
        onError: (e: Error) => toast.error(formatSupabaseError(e)),
      });
    }
  };

  const handlePdf = async (a: Aut) => {
    if (!a.pdf_autorizacao) {
      toast.error("PDF indisponível para esta autorização");
      return;
    }
    try {
      const url = await downloadBlobUrl(a.pdf_autorizacao);
      const w = window.open(url, "_blank", "noopener,noreferrer");
      if (!w) toast.error("Permita pop-ups para abrir o PDF");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      toast.error(formatSupabaseError(e));
    }
  };

  const filtered = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return data.filter((a) => {
      if (status !== "todos" && a.status !== status) return false;
      if (t && !`${a.num_aut} ${a.paciente?.nome ?? ""}`.toLowerCase().includes(t)) return false;
      return true;
    });
  }, [data, busca, status]);

  return (
    <>
      <PageHeader
        title="Autorizações" description="Histórico e emissão de autorizações de exames e consultas."
        actions={podeCriar && (
          <Button asChild><Link to="/saude/regulacao/autorizacao-exames/autorizacoes/nova"><Plus className="size-4" /> Nova autorização</Link></Button>
        )}
      />
      <PageBody>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por número ou paciente" className="pl-9" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          {isLoading && (
            <div className="border rounded-lg bg-card py-10 text-center">
              <Loader2 className="size-5 animate-spin mx-auto text-muted-foreground" />
            </div>
          )}
          {!isLoading && filtered.length === 0 && (
            <div className="border rounded-lg bg-card py-10 text-center text-muted-foreground">
              Nenhuma autorização encontrada.
            </div>
          )}
          {filtered.map((a) => (
            <div
              key={a.id}
              className="border rounded-lg bg-card px-4 py-3 flex items-center gap-4 hover:bg-accent/40 transition-colors"
            >
              <QrThumb value={a.num_aut} />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm truncate uppercase">
                  {a.paciente?.nome ?? "—"}
                </div>
                <div className="font-mono text-xs text-muted-foreground mt-0.5">
                  {a.num_aut}
                </div>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <Badge variant={VARIANTS[a.status] ?? "secondary"} className="capitalize text-[10px]">
                    {a.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {brl(Number(a.total_autorizado))}
                  </span>
                  {a.empresa?.nome_fantasia && (
                    <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                      • {a.empresa.nome_fantasia}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className="text-sm font-medium text-destructive tabular-nums">
                  {dateBR(a.data_autorizacao)}
                </span>
                <div className="flex items-center gap-0.5">
                  <Button variant="ghost" size="icon" asChild className="size-8" title="Visualizar">
                    <Link to="/saude/regulacao/autorizacao-exames/autorizacoes/$id" params={{ id: a.id }} aria-label="Visualizar">
                      <Eye className="size-4" />
                    </Link>
                  </Button>
                  {(isAdmin || (a.status === "pendente" && has(["atendente"]))) && (
                    <Button variant="ghost" size="icon" asChild className="size-8" title="Editar">
                      <Link to="/saude/regulacao/autorizacao-exames/autorizacoes/$id/editar" params={{ id: a.id }} aria-label="Editar">
                        <Pencil className="size-4" />
                      </Link>
                    </Button>
                  )}
                  <Button
                    variant="ghost" size="icon" className="size-8" title="Abrir PDF"
                    onClick={() => handlePdf(a)} aria-label="Abrir PDF"
                  >
                    <FileText className="size-4" />
                  </Button>
                  {isAdmin && (
                    <Button
                      variant="ghost" size="icon"
                      className="size-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      title="Excluir" onClick={() => handleDelete(a)}
                      disabled={removeMut.isPending} aria-label="Excluir"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </PageBody>
    </>
  );
}
