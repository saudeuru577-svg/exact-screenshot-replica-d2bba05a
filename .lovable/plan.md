# Plano de endurecimento — 5 falhas identificadas

Trataremos as 5 falhas em ordem de risco. Cada item tem causa, correção e impacto.

---

## 1. Limite de R$130.000 hardcoded no trigger (risco operacional alto)

**Onde:** `verificar_limite_mensal()` (variável `v_limite_base`) e também no frontend (`src/routes/_authenticated/dashboard.tsx`, constante `LIMITE_BASE`).

**Correção:**
- Criar tabela `configuracoes_sistema` (chave/valor) ou `limites_globais (mes_referencia, valor_base)` com RLS: SELECT para todos os perfis logados, INSERT/UPDATE só administrador.
- Migrar o valor atual (130000) como linha-base "default".
- Reescrever `verificar_limite_mensal()` para ler o limite via `SELECT valor FROM limites_globais` (com fallback para o default mais recente).
- Dashboard passa a buscar o limite da tabela em vez de usar a constante.
- Bônus: tela admin simples para editar o limite (fora do escopo deste plano se preferir).

---

## 2. Status "bloqueado" silencioso (risco UX/dados)

**Onde:** `verificar_limite_mensal()` faz `NEW.status := 'bloqueado'` em vez de `RAISE EXCEPTION`. O insert "sucede" e o frontend mostra toast de sucesso.

**Correção (duas camadas):**
- **Backend:** manter o comportamento de gravar como `bloqueado` (útil para auditoria) **mas** sinalizar claramente — adicionar uma coluna `motivo_bloqueio TEXT` preenchida pelo trigger ("Limite mensal total excedido" / "Limite da empresa excedido").
- **Frontend:** após cada `insert/update` em `autorizacoes`, checar `data.status === 'bloqueado'` e exibir `toast.warning("Autorização registrada como BLOQUEADA: " + motivo_bloqueio)` em vez do toast de sucesso. Locais: `autorizacoes/nova.tsx` e `autorizacoes/$id.editar.tsx`.

---

## 3. Perfil arbitrário via `raw_user_meta_data` (risco de privilege escalation)

**Onde:** `handle_new_auth_user()` faz `COALESCE((NEW.raw_user_meta_data->>'perfil')::perfil_usuario, 'atendente')`. Qualquer signup direto via API pode injetar `perfil: "administrador"`.

**Correção:**
- Reescrever o trigger para **ignorar** o campo `perfil` do metadata e sempre criar com `'atendente'` + `ativo = false`.
- A única forma legítima de definir perfil/ativo passa a ser pela edge function `admin-create-user` (que já valida que o caller é administrador) — ela faz `INSERT` direto na tabela `usuarios` com service role, OU faz `UPDATE` após o trigger (já é o caso atualmente).
- Garantir que signup público esteja desabilitado no Supabase Auth, ou que a UI de login não exponha cadastro.

---

## 4. Sessão em `localStorage` (risco XSS)

**Onde:** `src/integrations/supabase/client.ts` usa `storage: localStorage`.

**Trade-off honesto:** o Supabase JS SDK não suporta cookies httpOnly diretamente no client browser (precisaria de SSR auth helpers). Opções realistas:
- **A (mínimo):** manter `localStorage` mas reduzir TTL do refresh token no painel Supabase + endurecer CSP no `__root.tsx` (`Content-Security-Policy` restritivo bloqueando inline scripts de terceiros) para mitigar XSS.
- **B (mais robusto):** migrar para auth via cookies usando `@supabase/ssr` + middleware TanStack — refactor maior, ~1 dia de trabalho.

Recomendo **A agora** + ticket para B. Esta fase do plano implementa CSP + revisão de `dangerouslySetInnerHTML` (não há uso atualmente — verificado).

---

## 5. Mensagens de erro do banco expostas via `toast.error(e.message)` (vazamento de info)

**Onde:** ~30 ocorrências de `toast.error(e.message)` / `toast.error((e as Error).message)` em todas as rotas autenticadas. Mensagens cruas tipo `new row violates row-level security policy for table "x"` ou `duplicate key value violates unique constraint` chegam ao usuário.

**Correção:**
- Criar helper `src/lib/format-error.ts` com `formatSupabaseError(e: unknown): string` que:
  - Mapeia códigos PostgREST/Postgres conhecidos (`23505` → "Registro duplicado", `23503` → "Referência inválida", `42501`/`PGRST301` → "Sem permissão para esta ação", `P0001` → extrai só a parte após `:` para regras de negócio CA1/CA2/etc).
  - Para erros desconhecidos: retorna "Não foi possível concluir a operação. Tente novamente." e faz `console.error(e)` para diagnóstico.
- Substituir todos os `toast.error(e.message)` por `toast.error(formatSupabaseError(e))`.

---

## Ordem de execução proposta

1. Migração SQL única (itens 1, 2, 3): tabela `limites_globais`, coluna `motivo_bloqueio`, novo `handle_new_auth_user`, novo `verificar_limite_mensal`.
2. Helper `format-error.ts` + substituição em massa (item 5).
3. Frontend: dashboard lê `limites_globais`, telas de autorização checam status bloqueado (itens 1, 2).
4. CSP no `__root.tsx` (item 4-A).

## Detalhes técnicos

```sql
-- Item 1
CREATE TABLE limites_globais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mes_referencia text NOT NULL UNIQUE, -- 'default' ou 'YYYY-MM'
  valor numeric(12,2) NOT NULL,
  criado_em timestamptz DEFAULT now()
);
INSERT INTO limites_globais (mes_referencia, valor) VALUES ('default', 130000);

-- Item 2
ALTER TABLE autorizacoes ADD COLUMN motivo_bloqueio text;

-- Item 3 — substitui handle_new_auth_user para sempre 'atendente' + ativo=false
```

## Itens explicitamente fora do escopo

- Migração completa para auth por cookie httpOnly (fica como ticket separado).
- UI administrativa para editar `limites_globais` (pode ser feita depois — por ora se edita via SQL).

Confirma que sigo com a implementação nesta ordem?
