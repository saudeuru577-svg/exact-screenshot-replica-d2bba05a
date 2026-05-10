# 🏛️ Guia de Criação: Modern Professional (Stitch)

Utilize as instruções abaixo diretamente no **Stitch** (labs.google.com/stitch). Este guia foi atualizado para o novo sistema **Modern Professional**.

---

## 🎨 Regras de Design Obrigatórias (Copie e cole em todos os prompts)

**DESIGN SYSTEM (REQUIRED):**
- **Tipografia:** Inter (Google Fonts)
- **Cores:** Primária #005cb8 (Vibrant Blue), Fundo #f9f9ff, Superfícies #ffffff
- **Arredondamento:** 8px (0.5rem) para botões e inputs; 16px (1rem) para cards.
- **Vibe:** Corporate Modern, foco em legibilidade, confiança e eficiência técnica.

---

## 📄 Telas para Criar

### 0. Tela de Módulos Principal (Dashboard Home)
**Prompt para o Stitch:**
> "Crie uma tela inicial de portal administrativo municipal. 
> **Estrutura:** Cabeçalho com título 'Painel Administrativo' e uma grade (grid) de cards grandes.
> **Cards Necessários:** Prefeito (ícone de gravata), Saúde (ícone de coração/pulso), Administração (ícone de documento), Infraestrutura (ícone de capacete), Agricultura (ícone de folha).
> **Design:** Modern Professional. Fundo #f9f9ff. Cards brancos com bordas suaves e arredondamento de 16px. Use a fonte Inter.
> **Comportamento:** Ao passar o mouse (hover), o card deve ter uma sombra sutil e uma borda azul #005cb8."

### 1. Painel de Submódulos (Ex: Módulo Saúde)
**Prompt para o Stitch:**
> "Crie uma tela de 'Módulo de Saúde' que exibe as funcionalidades internas.
> **Estrutura:** Cabeçalho com Breadcrumb 'Prefeitura > Saúde' e botão de 'Voltar'.
> **Cards de Submódulos:** Secretaria, Autorização de Exames, Farmácia, TFD, Vacinas.
> **Estilo:** Seguir o mesmo padrão de cards de 16px de arredondamento da tela principal, mas com ícones específicos para cada área médica.
> **Cores:** Destaque em #005cb8. Fonte Inter obrigatória."

### 2. Cadastro de Paciente
**Prompt para o Stitch:**
> "Crie uma tela de cadastro de paciente mobile-first. 
> **Design:** Modern Professional. 
> **Cores:** Fundo #f9f9ff, botões em #005cb8 com texto branco. 
> **Campos:** Nome Completo, CPF, Data de Nascimento, Sexo (Dropdown), Telefone, Endereço e Cartão SUS. 
> **Visual:** Use cards brancos com cantos de 16px para agrupar as seções do formulário. Fontes em Inter."

### 2. Nova Autorização
**Prompt para o Stitch:**
> "Crie uma tela para 'Nova Autorização' de exames. 
> **Filtro:** Barra de busca de paciente no topo. 
> **Seleção:** Grid de exames disponíveis em cards brancos (16px roundness). 
> **Destaque:** Quando um exame for selecionado, use uma borda de 2px em #005cb8.
> **Finalização:** Botão 'Gerar Autorização' fixo na base da tela."

### 3. Recuperação de Senha
**Prompt para o Stitch:**
> "Tela de recuperação de senha minimalista. 
> **Visual:** Fundo #f9f9ff. Card centralizado com 16px de arredondamento. 
> **Elementos:** Campo de E-mail/CPF e botão primário em #005cb8. Texto de apoio em Inter 14px."

---

## 🛠️ Próximos Passos
1. Use os prompts acima no Stitch.
2. **Quando terminar:** Avise-me para eu importar e converter para o seu projeto local.
