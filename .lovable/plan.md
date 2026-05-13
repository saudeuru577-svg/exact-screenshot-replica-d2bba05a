# Plano — Módulo de Faturamento

## 1. Banco de dados (migrations)

Não existem tabelas de faturamento ainda. Criar:

**`faturamentos`** (uma sessão de conferência por empresa)
- `id` uuid pk, `empresa_id` uuid, `mes_referencia` text (YYYY-MM)
- `status` `status_faturamento` (enum já existe: aberto/enviado/parcialmente_glosado/fechado)
- `iniciado_por` uuid, `iniciado_em`, `finalizado_em`, `total_bruto`, `total_glosado`, `total_liquido`

**`faturamento_itens`** (1 linha por item de autorização conferido)
- `id`, `faturamento_id`, `autorizacao_id`, `item_autorizacao_id`
- `status` enum novo `status_item_faturamento`: `pendente | confirmado | glosado`
- `motivo_glosa_id` (nullable), `observacao_glosa` text, `conferido_por`, `conferido_em`
- unique (`faturamento_id`, `item_autorizacao_id`)

**`motivos_glosa`**
- `id`, `descricao` (unique), `ativo` bool, `criado_por`, `criado_em`

RLS: select para admin/secretaria/financeiro; insert/update para admin/financeiro. Motivos: insert por admin/financeiro.

Trigger: ao salvar/atualizar `faturamento_itens`, recalcular totais em `faturamentos`. Ao finalizar (status=fechado), marcar autorizações relacionadas como `faturado`.

## 2. Rotas

```
src/routes/_authenticated/faturamentos/
  index.tsx          -> Lista de empresas (cards/tabela) com botão "Conferir"
  $empresaId.tsx     -> Tela de conferência
```

## 3. Tela 1 — Lista de Empresas

- Reaproveita query `empresas` (ativas).
- Mostra: nome fantasia, CNPJ, status do faturamento atual do mês (badge), totais pendentes (count de autorizações `aprovado` não faturadas).
- Botão **"Conferir faturamento"** → navega para `/faturamentos/$empresaId`.
- Filtro por mês de referência (default: mês corrente) e busca por nome.

## 4. Tela 2 — Conferência (`/faturamentos/$empresaId`)

Layout duas colunas (grid `lg:grid-cols-[1fr_320px]`):

**Centro** — lista de requisições (autorizações da empresa no mês com status `aprovado`/`pendente` ainda não faturadas), agrupadas por `num_aut`. Para cada autorização:
- Cabeçalho: `num_aut`, paciente, data
- Lista de itens (`itens_autorizacao`): nome do exame em destaque (h3), paciente abaixo (text-sm muted), valor à direita
- Por item: botões `Confirmar` (check verde), `Glosar` (X destrutivo)
- No cabeçalho da requisição: botão `Confirmar todos` (check duplo)
- Estado visual por item: badge confirmado/glosado/pendente

**Painel direito (sticky)** — resumo:
- Nome da empresa em conferência
- Totais: bruto, confirmado, glosado, restante
- Contadores: itens conferidos / total
- Botão `Parar` (variant primary destacado) → confirma com AlertDialog → finaliza faturamento (status `fechado` ou `parcialmente_glosado` se houve glosas), marca autorizações como `faturado`, redireciona para lista.

Mutations: `confirmarItem`, `glosarItem`, `confirmarTodos(autorizacaoId)`, `finalizarFaturamento`. Invalida queryKey após cada ação.

## 5. Modal — Registrar Glosa

`Dialog` com:
- **Motivo de Glosa**: `Combobox` (Command + Popover) buscando em `motivos_glosa`. Opção "+ Adicionar novo motivo" abre input inline → cria registro e seleciona automaticamente.
- **Observação**: `Textarea`
- Footer: `Cancelar` (ghost) / `Salvar` (default, disabled se motivo vazio)
- Ao salvar: chama `glosarItem({ itemId, motivoId, observacao })`.

## 6. Permissões

- Visualizar: admin, secretaria, financeiro
- Conferir/glosar/finalizar: admin, financeiro
- Botões ocultos para perfis sem permissão (usar `usePerfil`).

## 7. Detalhes técnicos

- Usar `@tanstack/react-query` com chaves `["faturamento", empresaId, mes]`, `["faturamento-empresas", mes]`, `["motivos-glosa"]`.
- Formatação monetária via `format.ts` existente (criar helper `currencyBR` se não existir).
- Toda navegação tipada via `<Link to="/_authenticated/faturamentos/$empresaId" params>`.
- Componentes shadcn já disponíveis: Dialog, Command, Popover, Textarea, AlertDialog, Badge, Button, Card, Table.

## 8. Ordem de implementação

1. Migration: enum `status_item_faturamento`, tabelas `motivos_glosa`, `faturamentos`, `faturamento_itens`, RLS, trigger de totais.
2. `index.tsx` — lista de empresas + ação Conferir.
3. `$empresaId.tsx` — layout, query, listagem agrupada.
4. Mutations confirmar/glosar/confirmar-todos.
5. Modal de glosa com combobox de motivos + criação inline.
6. Botão Parar + finalização.
7. QA visual nos breakpoints.
