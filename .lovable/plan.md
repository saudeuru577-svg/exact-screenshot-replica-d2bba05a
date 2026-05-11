# Plano de desenvolvimento — Telas de Cadastros + Autorização

Plano organizado por ordem de dependência. Toda lógica de acesso assume RLS já configurada (perfis: `administrador`, `secretaria`, `atendente`, `financeiro`) e usa o cliente Supabase do browser (`@/integrations/supabase/client`) com sessão autenticada. Operações de mutação respeitam as políticas existentes — o frontend apenas espelha as permissões para esconder ações.

---

## 1. Procedimentos  `/cadastros/procedimentos`

**Por que primeiro:** depende apenas de `empresas`, mas o cadastro de empresas é trivial. Procedimentos são o catálogo central usado em itens de autorização e faturamento; precisam estar maduros antes de tudo.

### Estrutura
- Tabela paginada com colunas: Sigla, Nome, Grupo, Tipo (badge), Empresa, Valor unitário (R$), Status (ativo/inativo).
- Filtros: busca textual (nome/sigla/nomes_alternativos), Empresa (select), Tipo (`exame` / `consulta`), Grupo, Status.
- Ações: Novo, Editar, Ativar/Inativar (não há DELETE — usar `ativo=false`).
- Form lateral (Sheet) com: `sigla`, `nome`, `nomes_alternativos` (textarea), `grupo`, `tipo`, `empresa_id` (select), `valor_unitario` (input moeda), `ativo`.

### Dependências
- `empresas` precisa estar cadastrada (FK lógica via `empresa_id`).
- Acesso ao select de empresas via `empresas_select`.

### Queries
- List: `from('procedimentos').select('*, empresa:empresas(id,nome_fantasia)').order('nome')` + filtros `ilike` em nome/sigla.
- Insert/Update: somente `administrador` (RLS já bloqueia outros).
- "Delete" lógico: `update({ ativo: false })`.

### Validações (Zod)
- `sigla`: 2–20, único por empresa (validar via consulta antes de salvar).
- `nome`: obrigatório, ≤120.
- `valor_unitario`: number > 0, 2 casas decimais.
- `tipo` ∈ enum `tipo_procedimento`.
- `empresa_id`: obrigatório, empresa precisa estar `ativa=true`.

### Pontos de atenção
- Enum `tipo_procedimento` = `{exame, consulta}`.
- Não há `atualizado_em` — não tentar atualizá-lo.
- Sem soft-delete real: lista padrão deve filtrar `ativo=true` com toggle "mostrar inativos".
- Mudar `valor_unitario` NÃO recalcula autorizações já emitidas (preço é congelado em `itens_autorizacao.valor_unitario`).

---

## 2. Bairros e Povoados  `/cadastros/territorio`

**Por que aqui:** dependência direta de `pacientes`; tabelas simples.

### Estrutura
- Layout em duas colunas (Tabs ou grid) — Bairros / Povoados.
- Cada lista: nome, ativo, criado_em. Ações: Novo, Editar, Ativar/Inativar.
- Modal simples com `nome` + `ativo`.

### Dependências
- Nenhuma além de auth.

### Queries
- `from('bairros').select('*').order('nome')` / idem `povoados`.
- Insert/Update: somente `administrador`. Frontend deve preencher `criado_por = auth.uid()` (NOT NULL no schema).

### Validações
- `nome`: obrigatório, único (case-insensitive), 2–80.

### Pontos de atenção
- `criado_por` é NOT NULL — esquecer disso causa violação RLS/insert.
- Sem DELETE: usar `ativo=false`.
- Pacientes referenciam por `bairro_id` / `povoado_id` (nullable) + enum `zona_tipo` (`urbana`/`rural`) — o paciente é quem diz se mora em bairro OU povoado.

---

## 3. Empresas  `/cadastros/empresas`

