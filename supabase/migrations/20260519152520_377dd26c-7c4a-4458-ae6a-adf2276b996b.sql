-- Otimização de leitura: índices nas tabelas principais.
-- Nota: removido CONCURRENTLY porque a ferramenta de migração roda em transação.
-- Nas tabelas atuais (volume pequeno) o lock é de milissegundos.

CREATE INDEX IF NOT EXISTS idx_aut_empresa_data
  ON public.autorizacoes (empresa_id, data_autorizacao);

CREATE INDEX IF NOT EXISTS idx_aut_paciente_data
  ON public.autorizacoes (paciente_id, data_autorizacao DESC);

CREATE INDEX IF NOT EXISTS idx_itens_mes_status
  ON public.itens_autorizacao (mes_faturamento, status_faturamento);

CREATE INDEX IF NOT EXISTS idx_itens_procedimento
  ON public.itens_autorizacao (procedimento_id);

CREATE INDEX IF NOT EXISTS idx_fat_mes
  ON public.faturamentos (mes_referencia);

CREATE INDEX IF NOT EXISTS idx_fat_empresa_iniciado
  ON public.faturamentos (empresa_id, iniciado_em DESC);

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_pacientes_nome_trgm
  ON public.pacientes USING gin (nome gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_pacientes_sus_trgm
  ON public.pacientes USING gin (cartao_sus gin_trgm_ops);