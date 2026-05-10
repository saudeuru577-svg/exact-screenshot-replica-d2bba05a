# 💰 Módulo 03 — Controle Orçamentário (Limite Mensal)

> Referenciado por: [PRD_PRINCIPAL.md](../PRD_PRINCIPAL.md)  
> Ver também: [02_regras_negocio.md](./02_regras_negocio.md) para regras antifraude relacionadas

---

## 1. Limite Base Fixo

```
R$ 130.000,00 por mês calendário
```

---

## 2. Cálculo do Total Mensal Consumido

```
Total_Mensal = SOMA(total_autorizado)
  ONDE MONTH(data_autorizacao) = mês atual
    AND YEAR(data_autorizacao) = ano atual
    AND status IN (pendente, aprovado, faturado)
```

> Autorizações com status = **cancelado** ou **negado** não entram no cálculo.

---

## 3. Cálculo do Limite Atual

O limite pode ser expandido por acréscimos aprovados no mesmo mês:

```
Limite_Atual = 130.000 + SOMA(novo_limite)
  ONDE mes_referencia = YYYY-MM atual
    AND status = aprovado
```

---

## 4. Regra de Validação ao Salvar Autorização

### 🟢 Caso 1 — Dentro do Limite (Permitido)

```
(Total_Mensal + Novo_Valor_Autorização) <= Limite_Atual
```
→ Permitir salvar normalmente.

### 🔴 Caso 2 — Ultrapassa o Limite (Bloqueado)

```
(Total_Mensal + Novo_Valor_Autorização) > Limite_Atual
```
→ **Bloquear automaticamente**  
→ Exibir mensagem:

> "Limite mensal de R$ 130.000,00 atingido. Solicite acréscimo de gastos."

→ Status da autorização permanece como `bloqueado` — não pode ser aprovado.

---

## 5. Regras de Negócio do Orçamento

| ID | Regra |
|---|---|
| RN-LIM1 | Limite é aplicado por mês calendário (não por período customizado) |
| RN-LIM2 | Total gasto mensal = soma de autorizações aprovadas/pendentes/faturadas no mês |
| RN-LIM3 | Total de acréscimos aprovados no mês é somado ao limite base |
| RN-LIM4 | Cancelamentos removem o valor do total mensal automaticamente |
| RN-LIM5 | Não permitir edição retroativa para reduzir valor e burlar limite |
| RN-LIM6 | Alterações em autorizações recalculam o total mensal automaticamente |
| RN-LIM7 | Não permitir alteração manual do limite base de R$ 130.000 (antifraude) |

---

## 6. Fluxo de Acréscimo de Gastos

```
Atendente tenta salvar autorização
    ↓
Sistema verifica: Total_Mensal + Novo_Valor > Limite_Atual?
    ↓ sim
Bloqueia automaticamente (status = bloqueado)
    ↓
Secretaria abre solicitação de acréscimo
    ↓
Administrador recebe notificação
    ↓
Administrador aprova ou rejeita
    ↓ aprovado
Novo limite calculado: 130.000 + soma de acréscimos aprovados no mês
    ↓
Autorização bloqueada pode ser reprocessada
```

---

## 7. Campos da Solicitação de Acréscimo

Ao criar um acréscimo, o sistema registra automaticamente:
- `mes_referencia`: mês atual (YYYY-MM)
- `total_gasto`: total acumulado no mês no momento da solicitação
- `limite_atual`: limite vigente antes do acréscimo
- `novo_limite`: novo valor proposto após acréscimo

---

## 8. Dashboard — Indicadores Financeiros em Tempo Real

Exibir no topo do sistema para todos os perfis:

| Indicador | Fórmula |
|---|---|
| 💰 Limite Base | R$ 130.000,00 (fixo) |
| ➕ Acréscimos Aprovados no Mês | SOMA(novo_limite) dos acréscimos aprovados no mês |
| 📊 Limite Atual | Limite Base + Acréscimos |
| 📈 Total Autorizado no Mês | SOMA(total_autorizado) das autorizações ativas no mês |
| ⚠ Saldo Disponível | Limite Atual − Total Autorizado |

**Alerta visual:** Se Saldo ≤ 10% do Limite Atual → exibir em **vermelho** com ícone de alerta.

---

## 9. Impacto no PDF da Autorização

O rodapé do PDF deve incluir:
- Valor total da autorização
- Total acumulado no mês (no momento da emissão)
- Saldo restante no momento da emissão
