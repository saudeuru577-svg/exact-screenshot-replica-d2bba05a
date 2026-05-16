import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, Download, Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { onlyDigits } from "@/lib/format";

const HEADERS = ["sigla", "nome", "grupo", "tipo", "cnpj_empresa", "valor_unitario", "nomes_alternativos"];
const TIPOS = ["exame", "consulta"] as const;

type Empresa = { id: string; cnpj: string; nome_fantasia: string; ativa: boolean };
type Proc = { sigla: string; empresa_id: string };

type ParsedRow = {
  linha: number;
  sigla: string;
  nome: string;
  grupo: string;
  tipo: string;
  cnpj_raw: string;
  cnpj: string;
  valor: number;
  nomes_alternativos: string;
  empresa?: Empresa;
  status: "valida" | "duplicada" | "erro";
  motivo?: string;
};

export function ImportProcedimentosDialog({
  open, onOpenChange,
}: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string>("");

  const { data: empresas = [] } = useQuery({
    queryKey: ["empresas-import"],
    queryFn: async () => {
      const { data, error } = await supabase.from("empresas").select("id, cnpj, nome_fantasia, ativa");
      if (error) throw error;
      return (data ?? []) as Empresa[];
    },
    enabled: open,
  });

  const { data: existentes = [] } = useQuery({
    queryKey: ["procedimentos-existentes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("procedimentos").select("sigla, empresa_id");
      if (error) throw error;
      return (data ?? []) as Proc[];
    },
    enabled: open,
  });

  const empresaPorCnpj = useMemo(() => {
    const m = new Map<string, Empresa>();
    for (const e of empresas) m.set(onlyDigits(e.cnpj ?? ""), e);
    return m;
  }, [empresas]);

  const duplicadoKey = useMemo(() => {
    const s = new Set<string>();
    for (const p of existentes) s.add(`${p.sigla.toLowerCase()}|${p.empresa_id}`);
    return s;
  }, [existentes]);

  const baixarModelo = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      HEADERS,
      ["HEMO", "Hemograma Completo", "Hematologia", "exame", "12.345.678/0001-90", 25.5, "Hemograma; HMG"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Procedimentos");
    XLSX.writeFile(wb, "modelo_procedimentos.xlsx");
  };

  const onFile = async (file: File) => {
    setFileName(file.name);
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

    const parsed: ParsedRow[] = raw.map((r, i) => {
      const linha = i + 2;
      const sigla = String(r.sigla ?? "").trim();
      const nome = String(r.nome ?? "").trim();
      const grupo = String(r.grupo ?? "").trim();
      const tipo = String(r.tipo ?? "").trim().toLowerCase();
      const cnpj_raw = String(r.cnpj_empresa ?? "").trim();
      const cnpj = onlyDigits(cnpj_raw);
      const valor = Number(String(r.valor_unitario ?? "").toString().replace(",", ".")) || 0;
      const nomes_alternativos = String(r.nomes_alternativos ?? "").trim();
      const empresa = empresaPorCnpj.get(cnpj);

      const row: ParsedRow = {
        linha, sigla, nome, grupo, tipo, cnpj_raw, cnpj, valor, nomes_alternativos,
        empresa, status: "valida",
      };

      if (!sigla || !nome) { row.status = "erro"; row.motivo = "sigla e nome são obrigatórios"; return row; }
      if (!grupo) { row.status = "erro"; row.motivo = "grupo é obrigatório"; return row; }
      if (!TIPOS.includes(tipo as (typeof TIPOS)[number])) { row.status = "erro"; row.motivo = "tipo deve ser exame ou consulta"; return row; }
      if (!cnpj || cnpj.length !== 14) { row.status = "erro"; row.motivo = "CNPJ inválido"; return row; }
      if (!empresa) { row.status = "erro"; row.motivo = "empresa não encontrada"; return row; }
      if (!valor || valor <= 0) { row.status = "erro"; row.motivo = "valor unitário inválido"; return row; }
      if (duplicadoKey.has(`${sigla.toLowerCase()}|${empresa.id}`)) {
        row.status = "duplicada"; row.motivo = "já existe sigla nesta empresa"; return row;
      }
      // duplicada dentro do próprio arquivo
      return row;
    });

    // marca duplicadas dentro do próprio arquivo
    const seen = new Set<string>();
    for (const r of parsed) {
      if (r.status !== "valida" || !r.empresa) continue;
      const k = `${r.sigla.toLowerCase()}|${r.empresa.id}`;
      if (seen.has(k)) { r.status = "duplicada"; r.motivo = "linha repetida na planilha"; }
      else seen.add(k);
    }

    setRows(parsed);
  };

  const validas = rows.filter((r) => r.status === "valida");
  const duplicadas = rows.filter((r) => r.status === "duplicada");
  const erros = rows.filter((r) => r.status === "erro");

  const importar = useMutation({
    mutationFn: async () => {
      if (validas.length === 0) return;
      const payload = validas.map((r) => ({
        sigla: r.sigla,
        nome: r.nome,
        grupo: r.grupo,
        tipo: r.tipo,
        empresa_id: r.empresa!.id,
        valor_unitario: r.valor,
        nomes_alternativos: r.nomes_alternativos || null,
        ativo: true,
      }));
      const { error } = await supabase.from("procedimentos").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`${validas.length} procedimento(s) importado(s)`);
      qc.invalidateQueries({ queryKey: ["procedimentos"] });
      qc.invalidateQueries({ queryKey: ["procedimentos-grupos"] });
      qc.invalidateQueries({ queryKey: ["procedimentos-existentes"] });
      setRows([]); setFileName("");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reset = () => { setRows([]); setFileName(""); };

  return (
    <Sheet open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <SheetContent className="sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Importar procedimentos do Excel</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 px-4 pb-4">
          <div className="rounded-md border bg-muted/30 p-4 space-y-2">
            <p className="text-sm font-medium">1. Baixe o modelo</p>
            <p className="text-xs text-muted-foreground">
              Colunas: <code className="text-[11px]">sigla, nome, grupo, tipo (exame/consulta), cnpj_empresa, valor_unitario, nomes_alternativos</code>.
              A empresa é localizada pelo CNPJ.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={baixarModelo}>
              <Download className="size-4" /> Baixar modelo .xlsx
            </Button>
          </div>

          <div className="rounded-md border p-4 space-y-2">
            <p className="text-sm font-medium">2. Envie o arquivo preenchido</p>
            <label className="flex items-center gap-3 cursor-pointer">
              <Button type="button" variant="outline" size="sm" asChild>
                <span><Upload className="size-4" /> Selecionar .xlsx</span>
              </Button>
              <input
                type="file" accept=".xlsx,.xls" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
              />
              {fileName && <span className="text-xs text-muted-foreground">{fileName}</span>}
            </label>
          </div>

          {rows.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="default" className="gap-1"><CheckCircle2 className="size-3" /> {validas.length} válidas</Badge>
                <Badge variant="secondary" className="gap-1"><AlertCircle className="size-3" /> {duplicadas.length} duplicadas (ignoradas)</Badge>
                <Badge variant="destructive" className="gap-1"><XCircle className="size-3" /> {erros.length} com erro</Badge>
              </div>

              <div className="border rounded-md max-h-[380px] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-card">
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sigla</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Empresa (CNPJ)</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.linha} className={r.status === "erro" ? "bg-destructive/5" : r.status === "duplicada" ? "bg-muted/40" : ""}>
                        <TableCell className="text-xs text-muted-foreground">{r.linha}</TableCell>
                        <TableCell>
                          {r.status === "valida" && <Badge variant="default" className="text-[10px]">OK</Badge>}
                          {r.status === "duplicada" && <Badge variant="secondary" className="text-[10px]">DUP</Badge>}
                          {r.status === "erro" && <Badge variant="destructive" className="text-[10px]">ERR</Badge>}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{r.sigla}</TableCell>
                        <TableCell className="text-xs">{r.nome}</TableCell>
                        <TableCell className="text-xs">
                          {r.empresa?.nome_fantasia ?? <span className="text-muted-foreground">{r.cnpj_raw || "—"}</span>}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums">{r.valor.toFixed(2)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.motivo ?? ""}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <SheetFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            type="button"
            disabled={validas.length === 0 || importar.isPending}
            onClick={() => importar.mutate()}
          >
            {importar.isPending && <Loader2 className="size-4 animate-spin" />}
            Importar {validas.length > 0 ? `(${validas.length})` : ""}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
