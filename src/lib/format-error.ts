// Formata erros do Supabase/Postgres para mensagens amigáveis,
// evitando vazar detalhes internos do banco para a UI.

type PgLike = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

function asPgLike(e: unknown): PgLike | null {
  if (e && typeof e === "object") return e as PgLike;
  return null;
}

export function formatSupabaseError(e: unknown): string {
  const pg = asPgLike(e);
  const raw = pg?.message ?? (typeof e === "string" ? e : "");

  // Regras de negócio (RAISE EXCEPTION com prefixos CAx/RN-xxx)
  // Ex.: "CA2: Não é permitido editar autorização já aprovada."
  const ruleMatch = raw.match(/(?:^|\s)((?:CA\d+|RN-[A-Z0-9]+)\s*:\s*[^.\n]+\.?)/);
  if (ruleMatch) return ruleMatch[1].trim();

  switch (pg?.code) {
    case "23505":
      return "Já existe um registro com esses dados.";
    case "23503":
      return "Operação inválida: existe relação com outros registros.";
    case "23502":
      return "Campo obrigatório não preenchido.";
    case "23514":
      return "Valor fora do permitido pelas regras do sistema.";
    case "42501":
    case "PGRST301":
    case "PGRST116":
      return "Você não tem permissão para esta ação.";
    case "P0001":
      // Regra de negócio sem prefixo conhecido: mostra apenas a mensagem
      return raw || "Operação não permitida pelas regras do sistema.";
    case "22P02":
      return "Formato de dado inválido.";
  }

  // RLS genérico
  if (/row-level security|violates row-level/i.test(raw)) {
    return "Você não tem permissão para esta ação.";
  }
  if (/duplicate key/i.test(raw)) {
    return "Já existe um registro com esses dados.";
  }
  if (/foreign key/i.test(raw)) {
    return "Operação inválida: existe relação com outros registros.";
  }
  if (/JWT|token|auth/i.test(raw) && /expired|invalid/i.test(raw)) {
    return "Sessão expirada. Faça login novamente.";
  }

  // Erros de rede / HTTP
  if (/Failed to fetch|NetworkError|ENETUNREACH/i.test(raw)) {
    return "Falha de conexão. Verifique sua internet e tente novamente.";
  }

  // Fallback: registra detalhe no console e mostra mensagem genérica
  // eslint-disable-next-line no-console
  console.error("[unhandled-error]", e);
  return "Não foi possível concluir a operação. Tente novamente.";
}
