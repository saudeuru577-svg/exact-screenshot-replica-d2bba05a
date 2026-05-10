# 🗄️ Módulo 01 — Schema do Banco de Dados

> Referenciado por: [PRD_PRINCIPAL.md](../PRD_PRINCIPAL.md)  
> Backend: Supabase (PostgreSQL) com Row Level Security (RLS)

---

## Visão Geral das Tabelas

| Tabela | Descrição |
|---|---|
| `usuarios` | Funcionários com acesso ao sistema |
| `bairros` | Bairros cadastrados (zona urbana) |
| `povoados` | Povoados cadastrados (zona rural) |
| `ubs` | Unidades Básicas de Saúde |
| `profissionais` | Médicos e enfermeiros vinculados às UBS |
| `pacientes` | Pacientes da rede municipal |
| `empresas` | Laboratórios, clínicas e hospitais conveniados |
| `procedimentos` | Exames e consultas vinculados a empresas |
| `autorizacoes` | Guias de autorização emitidas |
| `itens_autorizacao` | Itens individuais de cada autorização |
| `acrescimos_gastos` | Solicitações de acréscimo ao limite mensal |
| `faturamentos` | Fechamentos financeiros por empresa e período |
| `logs_auditoria` | Registro de todas as ações críticas |

---

## Tabela: `usuarios`

| Campo | Tipo | Restrições |
|---|---|---|
| id | UUID | PK, obrigatório |
| nome | varchar(150) | obrigatório, apenas letras |
| email | varchar(255) | obrigatório, único |
| senha_hash | varchar(255) | obrigatório |
| perfil | enum | administrador \| secretaria \| atendente \| financeiro |
| ativo | boolean | default true |
| criado_em | timestamp | obrigatório |
| atualizado_em | timestamp | obrigatório |

---

## Tabela: `bairros`

| Campo | Tipo | Restrições |
|---|---|---|
| id | UUID | PK |
| nome | varchar(100) | obrigatório, único |
| ativo | boolean | default true |
| criado_por | UUID | FK → usuarios.id |
| criado_em | timestamp | obrigatório |
| atualizado_em | timestamp | obrigatório |

> **RN-GEO1:** Somente Administrador pode cadastrar bairros.

---

## Tabela: `povoados`

| Campo | Tipo | Restrições |
|---|---|---|
| id | UUID | PK |
| nome | varchar(100) | obrigatório, único |
| ativo | boolean | default true |
| criado_por | UUID | FK → usuarios.id |
| criado_em | timestamp | obrigatório |
| atualizado_em | timestamp | obrigatório |

> **RN-GEO2:** Somente Administrador pode cadastrar povoados.

---

## Tabela: `ubs`

| Campo | Tipo | Restrições |
|---|---|---|
| id | UUID | PK |
| id_posto | varchar(20) | obrigatório, único |
| cnes | varchar(15) | obrigatório, único, apenas números |
| nome_posto | varchar(150) | obrigatório, apenas letras |
| endereco | varchar(200) | obrigatório |
| bairro | varchar(100) | obrigatório |
| zona | enum | urbana \| rural |
| contato | varchar(20) | opcional |
| criado_em | timestamp | obrigatório |
| atualizado_em | timestamp | obrigatório |

---

## Tabela: `profissionais`

| Campo | Tipo | Restrições |
|---|---|---|
| id | UUID | PK |
| nome_profissional | varchar(150) | obrigatório, apenas letras |
| cargo | enum | medico \| enfermeiro |
| especialidade | varchar(150) | opcional |
| conselho | enum | CRM \| COREN |
| numero_conselho | varchar(20) | obrigatório, apenas números |
| estado_conselho | varchar(2) | obrigatório, 2 letras maiúsculas (UF) |
| ubs_id | UUID | FK → ubs.id, obrigatório |
| contato | varchar(20) | opcional |
| criado_em | timestamp | obrigatório |
| atualizado_em | timestamp | obrigatório |

