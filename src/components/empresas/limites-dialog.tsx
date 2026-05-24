// Refatorado para usar useLimitesEmpresa + useLimitesEmpresaMutations (5min staleTime).
import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatSupabaseError } from "@/lib/format-error";

import {
  useLimitesEmpresa, useLimitesEmpresaMutations,
} from "@/hooks/queries/use-limites";
import { brl } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  empresaId: string;
  empresaNome: string;
};

export function LimitesEmpresaDialog({ open, onOpenChange, empresaId, empresaNome }: Props) {
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));
  const [valor, setValor] = useState("");

  const { data = [], isLoading } = useLimitesEmpresa(empresaId, { enabled: open });
  const { upsert, remove } = useLimitesEmpresaMutations(empresaId);

  const handleSave = () => {
    const v = parseFloat(valor);
    upsert.mutate(
      { mes, valor: v },
      {
        onSuccess: () => {
          toast.success("Limite salvo");
          setValor("");
        },
        onError: (e: Error) => toast.error(formatSupabaseError(e)),
      },
    );
  };

  const handleRemove = (id: string) => {
    remove.mutate(id, {
      onError: (e: Error) => toast.error(formatSupabaseError(e)),
    });
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Limites mensais — {empresaNome}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-3">
          <div className="space-y-1">
            <Label>Mês</Label>
            <Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Valor (R$)</Label>
            <Input type="number" min={0} step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
          </div>
          <Button onClick={handleSave} disabled={upsert.isPending || !valor}>
            {upsert.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Salvar
          </Button>
        </div>

        <div className="border rounded-md overflow-hidden mt-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={3} className="text-center py-6"><Loader2 className="size-4 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
              )}
              {!isLoading && data.length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground text-sm">Nenhum limite definido.</TableCell></TableRow>
              )}
              {data.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-mono">{l.mes_referencia}</TableCell>
                  <TableCell className="text-right tabular-nums">{brl(Number(l.valor))}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => handleRemove(l.id)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
