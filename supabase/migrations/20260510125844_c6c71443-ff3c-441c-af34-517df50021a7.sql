
-- Trigger: ao criar usuário no Auth, espelhar em public.usuarios
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usuarios (id, nome, email, perfil, ativo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'perfil')::perfil_usuario, 'atendente'::perfil_usuario),
    COALESCE((NEW.raw_user_meta_data->>'ativo')::boolean, false)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Triggers de atualizado_em para tabelas que precisam
DROP TRIGGER IF EXISTS set_atualizado_em_usuarios ON public.usuarios;
CREATE TRIGGER set_atualizado_em_usuarios BEFORE UPDATE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

DROP TRIGGER IF EXISTS set_atualizado_em_pacientes ON public.pacientes;
CREATE TRIGGER set_atualizado_em_pacientes BEFORE UPDATE ON public.pacientes
  FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

DROP TRIGGER IF EXISTS set_atualizado_em_empresas ON public.empresas;
CREATE TRIGGER set_atualizado_em_empresas BEFORE UPDATE ON public.empresas
  FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

DROP TRIGGER IF EXISTS set_atualizado_em_ubs ON public.ubs;
CREATE TRIGGER set_atualizado_em_ubs BEFORE UPDATE ON public.ubs
  FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

DROP TRIGGER IF EXISTS set_atualizado_em_profissionais ON public.profissionais;
CREATE TRIGGER set_atualizado_em_profissionais BEFORE UPDATE ON public.profissionais
  FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

DROP TRIGGER IF EXISTS set_atualizado_em_bairros ON public.bairros;
CREATE TRIGGER set_atualizado_em_bairros BEFORE UPDATE ON public.bairros
  FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

DROP TRIGGER IF EXISTS set_atualizado_em_povoados ON public.povoados;
CREATE TRIGGER set_atualizado_em_povoados BEFORE UPDATE ON public.povoados
  FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

-- Bucket de storage para autorizações
INSERT INTO storage.buckets (id, name, public)
VALUES ('autorizacoes', 'autorizacoes', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "autorizacoes_select_auth"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'autorizacoes');

CREATE POLICY "autorizacoes_insert_auth"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'autorizacoes');

CREATE POLICY "autorizacoes_update_admin"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'autorizacoes' AND public.meu_perfil() = 'administrador'::perfil_usuario);

CREATE POLICY "autorizacoes_delete_admin"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'autorizacoes' AND public.meu_perfil() = 'administrador'::perfil_usuario);
