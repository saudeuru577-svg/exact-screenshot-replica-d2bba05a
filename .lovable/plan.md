
## Objetivo

Transformar a plataforma no **Cidade Presente** completo, expondo todas as secretarias como módulos. Sa\u00fade continua o único funcional; as demais entram como **shells "Em breve"**, já com seus submódulos internos listados. Entrada da plataforma passa a ser um novo hub `/inicio`, e o acesso aos novos módulos fica restrito a `administrador` (perfis específicos ficam para uma fase futura).

## Decisões aprovadas

- **Escopo:** shells + submódulos internos listados (sem regras de negócio nem tabelas novas).
- **Navegação:** novo hub `/inicio` com cards de todas as secretarias. Saúde vira mais um card.
- **Perfis:** adiar. Por enquanto, só `administrador` enxerga e entra nos novos módulos. Sa\u00fade mantém os perfis atuais.

## Secretarias propostas (ajustáveis antes de implementar)

Default sugerido — confirme/edite ao aprovar:

1. **Saúde** — já existente, vira card do hub.
2. **Educação** — Matrículas, Escolas/UBS Escolares, Transporte Escolar, Merenda, Censo.
3. **Assistência Social** — CRAS, CREAS, Cadastro Único, Benefícios eventuais.
4. **Obras e Infraestrutura** — Ordens de serviço, Iluminação pública, Manutenção viária.
5. **Fazenda / Tributação** — IPTU, ISS, Dívida ativa, Alvarás.
6. **Meio Ambiente** — Licenciamento, Fiscalização, Denúncias.
7. **Agricultura** — Produtor rural, ATER, Feiras.
8. **Cultura, Esporte e Turismo** — Eventos, Equipamentos públicos, Inscrições.
9. **Segurança / Defesa Civil** — Ocorrências, Guarda municipal, Alertas.
10. **Administração / Gestão** — RH, Protocolo, Frota, Patrimônio.
11. **Ouvidoria** — Canal único do cidadão (denúncias, elogios, sugestões).

## Estrutura final de rotas

```
/inicio                                 -> Hub Cidade Presente (cards das 11 secretarias)
  /saude                                -> hub atual (intacto)
    /saude/regulacao/autorizacao-exames -> existente
    /saude/atencao-basica ...           -> existentes (shells)
  /educacao                             -> shell + sidebar com submódulos "Em breve"
    /educacao/matriculas
    /educacao/escolas
    /educacao/transporte
    /educacao/merenda
    /educacao/censo
  /assistencia-social
    /assistencia-social/cras
    /assistencia-social/creas
    /assistencia-social/cadastro-unico
    /assistencia-social/beneficios
  /obras
    /obras/ordens-servico
    /obras/iluminacao
    /obras/manutencao-viaria
  /fazenda
    /fazenda/iptu
    /fazenda/iss
    /fazenda/divida-ativa
    /fazenda/alvaras
  /meio-ambiente
    /meio-ambiente/licenciamento
    /meio-ambiente/fiscalizacao
    /meio-ambiente/denuncias
  /agricultura
    /agricultura/produtor-rural
    /agricultura/ater
    /agricultura/feiras
  /cultura-esporte-turismo
    /cultura-esporte-turismo/eventos
    /cultura-esporte-turismo/equipamentos
    /cultura-esporte-turismo/inscricoes
  /seguranca
    /seguranca/ocorrencias
    /seguranca/guarda
    /seguranca/alertas
  /administracao
    /administracao/rh
    /administracao/protocolo
    /administracao/frota
    /administracao/patrimonio
  /ouvidoria
    /ouvidoria/manifestacoes
```

Todos os novos shells reutilizam **um único componente genérico** de shell de secretaria (header institucional + breadcrumb + sidebar de submódulos + `ComingSoon`), análogo ao `SubmoduloShell` da Saúde.

## Tarefas

### 1. Mapa de secretarias (`src/lib/secretarias.ts` — novo)
Constante `SECRETARIAS` com:
```ts
{ key, slug, to, label, descricao, icon, status: "ativo" | "em_breve",
  cor, submodulos: [{ slug, label, descricao, icon, status }] }
```
Sa\u00fade entra como `status: "ativo"` apontando para `/saude`. Demais ficam `em_breve`.

