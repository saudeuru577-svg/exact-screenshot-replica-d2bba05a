import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { usePerfil } from "@/hooks/use-perfil";
import { PageHeader, PageBody } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/cadastros/territorio")({
  component: TerritorioPage,
});

type Item = { id: string; nome: string; ativo: boolean; criado_por: string };
type Tabela = "bairros" | "povoados";

function TerritorioPage() {
  return (
    <>
      <PageHeader title="Bairros e Povoados" description="Áreas urbanas e rurais cadastradas no município." />
      <PageBody>
        <Tabs defaultValue="bairros">
          <TabsList>
            <TabsTrigger value="bairros">Bairros</TabsTrigger>
            <TabsTrigger value="povoados">Povoados</TabsTrigger>
          </TabsList>
          <TabsContent value="bairros" className="mt-4">
            <Lista tabela="bairros" titulo="Bairro" />
          </TabsContent>
          <TabsContent value="povoados" className="mt-4">
            <Lista tabela="povoados" titulo="Povoado" />
          </TabsContent>
        </Tabs>
      </PageBody>
    </>
  );
}

function Lista({ tabela, titulo }: { tabela: Tabela; titulo: string }) {
  const { isAdmin } = usePerfil();
  const userId = useAuth((s) => s.user?.id);
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [showInativos, setShowInativos] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [nome, setNome] = useState("");
  const [ativo, setAtivo] = useState(true);

  const { data = [], isLoading } = useQuery({
    queryKey: [tabela],
    queryFn: async () => {
      const { data, error } = await supabase.from(tabela).select("id,nome,ativo,criado_por").order("nome");
      if (error) throw error;
      return data as Item[];
    },
  });

  const filtered = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return data.filter((b) => (showInativos || b.ativo) && (!t || b.nome.toLowerCase().includes(t)));
  }, [data, busca, showInativos]);

  const save = useMutation({
    mutationFn: async () => {
      if (!nome.trim()) throw new Error("Informe o nome");
      if (editing) {
        const { error } = await supabase.from(tabela)
          .update({ nome: nome.trim(), ativo }).eq("id", editing.id);
        if (error) throw error;
      } else {
        if (!userId) throw new Error("Sessão inválida");
        const { error } = await supabase.from(tabela)
          .insert({ nome: nome.trim(), ativo, criado_por: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? `${titulo} atualizado` : `${titulo} cadastrado`);
      qc.invalidateQueries({ queryKey: [tabela] });
      setOpen(false); setEditing(null); setNome(""); setAtivo(true);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async (item: Item) => {
      const { error } = await supabase.from(tabela).update({ ativo: !item.ativo }).eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [tabela] }),
  });

  function openNew() { setEditing(null); setNome(""); setAtivo(true); setOpen(true); }
  function openEdit(it: Item) { setEditing(it); setNome(it.nome); setAtivo(it.ativo); setOpen(true); }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar" className="max-w-sm" />
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={showInativos} onCheckedChange={setShowInativos} /> Mostrar inativos
        </label>
        <div className="ml-auto">
          {isAdmin && <Button onClick={openNew}><Plus className="size-4" /> Novo {titulo.toLowerCase()}</Button>}
        </div>
      </div>

      <div className="border rounded-lg bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={3} className="text-center py-10"><Loader2 className="size-5 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>}
            {!isLoading && filtered.length === 0 && (
              <TableRow><TableCell colSpan={3} className="text-center py-10 text-muted-foreground">Nada por aqui.</TableCell></TableRow>
            )}
            {filtered.map((it) => (
              <TableRow key={it.id}>
                <TableCell className="font-medium">{it.nome}</TableCell>
                <TableCell>
                  {isAdmin
                    ? <Switch checked={it.ativo} onCheckedChange={() => toggle.mutate(it)} />
                    : <Badge variant={it.ativo ? "default" : "secondary"}>{it.ativo ? "Ativo" : "Inativo"}</Badge>}
                </TableCell>
                <TableCell className="text-right">
                  {isAdmin && (
                    <Button variant="ghost" size="sm" onClick={() => openEdit(it)}><Pencil className="size-4" /></Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editing ? `Editar ${titulo.toLowerCase()}` : `Novo ${titulo.toLowerCase()}`}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Nome</label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
            </div>
            <label className="flex items-center gap-3 rounded-md border p-3">
              <Switch checked={ativo} onCheckedChange={setAtivo} />
              <span className="text-sm font-medium">Ativo</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending && <Loader2 className="size-4 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
