import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { maskSUS } from "@/lib/format";

const ZONAS = ["urbana", "rural"] as const;
const SEXOS = ["masculino", "feminino"] as const;

export const pacienteSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  nome_da_mae: z.string().trim().min(2).max(120),
  dtn: z.string().min(1, "Informe a data de nascimento"),
  sexo: z.enum(SEXOS),
  cartao_sus: z.string().trim().optional().or(z.literal("")),
  naturalidade: z.string().trim().optional().or(z.literal("")),
  zona: z.enum(ZONAS),
  bairro_id: z.string().uuid().nullable().optional(),
  povoado_id: z.string().uuid().nullable().optional(),
  rua: z.string().trim().optional().or(z.literal("")),
  numero: z.string().trim().optional().or(z.literal("")),
  ponto_referencia: z.string().trim().optional().or(z.literal("")),
}).superRefine((d, ctx) => {
  if (d.dtn > new Date().toISOString().slice(0, 10)) {
    ctx.addIssue({ code: "custom", path: ["dtn"], message: "Data não pode ser futura" });
  }
  if (d.zona === "urbana" && !d.bairro_id) {
    ctx.addIssue({ code: "custom", path: ["bairro_id"], message: "Bairro obrigatório" });
  }
  if (d.zona === "rural" && !d.povoado_id) {
    ctx.addIssue({ code: "custom", path: ["povoado_id"], message: "Povoado obrigatório" });
  }
  if (d.cartao_sus) {
    const c = d.cartao_sus.replace(/\D/g, "");
    if (c.length !== 15) ctx.addIssue({ code: "custom", path: ["cartao_sus"], message: "Deve ter 15 dígitos" });
  }
});

export type PacienteForm = z.infer<typeof pacienteSchema>;

export const PACIENTE_EMPTY: PacienteForm = {
  nome: "", nome_da_mae: "", dtn: "", sexo: "masculino",
  cartao_sus: "", naturalidade: "",
  zona: "urbana", bairro_id: null, povoado_id: null,
  rua: "", numero: "", ponto_referencia: "",
};

export function PacienteFormFields({
  form, onSubmit, saving, submitLabel = "Salvar",
}: {
  form: ReturnType<typeof useForm<PacienteForm>>;
  onSubmit: (v: PacienteForm) => void;
  saving: boolean; submitLabel?: string;
}) {
  const zona = form.watch("zona");

  useEffect(() => {
    if (zona === "urbana") form.setValue("povoado_id", null);
    if (zona === "rural") form.setValue("bairro_id", null);
  }, [zona, form]);

  const { data: bairros = [] } = useQuery({
    queryKey: ["bairros-ativos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bairros")
        .select("id, nome").eq("ativo", true).order("nome");
      if (error) throw error; return data;
    },
  });
  const { data: povoados = [] } = useQuery({
    queryKey: ["povoados-ativos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("povoados")
        .select("id, nome").eq("ativo", true).order("nome");
      if (error) throw error; return data;
    },
  });

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Identificação</h3>
          <div className="grid grid-cols-2 gap-3">
            <FormField name="nome" control={form.control} render={({ field }) => (
              <FormItem className="col-span-2"><FormLabel>Nome completo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField name="nome_da_mae" control={form.control} render={({ field }) => (
              <FormItem className="col-span-2"><FormLabel>Nome da mãe</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField name="dtn" control={form.control} render={({ field }) => (
              <FormItem><FormLabel>Data de nascimento</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField name="sexo" control={form.control} render={({ field }) => (
              <FormItem><FormLabel>Sexo</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>{SEXOS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                </Select><FormMessage />
              </FormItem>
            )} />
            <FormField name="cartao_sus" control={form.control} render={({ field }) => (
              <FormItem><FormLabel>Cartão SUS</FormLabel><FormControl>
                <Input value={field.value ?? ""} onChange={(e) => field.onChange(maskSUS(e.target.value))} />
              </FormControl><FormMessage /></FormItem>
            )} />
            <FormField name="naturalidade" control={form.control} render={({ field }) => (
              <FormItem><FormLabel>Naturalidade</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Endereço</h3>
          <div className="grid grid-cols-2 gap-3">
            <FormField name="zona" control={form.control} render={({ field }) => (
              <FormItem><FormLabel>Zona</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>{ZONAS.map((z) => <SelectItem key={z} value={z} className="capitalize">{z}</SelectItem>)}</SelectContent>
                </Select><FormMessage />
              </FormItem>
            )} />
            {zona === "urbana" ? (
              <FormField name="bairro_id" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Bairro</FormLabel>
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>{bairros.map((b) => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}</SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
            ) : (
              <FormField name="povoado_id" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Povoado</FormLabel>
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>{povoados.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
            )}
            <FormField name="rua" control={form.control} render={({ field }) => (
              <FormItem><FormLabel>Rua</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField name="numero" control={form.control} render={({ field }) => (
              <FormItem><FormLabel>Número</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField name="ponto_referencia" control={form.control} render={({ field }) => (
              <FormItem className="col-span-2"><FormLabel>Ponto de referência</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
        </section>

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={saving}>{saving && <Loader2 className="size-4 animate-spin" />} {submitLabel}</Button>
        </div>
      </form>
    </Form>
  );
}

export function usePacienteForm(initial?: Partial<PacienteForm>) {
  return useForm<PacienteForm>({
    resolver: zodResolver(pacienteSchema),
    defaultValues: { ...PACIENTE_EMPTY, ...initial },
  });
}
