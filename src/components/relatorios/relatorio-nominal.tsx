import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { dateBR, brl } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  FiltrosBar, CampoPeriodo, CampoMes, CampoEmpresa, CampoPaciente, CampoProcedimento,
  StateLoading, StateError, StateEmpty, ExportButtons,
} from "./shared";

type Modo = "autorizado" | "faturado";

type Filtros = {
  inicio: string; fim: string; mes: string;
  empresaId: string; pacienteId: string; procedimentoId: string;
};

type Item = {
  id: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  status_faturamento: string;
  mes_faturamento: string | null;
  procedimentos: { nome: string; sigla: string } | null;
};

type AutRow = {
  id: string;
  num_aut: string;
  data_autorizacao: string;
  empresa_id: string;
  paciente_id: string;
  pacientes: { nome: string; cartao_sus: string | null } | null;
  itens_autorizacao: Item[];
};

function mesAtual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function RelatorioNominal({ modo }: { modo: Modo }) {
  const [draft, setDraft] = useState<Filtros & { pacienteLabel: string; procedimentoLabel: string }>({
    inicio: "", fim: "", mes: mesAtual(),
    empresaId: "", pacienteId: "", pacienteLabel: "",
    procedimentoId: "", procedimentoLabel: "",
  });
  const [filtros, setFiltros] = useState<Filtros | null>(null);

  const { data, isLoading, error } = useQuery({
    enabled: !!filtros,
    queryKey: ["rel-nominal", modo, filtros],
    queryFn: async () => {
      const f = filtros!;
      let q = supabase
        .from("autorizacoes")
        .select("id, num_aut, data_autorizacao, empresa_id, paciente_id, pacientes(nome, cartao_sus), itens_autorizacao(id, descricao, quantidade, valor_unitario, valor_total, status_faturamento, mes_faturamento, procedimento_id, procedimentos(nome, sigla))")
        .order("data_autorizacao", { ascending: false })
        .limit(500);

      if (modo === "autorizado") {
        if (f.inicio) q = q.gte("data_autorizacao", f.inicio);
        if (f.fim) q = q.lte("data_autorizacao", f.fim);
      }
      if (f.empresaId) q = q.eq("empresa_id", f.empresaId);
      if (f.pacienteId) q = q.eq("paciente_id", f.pacienteId);

      const { data, error } = await q;
      if (error) throw error;

      let result = data as unknown as AutRow[];

      if (modo === "faturado") {
        result = result
          .map((a) => ({
            ...a,
            itens_autorizacao: a.itens_autorizacao.filter((i) =>
              i.status_faturamento === "confirmado" &&
              i.mes_faturamento === f.mes &&
              (!f.procedimentoId || (i as Item & { procedimento_id?: string }).procedimento_id === f.procedimentoId)
            ),
          }))
          .filter((a) => a.itens_autorizacao.length > 0);
      } else if (f.procedimentoId) {
        result = result
          .map((a) => ({
            ...a,
            itens_autorizacao: a.itens_autorizacao.filter((i) =>
              (i as Item & { procedimento_id?: string }).procedimento_id === f.procedimentoId,
            ),
          }))
          .filter((a) => a.itens_autorizacao.length > 0);
      }
      return result;
    },
  });

  const titulo = modo === "autorizado"
    ? "Procedimentos-autorizados-nominal"
    : "Procedimentos-faturados-nominal";

  const expRows = useMemo(() => {
    if (!data) return [];
    const rows: (string | number)[][] = [];
    for (const a of data) {
      for (const i of a.itens_autorizacao) {
        rows.push(modo === "autorizado" ? [
          a.num_aut, a.pacientes?.nome ?? "—", dateBR(a.data_autorizacao),
          i.procedimentos?.nome ?? i.descricao, i.procedimentos?.sigla ?? "—",
          i.quantidade, i.status_faturamento,
        ] : [
          a.num_aut, a.pacientes?.nome ?? "—", i.mes_faturamento ?? "—",
          i.procedimentos?.nome ?? i.descricao, i.procedimentos?.sigla ?? "—",
          i.quantidade, brl(i.valor_unitario), brl(i.valor_total),
        ]);
      }
    }
    return rows;
  }, [data, modo]);

  const headers = modo === "autorizado"
    ? ["Nº Aut.", "Paciente", "Data", "Procedimento", "Código", "Qtd.", "Status"]
    : ["Nº Aut.", "Paciente", "Competência", "Procedimento", "Código", "Qtd.", "Valor Unit.", "Valor Total"];

  return (
    <div>
      <FiltrosBar
        onAplicar={() => setFiltros({
          inicio: draft.inicio, fim: draft.fim, mes: draft.mes,
          empresaId: draft.empresaId, pacienteId: draft.pacienteId,
          procedimentoId: draft.procedimentoId,
        })}
        onLimpar={() => {
          setDraft({
            inicio: "", fim: "", mes: mesAtual(),
            empresaId: "", pacienteId: "", pacienteLabel: "",
            procedimentoId: "", procedimentoLabel: "",
          });
          setFiltros(null);
        }}
      >
        {modo === "autorizado" ? (
          <CampoPeriodo
            inicio={draft.inicio} fim={draft.fim}
            onInicio={(v) => setDraft({ ...draft, inicio: v })}
            onFim={(v) => setDraft({ ...draft, fim: v })}
          />
        ) : (
          <CampoMes value={draft.mes} onChange={(v) => setDraft({ ...draft, mes: v })} />
        )}
        <CampoEmpresa value={draft.empresaId} onChange={(v) => setDraft({ ...draft, empresaId: v })} />
        <CampoPaciente
          value={draft.pacienteId} label={draft.pacienteLabel}
          onChange={(id, label) => setDraft({ ...draft, pacienteId: id, pacienteLabel: label })}
        />
        {modo === "faturado" && (
          <CampoProcedimento
            value={draft.procedimentoId} label={draft.procedimentoLabel}
            onChange={(id, label) => setDraft({ ...draft, procedimentoId: id, procedimentoLabel: label })}
          />
        )}
      </FiltrosBar>

      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-muted-foreground">
          {data ? `${data.length} ${data.length === 1 ? "autorização" : "autorizações"}` : ""}
        </div>
        <ExportButtons
          titulo={titulo} headers={headers} rows={expRows}
          subtitulo={modo === "faturado" && filtros ? `Competência: ${filtros.mes}` : undefined}
          disabled={!filtros}
        />
      </div>

      {!filtros ? <StateEmpty message="Defina os filtros e clique em Aplicar." />
        : isLoading ? <StateLoading />
        : error ? <StateError message={(error as Error).message} />
        : !data || data.length === 0 ? <StateEmpty />
        : (
          <Card className="p-2">
            <Accordion type="multiple" className="w-full">
              {data.map((a) => (
                <AccordionItem key={a.id} value={a.id} className="px-3">
                  <AccordionTrigger>
                    <div className="flex flex-1 items-center gap-3 text-left">
                      <span className="font-medium">{a.num_aut}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="truncate">{a.pacientes?.nome ?? "—"}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-sm text-muted-foreground">
                        {modo === "autorizado"
                          ? dateBR(a.data_autorizacao)
                          : `Comp.: ${a.itens_autorizacao[0]?.mes_faturamento ?? "—"}`}
                      </span>
                      <Badge variant="outline" className="ml-auto">
                        {a.itens_autorizacao.length} {a.itens_autorizacao.length === 1 ? "item" : "itens"}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="rounded-md border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-xs text-muted-foreground">
                          <tr>
                            <th className="text-left p-2">Procedimento</th>
                            <th className="text-left p-2">Código</th>
                            <th className="text-right p-2">Qtd.</th>
                            {modo === "autorizado" ? (
                              <th className="text-left p-2">Status</th>
                            ) : (
                              <>
                                <th className="text-right p-2">Valor Unit.</th>
                                <th className="text-right p-2">Valor Total</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {a.itens_autorizacao.map((i) => (
                            <tr key={i.id} className="border-t">
                              <td className="p-2">{i.procedimentos?.nome ?? i.descricao}</td>
                              <td className="p-2 text-muted-foreground">{i.procedimentos?.sigla ?? "—"}</td>
                              <td className="p-2 text-right tabular-nums">{i.quantidade}</td>
                              {modo === "autorizado" ? (
                                <td className="p-2"><Badge variant="outline">{i.status_faturamento}</Badge></td>
                              ) : (
                                <>
                                  <td className="p-2 text-right tabular-nums">{brl(i.valor_unitario)}</td>
                                  <td className="p-2 text-right tabular-nums">{brl(i.valor_total)}</td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Card>
        )
      }
    </div>
  );
}
