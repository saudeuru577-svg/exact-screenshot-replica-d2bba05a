# Plano — Nova Autorização e Solicitar Acréscimo

Duas telas que fecham o fluxo operacional: emissão de autorização (núcleo do sistema) e o pedido de acréscimo de limite mensal (válvula de escape quando o teto de R$ 130k é atingido).

---

## 1. Nova Autorização — `/autorizacoes/nova`

### 1.1 Arquitetura
Wizard de 4 etapas controlado por estado local (`useState` + `zod` por etapa). Sem persistência intermediária no banco — só grava ao confirmar a última etapa, em transação lógica orquestrada pelo client.

```
Etapa 1: Paciente   →  Etapa 2: Origem (UBS/Profissional/Requisição)
Etapa 3: Itens      →  Etapa 4: Confirmação (assinaturas + PDF/QR)
```

Componentes novos:
- `src/components/autorizacoes/wizard.tsx` — shell com `Stepper`, navegação, validação por etapa, estado consolidado.
- `src/components/autorizacoes/step-paciente.tsx`
- `src/components/autorizacoes/step-origem.tsx`
- `src/components/autorizacoes/step-itens.tsx`
- `src/components/autorizacoes/step-confirmacao.tsx`
- `src/components/autorizacoes/signature-pad.tsx` — canvas de assinatura (mouse/touch) com clear/undo, exporta PNG.
- `src/components/autorizacoes/orcamento-banner.tsx` — saldo do mês via `vw_orcamento_mes_atual`.
- `src/lib/autorizacao-pdf.ts` — geração de PDF (`pdf-lib`) + QR (`qrcode`) puro JS.
- `src/lib/autorizacao-storage.ts` — upload helpers para o bucket `autorizacoes`, com cleanup em falha.

### 1.2 Etapa 1 — Paciente
- Combobox de busca (`ilike` em nome / nome_da_mae / cartao_sus, debounce 300ms, limit 20).
- Card com dados do paciente selecionado (nome, DTN/idade, mãe, SUS, zona, endereço resumido).
- Botão "Cadastrar novo paciente" abre o `PacienteForm` em Sheet (reaproveita `src/components/pacientes/paciente-form.tsx`); ao salvar, seleciona automaticamente.
- Validação: `paciente_id` obrigatório.

### 1.3 Etapa 2 — Origem
Campos:
- `ubs_id` (Select de `ubs` ativas, ordenado por `nome_posto`).
- `profissional_id` (Select filtrado por `ubs_id` selecionada — query `from('profissionais').eq('ubs_id', ubsId)`).
- `data_autorizacao` (default hoje; bloquear futura; permitir até N dias retroativos — confirmar regra, default 30).
- `sintomas` (Textarea opcional, ≤500).
- `foto_requisicao` (upload de imagem/PDF; preview inline; opcional no schema mas recomendado obrigatório por UX — confirmar).

Validação Zod: `ubs_id`, `profissional_id`, `data_autorizacao` obrigatórios.

### 1.4 Etapa 3 — Itens
- Select de `empresa_id` (apenas `ativa=true` com contrato vigente).
- Tabela editável de itens. Linha: Procedimento (combobox filtrado por `empresa_id` + `ativo=true`), Descrição (auto-preenche com `nome` do procedimento, editável), Quantidade (int ≥1), Valor unitário (preenche com `procedimentos.valor_unitario`, **editável** ou bloqueado — decidir; default: bloqueado para preservar tabela), Valor total (calculado `qtd * vu`), botão remover.
- Botão "+ Adicionar item".
- Footer com `total_autorizado` em destaque + componente `OrcamentoBanner` mostrando: limite do mês, gasto até agora, saldo, e projeção `saldo - total_autorizado` com aviso visual quando ficar negativo ("Será criada como **bloqueada** — solicite acréscimo").
- Validação: ≥1 item; `quantidade>0`; `valor_total = quantidade*valor_unitario` (recalcular no submit, não confiar no input); todos os procedimentos da mesma `empresa_id` (garantido pelo filtro).
- Trocar de empresa com itens preenchidos → confirm dialog (limpa itens).

### 1.5 Etapa 4 — Confirmação
- Resumo read-only de tudo.
- Dois `SignaturePad`: assinatura do atendente, assinatura do paciente. Validação: ambos não vazios (heurística: bounding box > X px).
- Botão "Emitir autorização" dispara o submit.

### 1.6 Submit — sequência atômica (best-effort)
A SDK do Supabase não oferece transação multi-tabela + Storage. Estratégia:

