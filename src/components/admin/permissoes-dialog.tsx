import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { PerfilUsuario } from "@/hooks/use-auth";
import { TELAS, temAcessoPadrao } from "@/lib/telas";
import { usePermissoesUsuario } from "@/hooks/use-permissoes";

type Props = {
  open: boolean;
  onClose: () => void;
  usuario: { id: string; nome: string; perfil: PerfilUsuario } | null;
};

// Estado por tela: undefined = padrão (segue perfil), true/false = override
type EstadoTelas = Record<string, boolean | undefined>;

export function PermissoesDialog({ open, onClose, usuario }: Props) {
  const qc = useQueryClient();
  const { data: overrides, isLoading } = usePermissoesUsuario(usuario?.id);
  const [estado, setEstado] = useState<EstadoTelas>({});

  useEffect(() => {
    if (overrides) setEstado({ ...overrides });
  }, [overrides, usuario?.id]);

  const grupos = useMemo(() => {
    const map = new Map<string, typeof TELAS>();
    TELAS.forEach((t) => {
      const arr = map.get(t.grupo) ?? [];
      arr.push(t);
      map.set(t.grupo, arr);
    });
    return Array.from(map.entries());
  }, []);

  const efetivo = (key: string): boolean => {
    if (key in estado && estado[key] !== undefined) return estado[key]!;
    if (!usuario) return false;
    const def = TELAS.find((t) => t.key === key)!;
    return temAcessoPadrao(def, usuario.perfil);
  };

  const setOverride = (key: string, value: boolean) => {
    if (!usuario) return;
    const def = TELAS.find((t) => t.key === key)!;
    const padrao = temAcessoPadrao(def, usuario.perfil);
    setEstado((prev) => ({
      ...prev,
      // se o valor coincide com o padrão, remove override
      [key]: value === padrao ? undefined : value,
    }));
  };

  const resetAll = () => setEstado({});

  const salvar = useMutation({
    mutationFn: async () => {
      if (!usuario) return;
      const original = overrides ?? {};
      const upserts: { usuario_id: string; tela: string; permitido: boolean }[] = [];
      const deletes: string[] = [];

      const allKeys = new Set([...Object.keys(estado), ...Object.keys(original)]);
      allKeys.forEach((k) => {
        const v = estado[k];
        if (v === undefined) {
          if (k in original) deletes.push(k);
        } else if (original[k] !== v) {
          upserts.push({ usuario_id: usuario.id, tela: k, permitido: v });
        }
      });

      if (upserts.length) {
        const { error } = await supabase
          .from("permissoes_usuario")
          .upsert(upserts, { onConflict: "usuario_id,tela" });
        if (error) throw error;
      }
      if (deletes.length) {
        const { error } = await supabase
          .from("permissoes_usuario")
          .delete()
          .eq("usuario_id", usuario.id)
          .in("tela", deletes);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Permissões atualizadas");
      qc.invalidateQueries({ queryKey: ["permissoes_usuario", usuario?.id] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!usuario) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Permissões de {usuario.nome}</DialogTitle>
          <DialogDescription>
            Perfil: <Badge variant="secondary" className="uppercase text-[10px]">{usuario.perfil}</Badge>
            {" — "}as alterações abaixo substituem o acesso padrão do perfil para este usuário.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="grid place-items-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto space-y-5 pr-1">
            {grupos.map(([grupo, telas]) => (
              <div key={grupo}>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {grupo}
                </div>
                <div className="rounded-md border divide-y">
                  {telas.map((t) => {
                    const padrao = temAcessoPadrao(t, usuario.perfil);
                    const valor = efetivo(t.key);
                    const override = estado[t.key] !== undefined;
                    return (
                      <div key={t.key} className="flex items-center justify-between px-3 py-2.5 text-sm">
                        <div>
                          <div className="font-medium">{t.label}</div>
                          <div className="text-xs text-muted-foreground">
                            Padrão do perfil: {padrao ? "permitido" : "bloqueado"}
                            {override && (
                              <span className="ml-2 text-amber-600 dark:text-amber-400">• alterado</span>
                            )}
                          </div>
                        </div>
                        <Switch
                          checked={valor}
                          onCheckedChange={(v) => setOverride(t.key, v)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="ghost" onClick={resetAll} disabled={salvar.isPending}>
            <RotateCcw className="size-4" /> Voltar tudo ao padrão
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={salvar.isPending}>
              Cancelar
            </Button>
            <Button onClick={() => salvar.mutate()} disabled={salvar.isPending}>
              {salvar.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Salvar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
