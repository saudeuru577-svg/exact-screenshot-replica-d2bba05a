import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";
import {
  FiltrosBar, CampoMes, CampoEmpresa, CampoPaciente, CampoProcedimento,
  StateLoading, StateError, StateEmpty, ExportButtons, TabelaPaginada,
} from "./shared";

type Filtros = { mes: string; empresaId: string; pacienteId: string; procedimentoId: string };

type ItemRow = {
  procedimento_id: string;
  quantidade: number;
  valor_total: number;
  procedimentos: { nome: string; sigla: string } | null;
  autorizacoes: { empresa_id: string; paciente_id: string } | null;
};

function mesAtual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function R2FatPorProcedimento() {
  const [draft, setDraft] = useState<Filtros & { pacienteLabel: string; procedimentoLabel: string }>({
    mes: mesAtual(), empresaId: "", pacienteId: "", pacienteLabel: "",
    procedimentoId: "", procedimentoLabel: "",
  });
  const [filtros, setFiltros] = useState<Filtros | null>(null);

  const { data, isLoading, error } = useQuery({
    enabled: !!filtros,
    queryKey: ["rel2", filtros],
    queryFn: async () => {
      const f = filtros!;
      let q = supabase
        .from("itens_autorizacao")
        .select("procedimento_id, quantidade, valor_total, procedimentos(nome, sigla), autorizacoes!inner(empresa_id, paciente_id)")
        .eq("mes_faturamento", f.mes)
        .eq("status_faturamento", "confirmado")
        .limit(1000);
      if (f.empresaId) q = q.eq("autorizacoes.empresa_id", f.empresaId);
      if (f.pacienteId) q = q.eq("autorizacoes.paciente_id", f.pacienteId);
      if (f.procedimentoId) q = q.eq("procedimento_id", f.procedimentoId);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as ItemRow[];
    },
  });

  const linhas = useMemo(() => {
    if (!data) return [];
    const m = new Map<string, { procedimento: string; sigla: string; qtd: number; valor: number }>();
    for (const it of data) {
      const k = it.procedimento_id;
      const cur = m.get(k) ?? {
        procedimento: it.procedimentos?.nome ?? "—",
        sigla: it.procedimentos?.sigla ?? "—",
        qtd: 0, valor: 0,
      };
      cur.qtd += it.quantidade ?? 0;
      cur.valor += Number(it.valor_total ?? 0);
      m.set(k, cur);
    }
    return Array.from(m.values()).sort((a, b) => b.valor - a.valor);
  }, [data]);

  const headers = ["Procedimento", "Código", "Qtd. Faturada", "Valor Total"];
  const expRows = linhas.map((r) => [r.procedimento, r.sigla, r.qtd, brl(r.valor)]);

  return (
    <div>
      <FiltrosBar
        onAplicar={() => setFiltros({
          mes: draft.mes, empresaId: draft.empresaId,
          pacienteId: draft.pacienteId, procedimentoId: draft.procedimentoId,
        })}
        onLimpar={() => {
          setDraft({
            mes: mesAtual(), empresaId: "", pacienteId: "", pacienteLabel: "",
            procedimentoId: "", procedimentoLabel: "",
          });
          setFiltros(null);
        }}
      >
        <CampoMes value={draft.mes} onChange={(v) => setDraft({ ...draft, mes: v })} />
        <CampoEmpresa value={draft.empresaId} onChange={(v) => setDraft({ ...draft, empresaId: v })} />
        <CampoPaciente
          value={draft.pacienteId} label={draft.pacienteLabel}
          onChange={(id, label) => setDraft({ ...draft, pacienteId: id, pacienteLabel: label })}
        />
        <CampoProcedimento
          value={draft.procedimentoId} label={draft.procedimentoLabel}
          onChange={(id, label) => setDraft({ ...draft, procedimentoId: id, procedimentoLabel: label })}
        />
      </FiltrosBar>

      <div className="flex justify-end mb-3">
        <ExportButtons
          titulo={`Faturados-por-procedimento-${filtros?.mes ?? ""}`}
          headers={headers} rows={expRows}
          subtitulo={filtros ? `Competência: ${filtros.mes}` : undefined}
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
              { key: "qtd", label: "Qtd. Faturada", align: "right" },
              { key: "valor", label: "Valor Total", align: "right",
                render: (r) => brl(r.valor as number) },
            ]}
          />
      }
    </div>
  );
}
