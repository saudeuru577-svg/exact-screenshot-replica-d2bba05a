import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Search, Pencil, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { GrupoCombobox } from "@/components/ui/grupo-combobox";
import { ImportProcedimentosDialog } from "@/components/procedimentos/import-dialog";

import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageBody } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { usePerfil } from "@/hooks/use-perfil";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/cadastros/procedimentos")({
  component: ProcedimentosPage,
});

const TIPOS = ["exame", "consulta"] as const;

const schema = z.object({
  sigla: z.string().trim().min(2).max(20),
  nome: z.string().trim().min(2).max(120),
  nomes_alternativos: z.string().optional().or(z.literal("")),
  grupo: z.string().trim().min(1).max(60),
  tipo: z.enum(TIPOS),
  empresa_id: z.string().uuid("Selecione uma empresa"),
  valor_unitario: z.number().positive("Valor deve ser maior que zero"),
  ativo: z.boolean(),
});

type FormValues = z.infer<typeof schema>;
type Procedimento = FormValues & { id: string; empresa?: { nome_fantasia: string } | null };

const EMPTY: FormValues = {
  sigla: "", nome: "", nomes_alternativos: "", grupo: "", tipo: "exame",
  empresa_id: "", valor_unitario: 0, ativo: true,
};

function ProcedimentosPage() {
  const { isAdmin } = usePerfil();
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [empFiltro, setEmpFiltro] = useState("todas");
  const [tipoFiltro, setTipoFiltro] = useState("todos");
  const [grupoFiltro, setGrupoFiltro] = useState("");
  const [showInativos, setShowInativos] = useState(false);
  const [editing, setEditing] = useState<Procedimento | null>(null);
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const { data: empresas = [] } = useQuery({
    queryKey: ["empresas-ativas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("empresas")
        .select("id, nome_fantasia, ativa").order("nome_fantasia");
      if (error) throw error;
      return data;
    },
  });

  const { data = [], isLoading } = useQuery({
    queryKey: ["procedimentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("procedimentos")
        .select("*, empresa:empresas(nome_fantasia)")
        .order("nome");
      if (error) throw error;
      return data as unknown as Procedimento[];
    },
  });

  const grupos = useMemo(
    () => Array.from(new Set(data.map((p) => p.grupo).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [data],
  );

  const filtered = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return data.filter((p) => {
      if (!showInativos && !p.ativo) return false;
      if (empFiltro !== "todas" && p.empresa_id !== empFiltro) return false;
      if (tipoFiltro !== "todos" && p.tipo !== tipoFiltro) return false;
      if (grupoFiltro && p.grupo !== grupoFiltro) return false;
      if (t && !`${p.nome} ${p.sigla} ${p.nomes_alternativos ?? ""}`.toLowerCase().includes(t)) return false;
      return true;
    });
  }, [data, busca, empFiltro, tipoFiltro, grupoFiltro, showInativos]);

  const save = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        ...values,
        nomes_alternativos: values.nomes_alternativos || null,
      };
      if (editing) {
        const { error } = await supabase.from("procedimentos").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("procedimentos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Procedimento atualizado" : "Procedimento cadastrado");
      qc.invalidateQueries({ queryKey: ["procedimentos"] });
      setOpen(false); setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleAtivo = useMutation({
    mutationFn: async (p: Procedimento) => {
      const { error } = await supabase.from("procedimentos")
        .update({ ativo: !p.ativo }).eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["procedimentos"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        title="Procedimentos"
        description="Exames e consultas vinculados a empresas conveniadas."
        actions={isAdmin && (
          <Button onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="size-4" /> Novo procedimento
          </Button>
        )}
      />
      <PageBody>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou sigla" className="pl-9" />
          </div>
          <Select value={empFiltro} onValueChange={setEmpFiltro}>
            <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as empresas</SelectItem>
              {empresas.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome_fantasia}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {TIPOS.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={showInativos} onCheckedChange={setShowInativos} /> Mostrar inativos
          </label>
        </div>

        <div className="border rounded-lg bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sigla</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Grupo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={8} className="text-center py-10"><Loader2 className="size-5 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>}
              {!isLoading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">Nenhum procedimento encontrado.</TableCell></TableRow>
              )}
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.sigla}</TableCell>
                  <TableCell className="font-medium">{p.nome}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.grupo}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{p.tipo}</Badge></TableCell>
                  <TableCell className="text-sm">{p.empresa?.nome_fantasia ?? "—"}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{brl(p.valor_unitario)}</TableCell>
                  <TableCell>
                    {isAdmin ? (
                      <Switch checked={p.ativo} onCheckedChange={() => toggleAtivo.mutate(p)} />
                    ) : (
                      <Badge variant={p.ativo ? "default" : "secondary"}>{p.ativo ? "Ativo" : "Inativo"}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {isAdmin && (
                      <Button variant="ghost" size="sm" onClick={() => { setEditing(p); setOpen(true); }}>
                        <Pencil className="size-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </PageBody>

      <ProcForm
        open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}
        proc={editing} empresas={empresas.filter((e) => e.ativa || e.id === editing?.empresa_id)}
        onSubmit={(v) => save.mutate(v)} saving={save.isPending}
      />
    </>
  );
}

function ProcForm({
  open, onOpenChange, proc, empresas, onSubmit, saving,
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  proc: Procedimento | null;
  empresas: { id: string; nome_fantasia: string }[];
  onSubmit: (v: FormValues) => void; saving: boolean;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: proc ? {
      sigla: proc.sigla, nome: proc.nome, nomes_alternativos: proc.nomes_alternativos ?? "",
      grupo: proc.grupo, tipo: proc.tipo, empresa_id: proc.empresa_id,
      valor_unitario: Number(proc.valor_unitario), ativo: proc.ativo,
    } : EMPTY,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{proc ? "Editar procedimento" : "Novo procedimento"}</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form className="space-y-4 px-4 pb-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid grid-cols-2 gap-3">
              <FormField name="sigla" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Sigla</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="tipo" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Tipo</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <FormField name="nome" control={form.control} render={({ field }) => (
                <FormItem className="col-span-2"><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="nomes_alternativos" control={form.control} render={({ field }) => (
                <FormItem className="col-span-2"><FormLabel>Nomes alternativos</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="grupo" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Grupo</FormLabel><FormControl><Input {...field} placeholder="Ex.: Hematologia" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="valor_unitario" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Valor unitário (R$)</FormLabel><FormControl>
                  <Input type="number" step="0.01" min="0" value={field.value}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                </FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="empresa_id" control={form.control} render={({ field }) => (
                <FormItem className="col-span-2"><FormLabel>Empresa</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>{empresas.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome_fantasia}</SelectItem>)}</SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <FormField name="ativo" control={form.control} render={({ field }) => (
                <FormItem className="col-span-2 flex items-center gap-3 rounded-md border p-3">
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="!mt-0">Ativo</FormLabel>
                </FormItem>
              )} />
            </div>
            <SheetFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving && <Loader2 className="size-4 animate-spin" />} Salvar</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