> **RN-PROF2:** Se cargo = medico → conselho deve ser CRM. Se cargo = enfermeiro → conselho deve ser COREN.

---

## Tabela: `pacientes`

| Campo | Tipo | Restrições |
|---|---|---|
| id | UUID | PK |
| nome | varchar(150) | obrigatório, apenas letras e espaços |
| cartao_sus | varchar(15) | opcional, único |
| dtn | date | obrigatório |
| idade_calculada | virtual | calculado automaticamente, não editável |
| sexo | enum | masculino \| feminino |
| zona | enum | urbana \| rural |
| rua | varchar(150) | obrigatório se zona = urbana |
| numero | varchar(10) | obrigatório se zona = urbana |
| bairro_id | UUID | FK → bairros.id (obrigatório se zona = urbana) |
| povoado_id | UUID | FK → povoados.id (obrigatório se zona = rural) |
| ponto_referencia | varchar(200) | opcional |
| nome_da_mae | varchar(150) | obrigatório, apenas letras |
| naturalidade | varchar(100) | opcional |
| criado_por | UUID | FK → usuarios.id |
| criado_em | timestamp | obrigatório |
| atualizado_em | timestamp | obrigatório |

---

## Tabela: `empresas`

| Campo | Tipo | Restrições |
|---|---|---|
| id | UUID | PK |
| nome_fantasia | varchar(150) | obrigatório |
| razao_social | varchar(150) | obrigatório |
| cnpj | varchar(18) | obrigatório, único |
| inscricao_estadual | varchar(30) | opcional |
| telefone | varchar(20) | opcional |
| email | varchar(255) | opcional |
| endereco | varchar(200) | opcional |
| bairro | varchar(100) | opcional |
| cidade | varchar(100) | opcional |
| estado | varchar(2) | opcional |
| cep | varchar(10) | opcional |
| responsavel_contrato | varchar(150) | opcional |
| tipo_servico | enum | laboratorio \| clinica \| hospital \| outro |
| contrato_numero | varchar(50) | opcional |
| contrato_inicio | date | opcional |
| contrato_fim | date | opcional |
| ativa | boolean | default true |
| criado_em | timestamp | obrigatório |
| atualizado_em | timestamp | obrigatório |

---

## Tabela: `procedimentos`

| Campo | Tipo | Restrições |
|---|---|---|
| id | UUID | PK |
| empresa_id | UUID | FK → empresas.id, obrigatório |
| sigla | varchar(20) | obrigatório |
| nome | varchar(150) | obrigatório |
| nomes_alternativos | text | opcional |
| grupo | varchar(100) | obrigatório |
| tipo | enum | exame \| consulta |
| valor_unitario | decimal(12,2) | obrigatório, > 0 |
| ativo | boolean | default true |
| criado_em | timestamp | obrigatório |

---

## Tabela: `autorizacoes`

| Campo | Tipo | Restrições |
|---|---|---|
| id | UUID | PK |
| num_aut | varchar(20) | único, gerado automaticamente (ex: AUT20260001) |
| paciente_id | UUID | FK → pacientes.id, obrigatório |
| profissional_id | UUID | FK → profissionais.id, obrigatório |
| ubs_id | UUID | FK → ubs.id, obrigatório |
| empresa_id | UUID | FK → empresas.id, obrigatório |
| sintomas | text | opcional |
| foto_requisicao | varchar(500) | opcional (URL Supabase Storage) |
| assinatura_paciente | varchar(500) | obrigatório (URL Supabase Storage) |
| assinatura_atendente | varchar(500) | obrigatório (URL Supabase Storage) |
| qr_code | varchar(500) | obrigatório (gerado automaticamente) |
| pdf_autorizacao | varchar(500) | obrigatório (URL Supabase Storage) |
| total_autorizado | decimal(12,2) | calculado: soma de itens_autorizacao |
| status | enum | pendente \| aprovado \| bloqueado \| cancelado |
| data_autorizacao | date | obrigatório |
| criado_por | UUID | FK → usuarios.id, obrigatório |
| criado_em | timestamp | obrigatório |