### Estrutura
- Tabela: Nome fantasia, CNPJ, Tipo (badge), Cidade/UF, Contrato (vigência), Ativa.
- Filtros: busca (nome/CNPJ), Tipo serviço, Status, Contrato vigente.
- Form completo (Sheet/Dialog) com seções: Dados, Endereço, Contato, Contrato.

### Dependências
- Nenhuma. Bloqueia: Procedimentos e Autorizações.

### Queries
- List/Insert/Update padrão; só `administrador` muta. SELECT exige perfil staff.
- Ao desativar (`ativa=false`), avisar que procedimentos vinculados continuam visíveis mas devem ser ocultados na seleção de nova autorização.

### Validações (Zod)
- `cnpj`: máscara + dígito verificador, único.
- `email`: válido se preenchido.
- `tipo_servico` ∈ `{laboratorio, clinica, hospital, outro}`.
- `contrato_fim >= contrato_inicio` quando ambos presentes.
- `cep`/`telefone`: máscara BR.

### Pontos de atenção
- Não há FK declarada para `procedimentos.empresa_id` — manter integridade no app.
- `inscricao_estadual` opcional (laboratório isento etc.).
- Trigger `set_atualizado_em` cuida do timestamp.

---

## 4. Profissionais  `/cadastros/profissionais`

### Estrutura
- Tabela: Nome, Cargo, Conselho (CRM/COREN UF nº), Especialidade, UBS, Contato.
- Filtros: busca, UBS, Cargo, Conselho.
- Form: `nome_profissional`, `cargo`, `conselho`, `numero_conselho`, `estado_conselho` (UF), `especialidade`, `ubs_id`, `contato`.

### Dependências
- `ubs` precisa existir (FK lógica `ubs_id` NOT NULL). UBS hoje é um `ComingSoon` — **bloqueador**: a tela de UBS precisa ser construída antes (ou adicionar mini-cadastro inline).

### Queries
- List: `select('*, ubs:ubs(id,nome_posto)')`.
- Insert/Update: `administrador`. SELECT: staff.

### Validações
- `numero_conselho`: único por (`conselho`, `estado_conselho`).
- `estado_conselho`: 2 letras UF.
- `cargo`/`conselho`: enums (`{medico,enfermeiro}` / `{CRM,COREN}`).
- Coerência sugerida: médico→CRM, enfermeiro→COREN (warning, não erro hard).

### Pontos de atenção
- Sem soft-delete (não existe coluna `ativo`). Decidir: adicionar via migration ou bloquear remoção.
- `ubs_id` NOT NULL — sem UBS cadastrada, não há como criar profissional.

---

## 5. Pacientes  `/cadastros/pacientes` (`index`, `novo`, `$id`)

### Estrutura
- **Lista** `/pacientes`: tabela com Nome, DTN/Idade, Sexo, Mãe, Cartão SUS, Zona, Bairro/Povoado. Filtros: busca (nome, mãe, SUS), Zona, Bairro, Povoado. Ações: Novo, Editar, Ver detalhes.
- **Form** (`/pacientes/novo` e edição): seções Identificação (`nome`, `dtn`, `sexo`, `nome_da_mae`, `naturalidade`, `cartao_sus`) e Endereço (`zona`, condicional: `bairro_id` se urbana / `povoado_id` se rural, `rua`, `numero`, `ponto_referencia`).
- **Detalhe** `/pacientes/$id`: dados + histórico de autorizações (lista resumida).

### Dependências
- `bairros`, `povoados` (selects).
- Bloqueia: Autorizações.

### Queries
- List: `select('*, bairro:bairros(nome), povoado:povoados(nome)')`.
- Insert: `administrador`/`atendente`. Setar `criado_por = auth.uid()` (NOT NULL).
- Update: `administrador` ou `atendente` que criou.
- Histórico: `from('autorizacoes').select('id,num_aut,data_autorizacao,total_autorizado,status').eq('paciente_id', id)`.

