## Diagnóstico do problema

O comportamento vem de uma combinação de 3 pontos, mas há um causador principal:

1. **Erro 500 real na consulta de pacientes**
   - A requisição atual para `pacientes` está retornando:
     - `stack depth limit exceeded`
     - código Postgres `54001`
   - Isso indica **recursão nas políticas RLS do banco**, não apenas lentidão de frontend.
   - A função `public.meu_perfil()` está definida assim:

```sql
SELECT perfil FROM usuarios WHERE id = auth.uid();
```

   - Só que a tabela `usuarios` também tem políticas RLS que chamam `meu_perfil()` para decidir se o usuário é administrador.
   - Resultado: uma consulta chama a política, a política chama a função, a função consulta `usuarios`, que chama a política de `usuarios`, que chama a função de novo... até estourar a pilha do Postgres.

2. **React Query tenta novamente quando uma query falha**
   - Como a query de pacientes falha com 500, o React Query entra no comportamento padrão de retry.
   - Na preview isso aparece como “carregando dados do banco sem parar”.
   - Não é uma busca infinita normal: é **erro + retentativas automáticas**.

3. **A autenticação reconsulta `usuarios` muitas vezes**
   - O hook `useAuth` consulta `usuarios` no `getSession()` e também no `onAuthStateChange`.
   - O snapshot de rede mostra várias chamadas repetidas para `usuarios` logo após login/navegação.
   - Isso não é o principal erro 500, mas aumenta a sensação de recarregamento e pode provocar mais renderizações.

## Plano de correção

### 1. Corrigir a função `meu_perfil()` no banco
Criar uma migração para transformar `public.meu_perfil()` em uma função **SECURITY DEFINER**, com `search_path` fixo, para que ela consiga ler `public.usuarios` sem disparar novamente as próprias políticas RLS.

Forma esperada:

```sql
CREATE OR REPLACE FUNCTION public.meu_perfil()
RETURNS public.perfil_usuario
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.perfil
  FROM public.usuarios u
  WHERE u.id = auth.uid()
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.meu_perfil() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.meu_perfil() TO authenticated;
```

Isso deve remover a recursão que causa `stack depth limit exceeded`.

### 2. Revisar políticas que consultam `usuarios`
Manter as políticas atuais, mas garantir que qualquer verificação de perfil use a função corrigida.

Pontos sensíveis:
- `usuarios_select`
- `pacientes_select`
- `permissoes_usuario`
- demais tabelas que chamam `meu_perfil()`

Não será necessário criar novas tabelas nem mudar o modelo de perfis agora.

### 3. Reduzir reconsultas repetidas de autenticação no frontend
Ajustar `src/hooks/use-auth.ts` para evitar `refreshUsuario()` duplicado quando Supabase dispara eventos como `INITIAL_SESSION` logo após `getSession()`.

Mudança planejada:
- controlar o último `user.id` carregado;
- não buscar `usuarios` de novo se a sessão for a mesma e o perfil já estiver no estado;
- manter a busca após login/logout funcionando normalmente.

### 4. Ajustar cache/retry das queries críticas
Nos hooks de dados principais, principalmente `usePacientesLista`, configurar retry de forma mais conservadora para erros 500 do banco.

Exemplo de regra:
- não ficar insistindo várias vezes em erro estrutural do banco;
- continuar permitindo refetch manual/navegação normal;
- manter `staleTime` já existente de 5 minutos.

### 5. Validar depois da correção
Após aplicar:
- abrir `/saude/regulacao/autorizacao-exames/pacientes`;
- confirmar que a consulta de pacientes não retorna mais 500;
- navegar entre hub, módulo e submódulo;
- confirmar que não há várias chamadas repetidas para `usuarios` a cada troca de página;
- verificar que o app continua protegendo rotas autenticadas.

## Resultado esperado

- A página não deve mais ficar em carregamento/retry constante.
- A navegação entre páginas deve ser client-side, sem sensação de reload completo.
- As consultas ao banco devem acontecer quando necessário, respeitando cache.
- A autorização por perfil continua funcionando, mas sem recursão no banco.