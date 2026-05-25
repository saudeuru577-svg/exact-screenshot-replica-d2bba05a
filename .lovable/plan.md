## Contexto

O projeto **já usa `useQuery` em todas as telas** — não há `useEffect + supabase.from()` para refatorar. O ganho real está em:

- **Eliminar duplicação**: `["ubs"]`, `["empresas"]`, `["procedimentos"]`, `["bairros"]`, `["povoados"]` aparecem em 3+ telas, cada uma com `select` e ordenação levemente diferentes.
- **Aplicar `staleTime`**: hoje quase nenhuma query define `staleTime`, então toda navegação dispara refetch em background — desperdício de rede no Supabase.
- **Padronizar `queryKey`** com filtros estruturados.
- **Co-localizar mutations** (insert/update/delete) com `invalidateQueries` consistente.

UI, layout e regras de negócio permanecem **intocados**.

## Política de staleTime

| Volatilidade | staleTime | Recursos |
|---|---|---|
| Alta (muda no dia-a-dia) | **60s** | `autorizacoes`, `faturamentos`, `itens_autorizacao`, `acrescimos_gastos`, `vw_orcamento_mes_atual`, dashboard |
| Média (semi-estática) | **5min** | `pacientes`, `empresas`, `profissionais`, `usuarios`, `limites_empresa`, `limites_globais` |
| Baixa (quase estática) | **30min** | `ubs`, `procedimentos`, `bairros`, `povoados`, `motivos_glosa` |

## Convenção dos hooks

```
src/hooks/queries/use-<recurso>.ts
```

Cada arquivo exporta:
- `<recurso>Keys` — fábrica de queryKeys (padrão TanStack):
  ```ts
  export const ubsKeys = {
    all: ['ubs'] as const,
    list: (filters?: UbsFilters) => [...ubsKeys.all, 'list', filters ?? {}] as const,
    detail: (id: string) => [...ubsKeys.all, 'detail', id] as const,
  };
  ```
- `use<Recurso>(filters?)` — hook tipado `useQuery<Row[]>`
- `use<Recurso>Mutations()` (quando aplicável) — `create/update/delete` com `invalidateQueries({ queryKey: <recurso>Keys.all })`

Tipos derivados de `Database['public']['Tables'][...]['Row']` do `src/integrations/supabase/types.ts`.

## Ordem de execução (uma tela por vez)

Cada item é um commit isolado e testável. Telas de cadastro primeiro (mais simples, validam o padrão), depois fluxos complexos.

```text
Fase 1 — Recursos compartilhados quase estáticos (30min)
  1. use-ubs              → ubs.tsx, profissionais.tsx, autorizacoes/nova.tsx
  2. use-procedimentos    → procedimentos.tsx, autorizacoes/nova.tsx, $id.editar.tsx, relatorios/shared.tsx
  3. use-territorio       → cadastros/territorio.tsx (bairros/povoados unificados)
  4. use-bairros, use-povoados → paciente-form.tsx

Fase 2 — Recursos semi-estáticos (5min)
  5. use-empresas         → empresas.tsx, procedimentos.tsx, faturamentos/index.tsx, acrescimos/novo.tsx, autorizacoes/nova.tsx
  6. use-profissionais    → profissionais.tsx, autorizacoes/nova.tsx
  7. use-pacientes        → pacientes/index.tsx, pacientes/$id.tsx, autorizacoes/nova.tsx (busca)
  8. use-usuarios         → admin/usuarios.tsx
  9. use-limites          → limites-dialog.tsx, acrescimos/novo.tsx, dashboard.tsx (limites_globais + limites_empresa)

Fase 3 — Recursos voláteis (60s)
  10. use-autorizacoes    → autorizacoes/index.tsx ✅, $id.tsx ✅, $id.editar.tsx ✅
  11. use-itens-autorizacao → $id.tsx ✅, $id.editar.tsx ✅, faturamentos/$empresaId.tsx ✅
  12. use-faturamentos    → faturamentos/index.tsx ✅, $empresaId.tsx ✅
  13. use-acrescimos + use-orcamento → acrescimos/novo.tsx ✅
  14. use-dashboard       → dashboard.tsx ✅
  15. use-motivos-glosa   → faturamentos/$empresaId.tsx ✅
```

## Plano por tela (template repetido)

Para **cada** tela acima:

1. **Identificar** todas as `useQuery` inline e suas `queryFn`.
2. **Criar/estender** o(s) hook(s) em `src/hooks/queries/use-<recurso>.ts` com:
   - Tipos importados de `Database['public']['Tables'][...]['Row']`
   - `queryKey` via fábrica de keys
   - `queryFn` extraída literalmente (mesma `select`, mesmo `order`, mesmo filtro)
   - `staleTime` conforme tabela acima
3. **Substituir na tela** o `useQuery({...})` inline por `useRecurso(filters)`.
4. **Mutations**: substituir `supabase.from().insert/update/delete` envolvido em `useMutation` por `useRecursoMutations()`, mantendo `onSuccess`/`onError` da tela (toasts permanecem na tela — UI intacta).
5. **Verificar**: a tela continua renderizando idêntica; `isLoading`, `isError`, `data` mantêm os mesmos nomes locais.

## Regras invioláveis

- **NÃO** alterar JSX, classes Tailwind, textos, ordem de campos, mensagens de toast.
- **NÃO** alterar `signature-pad`, `signed URL` effects, debounce, hidratação de form — esses `useEffect` ficam como estão.
- **NÃO** consolidar queries que parecem iguais mas têm `select` diferente sem revisar (ex.: `empresas` é lido com 3 projeções distintas) — o hook aceita parâmetro `select`/`fields` quando necessário, ou expõe variantes (`useEmpresasResumo`, `useEmpresasCompleto`).
- **Manter** `formatSupabaseError` em todos os `onError` existentes.
- **TypeScript estrito**: nada de `any`; todo `useQuery<T>` tipado.

## Entregáveis por iteração

Quando aprovado, vou implementar **uma fase por vez** (ou sob demanda, tela a tela), e em cada iteração eu mostro:

- Arquivo(s) novo(s) em `src/hooks/queries/`
- Diff da tela (somente camada de dados)
- Confirmação de que `bun run build` passa sem erros TS

## Fora de escopo

- Migrar para `ensureQueryData` + `useSuspenseQuery` em loaders de rota (mudança maior; pode virar plano separado).
- Refatorar os `useEffect` legítimos (signed URLs, debounce, hidratação).
- Mexer em `useMutation` que não consome dado de tabela (ex.: chamadas RPC, edge functions).
