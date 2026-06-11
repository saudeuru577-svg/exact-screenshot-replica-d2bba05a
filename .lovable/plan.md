# Corrigir tela de carregamento infinito

## Diagnóstico (confirmado no preview)

Reproduzi o problema: o app fica preso no spinner do gate de autenticação. A causa não é cache — é o bootstrap de autenticação em `src/hooks/use-auth.ts`:

1. **`supabase.auth.getSession()` pode travar indefinidamente** — a biblioteca do Supabase usa um "lock" do navegador compartilhado entre abas/iframes. Com o preview do Lovable aberto em mais de um contexto (editor + aba), o lock fica ocupado e a chamada nunca resolve. Como `loading` só vira `false` depois dela, o spinner nunca sai.
2. **`init()` ainda espera o carregamento do perfil (`refreshUsuario`)** antes de liberar a tela, somando mais um ponto de travamento.
3. **Bug no `signOut()`**: ele remove o listener de auth e marca `initialized: false`, mas o `init()` nunca roda de novo — após sair e logar novamente sem recarregar a página, o estado de auth para de atualizar.
4. O gate (`_authenticated.tsx`) não tem limite de espera — qualquer travamento vira spinner eterno.

## Mudanças

### `src/hooks/use-auth.ts`
- Adicionar timeout de ~4s no `getSession()` (Promise.race). Se estourar, ler a sessão diretamente do `localStorage` como fallback e seguir.
- Garantir `loading: false` assim que a sessão for conhecida — o perfil (`usuario`) carrega em paralelo, sem bloquear a tela.
- Corrigir `signOut()`: manter o listener ativo e não resetar `initialized` (apenas limpar user/session/usuario).

### `src/routes/_authenticated.tsx`
- Adicionar tempo máximo de espera no spinner (~8s). Se estourar, mostrar tela com botões "Tentar novamente" (recarrega) e "Ir para login", em vez de spinner infinito.
- Enquanto `usuario` ainda está carregando (user existe mas perfil não chegou), mostrar spinner curto em vez de "Conta não vinculada" prematuro.

## Detalhes técnicos
- O fallback de sessão lê a chave `sb-<ref>-auth-token` do localStorage e valida expiração, evitando depender do lock do Supabase.
- Nenhuma mudança de backend, rotas ou UI além do estado de erro do gate.