### Validações
- `dtn`: data válida, ≤ hoje.
- `cartao_sus`: 15 dígitos (se preenchido), único quando informado.
- `zona`: enum `{urbana, rural}`.
- Regra condicional: `zona=urbana` ⇒ `bairro_id` obrigatório, `povoado_id` null; `rural` ⇒ inverso.
- `nome` e `nome_da_mae`: obrigatórios, trim, ≤120.

### Pontos de atenção
- Atendente só edita o que ele criou (RLS) — UI deve refletir isso.
- Buscas grandes: limitar a 1000 (limite Supabase) e paginar via `range()`.
- Considerar índice em `nome` para busca `ilike` (pode ser sugerido como migration futura).

---

## 6. Autorização  `/autorizacoes` (`index`, `nova`, `$id`)

Tela mais crítica — ponto de junção de todos os cadastros + regras de negócio do PRD.

### Estrutura
- **Lista** `/autorizacoes`: colunas `num_aut`, Data, Paciente, UBS, Empresa, Profissional, Total (R$), Status (badge). Filtros: período (data_autorizacao), status, empresa, UBS, paciente (search), num_aut. Ações: Ver, Nova, (Admin) cancelar.
- **Wizard "Nova"** `/autorizacoes/nova`: 4 etapas
  1. Paciente (busca + criar inline)
  2. Origem (UBS, Profissional filtrado por UBS, Sintomas, foto da requisição → upload em bucket `autorizacoes`)
  3. Itens (Empresa → Procedimentos da empresa → quantidade, valor unitário pré-preenchido editável → calcula `valor_total`; soma `total_autorizado`)
  4. Confirmação (assinaturas atendente + paciente em canvas → upload PNG; gera `num_aut` no servidor; renderiza PDF/QR após criação)
- **Detalhe** `/autorizacoes/$id`: cabeçalho com num_aut, status, dados, lista de itens, anexos (req, assinaturas, PDF/QR), botões Imprimir / (Admin) Cancelar / (Admin) Editar.

### Dependências
- TODAS as anteriores: `pacientes`, `ubs`, `profissionais`, `empresas`, `procedimentos`.
- Bucket Storage `autorizacoes` (já existe, RLS por perfil).
- Funções: `gerar_num_aut()`, triggers `verificar_limite_mensal`, `bloquear_alteracao_data_autorizacao`, `bloquear_edicao_autorizacao_aprovada`, `atualizar_total_autorizacao`.
- Geração de PDF/QR: server function (idealmente `createServerFn`) — biblioteca pure-JS (`@react-pdf/renderer` ou `pdf-lib` + `qrcode`).

### Queries
- Insert autorização: `administrador`/`atendente`. Campos obrigatórios: `paciente_id`, `empresa_id`, `ubs_id`, `profissional_id`, `data_autorizacao`, `criado_por=auth.uid()`, `pdf_autorizacao`, `qr_code`, `assinatura_atendente`, `assinatura_paciente` (todos NOT NULL — ordenar fluxo: upload assinaturas → gerar PDF/QR → insert).
- `num_aut`: chamar `rpc('gerar_num_aut')` antes do insert.
- Insert itens: `from('itens_autorizacao').insert([...])` — trigger recalcula `total_autorizado`.
- Update: só admin, ou atendente em `status=pendente` que criou.
- Cancelar: update `status='cancelado'` (somente admin).
- List detalhe: `select('*, paciente:pacientes(*), empresa:empresas(*), ubs:ubs(*), profissional:profissionais(*), itens:itens_autorizacao(*, procedimento:procedimentos(*))')`.

