## Diagnóstico curto

- Na preview atual, a sessão do navegador foi redirecionada para `/login`, então não há consulta contínua ao banco antes do login.
- A causa mais provável do “carrega sem parar” dentro das rotas autenticadas é uma combinação de:
  1. inicialização de autenticação sem `try/finally`, podendo deixar `loading=true` se a consulta de perfil falhar ou demorar;
  2. chamadas duplicadas para `refreshUsuario()` entre `getSession()` e `onAuthStateChange`;
  3. várias queries sem `staleTime/enabled` consistente, fazendo refetch a cada remount/navegação;
  4. muitos arquivos de rotas “em breve” carregados no dev preview, o que aumenta o carregamento inicial e parece “histórico/cache longo”, embora não seja loop de banco.

## Plano de correção

1. **Blindar o boot de autenticação**
   - Ajustar `src/hooks/use-auth.ts` para usar `try/finally` no `init()`.
   - Garantir que `loading` sempre vire `false`, mesmo se Supabase/perfil retornar erro.
   - Deduplicar `refreshUsuario()` com uma promise em andamento por `user.id`, evitando duas consultas simultâneas para `usuarios`.
   - Guardar e expor erro de perfil quando necessário, em vez de deixar spinner infinito.

2. **Evitar consultas antes da sessão estar pronta**
   - Revisar hooks críticos que consultam Supabase e adicionar `enabled` baseado em usuário/perfil quando necessário.
   - Garantir que telas internas só iniciem queries depois que o gate autenticado já tiver `usuario` carregado.

3. **Ajustar cache global do React Query**
   - Em `src/router.tsx`, manter `refetchOnWindowFocus: false` e `refetchOnReconnect: false`.
   - Adicionar um `staleTime` padrão moderado para dados administrativos, reduzindo refetch ao trocar de página.
   - Manter retry bloqueado para erros estruturais do Postgres/PostgREST.

4. **Reduzir sensação de reload na navegação**
   - Remover navegação com `<a href>` em áreas internas onde existir, substituindo por `<Link>`/`navigate` para manter navegação client-side.
   - Revisar links dinâmicos dos shells para evitar caminhos montados como string quando houver alternativa tipada.

5. **Tratar o excesso de rotas placeholder**
   - Avaliar consolidar submódulos “em breve” em rotas dinâmicas por secretaria, reduzindo dezenas de arquivos e o carregamento inicial do preview.
   - Não mexer nas rotas reais de Saúde/Autorização de Exames.

6. **Validação**
   - Abrir `/inicio` após login.
   - Navegar entre secretaria, módulo e submódulo.
   - Confirmar no network que não há chamadas repetidas indefinidamente para `usuarios`, `pacientes` ou `permissoes_usuario`.
   - Confirmar que, se o banco falhar, a tela mostra erro/estado vazio em vez de spinner eterno.