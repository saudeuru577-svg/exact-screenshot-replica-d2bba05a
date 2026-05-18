## PRD: Consultas e Organização do Banco de Dados

Vou gerar um documento Markdown em `/mnt/documents/prd-banco-de-dados.md` e disponibilizá-lo como artefato para download.

### Estrutura do documento

1. **Sumário Executivo**
   - Visão geral do sistema (SAS — autorizações, faturamento, cadastros)
   - Stack: Supabase (Postgres + Auth + Storage) acessado via cliente JS no frontend TanStack Start
   - Princípios: RLS por perfil, triggers de negócio no Postgres, RPCs para operações sensíveis

2. **Arquitetura de Acesso a Dados**
   - Como o frontend conversa com o banco: `supabase.from(...).select/insert/update/delete` e `supabase.rpc(...)`
   - Cliente: `src/integrations/supabase/client.ts` (publishable key, sessão no localStorage)
   - Autenticação: `useAuth` com `onAuthStateChange` + `getSession`
   - Segurança: toda autorização é decidida pelo Postgres via RLS — o frontend não filtra por perfil
   - Função-chave `public.meu_perfil()` usada em todas as policies
   - Server functions (TanStack) — quando usar vs chamada direta

3. **Organização do Banco**
   - **Diagrama lógico** (ASCII) com agrupamentos:
     - Identidade & Permissões: `usuarios`, `permissoes_usuario`, `logs_auditoria`
     - Cadastros base: `empresas`, `ubs`, `profissionais`, `procedimentos`, `bairros`, `povoados`, `motivos_glosa`
     - Pacientes: `pacientes`
     - Operação: `autorizacoes`, `itens_autorizacao`
     - Financeiro: `faturamentos`, `limites_empresa`, `acrescimos_gastos`
   - Para cada tabela: finalidade, campos-chave, RLS resumida em linguagem natural (quem vê / cria / edita / apaga)
   - Enums usados (`perfil_usuario`, `status_autorizacao`, `status_acrescimo`, `escopo_acrescimo`, `status_item_faturamento`, etc.)

4. **Regras de Negócio no Banco (Funções e Triggers)**
   - `meu_perfil()` — base das RLS
   - `handle_new_auth_user()` — provisiona linha em `usuarios` ao criar conta
   - `gerar_num_aut()` — gera número sequencial AUTYYYY####
   - `atualizar_total_autorizacao()` — recalcula `total_autorizado`
   - `verificar_limite_mensal()` — bloqueia autorização que estoura limite total ou da empresa, considerando `limites_empresa` + `acrescimos_gastos`
   - `acrescimo_auto_aprovar()` — aprovação automática
   - `recalc_totais_faturamento()` — totais por faturamento
   - `abrir_faturamento(empresa, mes)` — RPC `SECURITY DEFINER` que cria/recupera faturamento e vincula itens
   - `bloquear_edicao_autorizacao_aprovada`, `bloquear_alteracao_data_autorizacao`, `bloquear_edicao_faturamento_fechado` — guardas + logs
   - `rls_auto_enable` — event trigger que liga RLS em novas tabelas
   - `set_atualizado_em` — timestamp

5. **Mapa de Consultas por Tela**
   Tabela com: Tela / Rota / Tabelas e RPCs usadas / Tipo de operação. Cobertura:
   - Dashboard (`/dashboard`)
   - Autorizações: lista, nova, detalhe, editar (`autorizacoes`, `itens_autorizacao`, `vw_orcamento_mes_atual`, `gerar_num_aut`, Storage `autorizacoes`)
   - Pacientes: lista, novo, detalhe
   - Cadastros: empresas (+ `limites_empresa` via diálogo), UBS, profissionais, procedimentos (+ import), território (bairros/povoados)
   - Acréscimos: novo (consulta de limites e gastos, insert em `acrescimos_gastos`)
   - Faturamentos: index + por empresa (RPC `abrir_faturamento`, leitura de `faturamentos` e `itens_autorizacao`)
   - Relatórios (pacientes/procedimentos)
   - Admin: usuários, logs

6. **Padrões de Consulta**
   - Listagens: `select("*").order(...)` com filtros via `.eq/.ilike/.in`
   - Joins implícitos via select embed (`itens_autorizacao(*, procedimento:procedimentos(...))`)
   - Storage: bucket privado `autorizacoes` para PDFs/QRs
   - Tratamento de erro padrão (toast + early return)
   - Quando usar `.maybeSingle()` vs `.single()`

7. **Segurança e Auditoria**
   - RLS em todas as tabelas de `public`
   - Política especial em `logs_auditoria` (insert `false`, leitura só admin) — escrita só por triggers `SECURITY DEFINER`
   - Storage privado, URLs assinadas
   - RPCs `SECURITY DEFINER` revogadas de `anon`/`public`

8. **Apêndices**
   - Glossário de enums e seus valores
   - Lista completa de RLS por tabela (já em linguagem natural)
   - Convenções de nomenclatura (snake_case, `criado_em`/`atualizado_em`, `criado_por` = `auth.uid()`)

### Entrega

- Arquivo: `/mnt/documents/prd-banco-de-dados.md`
- Tag `<presentation-artifact>` ao final para download.
- Sem alterações de código no projeto.