
# Plano: Índices faltantes (add_indexes.sql)

## 1. Diagnóstico — índices que JÁ existem

```text
autorizacoes       : pk(id), UNIQUE(num_aut), (data_autorizacao), (empresa_id), (paciente_id), (status)
itens_autorizacao  : pk(id), (autorizacao_id), (faturamento_id), (mes_faturamento)
faturamentos       : pk(id), UNIQUE(empresa_id, mes_referencia) WHERE status='aberto'
pacientes          : pk(id), UNIQUE(cartao_sus), UNIQUE(nome,dtn), (nome), (criado_por)
```

Não vou recriar nada disso.

## 2. Queries quentes encontradas no código

| Tela / arquivo | Tabela | Filtro / ordenação |
|---|---|---|
| `acrescimos/novo.tsx` (cálculo de gasto) | autorizacoes | `empresa_id = ? AND data_autorizacao BETWEEN ? AND ? AND status IN (...)` |
| `pacientes/$id.tsx` (histórico) | autorizacoes | `paciente_id = ? ORDER BY data_autorizacao DESC` |
| `autorizacoes/$id.tsx`, `$id.editar.tsx`, `faturamentos/$empresaId.tsx` | itens_autorizacao | `autorizacao_id = ? ORDER BY criado_em` |
| `relatorios/fat-por-procedimento.tsx` | itens_autorizacao | `mes_faturamento = ? AND status_faturamento = 'confirmado'` |
| `relatorios/*` | itens_autorizacao | `procedimento_id = ?` |
| `faturamentos/index.tsx` | faturamentos | `mes_referencia = ?` |
| `faturamentos/$empresaId.tsx` | faturamentos | `empresa_id = ? ORDER BY iniciado_em DESC` |
| `relatorios/shared.tsx`, autocomplete | pacientes | `nome ILIKE '%x%' OR cartao_sus ILIKE '%x%'` |

## 3. Índices propostos

| # | Tabela | Colunas | Tipo | Por quê |
|---|---|---|---|---|
| 1 | autorizacoes | (empresa_id, data_autorizacao) | composto | Filtro empresa+período no cálculo de acréscimos e relatórios. Cobre também filtros apenas por empresa_id (substitui idx existente — mantenho para não recriar). |
| 2 | autorizacoes | (paciente_id, data_autorizacao DESC) | composto | Histórico do paciente — `WHERE paciente_id=? ORDER BY data DESC`. Elimina o sort. |
| 3 | itens_autorizacao | (mes_faturamento, status_faturamento) | composto | Relatório fat-por-procedimento filtra exatamente por esses dois campos. |
| 4 | itens_autorizacao | (procedimento_id) | simples | Relatórios e agregações por procedimento; hoje faz seq scan. |
| 5 | faturamentos | (mes_referencia) | simples | Lista mensal filtra por essa coluna sozinha (o índice único existente exige `status='aberto'` e não cobre). |
| 6 | faturamentos | (empresa_id, iniciado_em DESC) | composto | Tela de faturamento da empresa pega o mais recente por empresa. |
| 7 | pacientes | (nome gin_trgm_ops, cartao_sus gin_trgm_ops) | GIN trigram | Busca `ILIKE '%x%'` hoje sempre faz seq scan. Requer `CREATE EXTENSION pg_trgm` (gratuito no Supabase). |

Tudo é não-bloqueante (`CREATE INDEX CONCURRENTLY` + `IF NOT EXISTS`). Custo: zero — todos os índices entram nos 500 MB do Free Tier (estimativa < 5 MB total no tamanho atual).

## 4. Entregável — `add_indexes.sql`

Arquivo único comentado, agrupado por tabela, pronto para colar no **SQL Editor → Run**. Como `CONCURRENTLY` não roda dentro de transação, o script desativa a transação implícita do editor com um comentário de instrução no topo (Supabase SQL Editor já roda statements sem BEGIN automático quando há múltiplos statements separados — vou usar `-- supabase: no-transaction` e cada `CREATE INDEX` como statement independente).

Salvar em: `/mnt/documents/add_indexes.sql`

### Esboço do conteúdo

```sql
-- add_indexes.sql — Otimização de leitura SAS
-- Rodar no Supabase SQL Editor. NÃO envolver em BEGIN/COMMIT.
-- Todos os índices usam CONCURRENTLY (sem lock de escrita) e IF NOT EXISTS.

-- =========================================================
-- 1. autorizacoes
-- =========================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_aut_empresa_data
  ON public.autorizacoes (empresa_id, data_autorizacao);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_aut_paciente_data
  ON public.autorizacoes (paciente_id, data_autorizacao DESC);

-- =========================================================
-- 2. itens_autorizacao
-- =========================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_itens_mes_status
  ON public.itens_autorizacao (mes_faturamento, status_faturamento);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_itens_procedimento
  ON public.itens_autorizacao (procedimento_id);

-- =========================================================
-- 3. faturamentos
-- =========================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fat_mes
  ON public.faturamentos (mes_referencia);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fat_empresa_iniciado
  ON public.faturamentos (empresa_id, iniciado_em DESC);

-- =========================================================
-- 4. pacientes  (busca ILIKE '%termo%')
-- =========================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pacientes_nome_trgm
  ON public.pacientes USING gin (nome gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pacientes_sus_trgm
  ON public.pacientes USING gin (cartao_sus gin_trgm_ops);
```

## 5. Observações

- **Não usei índices parciais** salvo o já existente em `faturamentos`. Os filtros de status em `autorizacoes` variam (`IN ('pendente','aprovado','faturado')`), então um parcial atrapalharia outras telas.
- **Por que substitui ler `idx_autorizacoes_empresa`?** Não substitui — Postgres usa o composto também para queries só com `empresa_id`. Posso opcionalmente dropar o simples depois, mas deixo fora desta entrega para zero risco.
- **Aplicação**: cole o arquivo inteiro no SQL Editor e clique Run. Tempo total estimado < 30 s para o volume atual; sem bloqueio de leitura/escrita.

Confirma que eu gere o arquivo `/mnt/documents/add_indexes.sql` ao aprovar?
