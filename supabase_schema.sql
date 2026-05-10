-- =============================================================================
-- SISTEMA MUNICIPAL DE AUTORIZAÇÃO DE EXAMES
-- Schema completo para Supabase (PostgreSQL)
-- Inclui: Tabelas, Enums, Constraints, RLS, Triggers, Funções
-- =============================================================================


-- =============================================================================
-- 0. EXTENSÕES
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- =============================================================================
-- 1. ENUMS
-- =============================================================================

CREATE TYPE perfil_usuario     AS ENUM ('administrador', 'secretaria', 'atendente', 'financeiro');
CREATE TYPE zona_tipo           AS ENUM ('urbana', 'rural');
CREATE TYPE sexo_tipo           AS ENUM ('masculino', 'feminino');
CREATE TYPE cargo_profissional  AS ENUM ('medico', 'enfermeiro');
CREATE TYPE conselho_tipo       AS ENUM ('CRM', 'COREN');
CREATE TYPE tipo_procedimento   AS ENUM ('exame', 'consulta');
CREATE TYPE tipo_servico_emp    AS ENUM ('laboratorio', 'clinica', 'hospital', 'outro');
CREATE TYPE status_autorizacao  AS ENUM ('pendente', 'aprovado', 'bloqueado', 'cancelado');
CREATE TYPE status_acrescimo    AS ENUM ('pendente', 'aprovado', 'rejeitado');
CREATE TYPE status_faturamento  AS ENUM ('aberto', 'enviado', 'parcialmente_glosado', 'fechado');
CREATE TYPE acao_log            AS ENUM ('INSERT', 'UPDATE', 'DELETE', 'TENTATIVA_VIOLACAO');


-- =============================================================================
-- 2. TABELAS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- usuarios
-- Nota: Supabase gerencia auth.users. Esta tabela armazena perfil e metadados.
-- O id deve corresponder ao auth.users.id do Supabase Auth.
-- -----------------------------------------------------------------------------
CREATE TABLE usuarios (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome            VARCHAR(150) NOT NULL,
    email           VARCHAR(255) NOT NULL UNIQUE,
    perfil          perfil_usuario NOT NULL,
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_usuario_nome
        CHECK (nome ~ '^[A-Za-zÀ-ÿ]+(?:\s[A-Za-zÀ-ÿ]+)*$'
           AND char_length(nome) BETWEEN 3 AND 150)
);

-- -----------------------------------------------------------------------------
-- bairros
-- -----------------------------------------------------------------------------
CREATE TABLE bairros (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome            VARCHAR(100) NOT NULL UNIQUE,
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_por      UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_bairro_nome
        CHECK (nome ~ '^[A-Za-zÀ-ÿ]+(?:\s[A-Za-zÀ-ÿ]+)*$'
           AND char_length(nome) BETWEEN 3 AND 100)
);

-- -----------------------------------------------------------------------------
-- povoados
-- -----------------------------------------------------------------------------
CREATE TABLE povoados (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome            VARCHAR(100) NOT NULL UNIQUE,
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_por      UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_povoado_nome
        CHECK (nome ~ '^[A-Za-zÀ-ÿ]+(?:\s[A-Za-zÀ-ÿ]+)*$'
           AND char_length(nome) BETWEEN 3 AND 100)
);

-- -----------------------------------------------------------------------------
-- ubs
-- -----------------------------------------------------------------------------
CREATE TABLE ubs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_posto        VARCHAR(20) NOT NULL UNIQUE,
    cnes            VARCHAR(15) NOT NULL UNIQUE,
    nome_posto      VARCHAR(150) NOT NULL,
    endereco        VARCHAR(200) NOT NULL,
    bairro          VARCHAR(100) NOT NULL,
    zona            zona_tipo NOT NULL,
    contato         VARCHAR(20),
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- cnes apenas números
    CONSTRAINT chk_ubs_cnes
        CHECK (cnes ~ '^[0-9]+$'),

    -- nome apenas letras
    CONSTRAINT chk_ubs_nome
        CHECK (nome_posto ~ '^[A-Za-zÀ-ÿ]+(?:[\s\-][A-Za-zÀ-ÿ0-9]+)*$'
           AND char_length(nome_posto) BETWEEN 3 AND 150)
);

