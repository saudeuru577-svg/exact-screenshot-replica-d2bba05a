## Objetivo

Confirmar que a refatoração das Fases 1–3 dos hooks `src/hooks/queries/*` não introduziu erros de TypeScript, falhas de build, nem warnings em runtime.

## Passos

1. **Typecheck estrito**
   - Rodar `bunx tsc --noEmit` para validar o projeto inteiro contra `tsconfig.json` (strict: true).
   - Foco esperado: arquivos refatorados (`src/routes/_authenticated/**` e `src/hooks/queries/*`) — projeções com `as unknown as`, payloads de mutation e chaves de query.

2. **Lint**
   - Rodar `bunx eslint .` para capturar imports não usados, hooks-rules e regras do `eslint.config.js` (inclui `no-restricted-imports` para `server-only`).
   - Tratar warnings como sinais — corrigir os relevantes à refatoração.

3. **Build de produção**
   - Rodar o build oficial do template (Vite + TanStack Start) e observar a saída por erros e warnings (resolução de imports, código morto, chunks).

4. **Smoke runtime no preview**
   - Abrir o preview (`/dashboard`, `/autorizacoes`, `/autorizacoes/$id`, `/autorizacoes/$id/editar`, `/faturamentos`, `/faturamentos/$empresaId`, `/acrescimos/novo`, `/cadastros/*`, `/pacientes`, `/pacientes/$id`, `/admin/usuarios`, `/relatorios`).
   - Para cada rota, ler `console logs` e `network requests` do preview, checando:
     - Ausência de erros React Query (queries duplicadas, keys instáveis).
     - Ausência de warnings "Each child should have a unique key", "Cannot update state on unmounted component", etc.
     - Requisições Supabase retornando 200 e somente as colunas projetadas.

5. **Relatório**
   - Consolidar resultados em um resumo: comandos rodados, contagem de erros/warnings, telas verificadas e quaisquer correções pontuais necessárias.
   - Se houver problema, abrir tarefa de correção e tratar antes de fechar.

## Notas técnicas

- Pular checagens fora do escopo da refatoração (ex.: avisos pré-existentes em `src/components/ui/*`), mas registrá-los.
- Não alterar comportamento — apenas corrigir tipos/imports se aparecerem regressões diretamente ligadas aos hooks novos.
- Caso `tsc`/`eslint`/build acuse erro em arquivo refatorado, aplicar correção mínima (ajuste de tipo do projection, chave de invalidação, import faltante) e re-rodar o passo correspondente.
