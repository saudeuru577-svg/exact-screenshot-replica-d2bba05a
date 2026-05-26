## Objetivo

Reconhecer o app atual como submódulo **Autorização de Exames** dentro de **Saúde › Central de Regulação** da plataforma Cidade Presente, sem tocar na lógica de negócio nem nos componentes visuais internos das telas existentes.

## Decisões aprovadas

- **Escopo:** re-prefixar rotas e adaptar a sidebar (não construir os 9 módulos agora).
- **Perfis:** adicionar `regulador` e `profissional_ubs` ao enum, mantendo os atuais.
- **Visual:** aplicar paleta institucional Cidade Presente (Institutional Blue, neutros, 8pt grid, microcopy respeitosa) apenas no shell — telas internas permanecem como estão.

## Resultado esperado

```
URL:    /saude/regulacao/autorizacao-exames/<tela-atual>
Shell:  [Header Saúde] [Breadcrumb: Saúde > Central de Regulação > Autorização de Exames]
        [Sidebar SIGESA com 'Central de Regulação' aberta e 'Autorização de Exames' ativo]
        [Conteúdo das telas existentes, intacto]
Acesso: apenas perfis regulador e profissional_ubs (admin mantém acesso total)
```

## Tarefas

### 1. Banco — adicionar perfis Regulador e Profissional de UBS
- Migration: `ALTER TYPE` do enum de perfil (ou app_role) para incluir `regulador` e `profissional_ubs`.
- Não migrar usuários existentes automaticamente; admin atribui depois pela tela `/admin/usuarios`.
- **Esperado:** tipos regenerados; nenhum dado quebrado; novos perfis selecionáveis no formulário de usuário.

### 2. Tipos e telas — refletir novos perfis
- Atualizar `PerfilUsuario` em `src/hooks/use-auth.ts` (`"regulador" | "profissional_ubs"`).
- Atualizar `PERFIL_LABEL` em `_authenticated.tsx` e qualquer select de perfil em `admin/usuarios.tsx` e `permissoes-dialog.tsx`.
- **Esperado:** zero erros de tipo após `tsc`.

### 3. Mapa de permissões do submódulo (`src/lib/telas.ts`)
- Definir constante única `PERFIS_AUT_EXAMES = ["administrador", "regulador", "profissional_ubs"]`.
- Atualizar `perfisPadrao` de todas as TELAS do submódulo (dashboard, pacientes, autorizações, acréscimos, faturamentos, relatórios, cadastros, admin) usando essa constante + admin onde fizer sentido.
- Reescrever as `key`s das telas com o novo prefixo `/saude/regulacao/autorizacao-exames/...`.
- **Esperado:** `temAcessoFinal` continua funcionando; perfis legados (`secretaria`, `atendente`, `financeiro`) deixam de ter acesso por padrão (podem ser concedidos via overrides em `permissoes_usuario`).

### 4. Re-prefixar rotas para `/saude/regulacao/autorizacao-exames/*`
- Renomear a pasta `src/routes/_authenticated/` → `src/routes/_authenticated/saude/regulacao/autorizacao-exames/` (mantendo a subárvore intacta: `dashboard.tsx`, `pacientes/`, `autorizacoes/`, `acrescimos/`, `faturamentos/`, `cadastros/`, `relatorios/`, `admin/`).
- Atualizar cada `createFileRoute("/_authenticated/...")` para a nova string completa.
- Atualizar `src/routes/index.tsx` → redirect para `/saude/regulacao/autorizacao-exames/dashboard`.
- Atualizar **todos** os `<Link to=...>` e `navigate({ to: ... })` (rg-search em `src/`) para os novos paths.
- Não editar `routeTree.gen.ts` (regenerado).
- **Esperado:** app abre em `/saude/regulacao/autorizacao-exames/dashboard`; nenhum 404 ao navegar.

### 5. Layout institucional do submódulo
- Criar `src/routes/_authenticated/saude.tsx` como layout pathless intermediário com `<Outlet />` (futuro espaço para header do módulo Saúde).
- Criar `src/routes/_authenticated/saude/regulacao/autorizacao-exames/route.tsx` como layout do submódulo, contendo:
  - **Header do módulo:** faixa superior "SAÚDE · Central de Regulação" com Institutional Blue (`--primary` em tom institucional, definido em `src/styles.css`).
  - **Breadcrumb:** `Saúde > Central de Regulação > Autorização de Exames` (componente novo `src/components/layout/breadcrumb.tsx` baseado no shadcn breadcrumb existente).
  - **Sidebar adaptada:** reaproveitar `_authenticated.tsx` mas reorganizar o NAV em duas seções: "Central de Regulação" (Dashboard, Pacientes, Autorizações, Acréscimos) e "Apoio" (Faturamentos, Relatórios, Cadastros, Administração). Topo da sidebar passa a mostrar "SIGESA · Saúde" no lugar de "SISMUNA".
  - `<Outlet />` para conteúdo.
- Mover o conteúdo de gate (loading, conta não vinculada/inativa) de `_authenticated.tsx` para um helper compartilhado; `_authenticated.tsx` continua apenas como gate de auth.
- **Esperado:** todas as telas existentes renderizam dentro do novo shell, sem alteração visual interna.

### 6. Tokens visuais Cidade Presente
- Em `src/styles.css`: adicionar/ajustar tokens `--sigesa-primary` (Institutional Blue em oklch), `--sigesa-surface`, `--sigesa-muted`, espaçamentos múltiplos de 8px se necessário.
- Aplicar apenas no header do módulo e na barra ativa da sidebar. **Não tocar** nos tokens globais usados pelas telas internas.
- **Esperado:** identidade visual institucional visível só no shell.

### 7. Verificação
- `bunx tsc --noEmit` → 0 erros.
- Smoke manual via preview: login → redireciona para `/saude/regulacao/autorizacao-exames/dashboard`; cada item da sidebar abre a tela correta; breadcrumb correto; usuário com perfil `regulador` vê tudo; usuário sem perfil é barrado.
- Console e network sem regressões.

## Fora de escopo (explícito)

- Construir os outros 8 módulos do Cidade Presente.
- Refatorar componentes internos das telas (Pacientes, Autorizações, etc.).
- Migrar usuários existentes para os novos perfis automaticamente.
- Mover lógica para outro projeto Lovable.
