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

export const Route = createFileRoute("/_authenticated/cadastros/ubs")({
  component: UbsPage,
});

const ZONAS = ["urbana", "rural"] as const;

const schema = z.object({
  id_posto: z.string().trim().min(1).max(20),
  cnes: z.string().trim().min(7).max(10),
  nome_posto: z.string().trim().min(2).max(120),
  endereco: z.string().trim().min(2).max(150),
  bairro: z.string().trim().min(2).max(80),
  zona: z.enum(ZONAS),
  contato: z.string().trim().optional().or(z.literal("")),
});
type FormValues = z.infer<typeof schema>;
type UBS = FormValues & { id: string };

const EMPTY: FormValues = {
  id_posto: "", cnes: "", nome_posto: "", endereco: "", bairro: "", zona: "urbana", contato: "",
};

function UbsPage() {
  const { isAdmin } = usePerfil();
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [zonaFiltro, setZonaFiltro] = useState("todas");
  const [editing, setEditing] = useState<UBS | null>(null);
  const [open, setOpen] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ["ubs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ubs").select("*").order("nome_posto");
      if (error) throw error;
      return data as UBS[];
    },
  });

  const filtered = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return data.filter((u) => {
      if (zonaFiltro !== "todas" && u.zona !== zonaFiltro) return false;
      if (t && !`${u.nome_posto} ${u.cnes} ${u.bairro}`.toLowerCase().includes(t)) return false;
      return true;
    });
  }, [data, busca, zonaFiltro]);

  const save = useMutation({
    mutationFn: async (v: FormValues) => {
      const payload = { ...v, contato: v.contato || null };
      if (editing) {
        const { error } = await supabase.from("ubs").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ubs").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "UBS atualizada" : "UBS cadastrada");
      qc.invalidateQueries({ queryKey: ["ubs"] });
      setOpen(false); setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        title="UBS" description="Unidades Básicas de Saúde do município."
        actions={isAdmin && (
          <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="size-4" /> Nova UBS</Button>
        )}
      />
      <PageBody>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, CNES ou bairro" className="pl-9" />
          </div>
          <Select value={zonaFiltro} onValueChange={setZonaFiltro}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as zonas</SelectItem>
              {ZONAS.map((z) => <SelectItem key={z} value={z} className="capitalize">{z}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-lg bg-card overflow-hidden">
          <Table>
            <TableHeader><TableRow>
              <TableHead>ID</TableHead><TableHead>CNES</TableHead><TableHead>Nome</TableHead>
              <TableHead>Bairro</TableHead><TableHead>Zona</TableHead><TableHead>Contato</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={7} className="text-center py-10"><Loader2 className="size-5 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>}
              {!isLoading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Nenhuma UBS encontrada.</TableCell></TableRow>
              )}
              {filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-mono text-xs">{u.id_posto}</TableCell>
                  <TableCell className="font-mono text-xs">{u.cnes}</TableCell>
                  <TableCell className="font-medium">{u.nome_posto}</TableCell>
                  <TableCell>{u.bairro}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{u.zona}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.contato ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    {isAdmin && <Button variant="ghost" size="sm" onClick={() => { setEditing(u); setOpen(true); }}><Pencil className="size-4" /></Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </PageBody>

      <UbsForm open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}
        ubs={editing} onSubmit={(v) => save.mutate(v)} saving={save.isPending} />
    </>
  );
}

function UbsForm({
  open, onOpenChange, ubs, onSubmit, saving,
}: { open: boolean; onOpenChange: (o: boolean) => void; ubs: UBS | null; onSubmit: (v: FormValues) => void; saving: boolean }) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: ubs ? { ...EMPTY, ...ubs, contato: ubs.contato ?? "" } : EMPTY,
  });
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader><SheetTitle>{ubs ? "Editar UBS" : "Nova UBS"}</SheetTitle></SheetHeader>
        <Form {...form}>
          <form className="space-y-4 px-4 pb-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid grid-cols-2 gap-3">
              <FormField name="id_posto" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>ID do posto</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="cnes" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>CNES</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="nome_posto" control={form.control} render={({ field }) => (
                <FormItem className="col-span-2"><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="endereco" control={form.control} render={({ field }) => (
                <FormItem className="col-span-2"><FormLabel>Endereço</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="bairro" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Bairro</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="zona" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Zona</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{ZONAS.map((z) => <SelectItem key={z} value={z} className="capitalize">{z}</SelectItem>)}</SelectContent>
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
