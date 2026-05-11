import { useState, type ReactNode } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ConfirmOpts = {
  title: string;
  description?: string;
  confirmLabel?: string;
  variant?: "default" | "destructive";
};

let resolver: ((v: boolean) => void) | null = null;
let setOpts: ((o: (ConfirmOpts & { open: boolean }) | null) => void) | null = null;

export function confirm(opts: ConfirmOpts): Promise<boolean> {
  return new Promise((resolve) => {
    resolver = resolve;
    setOpts?.({ ...opts, open: true });
  });
}

export function ConfirmHost(): ReactNode {
  const [state, set] = useState<(ConfirmOpts & { open: boolean }) | null>(null);
  setOpts = set;

  const close = (val: boolean) => {
    set(null);
    resolver?.(val);
    resolver = null;
  };

  return (
    <AlertDialog open={!!state?.open} onOpenChange={(o) => !o && close(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{state?.title}</AlertDialogTitle>
          {state?.description && (
            <AlertDialogDescription>{state.description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => close(false)}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => close(true)}
            className={state?.variant === "destructive" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
          >
            {state?.confirmLabel ?? "Confirmar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
