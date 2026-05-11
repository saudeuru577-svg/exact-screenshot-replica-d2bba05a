
-- 1. Restrict SELECT policies to authenticated staff
DROP POLICY IF EXISTS autorizacoes_select ON public.autorizacoes;
CREATE POLICY autorizacoes_select ON public.autorizacoes FOR SELECT TO authenticated
USING (meu_perfil() = ANY (ARRAY['administrador'::perfil_usuario, 'secretaria'::perfil_usuario, 'atendente'::perfil_usuario, 'financeiro'::perfil_usuario]));

DROP POLICY IF EXISTS empresas_select ON public.empresas;
CREATE POLICY empresas_select ON public.empresas FOR SELECT TO authenticated
USING (meu_perfil() = ANY (ARRAY['administrador'::perfil_usuario, 'secretaria'::perfil_usuario, 'atendente'::perfil_usuario, 'financeiro'::perfil_usuario]));

DROP POLICY IF EXISTS profissionais_select ON public.profissionais;
CREATE POLICY profissionais_select ON public.profissionais FOR SELECT TO authenticated
USING (meu_perfil() = ANY (ARRAY['administrador'::perfil_usuario, 'secretaria'::perfil_usuario, 'atendente'::perfil_usuario, 'financeiro'::perfil_usuario]));

DROP POLICY IF EXISTS itens_select ON public.itens_autorizacao;
CREATE POLICY itens_select ON public.itens_autorizacao FOR SELECT TO authenticated
USING (meu_perfil() = ANY (ARRAY['administrador'::perfil_usuario, 'secretaria'::perfil_usuario, 'atendente'::perfil_usuario, 'financeiro'::perfil_usuario]));

-- Also tighten reference tables (still readable by all logged-in staff, but not anon)
DROP POLICY IF EXISTS bairros_select ON public.bairros;
CREATE POLICY bairros_select ON public.bairros FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS povoados_select ON public.povoados;
CREATE POLICY povoados_select ON public.povoados FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS procedimentos_select ON public.procedimentos;
CREATE POLICY procedimentos_select ON public.procedimentos FOR SELECT TO authenticated USING (true);

-- 2. logs_insert: only triggers (SECURITY DEFINER) should write; deny direct user inserts
DROP POLICY IF EXISTS logs_insert ON public.logs_auditoria;
CREATE POLICY logs_insert ON public.logs_auditoria FOR INSERT TO authenticated
WITH CHECK (false);

-- 3. Storage: restrict autorizacoes bucket access to staff who handle authorizations
DROP POLICY IF EXISTS autorizacoes_select_auth ON storage.objects;
CREATE POLICY autorizacoes_select_auth ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'autorizacoes' AND meu_perfil() = ANY (ARRAY['administrador'::perfil_usuario, 'secretaria'::perfil_usuario, 'atendente'::perfil_usuario, 'financeiro'::perfil_usuario]));

DROP POLICY IF EXISTS autorizacoes_insert_auth ON storage.objects;
CREATE POLICY autorizacoes_insert_auth ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'autorizacoes' AND meu_perfil() = ANY (ARRAY['administrador'::perfil_usuario, 'atendente'::perfil_usuario]));

-- 4. Add fixed search_path to functions missing it
ALTER FUNCTION public.gerar_num_aut() SET search_path = public;
ALTER FUNCTION public.atualizar_total_autorizacao() SET search_path = public;
ALTER FUNCTION public.set_atualizado_em() SET search_path = public;
ALTER FUNCTION public.bloquear_edicao_autorizacao_aprovada() SET search_path = public;
ALTER FUNCTION public.bloquear_alteracao_data_autorizacao() SET search_path = public;
ALTER FUNCTION public.bloquear_edicao_faturamento_fechado() SET search_path = public;
ALTER FUNCTION public.verificar_limite_mensal() SET search_path = public;
ALTER FUNCTION public.meu_perfil() SET search_path = public;

-- 5. Recreate view with security_invoker so it respects caller's RLS instead of creator's
DROP VIEW IF EXISTS public.vw_orcamento_mes_atual;
CREATE VIEW public.vw_orcamento_mes_atual
WITH (security_invoker = true) AS
SELECT 130000.00 AS limite_base,
    COALESCE(sum((novo_limite - limite_atual)), 0::numeric) AS acrescimos_aprovados,
    (130000.00 + COALESCE(sum((novo_limite - limite_atual)), 0::numeric)) AS limite_atual,
    COALESCE((SELECT sum(a.total_autorizado) FROM autorizacoes a
        WHERE to_char(a.data_autorizacao::timestamptz, 'YYYY-MM') = to_char(CURRENT_DATE::timestamptz, 'YYYY-MM')
        AND a.status = ANY (ARRAY['pendente'::status_autorizacao, 'aprovado'::status_autorizacao, 'faturado'::status_autorizacao])), 0::numeric) AS total_autorizado_mes,
    ((130000.00 + COALESCE(sum((novo_limite - limite_atual)), 0::numeric))
     - COALESCE((SELECT sum(a.total_autorizado) FROM autorizacoes a
        WHERE to_char(a.data_autorizacao::timestamptz, 'YYYY-MM') = to_char(CURRENT_DATE::timestamptz, 'YYYY-MM')
        AND a.status = ANY (ARRAY['pendente'::status_autorizacao, 'aprovado'::status_autorizacao, 'faturado'::status_autorizacao])), 0::numeric)) AS saldo_disponivel
FROM acrescimos_gastos ag
WHERE mes_referencia::text = to_char(CURRENT_DATE::timestamptz, 'YYYY-MM')
  AND status = 'aprovado'::status_acrescimo;

-- 6. Revoke EXECUTE on SECURITY DEFINER functions from anon (they aren't called by anonymous users)
-- meu_perfil() is needed by authenticated for RLS evaluation, so keep that grant.
REVOKE EXECUTE ON FUNCTION public.meu_perfil() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.meu_perfil() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated, public;
