CREATE TABLE public.permissoes_usuario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  tela text NOT NULL,
  permitido boolean NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (usuario_id, tela)
);

ALTER TABLE public.permissoes_usuario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "permissoes_select"
ON public.permissoes_usuario FOR SELECT TO authenticated
USING (usuario_id = auth.uid() OR meu_perfil() = 'administrador'::perfil_usuario);

CREATE POLICY "permissoes_insert"
ON public.permissoes_usuario FOR INSERT TO authenticated
WITH CHECK (meu_perfil() = 'administrador'::perfil_usuario);

CREATE POLICY "permissoes_update"
ON public.permissoes_usuario FOR UPDATE TO authenticated
USING (meu_perfil() = 'administrador'::perfil_usuario);

CREATE POLICY "permissoes_delete"
ON public.permissoes_usuario FOR DELETE TO authenticated
USING (meu_perfil() = 'administrador'::perfil_usuario);

CREATE TRIGGER trg_permissoes_usuario_atualizado
BEFORE UPDATE ON public.permissoes_usuario
FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

CREATE INDEX idx_permissoes_usuario_uid ON public.permissoes_usuario(usuario_id);