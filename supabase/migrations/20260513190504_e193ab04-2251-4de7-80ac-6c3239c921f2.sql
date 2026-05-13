-- Tighten all policies to authenticated role; preserve existing logic
-- pacientes
DROP POLICY IF EXISTS pacientes_insert ON public.pacientes;
DROP POLICY IF EXISTS pacientes_select ON public.pacientes;
DROP POLICY IF EXISTS pacientes_update ON public.pacientes;
CREATE POLICY pacientes_insert ON public.pacientes FOR INSERT TO authenticated
  WITH CHECK (meu_perfil() = ANY (ARRAY['administrador'::perfil_usuario, 'atendente'::perfil_usuario]));
CREATE POLICY pacientes_select ON public.pacientes FOR SELECT TO authenticated
  USING (meu_perfil() = ANY (ARRAY['administrador'::perfil_usuario, 'secretaria'::perfil_usuario, 'atendente'::perfil_usuario]));
CREATE POLICY pacientes_update ON public.pacientes FOR UPDATE TO authenticated
  USING ((meu_perfil() = 'administrador'::perfil_usuario) OR ((meu_perfil() = 'atendente'::perfil_usuario) AND (criado_por = auth.uid())));

-- autorizacoes
DROP POLICY IF EXISTS autorizacoes_insert ON public.autorizacoes;
DROP POLICY IF EXISTS autorizacoes_update ON public.autorizacoes;
DROP POLICY IF EXISTS autorizacoes_delete ON public.autorizacoes;
CREATE POLICY autorizacoes_insert ON public.autorizacoes FOR INSERT TO authenticated
  WITH CHECK (meu_perfil() = ANY (ARRAY['administrador'::perfil_usuario, 'atendente'::perfil_usuario]));
CREATE POLICY autorizacoes_update ON public.autorizacoes FOR UPDATE TO authenticated
  USING ((meu_perfil() = 'administrador'::perfil_usuario) OR ((meu_perfil() = 'atendente'::perfil_usuario) AND (status = 'pendente'::status_autorizacao) AND (criado_por = auth.uid())));
CREATE POLICY autorizacoes_delete ON public.autorizacoes FOR DELETE TO authenticated
  USING (meu_perfil() = 'administrador'::perfil_usuario);

-- itens_autorizacao
DROP POLICY IF EXISTS itens_insert ON public.itens_autorizacao;
DROP POLICY IF EXISTS itens_update ON public.itens_autorizacao;
DROP POLICY IF EXISTS itens_delete ON public.itens_autorizacao;
CREATE POLICY itens_insert ON public.itens_autorizacao FOR INSERT TO authenticated
  WITH CHECK (meu_perfil() = ANY (ARRAY['administrador'::perfil_usuario, 'atendente'::perfil_usuario]));
CREATE POLICY itens_update ON public.itens_autorizacao FOR UPDATE TO authenticated
  USING (meu_perfil() = 'administrador'::perfil_usuario);
CREATE POLICY itens_delete ON public.itens_autorizacao FOR DELETE TO authenticated
  USING (meu_perfil() = 'administrador'::perfil_usuario);

-- usuarios
DROP POLICY IF EXISTS usuarios_insert ON public.usuarios;
DROP POLICY IF EXISTS usuarios_select ON public.usuarios;
DROP POLICY IF EXISTS usuarios_update ON public.usuarios;
CREATE POLICY usuarios_insert ON public.usuarios FOR INSERT TO authenticated
  WITH CHECK (meu_perfil() = 'administrador'::perfil_usuario);
CREATE POLICY usuarios_select ON public.usuarios FOR SELECT TO authenticated
  USING ((id = auth.uid()) OR (meu_perfil() = 'administrador'::perfil_usuario));
CREATE POLICY usuarios_update ON public.usuarios FOR UPDATE TO authenticated
  USING (meu_perfil() = 'administrador'::perfil_usuario);

-- ubs
DROP POLICY IF EXISTS ubs_insert ON public.ubs;
DROP POLICY IF EXISTS ubs_select ON public.ubs;
DROP POLICY IF EXISTS ubs_update ON public.ubs;
CREATE POLICY ubs_insert ON public.ubs FOR INSERT TO authenticated
  WITH CHECK (meu_perfil() = 'administrador'::perfil_usuario);
