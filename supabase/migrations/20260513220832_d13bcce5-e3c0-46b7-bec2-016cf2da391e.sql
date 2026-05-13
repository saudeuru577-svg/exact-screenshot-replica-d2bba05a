
-- 1. Enum
CREATE TYPE public.status_item_faturamento AS ENUM ('pendente','confirmado','glosado');

-- 2. motivos_glosa
CREATE TABLE public.motivos_glosa (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  descricao varchar(200) NOT NULL UNIQUE,
  ativo boolean NOT NULL DEFAULT true,
  criado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.motivos_glosa ENABLE ROW LEVEL SECURITY;

CREATE POLICY motivos_glosa_select ON public.motivos_glosa FOR SELECT TO authenticated
  USING (meu_perfil() = ANY (ARRAY['administrador'::perfil_usuario,'secretaria'::perfil_usuario,'financeiro'::perfil_usuario]));
CREATE POLICY motivos_glosa_insert ON public.motivos_glosa FOR INSERT TO authenticated
  WITH CHECK (meu_perfil() = ANY (ARRAY['administrador'::perfil_usuario,'financeiro'::perfil_usuario]));
CREATE POLICY motivos_glosa_update ON public.motivos_glosa FOR UPDATE TO authenticated
  USING (meu_perfil() = 'administrador'::perfil_usuario);

-- 3. faturamentos
CREATE TABLE public.faturamentos (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  empresa_id uuid NOT NULL,
  mes_referencia varchar(7) NOT NULL,
  status varchar NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','finalizado','cancelado')),
  total_itens integer NOT NULL DEFAULT 0,
  total_pendentes integer NOT NULL DEFAULT 0,
  valor_confirmado numeric(12,2) NOT NULL DEFAULT 0,
  valor_glosado numeric(12,2) NOT NULL DEFAULT 0,
  iniciado_por uuid NOT NULL,
  iniciado_em timestamptz NOT NULL DEFAULT now(),
  finalizado_por uuid,
  finalizado_em timestamptz
);
CREATE UNIQUE INDEX uniq_faturamento_aberto
  ON public.faturamentos (empresa_id, mes_referencia)
  WHERE status = 'aberto';

ALTER TABLE public.faturamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY faturamentos_select ON public.faturamentos FOR SELECT TO authenticated
  USING (meu_perfil() = ANY (ARRAY['administrador'::perfil_usuario,'secretaria'::perfil_usuario,'financeiro'::perfil_usuario]));
CREATE POLICY faturamentos_insert ON public.faturamentos FOR INSERT TO authenticated
  WITH CHECK (meu_perfil() = ANY (ARRAY['administrador'::perfil_usuario,'financeiro'::perfil_usuario]));
CREATE POLICY faturamentos_update ON public.faturamentos FOR UPDATE TO authenticated
  USING (meu_perfil() = ANY (ARRAY['administrador'::perfil_usuario,'financeiro'::perfil_usuario]));

-- 4. itens_autorizacao - novas colunas
ALTER TABLE public.itens_autorizacao
  ADD COLUMN status_faturamento public.status_item_faturamento NOT NULL DEFAULT 'pendente',
  ADD COLUMN motivo_glosa_id   uuid REFERENCES public.motivos_glosa(id),
  ADD COLUMN observacao_glosa  text,
  ADD COLUMN mes_faturamento   varchar(7),
  ADD COLUMN data_conferencia  timestamptz,
  ADD COLUMN faturamento_id    uuid REFERENCES public.faturamentos(id) ON DELETE SET NULL,
  ADD COLUMN conferido_por     uuid;

CREATE INDEX idx_itens_autorizacao_faturamento ON public.itens_autorizacao(faturamento_id);
CREATE INDEX idx_itens_autorizacao_mes ON public.itens_autorizacao(mes_faturamento);

-- 5. abrir_faturamento (idempotente)
CREATE OR REPLACE FUNCTION public.abrir_faturamento(p_empresa uuid, p_mes varchar)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing uuid;
  v_id uuid;
BEGIN
  IF meu_perfil() NOT IN ('administrador'::perfil_usuario,'financeiro'::perfil_usuario) THEN
    RAISE EXCEPTION 'Sem permissão para abrir faturamento';
  END IF;

  SELECT id INTO v_existing
    FROM public.faturamentos
   WHERE empresa_id = p_empresa
     AND mes_referencia = p_mes
     AND status = 'aberto';
  IF FOUND THEN
    RETURN v_existing;
  END IF;

  INSERT INTO public.faturamentos (empresa_id, mes_referencia, iniciado_por)
  VALUES (p_empresa, p_mes, auth.uid())
  RETURNING id INTO v_id;

  UPDATE public.itens_autorizacao i
     SET faturamento_id = v_id,
         mes_faturamento = p_mes
    FROM public.autorizacoes a
   WHERE i.autorizacao_id = a.id
     AND a.empresa_id = p_empresa
     AND to_char(a.data_autorizacao,'YYYY-MM') = p_mes
     AND a.status IN ('pendente','aprovado')
     AND i.status_faturamento = 'pendente'
     AND i.faturamento_id IS NULL;

  -- força recálculo dos totais via trigger (UPDATE acima já dispara)
  RETURN v_id;
END;
$$;

-- 6. trigger de recálculo
CREATE OR REPLACE FUNCTION public.recalc_totais_faturamento()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_ids uuid[];
  v_id uuid;
BEGIN
  v_ids := ARRAY[]::uuid[];
  IF TG_OP IN ('UPDATE','DELETE') AND OLD.faturamento_id IS NOT NULL THEN
    v_ids := array_append(v_ids, OLD.faturamento_id);
  END IF;
  IF TG_OP IN ('INSERT','UPDATE') AND NEW.faturamento_id IS NOT NULL THEN
    IF NOT (NEW.faturamento_id = ANY(v_ids)) THEN
      v_ids := array_append(v_ids, NEW.faturamento_id);
    END IF;
  END IF;

  FOREACH v_id IN ARRAY v_ids LOOP
    UPDATE public.faturamentos f SET
      total_itens      = (SELECT COUNT(*) FROM public.itens_autorizacao WHERE faturamento_id = v_id),
      total_pendentes  = (SELECT COUNT(*) FROM public.itens_autorizacao WHERE faturamento_id = v_id AND status_faturamento = 'pendente'),
      valor_confirmado = (SELECT COALESCE(SUM(valor_total),0) FROM public.itens_autorizacao WHERE faturamento_id = v_id AND status_faturamento = 'confirmado'),
      valor_glosado    = (SELECT COALESCE(SUM(valor_total),0) FROM public.itens_autorizacao WHERE faturamento_id = v_id AND status_faturamento = 'glosado')
    WHERE f.id = v_id;
  END LOOP;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

CREATE TRIGGER trg_recalc_totais_faturamento
AFTER INSERT OR UPDATE OR DELETE ON public.itens_autorizacao
FOR EACH ROW EXECUTE FUNCTION public.recalc_totais_faturamento();
