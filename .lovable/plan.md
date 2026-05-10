## Bootstrap do Sistema Municipal de Autorização de Exames

Vou montar a base completa do sistema com autenticação, layout e telas iniciais para todos os módulos do PRD.

### 1. Design System (azul moderno minimalista)

Atualizar `src/styles.css` com tokens em `oklch`:
- **Primary**: azul institucional moderno (~oklch(0.55 0.18 250))
- **Destructive**: vermelho para alertas de limite/saldo crítico
- **Background**: branco puro / cinza muito claro
- Tipografia: Inter (corpo) + um display sóbrio para títulos
- Sombras suaves, bordas finas, muito espaço em branco
- Componentes shadcn já instalados serão reutilizados

### 2. Banco de Dados (migrations)

A maioria das tabelas já existe. Migrations necessárias:
- **Trigger `on_auth_user_created`** em `auth.users` → cria registro espelho em `public.usuarios` (perfil padrão `atendente`, ativo=false até admin liberar)
- **Edge Function `admin-create-user`** (service role) — cria usuário no Auth + insere em `usuarios` com perfil escolhido, chamada apenas pelo admin
- Garantir defaults `atualizado_em` via trigger `set_atualizado_em` nas tabelas faltantes
- Bucket de Storage `autorizacoes` (privado) para PDFs, requisições e assinaturas

### 3. Autenticação

- `src/integrations/supabase/client.ts` (já existe via auto-gen)
- Hook `useAuth` (Zustand) carrega sessão Supabase + perfil da tabela `usuarios` via `meu_perfil()`
- Provider injeta `auth` no router context (isAuthenticated, perfil, hasPerfil)
- Tela `/login` (email + senha)
- Layout `_authenticated` com `beforeLoad` redirecionando para `/login`
- Layouts aninhados por perfil: `_authenticated/_admin`, `_authenticated/_financeiro`, etc.

### 4. Estrutura de Rotas (todas criadas, telas vazias com header/breadcrumb)

```
src/routes/
  __root.tsx                              (já existe)
  login.tsx
  _authenticated.tsx                      (sidebar layout + outlet)
  _authenticated/index.tsx                → /  (redireciona pra dashboard)
  _authenticated/dashboard.tsx
  _authenticated/pacientes/index.tsx
  _authenticated/pacientes/novo.tsx
  _authenticated/pacientes/$id.tsx
  _authenticated/autorizacoes/index.tsx
  _authenticated/autorizacoes/nova.tsx
  _authenticated/autorizacoes/$id.tsx
  _authenticated/acrescimos/novo.tsx
  _authenticated/faturamentos/index.tsx
  _authenticated/relatorios/index.tsx
  _authenticated/cadastros/ubs.tsx
  _authenticated/cadastros/profissionais.tsx
  _authenticated/cadastros/empresas.tsx
  _authenticated/cadastros/procedimentos.tsx
  _authenticated/cadastros/territorio.tsx
  _authenticated/admin/usuarios.tsx
  _authenticated/admin/logs.tsx
```

### 5. Layout Autenticado

- **Sidebar fixa** (shadcn `sidebar`) com navegação filtrada por perfil
- **Header** com nome do usuário, perfil (badge) e logout
- **Breadcrumbs** automáticos
- Cada tela "interna" será criada com cabeçalho + placeholder ("Em construção") e estrutura de container pronta para receber conteúdo nas próximas iterações

### 6. Dashboard (única tela com conteúdo real no bootstrap)

Cards do PRD usando dados reais via `createServerFn`:
- Limite Base (R$ 130.000)
- Acréscimos aprovados no mês
- Limite Atual
- Total Autorizado no Mês
- Saldo Disponível (vermelho se ≤ 10%)
- Tabela: últimas 10 autorizações

### 7. Tela de Admin / Usuários (mínima funcional)

- Lista de `usuarios`
- Botão "Novo usuário" → modal chama edge function `admin-create-user` (email, senha temporária, nome, perfil)
- Toggle ativo/inativo

### Detalhes Técnicos

**Stack adicional a instalar:**
- `zustand` (estado de sessão)
- `react-hook-form` + `zod` + `@hookform/resolvers` (formulários)
- `date-fns` (datas)

**Integração Supabase**: usar o pattern recomendado do TanStack — browser client em componentes/queries, `requireSupabaseAuth` em server functions de leitura, `supabaseAdmin` apenas em edge function para criar usuários.

**Permissões no frontend**: helper `usePerfil()` + componente `<RequirePerfil perfis={[...]}>` para esconder ações; RLS continua como fonte da verdade.

### Fora deste bootstrap (ficará para próximas iterações)
- Formulários completos de cada cadastro
- Geração de PDF + QR Code da autorização
- Assinatura digital em canvas
- Relatórios detalhados e exportação PDF/Excel
- Faturamento e glosas

Após sua aprovação, começo pelas migrations (trigger de signup + edge function) e em seguida monto design system, layout e rotas.
