# 🔐 Módulo 06 — Matriz de Permissões por Perfil

> Referenciado por: [PRD_PRINCIPAL.md](../PRD_PRINCIPAL.md)  
> Implementação: Row Level Security (RLS) no Supabase

---

## Legenda

| Símbolo | Significado |
|---|---|
| ✅ | Acesso total |
| 👁 | Somente leitura |
| ❌ | Sem acesso |
| ⚠️ | Acesso com restrições (ver nota) |

---

## 1. Autenticação e Sessão

| Ação | Administrador | Secretaria | Atendente | Financeiro |
|---|---|---|---|---|
| Login | ✅ | ✅ | ✅ | ✅ |
| Gerenciar usuários | ✅ | ❌ | ❌ | ❌ |
| Alterar própria senha | ✅ | ✅ | ✅ | ✅ |

---

## 2. Cadastro Territorial (Bairros / Povoados)

| Ação | Administrador | Secretaria | Atendente | Financeiro |
|---|---|---|---|---|
| Visualizar bairros/povoados | ✅ | 👁 | 👁 | ❌ |
| Criar bairro/povoado | ✅ | ❌ | ❌ | ❌ |
| Editar bairro/povoado | ✅ | ❌ | ❌ | ❌ |
| Inativar bairro/povoado | ✅ | ❌ | ❌ | ❌ |

---

## 3. UBS

| Ação | Administrador | Secretaria | Atendente | Financeiro |
|---|---|---|---|---|
| Visualizar UBS | ✅ | 👁 | 👁 | ❌ |
| Criar UBS | ✅ | ❌ | ❌ | ❌ |
| Editar UBS | ✅ | ❌ | ❌ | ❌ |

---

## 4. Profissionais

| Ação | Administrador | Secretaria | Atendente | Financeiro |
|---|---|---|---|---|
| Visualizar profissionais | ✅ | 👁 | 👁 | ❌ |
| Criar profissional | ✅ | ❌ | ❌ | ❌ |
| Editar profissional | ✅ | ❌ | ❌ | ❌ |

---

## 5. Pacientes

| Ação | Administrador | Secretaria | Atendente | Financeiro |
|---|---|---|---|---|
| Visualizar pacientes | ✅ | 👁 | ✅ | ❌ |
| Cadastrar paciente | ✅ | ❌ | ✅ | ❌ |
| Editar paciente | ✅ | ❌ | ⚠️ | ❌ |
| Inativar paciente | ✅ | ❌ | ❌ | ❌ |

> ⚠️ Atendente pode editar apenas pacientes que ele mesmo cadastrou e sem autorizações vinculadas.

---

## 6. Empresas e Procedimentos

| Ação | Administrador | Secretaria | Atendente | Financeiro |
|---|---|---|---|---|
| Visualizar empresas | ✅ | 👁 | 👁 | 👁 |
| Criar/Editar empresa | ✅ | ❌ | ❌ | ❌ |
| Visualizar procedimentos | ✅ | 👁 | 👁 | 👁 |
| Criar/Editar procedimento | ✅ | ❌ | ❌ | ❌ |
| Inativar procedimento | ✅ | ❌ | ❌ | ❌ |

---

## 7. Autorizações

| Ação | Administrador | Secretaria | Atendente | Financeiro |
|---|---|---|---|---|
| Visualizar autorizações | ✅ | 👁 | ✅ | 👁 |
| Criar autorização | ✅ | ❌ | ✅ | ❌ |
| Editar autorização (pendente) | ✅ | ❌ | ⚠️ | ❌ |
| Aprovar autorização | ✅ | ❌ | ❌ | ❌ |
| Cancelar autorização | ✅ | ❌ | ❌ | ❌ |
| Excluir autorização aprovada | ✅ | ❌ | ❌ | ❌ |
| Visualizar PDF | ✅ | 👁 | ✅ | 👁 |

> ⚠️ Atendente pode editar autorização apenas com status = pendente.  
> Exclusão de aprovada exige justificativa mínima de 20 caracteres.

---

## 8. Acréscimo de Gastos

| Ação | Administrador | Secretaria | Atendente | Financeiro |
|---|---|---|---|---|
| Visualizar limite mensal | ✅ | ✅ | ✅ | ✅ |
| Solicitar acréscimo | ✅ | ✅ | ❌ | ❌ |
| Aprovar acréscimo | ✅ | ❌ | ❌ | ❌ |
| Rejeitar acréscimo | ✅ | ❌ | ❌ | ❌ |
| Visualizar histórico de acréscimos | ✅ | 👁 | ❌ | 👁 |

---

## 9. Faturamento

| Ação | Administrador | Secretaria | Atendente | Financeiro |
|---|---|---|---|---|
| Visualizar faturamentos | ✅ | 👁 | ❌ | ✅ |
| Criar faturamento | ✅ | ❌ | ❌ | ✅ |
| Registrar glosa | ✅ | ❌ | ❌ | ✅ |
| Alterar status | ✅ | ❌ | ❌ | ✅ |
| Fechar período | ✅ | ❌ | ❌ | ✅ |
| Exportar PDF/Excel | ✅ | ❌ | ❌ | ✅ |

---

## 10. Relatórios

| Relatório | Administrador | Secretaria | Atendente | Financeiro |
|---|---|---|---|---|
| Dashboard financeiro | ✅ | ✅ | ✅ | ✅ |
| Relatório por UBS | ✅ | ✅ | ❌ | ✅ |
| Relatório por Profissional | ✅ | ✅ | ❌ | ✅ |
| Produção por Médico | ✅ | ✅ | ❌ | ✅ |
| Produção por Enfermeiro | ✅ | ✅ | ❌ | ✅ |
| Custo por Unidade | ✅ | 👁 | ❌ | ✅ |
| Relatório de Faturamento | ✅ | ❌ | ❌ | ✅ |
| Exportar relatórios | ✅ | ✅ | ❌ | ✅ |

---

## 11. Auditoria e Logs

| Ação | Administrador | Secretaria | Atendente | Financeiro |
|---|---|---|---|---|
| Visualizar logs de auditoria | ✅ | ❌ | ❌ | ❌ |
| Exportar logs | ✅ | ❌ | ❌ | ❌ |

---

## Resumo por Perfil

### Administrador
Acesso total ao sistema. Único que pode: excluir autorizações aprovadas, gerenciar usuários, visualizar logs, aprovar acréscimos, e cadastrar território.

### Secretaria
Foco em operação e controle de gastos. Pode: solicitar acréscimos, visualizar relatórios e dashboard, e acompanhar autorizações.

### Atendente
Foco no atendimento direto. Pode: cadastrar pacientes e criar autorizações. Não acessa relatórios financeiros detalhados.

### Financeiro
Foco em faturamento e análise financeira. Pode: gerar e fechar faturamentos, registrar glosas, exportar relatórios. Não cria autorizações nem pacientes.