-- -----------------------------------------------------------------------------
-- profissionais
-- -----------------------------------------------------------------------------
CREATE TABLE profissionais (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome_profissional   VARCHAR(150) NOT NULL,
    cargo               cargo_profissional NOT NULL,
    especialidade       VARCHAR(150),
    conselho            conselho_tipo NOT NULL,
    numero_conselho     VARCHAR(20) NOT NULL,
    estado_conselho     VARCHAR(2) NOT NULL,
    ubs_id              UUID NOT NULL REFERENCES ubs(id) ON DELETE RESTRICT,
    contato             VARCHAR(20),
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- RN-PROF2: cargo x conselho
    CONSTRAINT chk_profissional_conselho
        CHECK (
            (cargo = 'medico'    AND conselho = 'CRM') OR
            (cargo = 'enfermeiro' AND conselho = 'COREN')
        ),

    -- numero_conselho apenas números
    CONSTRAINT chk_profissional_num_conselho
        CHECK (numero_conselho ~ '^[0-9]+$'),

    -- estado_conselho: 2 letras maiúsculas
    CONSTRAINT chk_profissional_estado
        CHECK (estado_conselho ~ '^[A-Z]{2}$'),

    -- nome apenas letras
    CONSTRAINT chk_profissional_nome
        CHECK (nome_profissional ~ '^[A-Za-zÀ-ÿ]+(?:\s[A-Za-zÀ-ÿ]+)*$'
           AND char_length(nome_profissional) BETWEEN 3 AND 150)
);

-- -----------------------------------------------------------------------------
-- empresas
-- -----------------------------------------------------------------------------
CREATE TABLE empresas (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome_fantasia        VARCHAR(150) NOT NULL,
    razao_social         VARCHAR(150) NOT NULL,
    cnpj                 VARCHAR(18) NOT NULL UNIQUE,
    inscricao_estadual   VARCHAR(30),
    telefone             VARCHAR(20),
    email                VARCHAR(255),
    endereco             VARCHAR(200),
    bairro               VARCHAR(100),
    cidade               VARCHAR(100),
    estado               VARCHAR(2),
    cep                  VARCHAR(10),
    responsavel_contrato VARCHAR(150),
    tipo_servico         tipo_servico_emp NOT NULL,
    contrato_numero      VARCHAR(50),
    contrato_inicio      DATE,
    contrato_fim         DATE,
    ativa                BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- contrato_fim deve ser após contrato_inicio
    CONSTRAINT chk_empresa_contrato_datas
        CHECK (contrato_fim IS NULL OR contrato_inicio IS NULL OR contrato_fim >= contrato_inicio)
);

-- -----------------------------------------------------------------------------
-- pacientes
-- -----------------------------------------------------------------------------
CREATE TABLE pacientes (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome              VARCHAR(150) NOT NULL,
    cartao_sus        VARCHAR(15) UNIQUE,
    dtn               DATE NOT NULL,
    sexo              sexo_tipo NOT NULL,
    zona              zona_tipo NOT NULL,
    rua               VARCHAR(150),
    numero            VARCHAR(10),
    bairro_id         UUID REFERENCES bairros(id) ON DELETE RESTRICT,
    povoado_id        UUID REFERENCES povoados(id) ON DELETE RESTRICT,
    ponto_referencia  VARCHAR(200),
    nome_da_mae       VARCHAR(150) NOT NULL,
    naturalidade      VARCHAR(100),
    criado_por        UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- nome apenas letras
    CONSTRAINT chk_paciente_nome
        CHECK (nome ~ '^[A-Za-zÀ-ÿ]+(?:\s[A-Za-zÀ-ÿ]+)*$'
           AND char_length(nome) BETWEEN 3 AND 150),

    -- nome_da_mae apenas letras
    CONSTRAINT chk_paciente_nome_mae
        CHECK (nome_da_mae ~ '^[A-Za-zÀ-ÿ]+(?:\s[A-Za-zÀ-ÿ]+)*$'
           AND char_length(nome_da_mae) BETWEEN 3 AND 150),

    -- RN-PAC3: zona urbana exige rua, numero, bairro_id
    CONSTRAINT chk_paciente_zona_urbana
        CHECK (
            zona <> 'urbana' OR
            (rua IS NOT NULL AND numero IS NOT NULL AND bairro_id IS NOT NULL)
        ),

    -- RN-PAC3: zona rural exige povoado_id
    CONSTRAINT chk_paciente_zona_rural
        CHECK (
            zona <> 'rural' OR
            (povoado_id IS NOT NULL)
        ),

    -- dtn não pode ser data futura
    CONSTRAINT chk_paciente_dtn
        CHECK (dtn <= CURRENT_DATE),

    -- Unicidade: mesmo nome + mesma data de nascimento (RN-PAC1)
    UNIQUE (nome, dtn)
);

