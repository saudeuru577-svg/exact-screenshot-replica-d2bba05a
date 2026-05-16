# Importação de Procedimentos via Excel + Grupo selecionável

## 1. Campo "Grupo" como combobox (selecionável e adicionável)

Na tela `src/routes/_authenticated/cadastros/procedimentos.tsx`, substituir o `Input` simples do campo **Grupo** (no formulário `ProcForm`) por um combobox baseado em `Command` + `Popover`:

- Lista os grupos já existentes (consulta `distinct grupo from procedimentos`, cacheada via React Query).
- Permite digitar livremente; se o texto não corresponder a nenhum grupo, mostra opção **"Criar grupo: …"** que seta o valor digitado.
- Mesma UX também no filtro do topo da página (filtro por grupo passa a usar o combobox).

Não é necessária mudança de schema — `grupo` continua sendo `text` livre; o combobox apenas reaproveita valores já cadastrados.

## 2. Botão "Importar Excel" na tela de Procedimentos

Botão extra ao lado de **Novo procedimento** (apenas para admin), que abre um `Sheet` lateral com:

**Etapa 1 — Modelo**
- Botão **"Baixar modelo .xlsx"** que gera planilha com cabeçalho fixo e 1 linha de exemplo.
- Colunas obrigatórias:
  `sigla | nome | grupo | tipo | cnpj_empresa | valor_unitario | nomes_alternativos`
  - `tipo`: `exame` ou `consulta`
  - `cnpj_empresa`: apenas dígitos ou formatado — o sistema normaliza
  - `nomes_alternativos`: opcional

**Etapa 2 — Upload + pré-visualização**
- Input de arquivo `.xlsx`.
- Parsing client-side com a lib `xlsx` (SheetJS).
- Tabela de pré-visualização mostrando, por linha:
  - status (✓ válida / ✗ erro com motivo)
  - empresa resolvida (nome fantasia) ou "não encontrada"
  - indicação se será **importada** ou **ignorada (duplicada)**

**Regras de validação (definidas pelo usuário)**:
- Empresa identificada **somente por CNPJ** (busca exata por dígitos).
- Linhas inválidas (CNPJ não encontrado, tipo inválido, valor ≤ 0, sigla/nome vazios) são **listadas como erro e puladas** — as válidas seguem.
- **Duplicado** = mesma `sigla` + `empresa_id` já existe → linha é **ignorada** (mantém cadastro atual, não sobrescreve).
- Grupos novos vindos da planilha são aceitos automaticamente (campo livre).

**Etapa 3 — Confirmação**
- Resumo: `X linhas válidas a importar · Y ignoradas (duplicadas) · Z com erro`.
- Botão **Importar** → `supabase.from("procedimentos").insert([...])` em lote único.
- Após sucesso: toast, invalidação das queries `procedimentos` e `procedimentos-grupos`, e fechamento do Sheet.

## 3. Detalhes técnicos

- Lib nova: `xlsx` (SheetJS) — usada tanto para baixar modelo quanto para parsear upload.
- Novo arquivo: `src/components/procedimentos/import-dialog.tsx` (toda a lógica do Sheet de import).
- Novo arquivo: `src/components/ui/grupo-combobox.tsx` (combobox reaproveitável para o campo grupo, baseado em Command/Popover já existentes).
- Edição: `src/routes/_authenticated/cadastros/procedimentos.tsx` — botão "Importar", uso do combobox no `ProcForm` e no filtro.
- Permissão: import e combobox de criação ficam visíveis apenas quando `isAdmin` (mesma regra do "Novo procedimento"), respeitando as RLS de `procedimentos`.
- Nenhuma migração de banco necessária.

## 4. Fora do escopo

- Importar empresas inexistentes (a planilha precisa referenciar CNPJs já cadastrados).
- Atualizar procedimentos existentes via Excel (duplicados são sempre ignorados).
- Importar via servidor / edge function — todo o parsing roda no browser para feedback imediato; o insert vai direto ao Supabase usando a sessão do usuário.
