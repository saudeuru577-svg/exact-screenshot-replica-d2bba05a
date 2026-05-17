
-- Enum escopo
DO $$ BEGIN
  CREATE TYPE escopo_acrescimo AS ENUM ('total','empresa');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabela limites_empresa
CREATE TABLE IF NOT EXISTS public.limites_empresa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  mes_referencia varchar(7) NOT NULL,
  valor numeric(12,2) NOT NULL CHECK (valor >= 0),
  criado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, mes_referencia)
);

ALTER TABLE public.limites_empresa ENABLE ROW LEVEL SECURITY;

CREATE POLICY limites_empresa_select ON public.limites_empresa
  FOR SELECT TO authenticated
  USING (meu_perfil() = ANY (ARRAY['administrador'::perfil_usuario,'secretaria'::perfil_usuario,'atendente'::perfil_usuario,'financeiro'::perfil_usuario]));

CREATE POLICY limites_empresa_insert ON public.limites_empresa
  FOR INSERT TO authenticated
  WITH CHECK (meu_perfil() = 'administrador'::perfil_usuario);

CREATE POLICY limites_empresa_update ON public.limites_empresa
  FOR UPDATE TO authenticated
  USING (meu_perfil() = 'administrador'::perfil_usuario);

CREATE TRIGGER set_atualizado_em_limites_empresa
  BEFORE UPDATE ON public.limites_empresa
  FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

-- Acréscimos: novos campos
ALTER TABLE public.acrescimos_gastos
  ADD COLUMN IF NOT EXISTS escopo escopo_acrescimo NOT NULL DEFAULT 'total',
  ADD COLUMN IF NOT EXISTS empresa_id uuid;

ALTER TABLE public.acrescimos_gastos
  ALTER COLUMN status SET DEFAULT 'aprovado'::status_acrescimo;

-- garante coerência escopo/empresa
ALTER TABLE public.acrescimos_gastos
  DROP CONSTRAINT IF EXISTS acrescimos_escopo_empresa_chk;
ALTER TABLE public.acrescimos_gastos
  ADD CONSTRAINT acrescimos_escopo_empresa_chk
  CHECK ((escopo = 'total' AND empresa_id IS NULL) OR (escopo = 'empresa' AND empresa_id IS NOT NULL));

-- Trigger: marca aprovado_por/data_aprovacao automaticamente
CREATE OR REPLACE FUNCTION public.acrescimo_auto_aprovar()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'aprovado' THEN
    NEW.aprovado_por := COALESCE(NEW.aprovado_por, auth.uid());
    NEW.data_aprovacao := COALESCE(NEW.data_aprovacao, now());
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS acrescimo_auto_aprovar_trg ON public.acrescimos_gastos;
CREATE TRIGGER acrescimo_auto_aprovar_trg
  BEFORE INSERT OR UPDATE ON public.acrescimos_gastos
  FOR EACH ROW EXECUTE FUNCTION public.acrescimo_auto_aprovar();

-- Nova verificação de limite (total OU empresa)
CREATE OR REPLACE FUNCTION public.verificar_limite_mensal()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_limite_base    numeric(12,2) := 130000.00;
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

  SELECT COALESCE(SUM(novo_limite - limite_atual), 0) INTO v_acresc_total
    FROM acrescimos_gastos
   WHERE mes_referencia = v_mes_ref AND status = 'aprovado' AND escopo = 'total';

  v_limite_total := v_limite_base + v_acresc_total;

  SELECT COALESCE(SUM(total_autorizado), 0) INTO v_total_mes
    FROM autorizacoes
   WHERE to_char(data_autorizacao, 'YYYY-MM') = v_mes_ref
     AND status IN ('pendente','aprovado','faturado')
     AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  -- Limite da empresa
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

  IF (v_total_mes + NEW.total_autorizado) > v_limite_total
     OR (v_total_emp_mes + NEW.total_autorizado) > v_limite_emp THEN
    NEW.status := 'bloqueado';
  END IF;

  RETURN NEW;
END $$;