```
1.  authClient.auth.getUser() → pegar uid (criado_por).
2.  Gerar tempId = crypto.randomUUID() para path do Storage.
3.  Upload em paralelo:
      autorizacoes/{tempId}/req.<ext>  (se houver foto_requisicao)
      autorizacoes/{tempId}/sig_atendente.png
      autorizacoes/{tempId}/sig_paciente.png
    → guardar paths retornados.
4.  Gerar PDF (pdf-lib) com dados + itens; gerar QR (qrcode) apontando para
    /autorizacoes/{id futuro} — como id ainda não existe, QR aponta para
    /a/{tempId} e depois fazemos rewrite (ver 1.7) OU geramos QR após insert.
    Solução simples: gerar QR após o insert, em segunda etapa.
5.  rpc('gerar_num_aut') → num_aut.
6.  insert em autorizacoes com pdf_autorizacao=path-tmp, qr_code=path-tmp,
    assinaturas e foto referenciando os uploads. Retornar id.
7.  insert em itens_autorizacao (array). Trigger recalcula total_autorizado.
8.  Gerar PDF final + QR com id real, fazer upload em
    autorizacoes/{id}/aut.pdf e /qr.png; UPDATE autorizacoes setando paths.
9.  Em qualquer falha após o passo 3, rodar cleanup: storage.remove dos
    arquivos do tempId / id. Mostrar toast de erro com retry.
10. Ler novamente a autorização (para pegar status atualizado pela trigger
    verificar_limite_mensal — pode ter virado 'bloqueado').
11. Redirect para /autorizacoes/$id com toast contextual (sucesso ou
    "criada bloqueada — limite excedido, solicite acréscimo").
```

Notas:
- Trigger `verificar_limite_mensal` roda no INSERT de autorizacoes, mas naquele momento `total_autorizado=0` (itens entram depois). **Atenção:** a trigger precisa rodar após os itens entrarem para o cálculo bater. Verificar se existe trigger de UPDATE em `autorizacoes` que recheque, ou se devemos: (a) inserir itens primeiro com `autorizacao_id` opcional — não dá, FK NOT NULL; (b) inserir autorizacao com total já preenchido manualmente baseado no client antes de inserir itens (a trigger usa `NEW.total_autorizado`); (c) criar uma trigger em `itens_autorizacao` AFTER INSERT que rechame a verificação. → **Decisão recomendada:** preencher `total_autorizado` no insert da autorizacao com o total calculado no client; a trigger valida; depois itens entram e a trigger `atualizar_total_autorizacao` mantém consistência. Validar com o usuário.

### 1.7 PDF/QR
- Lib: `pdf-lib` (puro JS, compatível com Worker) + `qrcode` (gera dataURL/PNG buffer).
- Layout: cabeçalho com logo da prefeitura (placeholder), num_aut, data, paciente, UBS, profissional, empresa, tabela de itens, total, QR no rodapé, espaços de assinatura com as imagens embutidas.
- Geração no client (browser tem Web Crypto + Blob); upload direto.
- QR aponta para `${window.location.origin}/autorizacoes/${id}` (rota pública de validação futura — por ora cai no `_authenticated` e exige login; ok como v1).

### 1.8 Permissões / RLS
- Acesso à rota: perfil `administrador` ou `atendente`. Outros perfis veem `ComingSoon` ou redirect com toast "Sem permissão".
- Insert respaldado por RLS (`autorizacoes_insert`, `itens_insert`).
- Storage bucket `autorizacoes` já restrito a staff.

### 1.9 Pontos de atenção
- `criado_por` NOT NULL — preencher com `auth.uid()`.
- Todas as colunas `pdf_autorizacao`, `qr_code`, `assinatura_atendente`, `assinatura_paciente` são NOT NULL → ordem de insert obrigatória (não dá pra inserir e depois preencher; o passo 6 precisa de paths válidos, mesmo que provisórios).
- Evitar `puppeteer`/`sharp` (incompatíveis com Worker).
- Limpeza de arquivos órfãos em falha — não deixar lixo no bucket.
- `num_aut` único: a função tem loop de unicidade, sem ação extra.
- Status pode virar `bloqueado` automaticamente — UI deve **sempre reler** o registro pós-insert.

---

## 2. Solicitar Acréscimo — `/acrescimos/novo`

### 2.1 Estrutura
Form simples (uma página, sem wizard).

Campos:
- `mes_referencia` — mês/ano (input `month`, default mês corrente, formato `YYYY-MM`).
- `limite_atual` — readonly, calculado: 130000 + soma de acréscimos aprovados do mês.
- `total_gasto` — readonly, da `vw_orcamento_mes_atual` ou query `sum(total_autorizado) where status in (...) and mes=...`.
- `saldo` — readonly derivado.
- `novo_limite` — input moeda; validação `> limite_atual`.
- `acrescimo` — derivado (`novo_limite - limite_atual`), exibido em destaque.
- `justificativa` — textarea obrigatória (≥20 chars, ≤1000).
- `assinatura` — `SignaturePad` reaproveitado; upload em bucket (criar pasta `acrescimos/` no bucket `autorizacoes` ou novo bucket — usar o existente para simplificar; path `acrescimos/{userId}/{timestamp}.png`).

