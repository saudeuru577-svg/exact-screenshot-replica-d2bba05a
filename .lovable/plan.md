# Acréscimo automático + limite por empresa

## 1. Banco

**Nova tabela `limites_empresa`** (definida por mês, admin gerencia):
- `empresa_id uuid`, `mes_referencia varchar(7)`, `valor numeric`
- unique (`empresa_id`, `mes_referencia`)
- RLS: select para todos perfis autorizados; insert/update só admin

**Tabela `acrescimos_gastos`** — ajustes:
- Nova coluna `escopo` (`total` | `empresa`)
- Nova coluna `empresa_id uuid` (nullable, obrigatória quando escopo=`empresa`)
- Default de `status` muda para `aprovado` (sem aprovação manual)
- Colunas `aprovado_por` / `data_aprovacao` passam a ser preenchidas automaticamente com o próprio solicitante no insert (trigger) — mantém auditoria
- RLS de insert continua para admin/secretaria; update admin (apenas correção)

**Trigger `verificar_limite_mensal`** — reescrever:
- Calcular `limite_total = 130000 + Σ acrescimos(escopo=total, aprovado)` do mês
- Calcular `limite_empresa = (limites_empresa do mês para essa empresa, fallback 0/∞ — ver decisão abaixo) + Σ acrescimos(escopo=empresa, aprovado) daquela empresa no mês`
- Calcular `gasto_total_mes` e `gasto_empresa_mes`
- Bloquear (`status='bloqueado'`) se `(gasto+novo) > limite_total` **OU** `(gasto_empresa+novo) > limite_empresa`

> Fallback do limite por empresa quando não há registro no mês: tratar como **0** (bloqueia até admin cadastrar). Caso prefira "sem limite", ajusto.

**View `vw_orcamento_mes_atual`** — adicionar campos por empresa (lista) ou criar `vw_orcamento_empresa_mes`.

## 2. Frontend

### `acrescimos/novo.tsx` (reescrita)
- Remove "Solicitar / Enviar solicitação", "pendente", aprovação.
- Título: **"Registrar acréscimo de limite"**.
- Campo **Escopo**: radio `Total geral` / `Empresa específica`.
- Se `Empresa`: combobox de empresas ativas + mostra limite atual da empresa no mês.
- Se `Total`: mostra limite total atual do mês.
- Campo **Novo limite** + **Justificativa** + **Assinatura** (mantidos).
- Botão único **Registrar acréscimo** → insert com `status='aprovado'`, efeito imediato.
- Histórico do mês passa a listar acréscimos de total e por empresa, com badge do escopo.

### `cadastros/empresas.tsx`
- Nova seção/diálogo **"Limite mensal"** por empresa: tabela `mes / valor / editar` apoiada em `limites_empresa`. Admin cria/edita o valor de cada mês.

### `dashboard.tsx`
- KPI "Limite atual" continua (limite total).
- Nova seção **"Limites por empresa (mês atual)"**: lista cada empresa com `limite · gasto · saldo` (vermelho se saldo ≤ 10%).

### `autorizacoes/nova.tsx` (passo Confirmação)
- Mostra os dois saldos: total geral e da empresa selecionada.
- Aviso quando a autorização vai ser criada bloqueada por qualquer um dos limites.

## 3. Permissões / telas
- Mantém `acrescimos` em `src/lib/telas.ts`.
- Adiciona `cadastros.empresas.limites` se quiser controle fino — opcional, posso pular.

## 4. Fora do escopo
- Migração de dados de acréscimos existentes (todos ficam como `aprovado` retroativamente — sem destrutivo).
- Notificações/relatório dedicado de limites estourados.
