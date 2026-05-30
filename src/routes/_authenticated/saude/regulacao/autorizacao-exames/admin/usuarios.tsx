// Refatorado: lista via useUsuarios (5min), toggle via useUsuariosMutations.
// Criação ainda usa edge function admin-create-user; após sucesso invalida cache.
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Trash2, UserCog } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUsuarios, useUsuariosMutations, usuariosKeys, type UsuarioLista } from "@/hooks/queries/use-usuarios";
import { useQueryClient } from "@tanstack/react-query";
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
import { formatSupabaseError } from "@/lib/format-error";
import type { PerfilUsuario } from "@/hooks/use-auth";
import { useAuth } from "@/hooks/use-auth";
import { confirm } from "@/components/ui/confirm";
import { PermissoesDialog } from "@/components/admin/permissoes-dialog";

export const Route = createFileRoute("/_authenticated/saude/regulacao/autorizacao-exames/admin/usuarios")({
  component: UsuariosPage,
});

const PERFIS: PerfilUsuario[] = ["administrador", "secretaria", "atendente", "financeiro", "regulador", "profissional_ubs", "agente_saude", "enfermeiro_ubs", "farmaceutico", "agendador", "vigilancia_sanitaria", "gestor_saude"];

function UsuariosPage() {
  const qc = useQueryClient();
  const myId = useAuth((s) => s.usuario?.id);
  const [open, setOpen] = useState(false);
  const [editUser, setEditUser] = useState<UsuarioLista | null>(null);
  const [permUser, setPermUser] = useState<{ id: string; nome: string; perfil: PerfilUsuario } | null>(null);

  const { data: usuarios, isLoading } = useUsuarios();
  const { toggleAtivo } = useUsuariosMutations();

  const handleToggleAtivo = (id: string, ativo: boolean) => {
    toggleAtivo.mutate(
      { id, ativo },
      {
        onSuccess: () => toast.success("Usuário atualizado"),
        onError: (e: Error) => toast.error(formatSupabaseError(e)),
      },
    );
  };

  const removeUser = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke("admin-manage-user", {
        body: { action: "delete", user_id: id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast.success("Usuário excluído");
      qc.invalidateQueries({ queryKey: usuariosKeys.all });
    },
    onError: (e: Error) => toast.error(formatSupabaseError(e)),
  });

  const handleDelete = async (u: UsuarioLista) => {
    const ok = await confirm({
      title: `Excluir ${u.nome}?`,
      description: "Esta ação é permanente e remove o acesso do usuário ao sistema.",
      confirmLabel: "Excluir",
      variant: "destructive",
    });
    if (ok) removeUser.mutate(u.id);
  };



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
                      <div className="inline-flex items-center gap-2">
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => setPermUser({ id: u.id, nome: u.nome, perfil: u.perfil })}
                        >
                          Permissões
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => setEditUser(u)}
                          title="Editar"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => handleDelete(u)}
                          disabled={u.id === myId || removeUser.isPending}
                          title={u.id === myId ? "Você não pode excluir o próprio usuário" : "Excluir"}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                        <div className="inline-flex items-center gap-2 ml-2">
                          <span className="text-xs text-muted-foreground">Ativo</span>
                          <Switch
                            checked={u.ativo}
                            onCheckedChange={(v) => handleToggleAtivo(u.id, v)}
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
      <PermissoesDialog
        open={!!permUser}
        usuario={permUser}
        onClose={() => setPermUser(null)}
      />
      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        {editUser && <EditarUsuarioDialog usuario={editUser} onClose={() => setEditUser(null)} />}
      </Dialog>
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
      qc.invalidateQueries({ queryKey: usuariosKeys.all });
      onClose();
      setNome(""); setEmail(""); setPassword(""); setPerfil("atendente");
    },
    onError: (e: Error) => toast.error(formatSupabaseError(e)),
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

function EditarUsuarioDialog({ usuario, onClose }: { usuario: UsuarioLista; onClose: () => void }) {
  const qc = useQueryClient();
  const [nome, setNome] = useState(usuario.nome);
  const [perfil, setPerfil] = useState<PerfilUsuario>(usuario.perfil);
  const [password, setPassword] = useState("");

  const update = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-manage-user", {
        body: {
          action: "update",
          user_id: usuario.id,
          nome,
          perfil,
          password: password || undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast.success("Usuário atualizado");
      qc.invalidateQueries({ queryKey: usuariosKeys.all });
      onClose();
    },
    onError: (e: Error) => toast.error(formatSupabaseError(e)),
  });

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Editar usuário</DialogTitle>
        <DialogDescription>{usuario.email}</DialogDescription>
      </DialogHeader>
      <form
        className="space-y-4"
        onSubmit={(e) => { e.preventDefault(); update.mutate(); }}
      >
        <div className="space-y-2">
          <Label>Nome</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
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
        <div className="space-y-2">
          <Label>Nova senha (opcional)</Label>
          <Input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            placeholder="Deixe em branco para manter"
          />
          <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={update.isPending}>
            {update.isPending && <Loader2 className="size-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