### 2.2 Painel de contexto (cabeçalho da tela)
Card "Situação atual do mês":
- Limite vigente (R$)
- Gasto até agora (R$)
- Autorizações bloqueadas no mês (link → `/autorizacoes?status=bloqueado&mes=...`)
- Histórico de acréscimos do mês (lista compacta: data, novo limite, status, solicitante).

### 2.3 Submit
1. Upload da assinatura → path.
2. Insert em `acrescimos_gastos`:
   - `mes_referencia`, `justificativa`, `assinatura` (path), `limite_atual`, `total_gasto`, `novo_limite`, `status='pendente'`.
   - `aprovado_por` e `data_aprovacao` ficam null (preenchidos na aprovação por admin — fluxo separado, fora do escopo desta tela; sugerir tela de listagem `/acrescimos` em fase futura para aprovar/recusar).
3. Toast "Solicitação enviada — aguardando aprovação do administrador".
4. Redirect para `/acrescimos` (lista; se não existir, voltar para dashboard).

### 2.4 Permissões
- RLS `acrescimos_insert`: `administrador` ou `secretaria`. Atendente **não** pode solicitar — UI deve respeitar (esconder botão na origem; rota mostra `ComingSoon`/sem permissão se acessada).
- Aprovação só por `administrador` (`acrescimos_update`) — fora desta tela.

### 2.5 Validações Zod
- `mes_referencia`: regex `^\d{4}-(0[1-9]|1[0-2])$`.
- `novo_limite`: number, > `limite_atual`, ≤ `limite_atual * 3` (sanity check, confirmar).
- `justificativa`: 20–1000 chars, trim.
- `assinatura`: presente.

### 2.6 Pontos de atenção
- Não confundir `novo_limite` (limite total proposto) com "valor do acréscimo" (diferença) — UI deve deixar claro.
- Acréscimo só tem efeito quando `status='aprovado'` (a função `verificar_limite_mensal` filtra por isso). Avisar isso na UI pós-envio.
- Permitir múltiplas solicitações no mesmo mês? Schema permite. UI: alertar se já existir uma `pendente` para o mesmo mês ("você já tem um pedido em análise").
- Bucket: se reusar `autorizacoes`, garantir que as policies de Storage permitem `administrador`/`secretaria` para o prefixo `acrescimos/`. Se as policies hoje só liberam para `administrador`/`atendente`, **criar migration** ajustando ou criar bucket novo `acrescimos` com policies próprias. **Provável necessidade de migration** — confirmar.

---

## 3. Dependências e ordem de implementação

```
Storage helpers (lib/autorizacao-storage)  ─┐
SignaturePad (componente compartilhado)    ─┼─► Nova Autorização ─► Solicitar Acréscimo
PDF helper (lib/autorizacao-pdf)           ─┘
```

`SignaturePad` é compartilhado entre as duas telas → construir primeiro.

## 4. Riscos e decisões pendentes

1. **Atomicidade insert + uploads** — risco médio. Mitigação: cleanup em catch + função de "limpar autorizações órfãs" futura.
2. **Trigger `verificar_limite_mensal` x ordem de inserts** — risco alto. Confirmar se devo preencher `total_autorizado` no insert da autorização (em vez de zerar) para a trigger validar corretamente.
3. **PDF no Worker vs no client** — recomendação: gerar no client (mais simples, sem cold start). Server function só se precisarmos assinar/cifrar PDF futuramente.
4. **Edição de `valor_unitario` no item** — bloqueado por padrão (preserva tabela de preços). Confirmar.
5. **Retroatividade de `data_autorizacao`** — default 30 dias. Confirmar regra.
6. **Foto da requisição** — schema permite null. UX recomenda obrigatória. Confirmar.
7. **Bucket para assinatura de acréscimo** — pode exigir migration de policies do Storage. Confirmar.
8. **Lista de acréscimos `/acrescimos`** — fora do escopo desta entrega, mas necessária para o admin aprovar. Sinalizar como próximo passo.

## 5. Perguntas para o usuário antes de codar

1. `valor_unitario` na autorização: **bloqueado** (tabela manda) ou editável com auditoria?
2. `foto_requisicao`: obrigatória ou opcional?
3. `data_autorizacao` retroativa: até quantos dias?
4. Posso criar migration ajustando policies do bucket `autorizacoes` para incluir o prefixo `acrescimos/` (ou prefere bucket novo)?
5. Confirma a estratégia de preencher `total_autorizado` calculado no client no insert da autorização (para a trigger de limite validar corretamente antes dos itens entrarem)?
