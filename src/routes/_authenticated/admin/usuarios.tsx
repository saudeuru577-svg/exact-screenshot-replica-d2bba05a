import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, UserCog } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageBody } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { PerfilUsuario } from "@/hooks/use-auth";
import { PermissoesDialog } from "@/components/admin/permissoes-dialog";

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  component: UsuariosPage,
});

const PERFIS: PerfilUsuario[] = ["administrador", "secretaria", "atendente", "financeiro"];

function UsuariosPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [permUser, setPermUser] = useState<{ id: string; nome: string; perfil: PerfilUsuario } | null>(null);

  const { data: usuarios, isLoading } = useQuery({
    queryKey: ["usuarios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usuarios")
        .select("id, nome, email, perfil, ativo, criado_em")
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const toggleAtivo = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from("usuarios").update({ ativo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Usuário atualizado");
      qc.invalidateQueries({ queryKey: ["usuarios"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        title="Usuários"
        description="Gerencie funcionários com acesso ao sistema."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="size-4" /> Novo usuário</Button>
            </DialogTrigger>
            <NovoUsuarioDialog onClose={() => setOpen(false)} />
          </Dialog>
        }
      />
      <PageBody>
        {isLoading ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="rounded-lg border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Perfil</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {(usuarios ?? []).map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="px-4 py-3 font-medium">
                      <button
                        type="button"
                        onClick={() => setPermUser({ id: u.id, nome: u.nome, perfil: u.perfil })}
                        className="text-left hover:text-primary hover:underline underline-offset-2 transition-colors"
                      >
                        {u.nome}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="uppercase text-[10px]">
                        {u.perfil}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {u.ativo ? (
                        <Badge className="bg-success text-success-foreground hover:bg-success/90">
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Inativo</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-3">
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => setPermUser({ id: u.id, nome: u.nome, perfil: u.perfil })}
                        >
                          Permissões
                        </Button>
                        <div className="inline-flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Ativo</span>
                          <Switch
                            checked={u.ativo}
                            onCheckedChange={(v) => toggleAtivo.mutate({ id: u.id, ativo: v })}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
                {(!usuarios || usuarios.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                      <UserCog className="size-8 mx-auto mb-2 opacity-50" />
                      Nenhum usuário cadastrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </PageBody>
    </>
  );
}

function NovoUsuarioDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [perfil, setPerfil] = useState<PerfilUsuario>("atendente");

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: { nome, email, password, perfil },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast.success("Usuário criado com sucesso");
      qc.invalidateQueries({ queryKey: ["usuarios"] });
      onClose();
      setNome(""); setEmail(""); setPassword(""); setPerfil("atendente");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Novo usuário</DialogTitle>
        <DialogDescription>
          O usuário poderá acessar o sistema imediatamente com a senha informada.
        </DialogDescription>
      </DialogHeader>
      <form
        className="space-y-4"
        onSubmit={(e) => { e.preventDefault(); create.mutate(); }}
      >
        <div className="space-y-2">
          <Label>Nome</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Senha temporária</Label>
          <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
          <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
        </div>
        <div className="space-y-2">
          <Label>Perfil</Label>
          <Select value={perfil} onValueChange={(v) => setPerfil(v as PerfilUsuario)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PERFIS.map((p) => (
                <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending && <Loader2 className="size-4 animate-spin" />}
            Criar usuário
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
