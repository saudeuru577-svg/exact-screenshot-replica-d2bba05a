CREATE OR REPLACE FUNCTION public.meu_perfil()
RETURNS public.perfil_usuario
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.perfil
  FROM public.usuarios u
  WHERE u.id = auth.uid()
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.meu_perfil() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.meu_perfil() TO authenticated;