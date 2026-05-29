## Objetivo

Transformar o app no **Módulo Saúde** completo da plataforma Cidade Presente, com 5 subáreas — Central de Regulação (já existe: Autorização de Exames), Atenção Básica, Farmácia, Agendamento e Vigilância. Nesta entrega só Autorização de Exames continua funcional; os demais ficam como shells "Em breve", mas com rotas, perfis e permissões já reservados.

## Decisões aprovadas

- **Navegação:** hub `/saude` com cards dos subáreas; ao entrar, cada submódulo tem sua própria sidebar.
- **Escopo:** só shell + placeholders (sem tabelas novas, sem regras de negócio para os novos submódulos).
- **Perfis:** criar perfis específicos por área no enum `perfil_usuario`.

## Estrutura final

```
/saude                                  -> Hub (cards dos 5 submódulos)
  /saude/regulacao/autorizacao-exames   -> EXISTENTE, intacto
  /saude/atencao-basica                 -> Shell "Em breve"
  /saude/farmacia                       -> Shell "Em breve"
  /saude/agendamento                    -> Shell "Em breve"
  /saude/vigilancia                     -> Shell "Em breve"
```

Layout de submódulo "em breve" reutiliza header institucional + breadcrumb + sidebar mínima já existentes em Autorização de Exames, mas mostra `ComingSoon` no conteúdo (componente já existe em `src/components/layout/coming-soon.tsx`).

## Tarefas

### 1. Banco — novos perfis (migration)
- `ALTER TYPE perfil_usuario ADD VALUE` para: `agente_saude`, `enfermeiro_ubs`, `farmaceutico`, `agendador`, `vigilancia_sanitaria`, `gestor_saude`.
- Mantém todos os perfis atuais; não migra usuários.

### 2. Tipos e label de perfil
- Atualizar `PerfilUsuario` em `src/hooks/use-auth.ts` com os novos valores.
- Atualizar `PERFIL_LABEL` em `src/routes/_authenticated/saude/regulacao/autorizacao-exames.tsx` e no select de perfil em `admin/usuarios.tsx` + `permissoes-dialog.tsx`.
- `gestor_saude` é o "super-perfil" de Saúde — acesso a todos os submódulos por padrão.

### 3. Mapa de submódulos (`src/lib/modulos-saude.ts` — novo)
- Constante `SUBMODULOS_SAUDE` com `{ key, label, descricao, icon, perfisPadrao, status: "ativo" | "em_breve" }`.
- Entradas: Autorização de Exames (ativo), Atenção Básica, Farmácia, Agendamento, Vigilância (em_breve).
- Função `temAcessoSubmodulo(perfil)` reutilizando lógica de `temAcessoFinal`.

### 4. Hub Saúde (`src/routes/_authenticated/saude/index.tsx` — novo)
- Página com grid de cards (um por submódulo).
- Cada card: ícone, título, descrição curta, badge "Em breve" quando aplicável, click → navega para o submódulo.
- Cards bloqueados (perfil sem acesso) ficam visíveis mas desabilitados, com tooltip explicando.
- Header institucional "SAÚDE · Cidade Presente" reutilizando o estilo do submódulo atual.

### 5. Shells dos novos submódulos
Para cada um dos 4 novos submódulos criar:
- `src/routes/_authenticated/saude/<slug>.tsx` (layout do submódulo, igual em estrutura ao de autorização-exames: header + breadcrumb + sidebar simples + `<Outlet />`).
- `src/routes/_authenticated/saude/<slug>/index.tsx` renderizando `<ComingSoon />`.
- Sidebar contém apenas um item "Visão geral" + link "← Voltar para Saúde".
- Gate de perfil aplicado no `beforeLoad` ou no componente (mesma lógica de PERFIS_SUBMODULO atual).

Slugs: `atencao-basica`, `farmacia`, `agendamento`, `vigilancia`.

### 6. Roteamento e entrada
- `src/routes/index.tsx`: redirect passa a apontar para `/saude` (hub) em vez de direto para autorização-exames.
- Layout pathless `src/routes/_authenticated/saude.tsx` (se ainda não existir como pathless real) continua só com `<Outlet />`.
- Atualizar a sidebar de Autorização de Exames para incluir botão "← Outros módulos de Saúde" no topo, voltando para `/saude`.

### 7. Permissões na tela admin
- O dialog de permissões (`permissoes-dialog.tsx`) já consome `TELAS`. Adicionar entradas em `src/lib/telas.ts` para as chaves novas: `/saude/atencao-basica`, `/saude/farmacia`, `/saude/agendamento`, `/saude/vigilancia`, cada uma com `perfisPadrao` apropriado.

### 8. Verificação
- `tsc` sem erros.
- Login → hub `/saude` com 5 cards (1 ativo, 4 "Em breve").
- Click em Autorização de Exames → funciona exatamente como hoje.
- Click em qualquer outro → mostra shell com `ComingSoon`.
- Admin consegue selecionar os novos perfis ao criar/editar usuário.

## Fora de escopo

- Tabelas, formulários ou regras de negócio dos 4 novos submódulos.
- Migrar usuários para novos perfis.
- Redesenho do shell de Autorização de Exames.
- Outros módulos do Cidade Presente fora de Saúde (Educação, Obras, etc.).
