-- Allow secretaria to insert/select signatures for acrescimos (in same bucket)
DROP POLICY IF EXISTS "autorizacoes_insert_auth" ON storage.objects;
CREATE POLICY "autorizacoes_insert_auth" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'autorizacoes' AND (
      (meu_perfil() = ANY (ARRAY['administrador'::perfil_usuario, 'atendente'::perfil_usuario]))
      OR (meu_perfil() = 'secretaria'::perfil_usuario AND (storage.foldername(name))[1] = 'acrescimos')
    )
  );

DROP POLICY IF EXISTS "autorizacoes_select_auth" ON storage.objects;
CREATE POLICY "autorizacoes_select_auth" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'autorizacoes' AND meu_perfil() = ANY (ARRAY['administrador'::perfil_usuario, 'secretaria'::perfil_usuario, 'atendente'::perfil_usuario, 'financeiro'::perfil_usuario])
  );