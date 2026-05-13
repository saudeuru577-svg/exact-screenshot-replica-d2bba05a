# Plano — Módulo de Faturamento (revisado)

## 1. Banco de dados (migration única)

### 1.1 Enum
```sql
CREATE TYPE public.status_item_faturamento AS ENUM ('pendente','confirmado','glosado');
```

### 1.2 Tabela `motivos_glosa`
- `id` uuid PK, `descricao` varchar(200) UNIQUE, `ativo` bool default true
- `criado_por` uuid, `criado_em` timestamptz default now()
- RLS:
  - select: administrador, secretaria, financeiro
  - insert: administrador, financeiro
  - update: administrador

### 1.3 Tabela `faturamentos` (cabeçalho + totais)
- `id` uuid PK
- `empresa_id` uuid, `mes_referencia` varchar(7)
- `status` varchar CHECK in (`aberto`,`finalizado`,`cancelado`), default `aberto`
- Contadores:
  - `total_itens` int default 0 — COUNT(*)
  - `total_pendentes` int default 0 — COUNT(*) WHERE status_faturamento='pendente'
- Valores monetários:
  - `valor_confirmado` numeric(12,2) default 0 — SUM(valor_total) WHERE status='confirmado'
  - `valor_glosado` numeric(12,2) default 0 — SUM(valor_total) WHERE status='glosado'
- `iniciado_por` uuid NOT NULL, `iniciado_em` timestamptz default now()
- `finalizado_por` uuid, `finalizado_em` timestamptz
- Index único parcial: `(empresa_id, mes_referencia) WHERE status='aberto'` — garante apenas 1 faturamento aberto por empresa/mês.
- RLS:
  - select: administrador, secretaria, financeiro
  - insert/update: administrador, financeiro

> Status armazenado como `varchar` com CHECK para não interferir no enum existente `status_faturamento` usado por `acrescimos_gastos` / `bloquear_edicao_faturamento_fechado`.

### 1.4 Alterações em `itens_autorizacao`
```sql
ALTER TABLE public.itens_autorizacao
  ADD COLUMN status_faturamento status_item_faturamento NOT NULL DEFAULT 'pendente',
  ADD COLUMN motivo_glosa_id   uuid REFERENCES public.motivos_glosa(id),
  ADD COLUMN observacao_glosa  text,
  ADD COLUMN mes_faturamento   varchar(7),
  ADD COLUMN data_conferencia  timestamptz,
  ADD COLUMN faturamento_id    uuid REFERENCES public.faturamentos(id) ON DELETE SET NULL,
  ADD COLUMN conferido_por     uuid;

CREATE INDEX idx_itens_autorizacao_faturamento ON public.itens_autorizacao(faturamento_id);
CREATE INDEX idx_itens_autorizacao_mes ON public.itens_autorizacao(mes_faturamento);
```

### 1.5 Função `abrir_faturamento(p_empresa uuid, p_mes varchar)` (SECURITY DEFINER, idempotente)

Pseudocódigo:
```sql
DECLARE v_existing uuid; v_id uuid;
BEGIN
  -- Permissão
  IF meu_perfil() NOT IN ('administrador','financeiro') THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  -- Idempotência: se já existe aberto, retorna o existente
  SELECT id INTO v_existing
    FROM public.faturamentos
   WHERE empresa_id = p_empresa
     AND mes_referencia = p_mes
     AND status = 'aberto';
  IF FOUND THEN RETURN v_existing; END IF;

  -- Cria o faturamento
  INSERT INTO public.faturamentos (empresa_id, mes_referencia, iniciado_por)
  VALUES (p_empresa, p_mes, auth.uid())
  RETURNING id INTO v_id;

  -- Vincula itens pendentes da empresa/mês ainda não atrelados
  UPDATE public.itens_autorizacao i
     SET faturamento_id = v_id,
         mes_faturamento = p_mes
    FROM public.autorizacoes a
   WHERE i.autorizacao_id = a.id
     AND a.empresa_id = p_empresa
     AND to_char(a.data_autorizacao,'YYYY-MM') = p_mes
     AND a.status IN ('pendente','aprovado')
     AND i.status_faturamento = 'pendente'
     AND i.faturamento_id IS NULL;

  RETURN v_id;
END;
```

### 1.6 Trigger de recálculo em `itens_autorizacao`

