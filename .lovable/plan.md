## Causa raiz

As queries da tela de conferência (`src/routes/_authenticated/faturamentos/$empresaId.tsx`) usam embeds do PostgREST (`empresa:empresas(...)`, `autorizacoes(..., pacientes(nome))`) que exigem foreign keys declaradas no banco. Hoje, `faturamentos`, `autorizacoes` e `pacientes` **não têm FKs declaradas** para as tabelas relacionadas — só `itens_autorizacao` tem. O embed falha, a query entra em erro, `data` fica `undefined` e a tela renderiza "Nenhum faturamento encontrado" em vez dos 4 itens pendentes que existem no banco.

## Solução

Adicionar as foreign keys faltantes (correção definitiva — destrava todos os embeds do PostgREST em todo o app, não só este módulo) e tratar erros de query na tela para que falhas futuras não fiquem mais escondidas atrás do estado vazio.

### 1. Migration: adicionar FKs faltantes

Criar uma migration adicionando as constraints abaixo (todas como `ON DELETE RESTRICT` exceto onde indicado, sem alterar dados existentes):

- `faturamentos.empresa_id` → `empresas(id)`
- `faturamentos.iniciado_por` → `usuarios(id)`
- `faturamentos.finalizado_por` → `usuarios(id)`
- `autorizacoes.empresa_id` → `empresas(id)`
- `autorizacoes.ubs_id` → `ubs(id)`
- `autorizacoes.profissional_id` → `profissionais(id)`
- `autorizacoes.paciente_id` → `pacientes(id)`
- `autorizacoes.criado_por` → `usuarios(id)`
- `pacientes.bairro_id` → `bairros(id)`
- `pacientes.povoado_id` → `povoados(id)`
- `pacientes.criado_por` → `usuarios(id)`
- `procedimentos.empresa_id` → `empresas(id)`
- `profissionais.ubs_id` → `ubs(id)`
- `acrescimos_gastos.aprovado_por` → `usuarios(id)`
- `itens_autorizacao.conferido_por` → `usuarios(id)`

Antes de aplicar, validar que não há linhas órfãs (`SELECT … WHERE x_id NOT IN (SELECT id FROM …)`); se houver, a migration aborta com mensagem clara.

### 2. Tornar erros de query visíveis em `$empresaId.tsx`

Hoje o componente trata `data === null` e `data === undefined` da mesma forma. Ajustar para:

- Mostrar uma `Card` de erro com `error.message` quando `query.error` existir, em vez do texto genérico "Nenhum faturamento encontrado".
- Aplicar o mesmo padrão à query de `itens_autorizacao`.

Isso evita que regressões futuras (RLS, embeds quebrados, etc.) voltem a se disfarçar de "lista vazia".

### 3. Verificação

Após a migration e o ajuste de UI:

1. Recarregar `/faturamentos/f667b8d7…?mes=2026-05` — devem aparecer 2 grupos de autorização com 2 itens cada, totais 4 itens / 4 pendentes no painel lateral.
2. Confirmar 1 item → contador de pendentes cai para 3, `valor_confirmado` aumenta.
3. Glosar 1 item com motivo → `valor_glosado` aumenta, badge "Glosado" aparece.

## Detalhes técnicos

- A migration usa `ALTER TABLE … ADD CONSTRAINT … FOREIGN KEY … REFERENCES … NOT VALID` seguido de `VALIDATE CONSTRAINT` apenas se a verificação prévia de órfãos passar — assim a operação é segura mesmo com tabelas grandes.
- Nenhuma alteração em RLS, triggers, enum ou na função `abrir_faturamento` é necessária.
- Os tipos gerados em `src/integrations/supabase/types.ts` serão regenerados automaticamente após a migration; nenhum código de aplicação precisa mudar além do tratamento de erro descrito.