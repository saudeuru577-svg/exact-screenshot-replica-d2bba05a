## Problema

A trigger `verificar_limite_mensal` usa `uuid_nil()` (da extensão `uuid-ossp`), que não está disponível no schema `public`. Quando o INSERT em `autorizacoes` dispara a trigger, o Postgres falha com `function uuid_nil() does not exist`.

```sql
AND id <> COALESCE(NEW.id, uuid_nil())
```

## Correção

Migration única que recria a função `verificar_limite_mensal` substituindo `uuid_nil()` por `'00000000-0000-0000-0000-000000000000'::uuid` (literal equivalente, sem dependência de extensão). Mantém todo o resto da lógica idêntico (limite base 130k, soma de acréscimos aprovados, bloqueio automático ao exceder).

Nenhuma alteração de código frontend é necessária — o fluxo de submit em `autorizacoes/nova.tsx` já trata o status `bloqueado` retornado pela trigger.

## Próximo passo

Aprovar a migration para eu executá-la.