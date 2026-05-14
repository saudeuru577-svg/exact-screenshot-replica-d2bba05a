import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, FileSpreadsheet, FileText, ChevronUp, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { exportarXlsx, exportarPdf, type ExportRow } from "@/lib/relatorio-export";

/* ============= Filtros UI ============= */

export function FiltrosBar({
  children, onAplicar, onLimpar,
}: { children: ReactNode; onAplicar: () => void; onLimpar: () => void }) {
  return (
    <Card className="p-4 mb-4">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">{children}</div>
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline" onClick={onLimpar}>Limpar</Button>
        <Button onClick={onAplicar}>Aplicar</Button>
      </div>
    </Card>
  );
}

export function CampoPeriodo({
  inicio, fim, onInicio, onFim,
}: { inicio: string; fim: string; onInicio: (v: string) => void; onFim: (v: string) => void }) {
  return (
    <>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Data início</label>
        <Input type="date" value={inicio} onChange={(e) => onInicio(e.target.value)} />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Data fim</label>
        <Input type="date" value={fim} onChange={(e) => onFim(e.target.value)} />
      </div>
    </>
  );
}

export function CampoMes({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">Competência</label>
      <Input type="month" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function CampoEmpresa({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { data = [] } = useQuery({
    queryKey: ["rel-empresas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresas").select("id, nome_fantasia").eq("ativa", true).order("nome_fantasia");
      if (error) throw error;
      return data as { id: string; nome_fantasia: string }[];
    },
  });
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">Empresa/Convênio</label>
      <Select value={value || "__all"} onValueChange={(v) => onChange(v === "__all" ? "" : v)}>
        <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__all">Todas</SelectItem>
          {data.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome_fantasia}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

export function CampoPaciente({
  value, label, onChange,
}: { value: string; label: string; onChange: (id: string, label: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["rel-pacientes", q],
    enabled: open,
    queryFn: async () => {
      let query = supabase.from("pacientes")
        .select("id, nome, cartao_sus")
        .order("nome").limit(20);
      if (q.trim()) {
        const term = q.trim();
        query = query.or(`nome.ilike.%${term}%,cartao_sus.ilike.%${term}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as { id: string; nome: string; cartao_sus: string | null }[];
    },
  });

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">Paciente</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-between font-normal">
            <span className="truncate">{label || "Todos"}</span>
            <Search className="size-4 opacity-50 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Buscar nome ou cartão SUS…" value={q} onValueChange={setQ} />
            <CommandList>
              {value && (
                <CommandItem onSelect={() => { onChange("", ""); setOpen(false); }}>
                  <span className="text-muted-foreground">Limpar seleção</span>
                </CommandItem>
              )}
              {isLoading ? (
                <div className="p-3 text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" /> Buscando…
                </div>
              ) : (
                <>
                  <CommandEmpty>Nenhum paciente encontrado</CommandEmpty>
                  {data.map((p) => (
                    <CommandItem key={p.id} value={p.id} onSelect={() => {
                      onChange(p.id, p.nome); setOpen(false);
                    }}>
                      <div>
                        <div>{p.nome}</div>
                        {p.cartao_sus && <div className="text-xs text-muted-foreground">{p.cartao_sus}</div>}
                      </div>
                    </CommandItem>
                  ))}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function CampoProcedimento({
  value, label, onChange,
}: { value: string; label: string; onChange: (id: string, label: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["rel-procedimentos", q],
    enabled: open,
    queryFn: async () => {
      let query = supabase.from("procedimentos")
        .select("id, nome, sigla").eq("ativo", true).order("nome").limit(30);
      if (q.trim()) {
        const term = q.trim();
        query = query.or(`nome.ilike.%${term}%,sigla.ilike.%${term}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as { id: string; nome: string; sigla: string }[];
    },
  });

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">Procedimento</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-between font-normal">
            <span className="truncate">{label || "Todos"}</span>
            <Search className="size-4 opacity-50 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Buscar nome ou sigla…" value={q} onValueChange={setQ} />
            <CommandList>
              {value && (
                <CommandItem onSelect={() => { onChange("", ""); setOpen(false); }}>
                  <span className="text-muted-foreground">Limpar seleção</span>
                </CommandItem>
              )}
              {isLoading ? (
                <div className="p-3 text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" /> Buscando…
                </div>
              ) : (
                <>
                  <CommandEmpty>Nenhum procedimento encontrado</CommandEmpty>
                  {data.map((p) => (
                    <CommandItem key={p.id} value={p.id} onSelect={() => {
                      onChange(p.id, `${p.sigla} — ${p.nome}`); setOpen(false);
                    }}>
                      <div>
                        <div>{p.nome}</div>
                        <div className="text-xs text-muted-foreground">{p.sigla}</div>
                      </div>
                    </CommandItem>
                  ))}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/* ============= Estados ============= */

export function StateLoading() {
  return (
    <div className="flex items-center justify-center py-16 text-muted-foreground">
      <Loader2 className="size-5 animate-spin mr-2" /> Carregando…
    </div>
  );
}

export function StateError({ message }: { message: string }) {
  return (
    <Card className="p-8 text-center text-destructive">
      <div className="font-medium mb-1">Erro ao carregar relatório</div>
      <div className="text-sm">{message}</div>
    </Card>
  );
}

export function StateEmpty({ message = "Nenhum resultado para os filtros aplicados." }: { message?: string }) {
  return <Card className="p-8 text-center text-muted-foreground">{message}</Card>;
}

/* ============= Export buttons ============= */

export function ExportButtons({
  titulo, headers, rows, subtitulo, disabled,
}: {
  titulo: string;
  headers: string[];
  rows: ExportRow[];
  subtitulo?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-2">
      <Button
        variant="outline" size="sm" disabled={disabled || rows.length === 0}
        onClick={() => exportarXlsx(titulo, headers, rows)}
      >
        <FileSpreadsheet className="size-4" /> XLSX
      </Button>
      <Button
        variant="outline" size="sm" disabled={disabled || rows.length === 0}
        onClick={() => exportarPdf(titulo, headers, rows, subtitulo)}
      >
        <FileText className="size-4" /> PDF
      </Button>
    </div>
  );
}

/* ============= Tabela paginada ordenável ============= */

export type Coluna<T> = {
  key: keyof T & string;
  label: string;
  align?: "left" | "right" | "center";
  render?: (row: T) => ReactNode;
};

export function TabelaPaginada<T extends Record<string, unknown>>({
  data, colunas, pageSize = 50,
}: { data: T[]; colunas: Coluna<T>[]; pageSize?: number }) {
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const ordenado = useMemo(() => {
    if (!sortKey) return data;
    const arr = [...data];
    arr.sort((a, b) => {
      const av = a[sortKey] as unknown;
      const bv = b[sortKey] as unknown;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      const r = String(av).localeCompare(String(bv), "pt-BR");
      return sortDir === "asc" ? r : -r;
    });
    return arr;
  }, [data, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(ordenado.length / pageSize));
  const curPage = Math.min(page, totalPages);
  const slice = ordenado.slice((curPage - 1) * pageSize, curPage * pageSize);

  const toggleSort = (k: string) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  };

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            {colunas.map((c) => (
              <TableHead key={c.key} className={c.align === "right" ? "text-right" : ""}>
                <button
                  className="inline-flex items-center gap-1 hover:text-foreground"
                  onClick={() => toggleSort(c.key)}
                >
                  {c.label}
                  {sortKey === c.key && (sortDir === "asc"
                    ? <ChevronUp className="size-3" />
                    : <ChevronDown className="size-3" />)}
                </button>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {slice.map((row, i) => (
            <TableRow key={i}>
              {colunas.map((c) => (
                <TableCell key={c.key} className={c.align === "right" ? "text-right tabular-nums" : ""}>
                  {c.render ? c.render(row) : String(row[c.key] ?? "")}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between p-3 border-t text-sm text-muted-foreground">
        <span>{ordenado.length} {ordenado.length === 1 ? "registro" : "registros"}</span>
        {totalPages > 1 && (
          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => { e.preventDefault(); setPage(Math.max(1, curPage - 1)); }}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#" isActive>{curPage} / {totalPages}</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => { e.preventDefault(); setPage(Math.min(totalPages, curPage + 1)); }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </Card>
  );
}
