# Eliminar de vez o travamento do Supabase (lock entre abas)

## O que confirmei agora no preview

Reproduzi: ao abrir o app, **nenhuma requisição ao Supabase é feita** durante o spinner — a biblioteca fica presa antes mesmo de chamar a rede. Depois do timeout de 4s que adicionamos, o app destrava e segue (no meu teste, redirecionou ao login corretamente).

A causa raiz é o **Web Lock do navegador** (`navigator.locks`) que o Supabase usa para sincronizar a sessão entre abas. Com o preview do Lovable aberto no editor + em outra aba/janela, o lock fica ocupado e:

1. `getSession()` trava (já mitigado com o timeout de 4s — por isso ainda há 4s de spinner em todo carregamento);
2. **Todas as queries ao banco também travam**, porque cada query pede o token de sessão através do mesmo lock. É por isso que o perfil (`usuario`) às vezes nunca chega e o spinner persiste mesmo com o fallback.

## Mudança

### `src/integrations/supabase/client.ts`
Configurar o cliente com um **lock "no-op"** (sem Web Locks API):

- Passar `auth.lock: async (_name, _timeout, fn) => fn()` na criação do cliente.
- Isso remove a dependência do `navigator.locks` — sem lock compartilhado, nada trava: `getSession()`, refresh de token e queries respondem imediatamente.
- Trade-off: sem o lock, duas abas podem tentar renovar o token ao mesmo tempo (raro e inofensivo aqui — o Supabase tolera; no pior caso uma aba refaz o login silenciosamente).

### `src/hooks/use-auth.ts` (ajuste pequeno)
- Manter o timeout/fallback como rede de segurança, mas reduzir o timeout de 4s para ~1,5s — com o lock desativado, `getSession()` resolve em milissegundos e o fallback praticamente nunca será usado. O carregamento inicial fica imediato.

## Resultado esperado
- Sem mais spinner de 4s a cada carregamento.
- Queries (perfil, dashboard, etc.) deixam de travar quando o preview está aberto em mais de um contexto.
- A tela de escape de 8s do gate permanece como última defesa.
