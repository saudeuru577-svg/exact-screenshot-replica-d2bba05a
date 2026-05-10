# 📊 Módulo 05 — Relatórios e Dashboard

> Referenciado por: [PRD_PRINCIPAL.md](../PRD_PRINCIPAL.md)

---

## Filtros Globais Disponíveis

Todos os relatórios suportam os seguintes filtros:

| Filtro | Tipo | Obrigatoriedade |
|---|---|---|
| Período (início e fim) | date range | Obrigatório |
| Empresa | select | Opcional |
| UBS | select | Opcional |
| Profissional | select | Opcional |
| Paciente | busca/select | Opcional |
| Status da Autorização | select múltiplo | Opcional |
| Tipo de Procedimento | exame \| consulta | Opcional |

---

## Exportações

Todos os relatórios devem permitir:
- 👁 Visualização em tela (tabela paginada)
- 📄 Exportação em PDF (formatado)
- 📊 Exportação em Excel (.xlsx)

---

## 1. Dashboard Executivo (Tempo Real)

Rota: `/dashboard`

| Indicador | Cálculo |
|---|---|
| Limite Base | R$ 130.000,00 (fixo) |
| Acréscimos Aprovados no Mês | SOMA(novo_limite) dos acréscimos aprovados no mês |
| Limite Atual | Limite Base + Acréscimos |
| Total Autorizado no Mês | SOMA(total_autorizado) de autorizações ativas |
| Saldo Disponível | Limite Atual − Total Autorizado |
| Ranking de UBS | Top 5 por valor autorizado no mês |
| Ranking de Profissionais | Top 5 por volume de autorizações |

> Saldo ≤ 10% do Limite → exibir em **vermelho** com alerta visual.

---

## 2. Relatório por UBS

Agrupado por unidade de saúde no período selecionado:

| Campo | Descrição |
|---|---|
| UBS | Nome do posto |
| Total de Autorizações | Contagem de guias emitidas |
| Total de Procedimentos | Soma de itens autorizados |
| Total Financeiro (R$) | Soma de total_autorizado |
| Total por Empresa | Breakdown por empresa responsável |
| % do Orçamento Mensal | (Total UBS / Limite Atual) × 100 |

---

## 3. Relatório por Profissional

| Campo | Descrição |
|---|---|
| Nome | Nome do profissional |
| Cargo | Médico ou Enfermeiro |
| UBS Vinculada | Posto de atuação |
| Total de Autorizações | Contagem de guias emitidas |
| Total de Procedimentos | Soma de itens solicitados |
| Valor Total Autorizado (R$) | Soma financeira |
| Média Mensal de Solicitações | Total ÷ meses no período |

---

## 4. Produção por Médico

Filtro: `cargo = medico`

| Campo | Descrição |
|---|---|
| Nome | Nome do médico |
| Especialidade | Especialidade registrada |
| Total de Autorizações | Contagem |
| Total de Procedimentos | Soma de itens |
| Valor Total Autorizado | Soma financeira |
| Ranking | Ordenado por volume de produção (decrescente) |

---

## 5. Produção por Enfermeiro

Filtro: `cargo = enfermeiro`

| Campo | Descrição |
|---|---|
| Nome | Nome do enfermeiro |
| UBS | Unidade de atuação |
| Total de Autorizações | Contagem |
| Valor Total Autorizado | Soma financeira |
| % na Unidade | Participação sobre total da UBS |

---

## 6. Total Autorizado por Unidade

Agrupamento por UBS:

| Campo | Descrição |
|---|---|
| UBS | Nome da unidade |
| Total de Autorizações | Contagem |
| Total Financeiro Autorizado | Soma |
| Total de Pacientes Atendidos | Contagem de pacientes únicos |
| % sobre Orçamento Mensal | Participação no limite total |

---

## 7. Custo por Unidade

Agrupamento por UBS:

| Campo | Descrição |
|---|---|
| Total Gasto no Período | Soma financeira |
| Total de Acréscimos Utilizados | Soma de acréscimos aprovados |
| Custo Médio por Paciente | Total ÷ Pacientes únicos |
| Custo Médio por Autorização | Total ÷ Qtd. autorizações |
| Custo Médio por Procedimento | Total ÷ Qtd. itens |

---

## 8. Relatório de Faturamento

Por empresa e período:

| Campo | Descrição |
|---|---|
| Empresa | Nome da empresa responsável |
| Período | Início e fim do faturamento |
| Valor Total | total_confirmados + total_glosados |
| Total Confirmado | Valores aceitos pela empresa |
| Total Glosado | Valores recusados |
| % de Glosa | (total_glosados / valor_total) × 100 |
| Status | aberto \| enviado \| parcialmente_glosado \| fechado |
| Qtd. Procedimentos | Total de itens no período |
