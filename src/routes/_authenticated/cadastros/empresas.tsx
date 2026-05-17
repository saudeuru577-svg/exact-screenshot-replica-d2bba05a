import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Search, Pencil, Loader2, Wallet } from "lucide-react";
import { LimitesEmpresaDialog } from "@/components/empresas/limites-dialog";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageBody } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { dateBR, maskCEP, maskCNPJ, maskPhone, validCNPJ } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/cadastros/empresas")({
  component: EmpresasPage,
});

const TIPO = ["laboratorio", "clinica", "hospital", "outro"] as const;

const schema = z.object({
  nome_fantasia: z.string().trim().min(2).max(120),
  razao_social: z.string().trim().min(2).max(150),
  cnpj: z.string().refine(validCNPJ, "CNPJ inválido"),
  inscricao_estadual: z.string().trim().max(30).optional().or(z.literal("")),
  tipo_servico: z.enum(TIPO),
  email: z.string().trim().email("E-mail inválido").optional().or(z.literal("")),
  telefone: z.string().trim().optional().or(z.literal("")),
  endereco: z.string().trim().optional().or(z.literal("")),
  bairro: z.string().trim().optional().or(z.literal("")),
  cidade: z.string().trim().optional().or(z.literal("")),
  estado: z.string().trim().length(2).optional().or(z.literal("")),
  cep: z.string().trim().optional().or(z.literal("")),
  responsavel_contrato: z.string().trim().optional().or(z.literal("")),
  contrato_numero: z.string().trim().optional().or(z.literal("")),
  contrato_inicio: z.string().optional().or(z.literal("")),
  contrato_fim: z.string().optional().or(z.literal("")),
  ativa: z.boolean(),
}).refine(
  (d) => !d.contrato_inicio || !d.contrato_fim || d.contrato_fim >= d.contrato_inicio,
  { message: "Fim do contrato deve ser >= início", path: ["contrato_fim"] },
);

type FormValues = z.infer<typeof schema>;
type Empresa = FormValues & { id: string; criado_em: string };

const EMPTY: FormValues = {
  nome_fantasia: "", razao_social: "", cnpj: "", tipo_servico: "laboratorio",
  ativa: true, inscricao_estadual: "", email: "", telefone: "", endereco: "",
  bairro: "", cidade: "", estado: "", cep: "", responsavel_contrato: "",
  contrato_numero: "", contrato_inicio: "", contrato_fim: "",
};