-- Coluna virtual: idade calculada (gerada pelo banco, não editável)
ALTER TABLE pacientes
    ADD COLUMN idade_calculada INTEGER GENERATED ALWAYS AS (
        DATE_PART('year', AGE(CURRENT_DATE, dtn))::INTEGER
    ) STORED;

-- -----------------------------------------------------------------------------
-- procedimentos
-- -----------------------------------------------------------------------------
CREATE TABLE procedimentos (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id          UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
    sigla               VARCHAR(20) NOT NULL,
    nome                VARCHAR(150) NOT NULL,
    nomes_alternativos  TEXT,
    grupo               VARCHAR(100) NOT NULL,
    tipo                tipo_procedimento NOT NULL,
    valor_unitario      DECIMAL(12,2) NOT NULL,
    ativo               BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- valor_unitario > 0
    CONSTRAINT chk_procedimento_valor
        CHECK (valor_unitario > 0)
);

-- -----------------------------------------------------------------------------
-- autorizacoes
-- -----------------------------------------------------------------------------
CREATE TABLE autorizacoes (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    num_aut              VARCHAR(20) NOT NULL UNIQUE,
    paciente_id          UUID NOT NULL REFERENCES pacientes(id) ON DELETE RESTRICT,
    profissional_id      UUID NOT NULL REFERENCES profissionais(id) ON DELETE RESTRICT,
    ubs_id               UUID NOT NULL REFERENCES ubs(id) ON DELETE RESTRICT,
    empresa_id           UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
    sintomas             TEXT,
    foto_requisicao      VARCHAR(500),
    assinatura_paciente  VARCHAR(500) NOT NULL,
    assinatura_atendente VARCHAR(500) NOT NULL,
    qr_code              VARCHAR(500) NOT NULL,
    pdf_autorizacao      VARCHAR(500) NOT NULL,
    total_autorizado     DECIMAL(12,2) NOT NULL DEFAULT 0,
    status               status_autorizacao NOT NULL DEFAULT 'pendente',
    data_autorizacao     DATE NOT NULL,
    criado_por           UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    criado_em            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- CA1: data_autorizacao não pode ser futura
    CONSTRAINT chk_autorizacao_data
        CHECK (data_autorizacao <= CURRENT_DATE)
);

-- -----------------------------------------------------------------------------
-- itens_autorizacao
-- -----------------------------------------------------------------------------
CREATE TABLE itens_autorizacao (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    autorizacao_id   UUID NOT NULL REFERENCES autorizacoes(id) ON DELETE CASCADE,
    procedimento_id  UUID NOT NULL REFERENCES procedimentos(id) ON DELETE RESTRICT,
    descricao        VARCHAR(200) NOT NULL,
    quantidade       INTEGER NOT NULL,
    valor_unitario   DECIMAL(12,2) NOT NULL,
    valor_total      DECIMAL(12,2) NOT NULL,
    criado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- RN-ITEM1: quantidade >= 1
    CONSTRAINT chk_item_quantidade
        CHECK (quantidade >= 1),

    -- RN-ITEM2: valor_unitario > 0
    CONSTRAINT chk_item_valor_unitario
        CHECK (valor_unitario > 0),

    -- RN-ITEM3: valor_total = quantidade × valor_unitario
    CONSTRAINT chk_item_valor_total
        CHECK (valor_total = quantidade * valor_unitario)
);

