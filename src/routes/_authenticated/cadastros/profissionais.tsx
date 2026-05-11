import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Search, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageBody } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { maskPhone } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/cadastros/profissionais")({
  component: ProfissionaisPage,
});

const CARGOS = ["medico", "enfermeiro"] as const;
const CONSELHOS = ["CRM", "COREN"] as const;

const schema = z.object({
  nome_profissional: z.string().trim().min(2).max(120),
  cargo: z.enum(CARGOS),
  conselho: z.enum(CONSELHOS),
  numero_conselho: z.string().trim().min(1).max(20),
  estado_conselho: z.string().trim().length(2),
  especialidade: z.string().trim().optional().or(z.literal("")),
  ubs_id: z.string().uuid("Selecione uma UBS"),
  contato: z.string().trim().optional().or(z.literal("")),
});
type FormValues = z.infer<typeof schema>;
type Profissional = FormValues & { id: string; ubs?: { nome_posto: string } | null };

const EMPTY: FormValues = {
  nome_profissional: "", cargo: "medico", conselho: "CRM", numero_conselho: "",
  estado_conselho: "", especialidade: "", ubs_id: "", contato: "",
};

function ProfissionaisPage() {
  const { isAdmin } = usePerfil();
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [ubsFiltro, setUbsFiltro] = useState("todas");
  const [cargoFiltro, setCargoFiltro] = useState("todos");
  const [editing, setEditing] = useState<Profissional | null>(null);
  const [open, setOpen] = useState(false);

  const { data: ubs = [] } = useQuery({
    queryKey: ["ubs-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ubs").select("id, nome_posto").order("nome_posto");
      if (error) throw error; return data;
    },
  });

  const { data = [], isLoading } = useQuery({
    queryKey: ["profissionais"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profissionais").select("*, ubs:ubs(nome_posto)").order("nome_profissional");
      if (error) throw error;
      return data as unknown as Profissional[];
    },
  });

  const filtered = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return data.filter((p) => {
      if (ubsFiltro !== "todas" && p.ubs_id !== ubsFiltro) return false;
      if (cargoFiltro !== "todos" && p.cargo !== cargoFiltro) return false;
      if (t && !`${p.nome_profissional} ${p.numero_conselho} ${p.especialidade ?? ""}`.toLowerCase().includes(t)) return false;
      return true;
    });
  }, [data, busca, ubsFiltro, cargoFiltro]);

  const save = useMutation({
    mutationFn: async (v: FormValues) => {
      const payload = {
        ...v,
        especialidade: v.especialidade || null,
        contato: v.contato || null,
        estado_conselho: v.estado_conselho.toUpperCase(),
      };
      if (editing) {
        const { error } = await supabase.from("profissionais").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("profissionais").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Profissional atualizado" : "Profissional cadastrado");
      qc.invalidateQueries({ queryKey: ["profissionais"] });
      setOpen(false); setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        title="Profissionais" description="Médicos e enfermeiros vinculados às UBS."
        actions={isAdmin && (
          <Button onClick={() => { setEditing(null); setOpen(true); }} disabled={ubs.length === 0}>
            <Plus className="size-4" /> Novo profissional
          </Button>
        )}
      />
      <PageBody>
        {ubs.length === 0 && (
          <div className="rounded-md border border-warning/30 bg-warning/10 text-sm p-3 mb-4">
            Cadastre uma UBS antes de criar profissionais.
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, conselho ou especialidade" className="pl-9" />
          </div>
          <Select value={ubsFiltro} onValueChange={setUbsFiltro}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as UBS</SelectItem>
              {ubs.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome_posto}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={cargoFiltro} onValueChange={setCargoFiltro}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os cargos</SelectItem>
              {CARGOS.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-lg bg-card overflow-hidden">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Nome</TableHead><TableHead>Cargo</TableHead><TableHead>Conselho</TableHead>
              <TableHead>Especialidade</TableHead><TableHead>UBS</TableHead><TableHead>Contato</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={7} className="text-center py-10"><Loader2 className="size-5 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>}
              {!isLoading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Nenhum profissional encontrado.</TableCell></TableRow>
              )}
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nome_profissional}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{p.cargo}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{p.conselho}/{p.estado_conselho} {p.numero_conselho}</TableCell>
                  <TableCell className="text-sm">{p.especialidade ?? "—"}</TableCell>
                  <TableCell className="text-sm">{p.ubs?.nome_posto ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.contato ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    {isAdmin && <Button variant="ghost" size="sm" onClick={() => { setEditing(p); setOpen(true); }}><Pencil className="size-4" /></Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </PageBody>

      <ProfForm open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}
        prof={editing} ubs={ubs} onSubmit={(v) => save.mutate(v)} saving={save.isPending} />
    </>
  );
}

function ProfForm({
  open, onOpenChange, prof, ubs, onSubmit, saving,
}: {
  open: boolean; onOpenChange: (o: boolean) => void; prof: Profissional | null;
  ubs: { id: string; nome_posto: string }[]; onSubmit: (v: FormValues) => void; saving: boolean;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: prof ? {
      nome_profissional: prof.nome_profissional, cargo: prof.cargo,
      conselho: prof.conselho, numero_conselho: prof.numero_conselho,
      estado_conselho: prof.estado_conselho, especialidade: prof.especialidade ?? "",
      ubs_id: prof.ubs_id, contato: prof.contato ?? "",
    } : EMPTY,
  });
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader><SheetTitle>{prof ? "Editar profissional" : "Novo profissional"}</SheetTitle></SheetHeader>
        <Form {...form}>
          <form className="space-y-4 px-4 pb-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid grid-cols-2 gap-3">
              <FormField name="nome_profissional" control={form.control} render={({ field }) => (
                <FormItem className="col-span-2"><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="cargo" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Cargo</FormLabel>
                  <Select value={field.value} onValueChange={(v) => {
                    field.onChange(v);
                    form.setValue("conselho", v === "medico" ? "CRM" : "COREN");
                  }}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{CARGOS.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <FormField name="especialidade" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Especialidade</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="conselho" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Conselho</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{CONSELHOS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <FormField name="estado_conselho" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>UF</FormLabel><FormControl><Input maxLength={2} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="numero_conselho" control={form.control} render={({ field }) => (
                <FormItem className="col-span-2"><FormLabel>Número do conselho</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="ubs_id" control={form.control} render={({ field }) => (
                <FormItem className="col-span-2"><FormLabel>UBS</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>{ubs.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome_posto}</SelectItem>)}</SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <FormField name="contato" control={form.control} render={({ field }) => (
                <FormItem className="col-span-2"><FormLabel>Contato</FormLabel><FormControl>
                  <Input value={field.value ?? ""} onChange={(e) => field.onChange(maskPhone(e.target.value))} />
                </FormControl><FormMessage /></FormItem>
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