> **Formato num_aut:** `AUT` + ano (4 dígitos) + sequencial (4 dígitos com zero à esquerda). Ex: `AUT20260001`

---

## Tabela: `itens_autorizacao`

| Campo | Tipo | Restrições |
|---|---|---|
| id | UUID | PK |
| autorizacao_id | UUID | FK → autorizacoes.id, obrigatório |
| procedimento_id | UUID | FK → procedimentos.id, obrigatório |
| descricao | varchar(200) | snapshot histórico do nome do procedimento |
| quantidade | integer | obrigatório, mínimo 1 |
| valor_unitario | decimal(12,2) | obrigatório, snapshot do valor no momento |
| valor_total | decimal(12,2) | calculado: quantidade × valor_unitario |
| criado_em | timestamp | obrigatório |

> **Por que salvar descricao e valor_unitario como snapshot?** Se o procedimento for editado no futuro, a autorização histórica permanece íntegra para auditoria.

---

## Tabela: `acrescimos_gastos`

| Campo | Tipo | Restrições |
|---|---|---|
| id | UUID | PK |
| mes_referencia | varchar(7) | obrigatório, formato YYYY-MM |
| justificativa | text | obrigatório |
| assinatura | varchar(500) | obrigatório |
| aprovado_por | UUID | FK → usuarios.id, obrigatório |
| data_aprovacao | timestamp | obrigatório |
| total_gasto | decimal(12,2) | total acumulado no mês no momento da solicitação |
| limite_atual | decimal(12,2) | limite vigente antes do acréscimo |
| novo_limite | decimal(12,2) | novo limite após aprovação |
| status | enum | pendente \| aprovado \| rejeitado |
| criado_em | timestamp | obrigatório |

---

## Tabela: `faturamentos`

| Campo | Tipo | Restrições |
|---|---|---|
| id | UUID | PK |
| empresa_id | UUID | FK → empresas.id, obrigatório |
| periodo_inicio | date | obrigatório |
| periodo_fim | date | obrigatório |
| valor_total | decimal(12,2) | obrigatório |
| total_confirmados | decimal(12,2) | obrigatório |
| total_glosados | decimal(12,2) | obrigatório |
| total_procedimentos | integer | obrigatório |
| status | enum | aberto \| enviado \| parcialmente_glosado \| fechado |
| gerado_por | UUID | FK → usuarios.id, obrigatório |
| data_geracao | timestamp | obrigatório |

> **RN-FAT1:** valor_total = total_confirmados + total_glosados

---

## Tabela: `logs_auditoria`

| Campo | Tipo | Restrições |
|---|---|---|
| id | UUID | PK |
| usuario_id | UUID | FK → usuarios.id |
| entidade | varchar(50) | nome da tabela afetada |
| entidade_id | UUID | ID do registro afetado |
| acao | varchar(50) | INSERT \| UPDATE \| DELETE \| TENTATIVA_VIOLACAO |
| dados_anteriores | json | estado antes da ação |
| dados_novos | json | estado após a ação |
| ip_origem | varchar(45) | IP do usuário |
| criado_em | timestamp | obrigatório |

---

## Relacionamentos

```
usuarios        → autorizacoes        (1:N via criado_por)
usuarios        → faturamentos        (1:N via gerado_por)
usuarios        → logs_auditoria      (1:N)
bairros         → pacientes           (1:N via bairro_id)
povoados        → pacientes           (1:N via povoado_id)
ubs             → profissionais       (1:N)
ubs             → autorizacoes        (1:N)
profissionais   → autorizacoes        (1:N)
pacientes       → autorizacoes        (1:N)
empresas        → procedimentos       (1:N)
empresas        → autorizacoes        (1:N)
empresas        → faturamentos        (1:N)
autorizacoes    → itens_autorizacao   (1:N)
procedimentos   → itens_autorizacao   (1:N)
```
