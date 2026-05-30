import type { ComponentType } from "react";
import {
  FileCheck2, Stethoscope, Pill, CalendarClock, ShieldCheck,
  type LucideProps,
} from "lucide-react";
import type { PerfilUsuario } from "@/hooks/use-auth";

export type SubmoduloSaude = {
  key: string;
  slug: string;
  to: string;
  label: string;
  descricao: string;
  icon: ComponentType<LucideProps>;
  status: "ativo" | "em_breve";
  perfisPadrao: PerfilUsuario[];
};

const TODOS_GESTAO: PerfilUsuario[] = ["administrador", "gestor_saude"];

export const SUBMODULOS_SAUDE: SubmoduloSaude[] = [
  {
    key: "/saude/regulacao/autorizacao-exames",
    slug: "regulacao/autorizacao-exames",
    to: "/saude/regulacao/autorizacao-exames/dashboard",
    label: "Autorização de Exames",
    descricao: "Central de Regulação — autorização, faturamento e acompanhamento de exames.",
    icon: FileCheck2,
    status: "ativo",
    perfisPadrao: [...TODOS_GESTAO, "regulador", "profissional_ubs", "secretaria", "atendente", "financeiro"],
  },
  {
    key: "/saude/atencao-basica",
    slug: "atencao-basica",
    to: "/saude/atencao-basica",
    label: "Atenção Básica",
    descricao: "UBS, atendimentos clínicos e prontuário do cidadão.",
    icon: Stethoscope,
    status: "em_breve",
    perfisPadrao: [...TODOS_GESTAO, "enfermeiro_ubs", "agente_saude", "profissional_ubs"],
  },
  {
    key: "/saude/farmacia",
    slug: "farmacia",
    to: "/saude/farmacia",
    label: "Farmácia",
    descricao: "Estoque de medicamentos e dispensação ao paciente.",
    icon: Pill,
    status: "em_breve",
    perfisPadrao: [...TODOS_GESTAO, "farmaceutico"],
  },
  {
    key: "/saude/agendamento",
    slug: "agendamento",
    to: "/saude/agendamento",
    label: "Agendamento",
    descricao: "Marcação de consultas e exames pelo cidadão e pela UBS.",
    icon: CalendarClock,
    status: "em_breve",
    perfisPadrao: [...TODOS_GESTAO, "agendador", "profissional_ubs", "enfermeiro_ubs"],
  },
  {
    key: "/saude/vigilancia",
    slug: "vigilancia",
    to: "/saude/vigilancia",
    label: "Vigilância em Saúde",
    descricao: "Notificações, surtos e indicadores epidemiológicos.",
    icon: ShieldCheck,
    status: "em_breve",
    perfisPadrao: [...TODOS_GESTAO, "vigilancia_sanitaria"],
  },
];

export function temAcessoSubmodulo(sub: SubmoduloSaude, perfil: PerfilUsuario): boolean {
  return sub.perfisPadrao.includes(perfil);
}
