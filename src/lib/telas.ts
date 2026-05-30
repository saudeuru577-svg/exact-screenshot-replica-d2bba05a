import type { PerfilUsuario } from "@/hooks/use-auth";

export type TelaDef = {
  key: string; // identificador estável (path)
  label: string;
  grupo: string;
  perfisPadrao: PerfilUsuario[]; // perfis com acesso por padrão
};

/** Perfis com acesso ao submódulo Autorização de Exames (Cidade Presente · Saúde). */
export const PERFIS_SUBMODULO: PerfilUsuario[] = [
  "administrador",
  "gestor_saude",
  "regulador",
  "profissional_ubs",
];

const BASE = "/saude/regulacao/autorizacao-exames";

export const TELAS: TelaDef[] = [
  { key: `${BASE}/dashboard`, label: "Dashboard", grupo: "Central de Regulação",
    perfisPadrao: ["administrador", "regulador", "profissional_ubs"] },

  { key: `${BASE}/pacientes`, label: "Pacientes", grupo: "Central de Regulação",
    perfisPadrao: ["administrador", "profissional_ubs"] },
  { key: `${BASE}/autorizacoes`, label: "Autorizações", grupo: "Central de Regulação",
    perfisPadrao: ["administrador", "regulador", "profissional_ubs"] },
  { key: `${BASE}/acrescimos/novo`, label: "Solicitar acréscimo", grupo: "Central de Regulação",
    perfisPadrao: ["administrador", "regulador"] },

  { key: `${BASE}/faturamentos`, label: "Faturamentos", grupo: "Apoio",
    perfisPadrao: ["administrador"] },
  { key: `${BASE}/relatorios`, label: "Relatórios", grupo: "Apoio",
    perfisPadrao: ["administrador", "regulador"] },

  { key: `${BASE}/cadastros/ubs`, label: "UBS", grupo: "Cadastros",
    perfisPadrao: ["administrador"] },
  { key: `${BASE}/cadastros/profissionais`, label: "Profissionais", grupo: "Cadastros",
    perfisPadrao: ["administrador"] },
  { key: `${BASE}/cadastros/empresas`, label: "Empresas", grupo: "Cadastros",
    perfisPadrao: ["administrador"] },
  { key: `${BASE}/cadastros/procedimentos`, label: "Procedimentos", grupo: "Cadastros",
    perfisPadrao: ["administrador"] },
  { key: `${BASE}/cadastros/territorio`, label: "Bairros e Povoados", grupo: "Cadastros",
    perfisPadrao: ["administrador"] },

  { key: `${BASE}/admin/usuarios`, label: "Usuários", grupo: "Administração",
    perfisPadrao: ["administrador"] },
  { key: `${BASE}/admin/logs`, label: "Logs de auditoria", grupo: "Administração",
    perfisPadrao: ["administrador"] },

  { key: "/saude/atencao-basica", label: "Atenção Básica", grupo: "Módulo Saúde",
    perfisPadrao: ["administrador", "gestor_saude", "enfermeiro_ubs", "agente_saude", "profissional_ubs"] },
  { key: "/saude/farmacia", label: "Farmácia", grupo: "Módulo Saúde",
    perfisPadrao: ["administrador", "gestor_saude", "farmaceutico"] },
  { key: "/saude/agendamento", label: "Agendamento", grupo: "Módulo Saúde",
    perfisPadrao: ["administrador", "gestor_saude", "agendador", "profissional_ubs", "enfermeiro_ubs"] },
  { key: "/saude/vigilancia", label: "Vigilância em Saúde", grupo: "Módulo Saúde",
    perfisPadrao: ["administrador", "gestor_saude", "vigilancia_sanitaria"] },

  // Demais secretarias (Cidade Presente) — apenas administrador por enquanto
  { key: "/educacao", label: "Educação", grupo: "Cidade Presente", perfisPadrao: ["administrador"] },
  { key: "/assistencia-social", label: "Assistência Social", grupo: "Cidade Presente", perfisPadrao: ["administrador"] },
  { key: "/obras", label: "Obras e Infraestrutura", grupo: "Cidade Presente", perfisPadrao: ["administrador"] },
  { key: "/fazenda", label: "Fazenda e Tributação", grupo: "Cidade Presente", perfisPadrao: ["administrador"] },
  { key: "/meio-ambiente", label: "Meio Ambiente", grupo: "Cidade Presente", perfisPadrao: ["administrador"] },
  { key: "/agricultura", label: "Agricultura", grupo: "Cidade Presente", perfisPadrao: ["administrador"] },
  { key: "/cultura-esporte-turismo", label: "Cultura, Esporte e Turismo", grupo: "Cidade Presente", perfisPadrao: ["administrador"] },
  { key: "/seguranca", label: "Segurança e Defesa Civil", grupo: "Cidade Presente", perfisPadrao: ["administrador"] },
  { key: "/administracao", label: "Administração e Gestão", grupo: "Cidade Presente", perfisPadrao: ["administrador"] },
  { key: "/ouvidoria", label: "Ouvidoria", grupo: "Cidade Presente", perfisPadrao: ["administrador"] },
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