-- -----------------------------------------------------------------------------
-- acrescimos_gastos
-- -----------------------------------------------------------------------------
CREATE TABLE acrescimos_gastos (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mes_referencia   VARCHAR(7) NOT NULL,
    justificativa    TEXT NOT NULL,
    assinatura       VARCHAR(500) NOT NULL,
    aprovado_por     UUID REFERENCES usuarios(id) ON DELETE RESTRICT,
    data_aprovacao   TIMESTAMPTZ,
    total_gasto      DECIMAL(12,2) NOT NULL,
    limite_atual     DECIMAL(12,2) NOT NULL,
    novo_limite      DECIMAL(12,2),
    status           status_acrescimo NOT NULL DEFAULT 'pendente',
    criado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- formato mes_referencia: YYYY-MM
    CONSTRAINT chk_acrescimo_mes
        CHECK (mes_referencia ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),

    -- justificativa mínimo 20 caracteres
    CONSTRAINT chk_acrescimo_justificativa
        CHECK (char_length(justificativa) >= 20),

    -- novo_limite deve ser maior que limite_atual
    CONSTRAINT chk_acrescimo_novo_limite
        CHECK (novo_limite IS NULL OR novo_limite > limite_atual),

    -- se aprovado, campos obrigatórios
    CONSTRAINT chk_acrescimo_aprovacao
        CHECK (
            status <> 'aprovado' OR
            (aprovado_por IS NOT NULL AND data_aprovacao IS NOT NULL AND novo_limite IS NOT NULL)
        )
);

-- -----------------------------------------------------------------------------
-- faturamentos
-- -----------------------------------------------------------------------------
CREATE TABLE faturamentos (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id           UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
    periodo_inicio       DATE NOT NULL,
    periodo_fim          DATE NOT NULL,
    valor_total          DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_confirmados    DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_glosados       DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_procedimentos  INTEGER NOT NULL DEFAULT 0,
    status               status_faturamento NOT NULL DEFAULT 'aberto',
    gerado_por           UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    data_geracao         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- periodo_fim >= periodo_inicio
    CONSTRAINT chk_faturamento_periodo
        CHECK (periodo_fim >= periodo_inicio),

    -- RN-FAT1: valor_total = total_confirmados + total_glosados
    CONSTRAINT chk_faturamento_totais
        CHECK (ABS(valor_total - (total_confirmados + total_glosados)) < 0.01)
);

