
CREATE POLICY usuarios_delete ON public.usuarios
  FOR DELETE TO authenticated
  USING (meu_perfil() = 'administrador'::perfil_usuario);

CREATE POLICY pacientes_delete ON public.pacientes
  FOR DELETE TO authenticated
  USING (meu_perfil() = 'administrador'::perfil_usuario);

CREATE POLICY acrescimos_delete ON public.acrescimos_gastos
  FOR DELETE TO authenticated
  USING (meu_perfil() = 'administrador'::perfil_usuario);

CREATE POLICY faturamentos_delete ON public.faturamentos
  FOR DELETE TO authenticated
  USING (meu_perfil() = 'administrador'::perfil_usuario);

CREATE POLICY limites_empresa_delete ON public.limites_empresa
  FOR DELETE TO authenticated
  USING (meu_perfil() = 'administrador'::perfil_usuario);

REVOKE EXECUTE ON FUNCTION public.meu_perfil() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.acrescimo_auto_aprovar() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.verificar_limite_mensal() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.atualizar_total_autorizacao() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_atualizado_em() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalc_totais_faturamento() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bloquear_edicao_autorizacao_aprovada() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bloquear_alteracao_data_autorizacao() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bloquear_edicao_faturamento_fechado() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.gerar_num_aut() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.abrir_faturamento(uuid, character varying) FROM PUBLIC, anon;