Helper `temAcessoSecretaria(perfil)`: `true` se `administrador` **ou** se for Saúde (mantém regra atual).

### 2. Hub Cidade Presente (`src/routes/_authenticated/inicio.tsx` — novo)
- Header "Cidade Presente · Painel do Servidor" com nome do usuário e Sair.
- Grid responsivo com card por secretaria: ícone temático, título, descrição, badge "Em breve" / "Sem acesso".
- Card desabilitado quando perfil sem acesso (tooltip explicativo).

### 3. Shell genérico de secretaria (`src/components/layout/secretaria-shell.tsx` — novo)
- Recebe `slug` da secretaria.
- Sidebar lista todos os submódulos da secretaria + link "← Outras secretarias" (`/inicio`).
- Header com nome da secretaria e breadcrumb.
- Conteúdo padrão: `<ComingSoon />` parametrizado pelo submódulo ativo (via `useMatches`/param).
- Gate: se `usuario.perfil !== "administrador"`, mostra "Acesso restrito" com botão voltar.

### 4. Rotas das secretarias (uma por secretaria nova)
Para cada secretaria:
- `src/routes/_authenticated/<slug>.tsx` → layout que renderiza `<SecretariaShell />` + `<Outlet />`.
- `src/routes/_authenticated/<slug>/index.tsx` → visão geral (cards dos submódulos internos).
- `src/routes/_authenticated/<slug>/<submodulo>.tsx` → renderiza `<ComingSoon title={...} />`.

Todos `em_breve`; sem chamadas a banco; sem novas tabelas.

### 5. Roteamento de entrada
- `src/routes/index.tsx`: redirect passa a apontar para `/inicio` (em vez de `/saude`).
- `src/routes/login.tsx`: após login, redireciona para `/inicio`.
- `/saude` continua funcionando como sub-hub.

### 6. Telas e permissões (`src/lib/telas.ts`)
- Adicionar **uma entrada por secretaria nova** (chave = rota raiz, ex.: `/educacao`), `grupo: "Cidade Presente"`, `perfisPadrao: ["administrador"]`.
- Não cria entradas por submódulo agora (evita poluir o admin antes da fase funcional).

### 7. Sidebar de Saúde / link de volta
- No shell de Sa\u00fade (`saude/index.tsx` e `SubmoduloShell`), o link "Outros módulos de Saúde" ganha um irmão: "← Voltar ao Cidade Presente" apontando para `/inicio`.

### 8. Verificação
- `tsc` sem erros, `routeTree.gen.ts` regenerado.
- Login → `/inicio` com 11 cards (Saúde ativo, demais "Em breve" mas clicáveis para admin).
- Admin entra em qualquer secretaria → vê shell com sidebar de submódulos + `ComingSoon`.
- Usuário não-admin vê cards desabilitados (exceto Saúde, se perfil tiver acesso).
- Sa\u00fade segue 100% funcional.

## Detalhes técnicos

- **Sem migração de banco**: não criamos novos valores no enum `perfil_usuario` agora. O gate é puramente de UI (`perfil === "administrador"`), o que está alinhado com "adiar perfis".
- **Componente único** (`SecretariaShell`) parametrizado pelo mapa `SECRETARIAS` evita 11 layouts duplicados — adicionar/remover secretaria é uma entrada no array + criar 1 ou 2 arquivos de rota.
- **Ícones**: usar `lucide-react` (GraduationCap, HeartHandshake, HardHat, Landmark, Trees, Sprout, Palette, ShieldAlert, Building2, MessageSquareWarning, HeartPulse). Sem novas dependências.
- **Design tokens**: cards usam tokens existentes (`bg-card`, `border`, `text-primary`); sem cores hardcoded.
- **Acessibilidade**: cards desabilitados ganham `aria-disabled` e tooltip explicando o motivo.

## Fora de escopo

- Tabelas, formulários ou regras de negócio dos submódulos novos.
- Novos perfis no enum `perfil_usuario` (fase posterior, quando definirmos quem opera cada secretaria).
- Integrações externas (SUS, FNDE, SIAFI, etc.).
- Portal do cidadão / app mobile.
- Redesenho do hub `/saude` (continua igual).

## Pergunta pendente antes de implementar

Confirme a lista de secretarias (ou ajuste: remova/adicione/renomeie) — implemento exatamente o conjunto aprovado.
