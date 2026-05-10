# 📋 Módulo 02 — Regras de Negócio e Antifraude

> Referenciado por: [PRD_PRINCIPAL.md](../PRD_PRINCIPAL.md)  
> Ver também: [03_orcamento.md](./03_orcamento.md) para regras de limite financeiro

---

## 1. Regras Gerais do Sistema

| ID | Regra |
|---|---|
| RN-GER1 | Todos os registros devem possuir `criado_em`, `atualizado_em` e `criado_por` |
| RN-GER2 | Nenhuma exclusão física para entidades críticas (pacientes, autorizações, faturamentos) — usar inativação lógica |
| RN-GER3 | Todas as ações críticas geram log de auditoria em `logs_auditoria` |
| RN-GER4 | Valores monetários usam `decimal(12,2)` |
| RN-GER5 | Datas futuras não são permitidas para autorizações ou faturamentos |

---

## 2. Regras de Dados — Campos de Nome

Aplica-se a: `pacientes.nome`, `pacientes.nome_da_mae`, `empresas.nome_fantasia`, `procedimentos.grupo`, `profissionais.nome_profissional`, `ubs.nome_posto`, `usuarios.nome`

| ID | Regra |
|---|---|
| RN-DADOS1 | Campos de nome **não podem conter caracteres numéricos (0–9)** |
| RN-DADOS2 | Permitido apenas: letras (A–Z, À–ÿ) e espaço simples entre palavras |
| RN-DADOS3 | Tamanho mínimo: 3 caracteres. Máximo: 150 caracteres |
| RN-DADOS4 | Normalização automática ao salvar: remover espaços duplos, trim, Title Case |
| RN-DADOS5 | Bloquear padrões inválidos: sequências repetitivas (ex: "AAAA"), palavras genéricas como "teste", "aaa" |

**Regex de validação (banco e frontend):**
```
^[A-Za-zÀ-ÿ]+(?:\s[A-Za-zÀ-ÿ]+)*$
```

**Constraint no banco:**
```sql
CHECK (campo ~ '^[A-Za-zÀ-ÿ]+(?:\s[A-Za-zÀ-ÿ]+)*$')
CHECK (char_length(campo) BETWEEN 3 AND 150)
```

**Mensagem de erro para o usuário:**
> "O campo deve conter apenas letras e espaços, mínimo 3 caracteres."

---

## 3. Regras — Pacientes

| ID | Regra |
|---|---|
| RN-PAC1 | Não permitir paciente com nome duplicado (mesmo nome + mesma data de nascimento) |
| RN-PAC2 | Idade deve ser calculada automaticamente a partir de `dtn` — campo não editável |
| RN-PAC3 | Endereço condicional: zona urbana exige rua, número e bairro_id. Zona rural exige povoado_id |
| RN-PAC4 | `cartao_sus` deve ser único se informado |
| RN-PAC5 | Não permitir exclusão de paciente com autorização vinculada |

---

## 4. Regras — UBS

| ID | Regra |
|---|---|
| RN-UBS1 | `nome_posto` deve seguir validação de nome (sem números) |
| RN-UBS2 | `cnes` deve conter apenas números |
| RN-UBS3 | `id_posto` deve ser único no sistema |
| RN-UBS4 | `zona` obrigatório: urbana ou rural |

---

## 5. Regras — Profissionais

| ID | Regra |
|---|---|
| RN-PROF1 | `nome_profissional` segue regras RN-DADOS1 a RN-DADOS5 |
| RN-PROF2 | Se cargo = medico → conselho deve ser CRM. Se cargo = enfermeiro → conselho deve ser COREN |
| RN-PROF3 | `numero_conselho` deve conter apenas números |
| RN-PROF4 | `estado_conselho` deve conter exatamente 2 letras maiúsculas (UF). Regex: `^[A-Z]{2}$` |
| RN-PROF5 | `ubs_id` obrigatório — profissional sempre vinculado a uma UBS |

---

## 6. Regras — Autorizações

| ID | Regra |
|---|---|
| RN-AUT1 | Número da autorização gerado automaticamente: `AUT` + ANO + sequencial com zero à esquerda. Ex: `AUT20260001` |
| RN-AUT2 | Uma autorização deve possuir pelo menos 1 item em `itens_autorizacao` |
| RN-AUT3 | `total_autorizado` = soma automática dos `valor_total` dos itens |
| RN-AUT4 | Não permitir aprovação se total ultrapassar o limite mensal vigente |
| RN-AUT5 | Após status = aprovado, não permitir edição de itens |
| RN-AUT6 | Assinatura do paciente e do atendente são obrigatórias antes da aprovação |

---

## 7. Regras — Itens da Autorização

| ID | Regra |
|---|---|
| RN-ITEM1 | Quantidade deve ser maior que zero |
| RN-ITEM2 | Valor unitário deve ser maior que zero |
| RN-ITEM3 | `valor_total` = quantidade × valor_unitario (calculado automaticamente) |
| RN-ITEM4 | Não permitir item com procedimento inativo |

---

## 8. Regras — Faturamento

| ID | Regra |
|---|---|
| RN-FAT1 | `valor_total` = `total_confirmados` + `total_glosados` |
| RN-FAT2 | Não permitir status = fechado se houver pendências |
| RN-FAT3 | Apenas perfil Financeiro ou Administrador pode alterar status |
| RN-FAT4 | Não permitir alteração de faturamento com status = fechado |
| RN-FAT5 | Percentual de glosa = (total_glosados / valor_total) × 100 |

---

## 9. 🚨 Regras Antifraude

### CA1 — Bloqueio de Alteração Retroativa de Data
Não permitir alteração de `data_autorizacao` ou `periodo_inicio`/`periodo_fim` após o registro inicial.

### CA2 — Bloqueio de Redução de Valor Após Aprovação
Se status = aprovado:
- Não permitir reduzir `valor_total` da autorização
- Não permitir reduzir quantidade de item
- Não permitir remover item

### CA3 — Exclusão Restrita de Autorização Aprovada
- Permitido apenas para perfil **Administrador**
- Requer justificativa obrigatória (mínimo 20 caracteres)
- Gera log completo em `logs_auditoria`

### CA4 — Log de Tentativa de Violação
Toda tentativa de:
- Alterar valor após aprovação
- Alterar data retroativamente
- Aprovar acima do limite
- Excluir indevidamente

Deve ser registrada em `logs_auditoria` com: usuário, data/hora, IP, ação tentada, entidade afetada, payload.

### RN-LIM7 — Proteção do Limite Base
Não permitir:
- Alteração manual do limite base de R$ 130.000
- Alteração retroativa de acréscimos já aprovados
- Alteração de mês de competência após criação

---

## 10. Tratamento de Erros na Interface

| Situação | Mensagem ao Usuário |
|---|---|
| Campo de nome inválido | "O campo deve conter apenas letras e espaços, mínimo 3 caracteres." |
| CPF duplicado | "Este CPF já está cadastrado no sistema." |
| Limite mensal atingido | "Limite mensal de R$ 130.000,00 atingido. Solicite acréscimo de gastos." |
| Autorização sem itens | "Adicione pelo menos um procedimento antes de salvar." |
| Tentativa de editar autorização aprovada | "Esta autorização está aprovada e não pode ser editada." |
| API retorna violação | HTTP 400 — Código interno: `ERRO_VALIDACAO_NOME` |
