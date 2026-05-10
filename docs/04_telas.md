# 🖥️ Módulo 04 — Telas e Fluxos de Interface

> Referenciado por: [PRD_PRINCIPAL.md](../PRD_PRINCIPAL.md)  
> Stack: React + Vite + TailwindCSS + Shadcn/ui  
> Ver também: [tech/DESIGN_REACT_APP.md](../tech/DESIGN_REACT_APP.md)

---

## Mapa de Rotas

| Rota | Tela | Perfis com Acesso |
|---|---|---|
| `/login` | Login | Todos |
| `/dashboard` | Dashboard Financeiro | Todos |
| `/pacientes` | Lista de Pacientes | Todos |
| `/pacientes/novo` | Cadastro de Paciente | Atendente, Administrador |
| `/pacientes/:id` | Detalhes do Paciente | Todos |
| `/autorizacoes` | Lista de Autorizações | Todos |
| `/autorizacoes/nova` | Nova Autorização | Atendente |
| `/autorizacoes/:id` | Detalhes da Autorização | Todos |
| `/acrescimos/novo` | Solicitação de Acréscimo | Secretaria |
| `/faturamentos` | Faturamentos | Financeiro, Administrador |
| `/relatorios` | Relatórios | Financeiro, Secretaria, Administrador |
| `/cadastros/ubs` | UBS | Administrador |
| `/cadastros/profissionais` | Profissionais | Administrador |
| `/cadastros/empresas` | Empresas | Administrador |
| `/cadastros/procedimentos` | Procedimentos | Administrador |
| `/cadastros/territorio` | Bairros e Povoados | Administrador |
| `/admin/usuarios` | Gestão de Usuários | Administrador |
| `/admin/logs` | Logs de Auditoria | Administrador |

---

## Tela: Login `/login`

**Elementos:**
- Logo centralizado
- Campo Email (obrigatório)
- Campo Senha (obrigatório, mínimo 8 caracteres)
- Botão "Entrar"

**Fluxo:**
1. Validar campos obrigatórios
2. Autenticar via Supabase Auth
3. Se válido → redirecionar para `/dashboard`
4. Se inválido → exibir toast: "Email ou senha inválidos"

---

## Tela: Dashboard `/dashboard`

**Seção superior — Indicadores Financeiros:**
- Limite Base: R$ 130.000,00
- Acréscimos Aprovados no Mês
- Limite Atual
- Total Autorizado no Mês
- Saldo Disponível (vermelho se ≤ 10%)

**Seção central:**
- Últimas autorizações (tabela)
- Acréscimos pendentes de aprovação (se Administrador/Secretaria)

---

## Tela: Cadastro de Paciente `/pacientes/novo`

**Campos:**
- Nome Completo (obrigatório, apenas letras)
- Cartão SUS (opcional, único)
- Data de Nascimento (obrigatório)
- Idade Calculada (exibição automática, não editável)
- Sexo (obrigatório)
- Zona (urbana | rural) — controla campos condicionais

**Campos condicionais — Zona Urbana:**
- Rua (obrigatório)
- Número (obrigatório)
- Bairro (select de lista, obrigatório)

**Campos condicionais — Zona Rural:**
- Povoado (select de lista, obrigatório)

**Campos adicionais:**
- Ponto de Referência (opcional)
- Nome da Mãe (obrigatório, apenas letras)
- Naturalidade (opcional)

**Fluxo ao salvar:**
1. Validar CPF único (se informado)
2. Verificar duplicidade (nome + data nascimento)
3. Persistir no banco
4. Redirecionar para `/pacientes`

---

## Tela: Nova Autorização `/autorizacoes/nova`

### Seção 1 — Dados Gerais
- Número da Autorização (auto gerado, exibição apenas)
- Paciente (busca/select)
- Profissional (busca/select vinculado à UBS)
- UBS (preenchida automaticamente ao selecionar profissional)
- Empresa Responsável (select)
- Sintomas (textarea, opcional)
- Upload de Requisição (imagem/PDF, opcional)

### Seção 2 — Itens da Autorização
Tabela dinâmica com linha por procedimento:

| Campo | Comportamento |
|---|---|
| Procedimento | Select filtrado por empresa selecionada |
| Descrição | Preenchida automaticamente |
| Quantidade | Input numérico, mínimo 1 |
| Valor Unitário | Pré-preenchido, editável |
| Valor Total Item | Calculado automaticamente (qtd × v.unit) |

- Botão **+ Adicionar Procedimento**
- Exibir **Total Geral** em tempo real (soma dos itens)
- Exibir barra de uso do orçamento mensal em tempo real

### Seção 3 — Assinaturas
- Canvas de assinatura do paciente (obrigatório)
- Canvas de assinatura do atendente (obrigatório)
- Opção: "Assinar fisicamente" (gera linha para assinatura manual no PDF)

### Ações ao Salvar
1. Validar pelo menos 1 item
2. Validar assinaturas obrigatórias
3. Verificar limite mensal
4. Calcular `total_autorizado`
5. Gerar `num_aut` sequencial
6. Gerar QR Code vinculado ao ID
7. Gerar PDF A4 com: dados, itens, assinaturas, QR Code, saldo do mês
8. Fazer upload de PDF e assinaturas para Supabase Storage
9. Persistir registros

---

## Tela: Solicitação de Acréscimo `/acrescimos/novo`

**Dados exibidos automaticamente:**
- Limite base: R$ 130.000,00
- Acréscimos já aprovados no mês
- Limite atual
- Total gasto no mês
- Saldo atual (provavelmente negativo ou crítico)

**Campos do formulário:**
- Novo Limite Solicitado (valor total desejado)
- Justificativa (textarea, obrigatório, mínimo 20 caracteres)
- Canvas de assinatura (obrigatório)

**Acesso:** Somente perfil Secretaria pode criar.  
**Aprovação:** Somente Administrador pode aprovar ou rejeitar.

---

## Tela: Faturamento `/faturamentos`

**Filtros:**
- Empresa (select)
- Período (data início e fim)

**Tabela de resultados:**
- Empresa, Período, Valor Total, Confirmados, Glosados, Qtd. Procedimentos, Status

**Ações disponíveis:**
- Alterar status do faturamento
- Registrar valores glosados por item
- Exportar em PDF ou Excel

---

## Componentes Reutilizáveis

| Componente | Uso |
|---|---|
| `<AssinaturaCanvas />` | Captação de assinatura digital (react-signature-canvas) |
| `<OrcamentoBar />` | Barra de progresso do orçamento mensal |
| `<ProcedimentoRow />` | Linha da tabela dinâmica de itens |
| `<ToastNotification />` | Mensagens de erro, sucesso e alertas |
| `<QRCodeAutorizacao />` | QR Code vinculado ao num_aut |
| `<PDFAutorizacao />` | Layout do PDF gerado com @react-pdf/renderer |
