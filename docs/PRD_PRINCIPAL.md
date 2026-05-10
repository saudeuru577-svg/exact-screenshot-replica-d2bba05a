# 📘 PRD PRINCIPAL — Sistema Municipal de Autorização de Exames

> **Status:** Em Desenvolvimento  
> **Versão:** 2.0 (Consolidada)  
> **Última atualização:** 2026-05  
> **Stack:** React + TypeScript + Vite + Supabase + TailwindCSS + Shadcn/ui

---

## 1. Visão do Produto

Sistema web institucional para controle administrativo de autorizações de exames e consultas, destinado à **Secretaria Municipal de Saúde**.

**Substitui:** Sistema legado em AppSheet.

**Resolve:**
- Falta de controle de limites financeiros mensais
- Ausência de rastreabilidade documental (PDF + QR Code)
- Dificuldade no faturamento e apuração de glosas
- Inexistência de antifraude estruturado

---

## 2. Perfis de Usuário

| Perfil | Responsabilidades Principais |
|---|---|
| **Administrador** | Gerencia usuários, cadastra território, visualiza logs, aprova acréscimos, exclui autorizações aprovadas (com justificativa) |
| **Secretaria** | Solicita acréscimos de gasto, visualiza relatórios e dashboard |
| **Atendente** | Cadastra pacientes, cria autorizações |
| **Financeiro** | Gera faturamento, registra glosas, fecha períodos |

---

## 3. Módulos do Sistema

| # | Módulo | Arquivo de Referência |
|---|---|---|
| 1 | Banco de Dados (Schema completo) | [→ modulos/01_schema_banco.md](./modulos/01_schema_banco.md) |
| 2 | Regras de Negócio e Antifraude | [→ modulos/02_regras_negocio.md](./modulos/02_regras_negocio.md) |
| 3 | Controle Orçamentário (Limite Mensal) | [→ modulos/03_orcamento.md](./modulos/03_orcamento.md) |
| 4 | Telas e Fluxos de Interface | [→ modulos/04_telas.md](./modulos/04_telas.md) |
| 5 | Relatórios e Dashboard | [→ modulos/05_relatorios.md](./modulos/05_relatorios.md) |
| 6 | Matriz de Permissões por Perfil | [→ modulos/06_permissoes.md](./modulos/06_permissoes.md) |
| 7 | Design e Arquitetura Técnica (React) | [→ tech/DESIGN_REACT_APP.md](./tech/DESIGN_REACT_APP.md) |

---

## 4. Arquitetura Funcional — Módulos

```
autenticacao
├── cadastro-territorial (bairros / povoados)
├── cadastro-ubs
├── cadastro-profissionais
├── cadastro-pacientes
├── cadastro-empresas
├── cadastro-procedimentos
├── autorizacoes
│   └── itens-autorizacao
├── controle-orcamentario
│   └── acrescimos
├── faturamento
│   └── glosas
├── relatorios
└── logs-auditoria
```

---

## 5. Estética e Identidade Visual

| Elemento | Definição |
|---|---|
| **Cor Principal** | Azul institucional |
| **Base** | Branco |
| **Alertas / Crítico** | Vermelho |
| **Tipografia** | Sem serifa, moderna |
| **Estilo** | Minimalista administrativo |

Saldo ≤ 10% do limite → **alerta vermelho automático** no dashboard.

---

## 6. Fora do Escopo (MVP)

- Integração com CNES
- API externa de terceiros
- Assinatura digital com validade jurídica (ICP-Brasil)
- Multi-município
- Acesso direto por pacientes

---

## 7. Histórias de Usuário

| ID | Como... | Quero... | Para... |
|---|---|---|---|
| US1 | Atendente | Cadastrar novo paciente | Habilitar autorizações de exames |
| US2 | Atendente | Gerar autorização com múltiplos procedimentos | Registrar exames com rastreabilidade |
| US3 | Secretária | Solicitar acréscimo quando limite for atingido | Continuar autorizações no mês |
| US4 | Financeiro | Gerar faturamento mensal por empresa | Controlar confirmados e glosados |
| US5 | Financeiro | Filtrar relatórios por período e profissional | Apoiar decisões gerenciais |
| US6 | Administrador | Cadastrar bairros, UBS e profissionais | Manter dados territoriais corretos |
| US7 | Administrador | Gerenciar usuários e perfis | Controlar acessos ao sistema |
| US8 | Administrador | Visualizar logs de auditoria | Auditar ações críticas |

---

## 8. Decisões Técnicas Consolidadas

| Decisão | Escolha | Motivo |
|---|---|---|
| Backend / Banco | Supabase (PostgreSQL + RLS) | Autenticação, storage e segurança por perfil |
| Frontend | React + Vite + TypeScript | SPA administrativa sem necessidade de SEO |
| Estilização | TailwindCSS + Shadcn/ui | Minimalismo com componentes de qualidade |
| Estado Global | Zustand + React Query | Síncrono (perfil) e assíncrono (dados) |
| Formulários | React Hook Form + Zod | Validação sólida no cliente |
| Assinatura | react-signature-canvas (canvas digital) | Híbrido: digital no sistema, físico no PDF |
| QR Code | qrcode.react | Vincula num_aut para conferência antifraude |
| Geração de PDF | @react-pdf/renderer | PDF A4 com dados, itens, assinaturas e QR Code |

> Detalhes de implementação → [tech/DESIGN_REACT_APP.md](./tech/DESIGN_REACT_APP.md)