### Validações
- Pelo menos 1 item.
- `quantidade > 0`, `valor_unitario >= 0`, `valor_total = quantidade*valor_unitario` (calcular no client e validar no server function).
- Procedimentos: todos da mesma `empresa_id` selecionada.
- `data_autorizacao`: hoje (default), não permitir futura nem retroativa > N dias (regra de negócio a confirmar).
- Antes de submeter: chamar view `vw_orcamento_mes_atual` para mostrar saldo restante; se total > saldo, avisar — trigger marcará como `bloqueado` automaticamente.
- Assinaturas obrigatórias antes de gerar PDF.

### Pontos de atenção
- Status `bloqueado` é setado pela trigger `verificar_limite_mensal` → UI deve tratar e mostrar aviso pós-criação ("excedeu limite, autorização bloqueada — solicitar acréscimo").
- Edição: trigger bloqueia mudança de `data_autorizacao` e qualquer edição se `status=aprovado`. UI deve desabilitar campos.
- Storage: paths sugeridos `autorizacoes/{autorizacao_id}/req.jpg`, `/sig_atendente.png`, `/sig_paciente.png`, `/aut.pdf`, `/qr.png`. Bucket privado → usar `createSignedUrl` para exibir.
- Atomicidade: insert da autorização + itens + uploads NÃO é transacional via SDK. Estratégia: subir arquivos primeiro com nome temporário (uuid client), inserir autorização referenciando paths, inserir itens; em falha, limpar arquivos.
- `num_aut` gerado por função SQL: pequena chance de corrida — função já tem loop de unicidade.
- Trigger de auditoria insere em `logs_auditoria` — não tentar inserir manualmente (RLS bloqueia).

---

## Análise de resolutividade

### Cobertura de fluxos críticos
Cobre: catálogo de empresas/procedimentos, território, profissionais por UBS, pacientes urbanos/rurais, emissão de autorização com itens, controle de limite mensal, anexos, assinaturas, PDF/QR, auditoria. **Não cobertos neste plano** (ficam para fases seguintes do PRD): UBS, Acréscimos de gastos, Faturamentos, Glosas, Relatórios, Gestão de usuários — todos já existem como rotas placeholder.

### Dependências e bloqueios
```text
ubs ──────────────► profissionais ─┐
bairros/povoados ─► pacientes ─────┤
empresas ─► procedimentos ─────────┼─► autorizações ─► itens
                                   │
ubs ───────────────────────────────┘
```
- **Bloqueio real:** Profissionais depende de UBS (ainda placeholder). Resolver antes de chegar em Autorização — adicionar tela UBS ao escopo (estrutura é trivial: `nome_posto`, `cnes`, `id_posto`, `endereco`, `bairro`, `zona`, `contato`).
- **Sem dependências circulares.**

### Paralelizável
Após Empresas estar pronta, dá pra rodar em paralelo:
- Trilha A: Procedimentos
- Trilha B: Bairros/Povoados → Pacientes
- Trilha C: UBS → Profissionais

Tudo converge em Autorização.

### Risco de retrabalho
1. **Autorização (alto)** — regra de limite, triggers que mudam status, atomicidade de uploads, geração de PDF, assinaturas em canvas. Recomenda-se prototipar fluxo "feliz" primeiro com PDF mock e evoluir.
2. **Pacientes (médio)** — endereço condicional (urbana/rural) e busca performática; se RLS de atendente exigir UX específica (ver só os seus), pode mudar layout.
3. **Procedimentos (baixo-médio)** — congelamento de preço em itens precisa estar claro desde o início; auditar se valor unitário deve ser editável na autorização.
4. **Empresas/Bairros/Povoados/UBS (baixo)** — CRUD simples.

### Recomendações antes de codar
- Adicionar **UBS** ao escopo (pré-requisito de Profissionais e Autorização).
- Decidir se `procedimentos.valor_unitario` é editável na hora da autorização (impacta UX e auditoria).
- Definir biblioteca de PDF compatível com o runtime Worker (evitar `puppeteer`/`sharp`; preferir `pdf-lib` + `qrcode`).
- Confirmar regra de retroatividade da `data_autorizacao`.