function EmpresasPage() {
  const { isAdmin } = usePerfil();
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState<string>("todos");
  const [showInativas, setShowInativas] = useState(false);
  const [editing, setEditing] = useState<Empresa | null>(null);
  const [open, setOpen] = useState(false);
  const [limitesEmp, setLimitesEmp] = useState<Empresa | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["empresas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresas").select("*").order("nome_fantasia");
      if (error) throw error;
      return data as Empresa[];
    },
  });

  const filtered = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return data.filter((e) => {
      if (!showInativas && !e.ativa) return false;
      if (tipo !== "todos" && e.tipo_servico !== tipo) return false;
      if (t && !`${e.nome_fantasia} ${e.razao_social} ${e.cnpj}`.toLowerCase().includes(t)) return false;
      return true;
    });
  }, [data, busca, tipo, showInativas]);

  const save = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        ...values,
        cnpj: values.cnpj.replace(/\D/g, ""),
        inscricao_estadual: values.inscricao_estadual || null,
        email: values.email || null,
        telefone: values.telefone || null,
        endereco: values.endereco || null,
        bairro: values.bairro || null,
        cidade: values.cidade || null,
        estado: values.estado ? values.estado.toUpperCase() : null,
        cep: values.cep || null,
        responsavel_contrato: values.responsavel_contrato || null,
        contrato_numero: values.contrato_numero || null,
        contrato_inicio: values.contrato_inicio || null,
        contrato_fim: values.contrato_fim || null,
      };
      if (editing) {
        const { error } = await supabase.from("empresas").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("empresas").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Empresa atualizada" : "Empresa cadastrada");
      qc.invalidateQueries({ queryKey: ["empresas"] });
      setOpen(false); setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleAtiva = useMutation({
    mutationFn: async (e: Empresa) => {
      const { error } = await supabase.from("empresas")
        .update({ ativa: !e.ativa }).eq("id", e.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["empresas"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        title="Empresas"
        description="Laboratórios, clínicas e hospitais conveniados."
        actions={isAdmin && (
          <Button onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="size-4" /> Nova empresa
          </Button>
        )}
      />
      <PageBody>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou CNPJ" className="pl-9" />
          </div>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {TIPO.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={showInativas} onCheckedChange={setShowInativas} /> Mostrar inativas
          </label>
        </div>

        <div className="border rounded-lg bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome fantasia</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead>Contrato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={7} className="text-center py-10"><Loader2 className="size-5 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>}
              {!isLoading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Nenhuma empresa encontrada.</TableCell></TableRow>
              )}
              {filtered.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.nome_fantasia}</TableCell>
                  <TableCell className="font-mono text-xs">{maskCNPJ(e.cnpj)}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{e.tipo_servico}</Badge></TableCell>
                  <TableCell>{e.cidade ? `${e.cidade}/${e.estado ?? ""}` : "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {e.contrato_inicio && e.contrato_fim ? `${dateBR(e.contrato_inicio)} → ${dateBR(e.contrato_fim)}` : "—"}
                  </TableCell>
                  <TableCell>
                    {isAdmin ? (
                      <Switch checked={e.ativa} onCheckedChange={() => toggleAtiva.mutate(e)} />
                    ) : (
                      <Badge variant={e.ativa ? "default" : "secondary"}>{e.ativa ? "Ativa" : "Inativa"}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {isAdmin && (
                      <Button variant="ghost" size="sm" onClick={() => { setEditing(e); setOpen(true); }}>
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

      <EmpresaForm
        open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}
        empresa={editing}
        onSubmit={(v) => save.mutate(v)}
        saving={save.isPending}
      />
    </>
  );
}

function EmpresaForm({
  open, onOpenChange, empresa, onSubmit, saving,
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  empresa: Empresa | null; onSubmit: (v: FormValues) => void; saving: boolean;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: empresa ? { ...EMPTY, ...empresa, cnpj: maskCNPJ(empresa.cnpj) } : EMPTY,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{empresa ? "Editar empresa" : "Nova empresa"}</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form className="space-y-4 px-4 pb-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid grid-cols-2 gap-3">
              <FormField name="nome_fantasia" control={form.control} render={({ field }) => (
                <FormItem className="col-span-2"><FormLabel>Nome fantasia</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="razao_social" control={form.control} render={({ field }) => (
                <FormItem className="col-span-2"><FormLabel>Razão social</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="cnpj" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>CNPJ</FormLabel><FormControl>
                  <Input value={field.value} onChange={(e) => field.onChange(maskCNPJ(e.target.value))} placeholder="00.000.000/0000-00" />
                </FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="inscricao_estadual" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Inscrição estadual</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="tipo_servico" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Tipo</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{TIPO.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <FormField name="responsavel_contrato" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Responsável</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="email" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>E-mail</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="telefone" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Telefone</FormLabel><FormControl>
                  <Input value={field.value ?? ""} onChange={(e) => field.onChange(maskPhone(e.target.value))} />
                </FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="endereco" control={form.control} render={({ field }) => (
                <FormItem className="col-span-2"><FormLabel>Endereço</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="bairro" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Bairro</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="cep" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>CEP</FormLabel><FormControl>
                  <Input value={field.value ?? ""} onChange={(e) => field.onChange(maskCEP(e.target.value))} />
                </FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="cidade" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="estado" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>UF</FormLabel><FormControl><Input maxLength={2} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="contrato_numero" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Nº do contrato</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="contrato_inicio" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Início</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="contrato_fim" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Fim</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="ativa" control={form.control} render={({ field }) => (
                <FormItem className="col-span-2 flex items-center gap-3 rounded-md border p-3">
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="!mt-0">Empresa ativa</FormLabel>
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
