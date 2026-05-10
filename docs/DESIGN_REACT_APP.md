# Design do Sistema: Autorização de Exames

## 📌 Resumo do Entendimento
*   **O que está sendo construído:** Uma plataforma web em React, TypeScript e TailwindCSS para controle administrativo de autorizações de exames e consultas, substituindo o app atual feito no AppSheet.
*   **Por que existe:** Para resolver a dificuldade de controle de limites financeiros, rastreabilidade documental (PDF com QR Code) e facilitar o faturamento administrativo.
*   **Para quem é:** Exclusivo para os funcionários administrativos da Secretaria de Saúde (Perfis: Secretária, Atendente, Financeiro e Administrador).
*   **Restrições principais:** Estética minimalista (azul, branco e vermelho), geração de PDF de autorização assinado (físico ou digital) com QR Code.
*   **Não-objetivos explícitos:** O sistema não é voltado para os pacientes acessarem diretamente e não fará integração direta com máquinas de exames.

## 💡 Premissas (Assumptions)
1.  A aplicação será uma Single Page Application responsiva (ideal para navegadores de computadores e tablets em postos de atendimento).
2.  A geração de PDFs e QR Codes deve ocorrer no frontend para agilidade e redução de custos com servidores pesados.

## 📓 Log de Decisões
*   **Backend / Banco de Dados:** **Supabase** foi escolhido para gerenciar autenticação, fornecer o banco de dados PostgreSQL (regras robustas) e Storage para os PDFs e imagens.
*   **Assinatura de Documentos:** Formato **Híbrido**. O sistema permite assinar digitalmente via canvas; caso não seja assinado no tablet/PC, o PDF final gera uma linha para assinatura física à caneta.
*   **Arquitetura Frontend:** **React SPA com Vite** foi selecionado por sua simplicidade, performance de desenvolvimento e adequação a sistemas administrativos fechados (onde SEO não é relevante).

## 🛠️ Design Final

### 1. Arquitetura e Estrutura de Componentes
*   **Core:** React + TypeScript empacotados com Vite.
*   **Estilização:** TailwindCSS aliado ao **Shadcn/ui** para componentes de alta qualidade (tabelas, botões, modais) respeitando o minimalismo (azul, vermelho e branco).
*   **Estado Global:** `Zustand` para estado síncrono (perfil logado) e `React Query` para o estado assíncrono (cache das listas de pacientes, autorizações e limites do Supabase).
*   **Formulários:** `React Hook Form` + `Zod` para validações sólidas no cliente antes do envio ao banco.

### 2. Fluxo de Dados e Segurança
*   **Segurança (RLS):** Toda a segurança será garantida a nível de banco de dados no Supabase usando Row Level Security. Perfis "Atendentes" só poderão registrar autorizações, enquanto "Administradores" ou "Financeiro" poderão ver/alterar limites.
*   **Armazenamento de PDF:** Ao gerar a autorização, o frontend renderiza o PDF e sobe silenciosamente para o Supabase Storage. A URL do arquivo fica atrelada à tabela de autorizações.

### 3. Geração de Documentos
*   **Assinatura Digital:** `react-signature-canvas` capta o desenho do usuário.
*   **QR Code:** `qrcode.react` vincula o número único da guia (ex: AUT20260001) para conferência antifraude.
*   **Criação do PDF:** `@react-pdf/renderer` para construir um PDF formato A4 padronizado que unifica os dados, o QR Code e a assinatura.

### 4. Casos Extremos e Tratamento de Erros
*   **Tratamento de Erros:** Exibição de mensagens via `Toasts` elegantes para guiar o usuário em falhas de rede ou regras de negócio (ex: "CPF inválido").
*   **Prevenção contra Condição de Corrida:** O Supabase impedirá a inserção de duas autorizações simultâneas que excedam o limite estabelecido pelo Administrador.
*   **Confiabilidade Offline Momentânea:** O React Query fará retentativas automáticas se a internet cair no exato momento da geração, evitando a perda do formulário preenchido.
