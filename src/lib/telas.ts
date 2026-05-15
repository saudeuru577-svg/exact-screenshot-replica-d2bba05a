import type { PerfilUsuario } from "@/hooks/use-auth";

export type TelaDef = {
  key: string; // identificador estável (path)
  label: string;
  grupo: string;
  perfisPadrao: PerfilUsuario[]; // perfis com acesso por padrão
};

export const TELAS: TelaDef[] = [
  { key: "/dashboard", label: "Dashboard", grupo: "Geral", perfisPadrao: ["administrador", "secretaria", "atendente", "financeiro"] },

  { key: "/pacientes", label: "Pacientes", grupo: "Operacional", perfisPadrao: ["administrador", "secretaria", "atendente"] },
  { key: "/autorizacoes", label: "Autorizações", grupo: "Operacional", perfisPadrao: ["administrador", "secretaria", "atendente", "financeiro"] },
  { key: "/acrescimos/novo", label: "Solicitar acréscimo", grupo: "Operacional", perfisPadrao: ["administrador", "secretaria"] },

  { key: "/faturamentos", label: "Faturamentos", grupo: "Financeiro", perfisPadrao: ["administrador", "financeiro"] },
  { key: "/relatorios", label: "Relatórios", grupo: "Financeiro", perfisPadrao: ["administrador", "secretaria", "financeiro"] },

  { key: "/cadastros/ubs", label: "UBS", grupo: "Cadastros", perfisPadrao: ["administrador"] },
  { key: "/cadastros/profissionais", label: "Profissionais", grupo: "Cadastros", perfisPadrao: ["administrador"] },
  { key: "/cadastros/empresas", label: "Empresas", grupo: "Cadastros", perfisPadrao: ["administrador"] },
  { key: "/cadastros/procedimentos", label: "Procedimentos", grupo: "Cadastros", perfisPadrao: ["administrador"] },
  { key: "/cadastros/territorio", label: "Bairros e Povoados", grupo: "Cadastros", perfisPadrao: ["administrador"] },

  { key: "/admin/usuarios", label: "Usuários", grupo: "Administração", perfisPadrao: ["administrador"] },
  { key: "/admin/logs", label: "Logs de auditoria", grupo: "Administração", perfisPadrao: ["administrador"] },
];

export function temAcessoPadrao(tela: TelaDef, perfil: PerfilUsuario): boolean {
  return tela.perfisPadrao.includes(perfil);
}

/**
 * Aplica overrides (permitido true/false) sobre o acesso padrão do perfil.
 */
export function temAcessoFinal(
  telaKey: string,
  perfil: PerfilUsuario,
  overrides: Record<string, boolean>,
): boolean {
  if (telaKey in overrides) return overrides[telaKey];
  const def = TELAS.find((t) => t.key === telaKey);
  if (!def) return false;
  return temAcessoPadrao(def, perfil);
}