`recalc_totais_faturamento()` AFTER INSERT/UPDATE/DELETE. Para cada `faturamento_id` afetado (NEW e/ou OLD, distinct, não nulo):

```sql
UPDATE public.faturamentos f SET
  total_itens       = (SELECT COUNT(*) FROM itens_autorizacao WHERE faturamento_id = f.id),
  total_pendentes   = (SELECT COUNT(*) FROM itens_autorizacao WHERE faturamento_id = f.id AND status_faturamento='pendente'),
  valor_confirmado  = (SELECT COALESCE(SUM(valor_total),0) FROM itens_autorizacao WHERE faturamento_id = f.id AND status_faturamento='confirmado'),
  valor_glosado     = (SELECT COALESCE(SUM(valor_total),0) FROM itens_autorizacao WHERE faturamento_id = f.id AND status_faturamento='glosado')
WHERE f.id = <fid>;
```

## 2. Rotas

```
src/routes/_authenticated/faturamentos/
  index.tsx          -> Lista de empresas
  $empresaId.tsx     -> Conferência
```

## 3. Tela 1 — Lista de Empresas
- Empresas ativas + filtro de mês (default mês atual) + busca por nome.
- Por linha: badge do status (sem faturamento / aberto / finalizado) + contador de pendentes.
- Botão **Conferir faturamento** → chama RPC `abrir_faturamento(empresa, mes)` (idempotente) → navega para `/faturamentos/$empresaId`.

## 4. Tela 2 — Conferência (`/faturamentos/$empresaId`)

Layout grid `lg:grid-cols-[1fr_320px]`.

**Centro** — busca itens via `itens_autorizacao` filtrando por `faturamento_id`, com join em `autorizacoes` (num_aut, paciente, data) e `procedimentos` (nome). Agrupa por `autorizacao_id`. Para cada grupo:
- Cabeçalho: `num_aut`, paciente, data, botão `Confirmar todos`.
- Itens: nome do exame em destaque, paciente abaixo (text-sm muted), valor à direita.
- Botões `Confirmar` / `Glosar` por item + badge de status.

**Painel direito (sticky)** — resumo lido direto de `faturamentos`:
- Empresa, mês.
- Contadores: `total_itens`, conferidos = `total_itens − total_pendentes`, `total_pendentes`.
- Valores: `valor_confirmado`, `valor_glosado`.
- Botão **Parar** (default destacado) → AlertDialog → UPDATE faturamentos SET status='finalizado', finalizado_por=auth.uid(), finalizado_em=now() → redireciona.

Mutations:
- `confirmarItem(itemId)` → status='confirmado', limpa motivo/obs, seta data_conferencia/conferido_por.
- `glosarItem(itemId, motivo, observacao)` → idem com status='glosado'.
- `confirmarTodos(autorizacaoId)` → WHERE autorizacao_id=X AND faturamento_id=Y AND status='pendente'.
- `finalizarFaturamento(id)`.

## 5. Modal — Registrar Glosa
- **Motivo**: Combobox (Command + Popover) sobre `motivos_glosa` ativos. Item "+ Adicionar novo motivo" abre input inline → INSERT e seleciona.
- **Observação**: Textarea.
- Footer: Cancelar / Salvar (disabled se motivo vazio).

## 6. Permissões UI
- Visualizar: administrador, secretaria, financeiro.
- Conferir/glosar/finalizar: administrador, financeiro (botões ocultos via `usePerfil`).

## 7. Detalhes técnicos
- React Query keys: `["faturamento-empresas", mes]`, `["faturamento", id]`, `["faturamento-itens", id]`, `["motivos-glosa"]`.
- Helper `currencyBR` já existe em `src/lib/format.ts` como `brl`.
- Navegação tipada via `<Link to="/_authenticated/faturamentos/$empresaId" params>`.

## 8. Ordem de execução
1. Migration (enum, motivos_glosa, faturamentos com valores monetários, ALTER itens_autorizacao, função idempotente `abrir_faturamento`, trigger de totais, RLS).
2. `index.tsx` — lista + ação Conferir.
3. `$empresaId.tsx` — layout + query agrupada.
4. Mutations confirmar/glosar/confirmar-todos + finalizar.
5. Modal de glosa com combobox + criação inline.
6. QA visual.
