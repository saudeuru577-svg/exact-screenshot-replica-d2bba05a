## Tela de Relatórios

Substituir o placeholder de `/relatorios` por uma tela com 4 relatórios em abas, filtros, tabelas paginadas e exportação para `.xlsx` e `.pdf`.

### Estrutura

- Rota: `src/routes/_authenticated/relatorios/index.tsx` (substitui o `ComingSoon`).
- Layout: `PageHeader` + `PageBody` com `Tabs` horizontais (4 abas) — padrão já usado no resto do app.
- Cada aba é um componente isolado em `src/components/relatorios/`:
  - `aut-por-procedimento.tsx` (R1)
  - `fat-por-procedimento.tsx` (R2)
  - `aut-nominal.tsx` (R3)
  - `fat-nominal.tsx` (R4)
- Subcomponentes compartilhados:
  - `filtros-bar.tsx` — barra superior colapsável com inputs de filtro + botões "Aplicar" / "Limpar".
  - `export-buttons.tsx` — botões "Exportar XLSX" e "Exportar PDF".
  - `paciente-combobox.tsx` — busca server-side em `pacientes` (nome/CPF/cartão SUS).
  - `empresa-select.tsx` — lista empresas ativas.
  - `procedimento-combobox.tsx` — busca em `procedimentos` por código/descrição.

### Filtros por relatório

| Relatório | Período | Mês/Ano | Paciente | Empresa | Procedimento |
|---|---|---|---|---|---|
| R1 Aut. por proced. | ✓ | — | ✓ | ✓ | — |
| R2 Fat. por proced. | — | ✓ | ✓ | ✓ | ✓ |
| R3 Aut. nominal | ✓ | — | ✓ | ✓ | — |
| R4 Fat. nominal | — | ✓ | ✓ | ✓ | ✓ |

Estado dos filtros: `useState` local em cada aba, aplicado só ao clicar em "Aplicar" (evita refetch a cada digitação). "Limpar" zera o formulário.

### Queries (Supabase client direto, com RLS)

- **R1**: `itens_autorizacao` join `autorizacoes!inner` + `procedimentos`, filtrado por `data_autorizacao` (período), `paciente_id`, `empresa_id`. Agregação client-side por `procedimento_id` → `{ proced, código, total, % }`.
- **R2**: `itens_autorizacao` filtrado por `mes_faturamento` + `status_faturamento='confirmado'`, join `procedimentos`, filtros opcionais. Agregação client-side por procedimento → `{ proced, código, qtd, valor }`.
- **R3**: `autorizacoes` + embed `pacientes(nome, cartao_sus)` + `itens_autorizacao(*, procedimentos(nome, sigla))`, filtros de período/paciente/empresa. Renderiza como `Accordion` agrupado por autorização.
- **R4**: igual R3 mas filtrado por `itens_autorizacao.mes_faturamento` (= competência) e `status_faturamento='confirmado'`; mostra valores unitário/total.

Cada query usa `useQuery` com `queryKey` = `[relatorio, filtrosAplicados]`. Limite 1000 linhas (limite Supabase) — já cobre o caso de uso; adicionar nota se ultrapassar.

### Tabelas

- Componente `Table` shadcn já existente.
- Ordenação client-side por coluna (clique no `TableHead` alterna asc/desc).
- Paginação client-side (50/página) com `Pagination` shadcn. Total de registros visível no rodapé.
- Estados: `<Loader2 />` para loading, mensagem para vazio, `Card` destrutivo para erro (mesmo padrão de `$empresaId.tsx`).

### Exportação

- `xlsx` via `xlsx` (SheetJS) — adicionar dep `bun add xlsx`.
- `pdf` via `jspdf` + `jspdf-autotable` — `bun add jspdf jspdf-autotable`.
- Funções utilitárias em `src/lib/relatorio-export.ts`: `exportarXlsx(nome, headers, rows)` e `exportarPdf(titulo, headers, rows, metadata)`.
- Para R3/R4 (agrupado): exportar como tabela achatada com colunas extras (Nº Aut., Paciente, Data).

### Permissões

Todos os perfis com acesso a `autorizacoes`/`faturamentos` veem a tela. Sem mudanças de RLS necessárias.

### Detalhes técnicos

- Sem mudanças de banco — todas as queries usam tabelas/embeds existentes (FKs já foram adicionadas em migration anterior).
- Formato de moeda/datas via `src/lib/format.ts` (já existente).
- Responsivo: filtros viram coluna em `< md`, tabelas com `overflow-auto`.
- Sem alterações em `routeTree.gen.ts` (apenas substituição do componente da rota existente).

### Verificação

1. Abrir `/relatorios` → 4 abas visíveis.
2. R1: aplicar período do mês corrente → tabela com totais por procedimento bate com soma manual no banco.
3. R2: selecionar competência atual → linhas só de itens confirmados.
4. R3/R4: accordion expande mostrando itens da autorização.
5. Exportar XLSX e PDF de cada relatório e abrir os arquivos.