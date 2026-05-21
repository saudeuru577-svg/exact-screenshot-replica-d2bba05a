-- 1) Tabela de limites globais
CREATE TABLE IF NOT EXISTS public.limites_globais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mes_referencia text NOT NULL UNIQUE,
  valor numeric(12,2) NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.limites_globais ENABLE ROW LEVEL SECURITY;

CREATE POLICY limites_globais_select ON public.limites_globais
  FOR SELECT TO authenticated
  USING (meu_perfil() = ANY (ARRAY['administrador'::perfil_usuario,'secretaria'::perfil_usuario,'atendente'::perfil_usuario,'financeiro'::perfil_usuario]));

CREATE POLICY limites_globais_insert ON public.limites_globais
  FOR INSERT TO authenticated
  WITH CHECK (meu_perfil() = 'administrador'::perfil_usuario);

CREATE POLICY limites_globais_update ON public.limites_globais
  FOR UPDATE TO authenticated
  USING (meu_perfil() = 'administrador'::perfil_usuario);

CREATE POLICY limites_globais_delete ON public.limites_globais
  FOR DELETE TO authenticated
  USING (meu_perfil() = 'administrador'::perfil_usuario);

CREATE TRIGGER limites_globais_atualizado_em
  BEFORE UPDATE ON public.limites_globais
  FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

INSERT INTO public.limites_globais (mes_referencia, valor)
  VALUES ('default', 130000)
  ON CONFLICT (mes_referencia) DO NOTHING;

-- 2) Coluna motivo_bloqueio em autorizacoes
ALTER TABLE public.autorizacoes ADD COLUMN IF NOT EXISTS motivo_bloqueio text;

-- 3) handle_new_auth_user: ignora perfil/ativo do metadata
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.usuarios (id, nome, email, perfil, ativo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    'atendente'::perfil_usuario,
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;

-- 4) verificar_limite_mensal: lê limite da tabela e grava motivo
CREATE OR REPLACE FUNCTION public.verificar_limite_mensal()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_limite_base    numeric(12,2);
  v_acresc_total   numeric(12,2);
  v_acresc_emp     numeric(12,2);
  v_limite_total   numeric(12,2);
  v_limite_emp     numeric(12,2);
  v_base_emp       numeric(12,2);
  v_total_mes      numeric(12,2);
  v_total_emp_mes  numeric(12,2);
  v_mes_ref        text;
BEGIN
  v_mes_ref := to_char(NEW.data_autorizacao, 'YYYY-MM');

  -- Limite base: tenta mês específico, senão usa 'default'
  SELECT valor INTO v_limite_base
    FROM limites_globais
   WHERE mes_referencia = v_mes_ref;
  IF v_limite_base IS NULL THEN
    SELECT valor INTO v_limite_base
      FROM limites_globais
     WHERE mes_referencia = 'default';
  END IF;
  v_limite_base := COALESCE(v_limite_base, 130000.00);

  SELECT COALESCE(SUM(novo_limite - limite_atual), 0) INTO v_acresc_total
    FROM acrescimos_gastos
   WHERE mes_referencia = v_mes_ref AND status = 'aprovado' AND escopo = 'total';

  v_limite_total := v_limite_base + v_acresc_total;

  SELECT COALESCE(SUM(total_autorizado), 0) INTO v_total_mes
    FROM autorizacoes
   WHERE to_char(data_autorizacao, 'YYYY-MM') = v_mes_ref
     AND status IN ('pendente','aprovado','faturado')
     AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  SELECT COALESCE(valor, 0) INTO v_base_emp
    FROM limites_empresa
   WHERE empresa_id = NEW.empresa_id AND mes_referencia = v_mes_ref;
  v_base_emp := COALESCE(v_base_emp, 0);

  SELECT COALESCE(SUM(novo_limite - limite_atual), 0) INTO v_acresc_emp
    FROM acrescimos_gastos
   WHERE mes_referencia = v_mes_ref AND status = 'aprovado'
     AND escopo = 'empresa' AND empresa_id = NEW.empresa_id;

  v_limite_emp := v_base_emp + v_acresc_emp;

  SELECT COALESCE(SUM(total_autorizado), 0) INTO v_total_emp_mes
    FROM autorizacoes
   WHERE to_char(data_autorizacao, 'YYYY-MM') = v_mes_ref
     AND empresa_id = NEW.empresa_id
     AND status IN ('pendente','aprovado','faturado')
     AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF (v_total_mes + NEW.total_autorizado) > v_limite_total THEN
    NEW.status := 'bloqueado';
    NEW.motivo_bloqueio := 'Limite mensal total excedido (limite: ' || v_limite_total::text || ')';
  ELSIF (v_total_emp_mes + NEW.total_autorizado) > v_limite_emp THEN
    NEW.status := 'bloqueado';
    NEW.motivo_bloqueio := 'Limite mensal da empresa excedido (limite: ' || v_limite_emp::text || ')';
  END IF;

  RETURN NEW;
END $function$;