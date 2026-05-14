import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  FiltrosBar, CampoPeriodo, CampoEmpresa, CampoPaciente,
  StateLoading, StateError, StateEmpty, ExportButtons, TabelaPaginada,
} from "./shared";

type Filtros = { inicio: string; fim: string; empresaId: string; pacienteId: string };

type ItemRow = {
  procedimento_id: string;
  procedimentos: { nome: string; sigla: string } | null;
  autorizacoes: { data_autorizacao: string; empresa_id: string; paciente_id: string } | null;
};

export function R1AutPorProcedimento() {
  const [draft, setDraft] = useState<Filtros & { pacienteLabel: string }>({
    inicio: "", fim: "", empresaId: "", pacienteId: "", pacienteLabel: "",
  });
  const [filtros, setFiltros] = useState<Filtros | null>(null);

  const { data, isLoading, error } = useQuery({
    enabled: !!filtros,
    queryKey: ["rel1", filtros],
    queryFn: async () => {
      const f = filtros!;
      let q = supabase
        .from("itens_autorizacao")
        .select("procedimento_id, procedimentos(nome, sigla), autorizacoes!inner(data_autorizacao, empresa_id, paciente_id)")
        .limit(1000);
      if (f.inicio) q = q.gte("autorizacoes.data_autorizacao", f.inicio);
      if (f.fim) q = q.lte("autorizacoes.data_autorizacao", f.fim);
      if (f.empresaId) q = q.eq("autorizacoes.empresa_id", f.empresaId);
      if (f.pacienteId) q = q.eq("autorizacoes.paciente_id", f.pacienteId);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as ItemRow[];
    },
  });

  const linhas = useMemo(() => {
    if (!data) return [];
    const m = new Map<string, { procedimento: string; sigla: string; total: number }>();
    for (const it of data) {
      const k = it.procedimento_id;
      const cur = m.get(k) ?? {
        procedimento: it.procedimentos?.nome ?? "—",
        sigla: it.procedimentos?.sigla ?? "—",
        total: 0,
      };
      cur.total += 1;
      m.set(k, cur);
    }
    const total = data.length;
    return Array.from(m.values())
      .map((r) => ({ ...r, pct: total ? (r.total / total) * 100 : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [data]);

  const headers = ["Procedimento", "Código", "Total", "% do Total"];
  const expRows = linhas.map((r) => [r.procedimento, r.sigla, r.total, `${r.pct.toFixed(1)}%`]);

  return (
    <div>
      <FiltrosBar
        onAplicar={() => setFiltros({
          inicio: draft.inicio, fim: draft.fim,
          empresaId: draft.empresaId, pacienteId: draft.pacienteId,
        })}
        onLimpar={() => {
          setDraft({ inicio: "", fim: "", empresaId: "", pacienteId: "", pacienteLabel: "" });
          setFiltros(null);
        }}
      >
        <CampoPeriodo
          inicio={draft.inicio} fim={draft.fim}
          onInicio={(v) => setDraft({ ...draft, inicio: v })}
          onFim={(v) => setDraft({ ...draft, fim: v })}
        />
        <CampoEmpresa value={draft.empresaId} onChange={(v) => setDraft({ ...draft, empresaId: v })} />
        <CampoPaciente
          value={draft.pacienteId} label={draft.pacienteLabel}
          onChange={(id, label) => setDraft({ ...draft, pacienteId: id, pacienteLabel: label })}
        />
      </FiltrosBar>

      <div className="flex justify-end mb-3">
        <ExportButtons
          titulo="Autorizacoes-por-procedimento"
          headers={headers} rows={expRows}
          disabled={!filtros}
        />
      </div>

      {!filtros ? <StateEmpty message="Defina os filtros e clique em Aplicar." />
        : isLoading ? <StateLoading />
        : error ? <StateError message={(error as Error).message} />
        : linhas.length === 0 ? <StateEmpty />
        : <TabelaPaginada
            data={linhas as unknown as Record<string, unknown>[]}
            colunas={[
              { key: "procedimento", label: "Procedimento" },
              { key: "sigla", label: "Código" },
              { key: "total", label: "Total", align: "right" },
              { key: "pct", label: "% do Total", align: "right",
                render: (r) => `${(r.pct as number).toFixed(1)}%` },
            ]}
          />
      }
    </div>
  );
}