-- -----------------------------------------------------------------------------
-- logs_auditoria
-- -----------------------------------------------------------------------------
CREATE TABLE logs_auditoria (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id        UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    entidade          VARCHAR(50) NOT NULL,
    entidade_id       UUID,
    acao              acao_log NOT NULL,
    dados_anteriores  JSONB,
    dados_novos       JSONB,
    ip_origem         VARCHAR(45),
    criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================================================
-- 3. ÍNDICES DE PERFORMANCE
-- =============================================================================

CREATE INDEX idx_pacientes_nome         ON pacientes(nome);
CREATE INDEX idx_pacientes_criado_por   ON pacientes(criado_por);
CREATE INDEX idx_autorizacoes_status    ON autorizacoes(status);
CREATE INDEX idx_autorizacoes_data      ON autorizacoes(data_autorizacao);
CREATE INDEX idx_autorizacoes_paciente  ON autorizacoes(paciente_id);
CREATE INDEX idx_autorizacoes_empresa   ON autorizacoes(empresa_id);
CREATE INDEX idx_itens_autorizacao      ON itens_autorizacao(autorizacao_id);
CREATE INDEX idx_procedimentos_empresa  ON procedimentos(empresa_id);
CREATE INDEX idx_logs_entidade          ON logs_auditoria(entidade, entidade_id);
CREATE INDEX idx_logs_usuario           ON logs_auditoria(usuario_id);
CREATE INDEX idx_acrescimos_mes         ON acrescimos_gastos(mes_referencia);
CREATE INDEX idx_faturamentos_empresa   ON faturamentos(empresa_id);


-- =============================================================================
-- 4. FUNÇÕES UTILITÁRIAS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 4.1 Gera num_aut sequencial: AUT + ANO + 4 dígitos (ex: AUT20260001)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION gerar_num_aut()
RETURNS VARCHAR(20)
LANGUAGE plpgsql
AS $$
DECLARE
    v_ano       TEXT := TO_CHAR(CURRENT_DATE, 'YYYY');
    v_prefixo   TEXT;
    v_sequencia INTEGER;
    v_num_aut   TEXT;
BEGIN
    v_prefixo := 'AUT' || v_ano;

    SELECT COUNT(*) + 1
      INTO v_sequencia
      FROM autorizacoes
     WHERE num_aut LIKE v_prefixo || '%';

    v_num_aut := v_prefixo || LPAD(v_sequencia::TEXT, 4, '0');

    -- Garante unicidade em caso de concorrência
    WHILE EXISTS (SELECT 1 FROM autorizacoes WHERE num_aut = v_num_aut) LOOP
        v_sequencia := v_sequencia + 1;
        v_num_aut := v_prefixo || LPAD(v_sequencia::TEXT, 4, '0');
    END LOOP;

    RETURN v_num_aut;
END;
$$;

-- -----------------------------------------------------------------------------
-- 4.2 Atualiza total_autorizado na autorizacao ao inserir/atualizar/deletar item
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION atualizar_total_autorizacao()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_autorizacao_id UUID;
    v_total          DECIMAL(12,2);
BEGIN
    -- Determina o autorizacao_id afetado
    IF TG_OP = 'DELETE' THEN
        v_autorizacao_id := OLD.autorizacao_id;
    ELSE
        v_autorizacao_id := NEW.autorizacao_id;
    END IF;

    -- Recalcula o total
    SELECT COALESCE(SUM(valor_total), 0)
      INTO v_total
      FROM itens_autorizacao
     WHERE autorizacao_id = v_autorizacao_id;

    -- Atualiza a autorização
    UPDATE autorizacoes
       SET total_autorizado = v_total
     WHERE id = v_autorizacao_id;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

CREATE TRIGGER trg_atualizar_total_autorizacao
AFTER INSERT OR UPDATE OR DELETE ON itens_autorizacao
FOR EACH ROW EXECUTE FUNCTION atualizar_total_autorizacao();

-- -----------------------------------------------------------------------------
-- 4.3 Atualiza atualizado_em automaticamente
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_atualizado_em()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.atualizado_em := NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_usuarios_atualizado_em
    BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE TRIGGER trg_bairros_atualizado_em
    BEFORE UPDATE ON bairros
    FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE TRIGGER trg_povoados_atualizado_em
    BEFORE UPDATE ON povoados
    FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE TRIGGER trg_ubs_atualizado_em
    BEFORE UPDATE ON ubs
    FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE TRIGGER trg_profissionais_atualizado_em
    BEFORE UPDATE ON profissionais
    FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE TRIGGER trg_empresas_atualizado_em
    BEFORE UPDATE ON empresas
    FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE TRIGGER trg_pacientes_atualizado_em
    BEFORE UPDATE ON pacientes
    FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- -----------------------------------------------------------------------------
-- 4.4 Antifraude: bloqueia edição de autorização aprovada (CA2)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION bloquear_edicao_autorizacao_aprovada()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.status = 'aprovado' THEN
        -- Registra tentativa de violação
        INSERT INTO logs_auditoria (usuario_id, entidade, entidade_id, acao, dados_anteriores, dados_novos)
        VALUES (
            auth.uid(),
            'autorizacoes',
            OLD.id,
            'TENTATIVA_VIOLACAO',
            row_to_json(OLD)::JSONB,
            row_to_json(NEW)::JSONB
        );
        RAISE EXCEPTION 'CA2: Não é permitido editar autorização já aprovada.';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bloquear_edicao_aprovada
    BEFORE UPDATE ON autorizacoes
    FOR EACH ROW
    WHEN (OLD.status = 'aprovado')
    EXECUTE FUNCTION bloquear_edicao_autorizacao_aprovada();

-- -----------------------------------------------------------------------------
-- 4.5 Antifraude: bloqueia alteração retroativa de data_autorizacao (CA1)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION bloquear_alteracao_data_autorizacao()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.data_autorizacao <> OLD.data_autorizacao THEN
        INSERT INTO logs_auditoria (usuario_id, entidade, entidade_id, acao, dados_anteriores, dados_novos)
        VALUES (
            auth.uid(),
            'autorizacoes',
            OLD.id,
            'TENTATIVA_VIOLACAO',
            row_to_json(OLD)::JSONB,
            row_to_json(NEW)::JSONB
        );
        RAISE EXCEPTION 'CA1: Não é permitido alterar a data de uma autorização já registrada.';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bloquear_alteracao_data
    BEFORE UPDATE ON autorizacoes
    FOR EACH ROW
    WHEN (NEW.data_autorizacao IS DISTINCT FROM OLD.data_autorizacao)
    EXECUTE FUNCTION bloquear_alteracao_data_autorizacao();

-- -----------------------------------------------------------------------------
-- 4.6 Antifraude: bloqueia edição de faturamento fechado (RN-FAT4)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION bloquear_edicao_faturamento_fechado()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.status = 'fechado' THEN
        INSERT INTO logs_auditoria (usuario_id, entidade, entidade_id, acao, dados_anteriores, dados_novos)
        VALUES (
            auth.uid(),
            'faturamentos',
            OLD.id,
            'TENTATIVA_VIOLACAO',
            row_to_json(OLD)::JSONB,
            row_to_json(NEW)::JSONB
        );
        RAISE EXCEPTION 'RN-FAT4: Não é permitido editar faturamento já fechado.';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bloquear_faturamento_fechado
    BEFORE UPDATE ON faturamentos
    FOR EACH ROW
    WHEN (OLD.status = 'fechado')
    EXECUTE FUNCTION bloquear_edicao_faturamento_fechado();

-- -----------------------------------------------------------------------------
-- 4.7 Verifica limite mensal antes de inserir/atualizar autorização (RN-LIM)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION verificar_limite_mensal()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_limite_base    DECIMAL(12,2) := 130000.00;
    v_acrescimos     DECIMAL(12,2);
    v_limite_atual   DECIMAL(12,2);
    v_total_mes      DECIMAL(12,2);
    v_mes_ref        TEXT;
BEGIN
    v_mes_ref := TO_CHAR(NEW.data_autorizacao, 'YYYY-MM');

    -- Soma acréscimos aprovados no mesmo mês
    SELECT COALESCE(SUM(novo_limite - limite_atual), 0)
      INTO v_acrescimos
      FROM acrescimos_gastos
     WHERE mes_referencia = v_mes_ref
       AND status = 'aprovado';

    v_limite_atual := v_limite_base + v_acrescimos;

    -- Soma autorizações ativas no mesmo mês (excluindo a atual em caso de UPDATE)
    SELECT COALESCE(SUM(total_autorizado), 0)
      INTO v_total_mes
      FROM autorizacoes
     WHERE TO_CHAR(data_autorizacao, 'YYYY-MM') = v_mes_ref
       AND status IN ('pendente', 'aprovado', 'faturado')
       AND id <> COALESCE(NEW.id, uuid_nil());

    -- Verifica se o novo total ultrapassaria o limite
    IF (v_total_mes + NEW.total_autorizado) > v_limite_atual THEN
        -- Bloqueia automaticamente em vez de impedir o INSERT
        NEW.status := 'bloqueado';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_verificar_limite_mensal
    BEFORE INSERT OR UPDATE ON autorizacoes
    FOR EACH ROW EXECUTE FUNCTION verificar_limite_mensal();


-- =============================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Habilita RLS em todas as tabelas
ALTER TABLE usuarios           ENABLE ROW LEVEL SECURITY;
ALTER TABLE bairros            ENABLE ROW LEVEL SECURITY;
ALTER TABLE povoados           ENABLE ROW LEVEL SECURITY;
ALTER TABLE ubs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE profissionais      ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacientes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedimentos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE autorizacoes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_autorizacao  ENABLE ROW LEVEL SECURITY;
ALTER TABLE acrescimos_gastos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE faturamentos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs_auditoria     ENABLE ROW LEVEL SECURITY;

-- Função auxiliar: retorna o perfil do usuário logado
CREATE OR REPLACE FUNCTION meu_perfil()
RETURNS perfil_usuario
LANGUAGE sql STABLE
AS $$
    SELECT perfil FROM usuarios WHERE id = auth.uid();
$$;

-- -----------------------------------------------------------------------------
-- USUARIOS: só admin gerencia; cada um vê o próprio
-- -----------------------------------------------------------------------------
CREATE POLICY usuarios_select ON usuarios
    FOR SELECT USING (
        id = auth.uid() OR meu_perfil() = 'administrador'
    );

CREATE POLICY usuarios_insert ON usuarios
    FOR INSERT WITH CHECK (meu_perfil() = 'administrador');

CREATE POLICY usuarios_update ON usuarios
    FOR UPDATE USING (meu_perfil() = 'administrador');

-- -----------------------------------------------------------------------------
-- BAIRROS / POVOADOS: leitura geral, escrita apenas admin
-- -----------------------------------------------------------------------------
CREATE POLICY bairros_select ON bairros FOR SELECT USING (true);
CREATE POLICY bairros_insert ON bairros FOR INSERT WITH CHECK (meu_perfil() = 'administrador');
CREATE POLICY bairros_update ON bairros FOR UPDATE USING (meu_perfil() = 'administrador');

CREATE POLICY povoados_select ON povoados FOR SELECT USING (true);
CREATE POLICY povoados_insert ON povoados FOR INSERT WITH CHECK (meu_perfil() = 'administrador');
CREATE POLICY povoados_update ON povoados FOR UPDATE USING (meu_perfil() = 'administrador');

-- -----------------------------------------------------------------------------
-- UBS / PROFISSIONAIS: leitura geral, escrita apenas admin
-- -----------------------------------------------------------------------------
CREATE POLICY ubs_select ON ubs FOR SELECT USING (true);
CREATE POLICY ubs_insert ON ubs FOR INSERT WITH CHECK (meu_perfil() = 'administrador');
CREATE POLICY ubs_update ON ubs FOR UPDATE USING (meu_perfil() = 'administrador');

CREATE POLICY profissionais_select ON profissionais FOR SELECT USING (true);
CREATE POLICY profissionais_insert ON profissionais FOR INSERT WITH CHECK (meu_perfil() = 'administrador');
CREATE POLICY profissionais_update ON profissionais FOR UPDATE USING (meu_perfil() = 'administrador');

-- -----------------------------------------------------------------------------
-- EMPRESAS / PROCEDIMENTOS: leitura geral, escrita apenas admin
-- -----------------------------------------------------------------------------
CREATE POLICY empresas_select ON empresas FOR SELECT USING (true);
CREATE POLICY empresas_insert ON empresas FOR INSERT WITH CHECK (meu_perfil() = 'administrador');
CREATE POLICY empresas_update ON empresas FOR UPDATE USING (meu_perfil() = 'administrador');

CREATE POLICY procedimentos_select ON procedimentos FOR SELECT USING (true);
CREATE POLICY procedimentos_insert ON procedimentos FOR INSERT WITH CHECK (meu_perfil() = 'administrador');
CREATE POLICY procedimentos_update ON procedimentos FOR UPDATE USING (meu_perfil() = 'administrador');

-- -----------------------------------------------------------------------------
-- PACIENTES: atendente e admin criam; todos leem
-- -----------------------------------------------------------------------------
CREATE POLICY pacientes_select ON pacientes
    FOR SELECT USING (
        meu_perfil() IN ('administrador', 'secretaria', 'atendente')
    );

CREATE POLICY pacientes_insert ON pacientes
    FOR INSERT WITH CHECK (
        meu_perfil() IN ('administrador', 'atendente')
    );

CREATE POLICY pacientes_update ON pacientes
    FOR UPDATE USING (
        meu_perfil() = 'administrador' OR
        (meu_perfil() = 'atendente' AND criado_por = auth.uid())
    );

-- -----------------------------------------------------------------------------
-- AUTORIZACOES: atendente cria; todos leem; admin tem controle total
-- -----------------------------------------------------------------------------
CREATE POLICY autorizacoes_select ON autorizacoes
    FOR SELECT USING (true);

CREATE POLICY autorizacoes_insert ON autorizacoes
    FOR INSERT WITH CHECK (
        meu_perfil() IN ('administrador', 'atendente')
    );

CREATE POLICY autorizacoes_update ON autorizacoes
    FOR UPDATE USING (
        meu_perfil() = 'administrador' OR
        (meu_perfil() = 'atendente' AND status = 'pendente' AND criado_por = auth.uid())
    );

CREATE POLICY autorizacoes_delete ON autorizacoes
    FOR DELETE USING (meu_perfil() = 'administrador');

-- -----------------------------------------------------------------------------
-- ITENS_AUTORIZACAO: herda acesso da autorização
-- -----------------------------------------------------------------------------
CREATE POLICY itens_select ON itens_autorizacao FOR SELECT USING (true);

CREATE POLICY itens_insert ON itens_autorizacao
    FOR INSERT WITH CHECK (
        meu_perfil() IN ('administrador', 'atendente')
    );

CREATE POLICY itens_update ON itens_autorizacao
    FOR UPDATE USING (meu_perfil() = 'administrador');

CREATE POLICY itens_delete ON itens_autorizacao
    FOR DELETE USING (meu_perfil() = 'administrador');

-- -----------------------------------------------------------------------------
-- ACRESCIMOS_GASTOS: secretaria e admin criam; admin aprova
-- -----------------------------------------------------------------------------
CREATE POLICY acrescimos_select ON acrescimos_gastos
    FOR SELECT USING (
        meu_perfil() IN ('administrador', 'secretaria', 'financeiro')
    );

CREATE POLICY acrescimos_insert ON acrescimos_gastos
    FOR INSERT WITH CHECK (
        meu_perfil() IN ('administrador', 'secretaria')
    );

CREATE POLICY acrescimos_update ON acrescimos_gastos
    FOR UPDATE USING (meu_perfil() = 'administrador');

-- -----------------------------------------------------------------------------
-- FATURAMENTOS: financeiro e admin
-- -----------------------------------------------------------------------------
CREATE POLICY faturamentos_select ON faturamentos
    FOR SELECT USING (
        meu_perfil() IN ('administrador', 'financeiro', 'secretaria')
    );

CREATE POLICY faturamentos_insert ON faturamentos
    FOR INSERT WITH CHECK (
        meu_perfil() IN ('administrador', 'financeiro')
    );

CREATE POLICY faturamentos_update ON faturamentos
    FOR UPDATE USING (
        meu_perfil() IN ('administrador', 'financeiro')
    );

-- -----------------------------------------------------------------------------
-- LOGS_AUDITORIA: somente admin lê; inserção via triggers (service role)
-- -----------------------------------------------------------------------------
CREATE POLICY logs_select ON logs_auditoria
    FOR SELECT USING (meu_perfil() = 'administrador');

CREATE POLICY logs_insert ON logs_auditoria
    FOR INSERT WITH CHECK (true); -- triggers usam service role


-- =============================================================================
-- 6. VIEWS ÚTEIS
-- =============================================================================

-- Saldo orçamentário do mês atual
CREATE OR REPLACE VIEW vw_orcamento_mes_atual AS
SELECT
    130000.00 AS limite_base,
    COALESCE(SUM(ag.novo_limite - ag.limite_atual), 0) AS acrescimos_aprovados,
    130000.00 + COALESCE(SUM(ag.novo_limite - ag.limite_atual), 0) AS limite_atual,
    COALESCE(
        (SELECT SUM(a.total_autorizado)
           FROM autorizacoes a
          WHERE TO_CHAR(a.data_autorizacao, 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
            AND a.status IN ('pendente', 'aprovado', 'faturado')),
        0
    ) AS total_autorizado_mes,
    (130000.00 + COALESCE(SUM(ag.novo_limite - ag.limite_atual), 0)) -
    COALESCE(
        (SELECT SUM(a.total_autorizado)
           FROM autorizacoes a
          WHERE TO_CHAR(a.data_autorizacao, 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
            AND a.status IN ('pendente', 'aprovado', 'faturado')),
        0
    ) AS saldo_disponivel
FROM acrescimos_gastos ag
WHERE ag.mes_referencia = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
  AND ag.status = 'aprovado';
