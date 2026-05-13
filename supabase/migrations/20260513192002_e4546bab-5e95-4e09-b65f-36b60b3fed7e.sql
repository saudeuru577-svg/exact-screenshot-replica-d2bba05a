CREATE OR REPLACE FUNCTION public.verificar_limite_mensal()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_limite_base    DECIMAL(12,2) := 130000.00;
    v_acrescimos     DECIMAL(12,2);
    v_limite_atual   DECIMAL(12,2);
    v_total_mes      DECIMAL(12,2);
    v_mes_ref        TEXT;
BEGIN
    v_mes_ref := TO_CHAR(NEW.data_autorizacao, 'YYYY-MM');

    SELECT COALESCE(SUM(novo_limite - limite_atual), 0)
      INTO v_acrescimos
      FROM acrescimos_gastos
     WHERE mes_referencia = v_mes_ref
       AND status = 'aprovado';

    v_limite_atual := v_limite_base + v_acrescimos;

    SELECT COALESCE(SUM(total_autorizado), 0)
      INTO v_total_mes
      FROM autorizacoes
     WHERE TO_CHAR(data_autorizacao, 'YYYY-MM') = v_mes_ref
       AND status IN ('pendente', 'aprovado', 'faturado')
       AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

    IF (v_total_mes + NEW.total_autorizado) > v_limite_atual THEN
        NEW.status := 'bloqueado';
    END IF;

    RETURN NEW;
END;
$function$;