CREATE POLICY ubs_select ON public.ubs FOR SELECT TO authenticated USING (true);
CREATE POLICY ubs_update ON public.ubs FOR UPDATE TO authenticated
  USING (meu_perfil() = 'administrador'::perfil_usuario);

-- empresas
DROP POLICY IF EXISTS empresas_insert ON public.empresas;
DROP POLICY IF EXISTS empresas_update ON public.empresas;
CREATE POLICY empresas_insert ON public.empresas FOR INSERT TO authenticated
  WITH CHECK (meu_perfil() = 'administrador'::perfil_usuario);
CREATE POLICY empresas_update ON public.empresas FOR UPDATE TO authenticated
  USING (meu_perfil() = 'administrador'::perfil_usuario);

-- bairros
DROP POLICY IF EXISTS bairros_insert ON public.bairros;
DROP POLICY IF EXISTS bairros_update ON public.bairros;
CREATE POLICY bairros_insert ON public.bairros FOR INSERT TO authenticated
  WITH CHECK (meu_perfil() = 'administrador'::perfil_usuario);
CREATE POLICY bairros_update ON public.bairros FOR UPDATE TO authenticated
  USING (meu_perfil() = 'administrador'::perfil_usuario);

-- povoados
DROP POLICY IF EXISTS povoados_insert ON public.povoados;
DROP POLICY IF EXISTS povoados_update ON public.povoados;
CREATE POLICY povoados_insert ON public.povoados FOR INSERT TO authenticated
  WITH CHECK (meu_perfil() = 'administrador'::perfil_usuario);
CREATE POLICY povoados_update ON public.povoados FOR UPDATE TO authenticated
  USING (meu_perfil() = 'administrador'::perfil_usuario);

-- procedimentos
DROP POLICY IF EXISTS procedimentos_insert ON public.procedimentos;
DROP POLICY IF EXISTS procedimentos_update ON public.procedimentos;
CREATE POLICY procedimentos_insert ON public.procedimentos FOR INSERT TO authenticated
  WITH CHECK (meu_perfil() = 'administrador'::perfil_usuario);
CREATE POLICY procedimentos_update ON public.procedimentos FOR UPDATE TO authenticated
  USING (meu_perfil() = 'administrador'::perfil_usuario);

-- profissionais
DROP POLICY IF EXISTS profissionais_insert ON public.profissionais;
DROP POLICY IF EXISTS profissionais_update ON public.profissionais;
CREATE POLICY profissionais_insert ON public.profissionais FOR INSERT TO authenticated
  WITH CHECK (meu_perfil() = 'administrador'::perfil_usuario);
CREATE POLICY profissionais_update ON public.profissionais FOR UPDATE TO authenticated
  USING (meu_perfil() = 'administrador'::perfil_usuario);

-- acrescimos_gastos
DROP POLICY IF EXISTS acrescimos_insert ON public.acrescimos_gastos;
DROP POLICY IF EXISTS acrescimos_select ON public.acrescimos_gastos;
DROP POLICY IF EXISTS acrescimos_update ON public.acrescimos_gastos;
CREATE POLICY acrescimos_insert ON public.acrescimos_gastos FOR INSERT TO authenticated
  WITH CHECK (meu_perfil() = ANY (ARRAY['administrador'::perfil_usuario, 'secretaria'::perfil_usuario]));
CREATE POLICY acrescimos_select ON public.acrescimos_gastos FOR SELECT TO authenticated
  USING (meu_perfil() = ANY (ARRAY['administrador'::perfil_usuario, 'secretaria'::perfil_usuario, 'financeiro'::perfil_usuario]));
CREATE POLICY acrescimos_update ON public.acrescimos_gastos FOR UPDATE TO authenticated
  USING (meu_perfil() = 'administrador'::perfil_usuario);

-- logs_auditoria
DROP POLICY IF EXISTS logs_select ON public.logs_auditoria;
CREATE POLICY logs_select ON public.logs_auditoria FOR SELECT TO authenticated
  USING (meu_perfil() = 'administrador'::perfil_usuario);