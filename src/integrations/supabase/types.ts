export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      acrescimos_gastos: {
        Row: {
          aprovado_por: string | null
          assinatura: string
          criado_em: string
          data_aprovacao: string | null
          id: string
          justificativa: string
          limite_atual: number
          mes_referencia: string
          novo_limite: number | null
          status: Database["public"]["Enums"]["status_acrescimo"]
          total_gasto: number
        }
        Insert: {
          aprovado_por?: string | null
          assinatura: string
          criado_em?: string
          data_aprovacao?: string | null
          id?: string
          justificativa: string
          limite_atual: number
          mes_referencia: string
          novo_limite?: number | null
          status?: Database["public"]["Enums"]["status_acrescimo"]
          total_gasto: number
        }
        Update: {
          aprovado_por?: string | null
          assinatura?: string
          criado_em?: string
          data_aprovacao?: string | null
          id?: string
          justificativa?: string
          limite_atual?: number
          mes_referencia?: string
          novo_limite?: number | null
          status?: Database["public"]["Enums"]["status_acrescimo"]
          total_gasto?: number
        }
        Relationships: [
          {
            foreignKeyName: "acrescimos_gastos_aprovado_por_fkey"
            columns: ["aprovado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      autorizacoes: {
        Row: {
          assinatura_atendente: string
          assinatura_paciente: string
          criado_em: string
          criado_por: string
          data_autorizacao: string
          empresa_id: string
          foto_requisicao: string | null
          id: string
          num_aut: string
          paciente_id: string
          pdf_autorizacao: string
          profissional_id: string
          qr_code: string
          sintomas: string | null
          status: Database["public"]["Enums"]["status_autorizacao"]
          total_autorizado: number
          ubs_id: string
        }
        Insert: {
          assinatura_atendente: string
          assinatura_paciente: string
          criado_em?: string
          criado_por: string
          data_autorizacao: string
          empresa_id: string
          foto_requisicao?: string | null
          id?: string
          num_aut: string
          paciente_id: string
          pdf_autorizacao: string
          profissional_id: string
          qr_code: string
          sintomas?: string | null
          status?: Database["public"]["Enums"]["status_autorizacao"]
          total_autorizado?: number
          ubs_id: string
        }
        Update: {
          assinatura_atendente?: string
          assinatura_paciente?: string
          criado_em?: string
          criado_por?: string
          data_autorizacao?: string
          empresa_id?: string
          foto_requisicao?: string | null
          id?: string
          num_aut?: string
          paciente_id?: string
          pdf_autorizacao?: string
          profissional_id?: string
          qr_code?: string
          sintomas?: string | null
          status?: Database["public"]["Enums"]["status_autorizacao"]
          total_autorizado?: number
          ubs_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "autorizacoes_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "autorizacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "autorizacoes_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "autorizacoes_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profissionais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "autorizacoes_ubs_id_fkey"
            columns: ["ubs_id"]
            isOneToOne: false
            referencedRelation: "ubs"
            referencedColumns: ["id"]
          },
        ]
      }
      bairros: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          criado_por: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          criado_por: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          criado_por?: string
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "bairros_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          ativa: boolean
          atualizado_em: string
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj: string
          contrato_fim: string | null
          contrato_inicio: string | null
          contrato_numero: string | null
          criado_em: string
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          inscricao_estadual: string | null
          nome_fantasia: string
          razao_social: string
          responsavel_contrato: string | null
          telefone: string | null
          tipo_servico: Database["public"]["Enums"]["tipo_servico_emp"]
        }
        Insert: {
          ativa?: boolean
          atualizado_em?: string
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj: string
          contrato_fim?: string | null
          contrato_inicio?: string | null
          contrato_numero?: string | null
          criado_em?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          nome_fantasia: string
          razao_social: string
          responsavel_contrato?: string | null
          telefone?: string | null
          tipo_servico: Database["public"]["Enums"]["tipo_servico_emp"]
        }
        Update: {
          ativa?: boolean
          atualizado_em?: string
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string
          contrato_fim?: string | null
          contrato_inicio?: string | null
          contrato_numero?: string | null
          criado_em?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          nome_fantasia?: string
          razao_social?: string
          responsavel_contrato?: string | null
          telefone?: string | null
          tipo_servico?: Database["public"]["Enums"]["tipo_servico_emp"]
        }
        Relationships: []
      }
      faturamentos: {
        Row: {
          empresa_id: string
          finalizado_em: string | null
          finalizado_por: string | null
          id: string
          iniciado_em: string
          iniciado_por: string
          mes_referencia: string
          status: string
          total_itens: number
          total_pendentes: number
          valor_confirmado: number
          valor_glosado: number
        }
        Insert: {
          empresa_id: string
          finalizado_em?: string | null
          finalizado_por?: string | null
          id?: string
          iniciado_em?: string
          iniciado_por: string
          mes_referencia: string
          status?: string
          total_itens?: number
          total_pendentes?: number
          valor_confirmado?: number
          valor_glosado?: number
        }
        Update: {
          empresa_id?: string
          finalizado_em?: string | null
          finalizado_por?: string | null
          id?: string
          iniciado_em?: string
          iniciado_por?: string
          mes_referencia?: string
          status?: string
          total_itens?: number
          total_pendentes?: number
          valor_confirmado?: number
          valor_glosado?: number
        }
        Relationships: []
      }
      itens_autorizacao: {
        Row: {
          autorizacao_id: string
          conferido_por: string | null
          criado_em: string
          data_conferencia: string | null
          descricao: string
          faturamento_id: string | null
          id: string
          mes_faturamento: string | null
          motivo_glosa_id: string | null
          observacao_glosa: string | null
          procedimento_id: string
          quantidade: number
          status_faturamento: Database["public"]["Enums"]["status_item_faturamento"]
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          autorizacao_id: string
          conferido_por?: string | null
          criado_em?: string
          data_conferencia?: string | null
          descricao: string
          faturamento_id?: string | null
          id?: string
          mes_faturamento?: string | null
          motivo_glosa_id?: string | null
          observacao_glosa?: string | null
          procedimento_id: string
          quantidade: number
          status_faturamento?: Database["public"]["Enums"]["status_item_faturamento"]
          valor_total: number
          valor_unitario: number
        }
        Update: {
          autorizacao_id?: string
          conferido_por?: string | null
          criado_em?: string
          data_conferencia?: string | null
          descricao?: string
          faturamento_id?: string | null
          id?: string
          mes_faturamento?: string | null
          motivo_glosa_id?: string | null
          observacao_glosa?: string | null
          procedimento_id?: string
          quantidade?: number
          status_faturamento?: Database["public"]["Enums"]["status_item_faturamento"]
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "itens_autorizacao_autorizacao_id_fkey"
            columns: ["autorizacao_id"]
            isOneToOne: false
            referencedRelation: "autorizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_autorizacao_faturamento_id_fkey"
            columns: ["faturamento_id"]
            isOneToOne: false
            referencedRelation: "faturamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_autorizacao_motivo_glosa_id_fkey"
            columns: ["motivo_glosa_id"]
            isOneToOne: false
            referencedRelation: "motivos_glosa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_autorizacao_procedimento_id_fkey"
            columns: ["procedimento_id"]
            isOneToOne: false
            referencedRelation: "procedimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      logs_auditoria: {
        Row: {
          acao: Database["public"]["Enums"]["acao_log"]
          criado_em: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          entidade: string
          entidade_id: string | null
          id: string
          ip_origem: string | null
          usuario_id: string | null
        }
        Insert: {
          acao: Database["public"]["Enums"]["acao_log"]
          criado_em?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          entidade: string
          entidade_id?: string | null
          id?: string
          ip_origem?: string | null
          usuario_id?: string | null
        }
        Update: {
          acao?: Database["public"]["Enums"]["acao_log"]
          criado_em?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          entidade?: string
          entidade_id?: string | null
          id?: string
          ip_origem?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logs_auditoria_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      motivos_glosa: {
        Row: {
          ativo: boolean
          criado_em: string
          criado_por: string | null
          descricao: string
          id: string
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          criado_por?: string | null
          descricao: string
          id?: string
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          criado_por?: string | null
          descricao?: string
          id?: string
        }
        Relationships: []
      }
      pacientes: {
        Row: {
          atualizado_em: string
          bairro_id: string | null
          cartao_sus: string | null
          criado_em: string
          criado_por: string
          dtn: string
          id: string
          naturalidade: string | null
          nome: string
          nome_da_mae: string
          numero: string | null
          ponto_referencia: string | null
          povoado_id: string | null
          rua: string | null
          sexo: Database["public"]["Enums"]["sexo_tipo"]
          zona: Database["public"]["Enums"]["zona_tipo"]
        }
        Insert: {
          atualizado_em?: string
          bairro_id?: string | null
          cartao_sus?: string | null
          criado_em?: string
          criado_por: string
          dtn: string
          id?: string
          naturalidade?: string | null
          nome: string
          nome_da_mae: string
          numero?: string | null
          ponto_referencia?: string | null
          povoado_id?: string | null
          rua?: string | null
          sexo: Database["public"]["Enums"]["sexo_tipo"]
          zona: Database["public"]["Enums"]["zona_tipo"]
        }
        Update: {
          atualizado_em?: string
          bairro_id?: string | null
          cartao_sus?: string | null
          criado_em?: string
          criado_por?: string
          dtn?: string
          id?: string
          naturalidade?: string | null
          nome?: string
          nome_da_mae?: string
          numero?: string | null
          ponto_referencia?: string | null
          povoado_id?: string | null
          rua?: string | null
          sexo?: Database["public"]["Enums"]["sexo_tipo"]
          zona?: Database["public"]["Enums"]["zona_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "pacientes_bairro_id_fkey"
            columns: ["bairro_id"]
            isOneToOne: false
            referencedRelation: "bairros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pacientes_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pacientes_povoado_id_fkey"
            columns: ["povoado_id"]
            isOneToOne: false
            referencedRelation: "povoados"
            referencedColumns: ["id"]
          },
        ]
      }
      povoados: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          criado_por: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          criado_por: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          criado_por?: string
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "povoados_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      procedimentos: {
        Row: {
          ativo: boolean
          criado_em: string
          empresa_id: string
          grupo: string
          id: string
          nome: string
          nomes_alternativos: string | null
          sigla: string
          tipo: Database["public"]["Enums"]["tipo_procedimento"]
          valor_unitario: number
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          empresa_id: string
          grupo: string
          id?: string
          nome: string
          nomes_alternativos?: string | null
          sigla: string
          tipo: Database["public"]["Enums"]["tipo_procedimento"]
          valor_unitario: number
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          empresa_id?: string
          grupo?: string
          id?: string
          nome?: string
          nomes_alternativos?: string | null
          sigla?: string
          tipo?: Database["public"]["Enums"]["tipo_procedimento"]
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "procedimentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      profissionais: {
        Row: {
          atualizado_em: string
          cargo: Database["public"]["Enums"]["cargo_profissional"]
          conselho: Database["public"]["Enums"]["conselho_tipo"]
          contato: string | null
          criado_em: string
          especialidade: string | null
          estado_conselho: string
          id: string
          nome_profissional: string
          numero_conselho: string
          ubs_id: string
        }
        Insert: {
          atualizado_em?: string
          cargo: Database["public"]["Enums"]["cargo_profissional"]
          conselho: Database["public"]["Enums"]["conselho_tipo"]
          contato?: string | null
          criado_em?: string
          especialidade?: string | null
          estado_conselho: string
          id?: string
          nome_profissional: string
          numero_conselho: string
          ubs_id: string
        }
        Update: {
          atualizado_em?: string
          cargo?: Database["public"]["Enums"]["cargo_profissional"]
          conselho?: Database["public"]["Enums"]["conselho_tipo"]
          contato?: string | null
          criado_em?: string
          especialidade?: string | null
          estado_conselho?: string
          id?: string
          nome_profissional?: string
          numero_conselho?: string
          ubs_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profissionais_ubs_id_fkey"
            columns: ["ubs_id"]
            isOneToOne: false
            referencedRelation: "ubs"
            referencedColumns: ["id"]
          },
        ]
      }
      ubs: {
        Row: {
          atualizado_em: string
          bairro: string
          cnes: string
          contato: string | null
          criado_em: string
          endereco: string
          id: string
          id_posto: string
          nome_posto: string
          zona: Database["public"]["Enums"]["zona_tipo"]
        }
        Insert: {
          atualizado_em?: string
          bairro: string
          cnes: string
          contato?: string | null
          criado_em?: string
          endereco: string
          id?: string
          id_posto: string
          nome_posto: string
          zona: Database["public"]["Enums"]["zona_tipo"]
        }
        Update: {
          atualizado_em?: string
          bairro?: string
          cnes?: string
          contato?: string | null
          criado_em?: string
          endereco?: string
          id?: string
          id_posto?: string
          nome_posto?: string
          zona?: Database["public"]["Enums"]["zona_tipo"]
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          email: string
          id: string
          nome: string
          perfil: Database["public"]["Enums"]["perfil_usuario"]
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          email: string
          id?: string
          nome: string
          perfil: Database["public"]["Enums"]["perfil_usuario"]
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          email?: string
          id?: string
          nome?: string
          perfil?: Database["public"]["Enums"]["perfil_usuario"]
        }
        Relationships: []
      }
    }
    Views: {
      vw_orcamento_mes_atual: {
        Row: {
          acrescimos_aprovados: number | null
          limite_atual: number | null
          limite_base: number | null
          saldo_disponivel: number | null
          total_autorizado_mes: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      abrir_faturamento: {
        Args: { p_empresa: string; p_mes: string }
        Returns: string
      }
      gerar_num_aut: { Args: never; Returns: string }
      meu_perfil: {
        Args: never
        Returns: Database["public"]["Enums"]["perfil_usuario"]
      }
    }
    Enums: {
      acao_log: "INSERT" | "UPDATE" | "DELETE" | "TENTATIVA_VIOLACAO"
      cargo_profissional: "medico" | "enfermeiro"
      conselho_tipo: "CRM" | "COREN"
      perfil_usuario:
        | "administrador"
        | "secretaria"
        | "atendente"
        | "financeiro"
      sexo_tipo: "masculino" | "feminino"
      status_acrescimo: "pendente" | "aprovado" | "rejeitado"
      status_autorizacao:
        | "pendente"
        | "aprovado"
        | "bloqueado"
        | "cancelado"
        | "faturado"
      status_faturamento:
        | "aberto"
        | "enviado"
        | "parcialmente_glosado"
        | "fechado"
      status_item_faturamento: "pendente" | "confirmado" | "glosado"
      tipo_procedimento: "exame" | "consulta"
      tipo_servico_emp: "laboratorio" | "clinica" | "hospital" | "outro"
      zona_tipo: "urbana" | "rural"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      acao_log: ["INSERT", "UPDATE", "DELETE", "TENTATIVA_VIOLACAO"],
      cargo_profissional: ["medico", "enfermeiro"],
      conselho_tipo: ["CRM", "COREN"],
      perfil_usuario: [
        "administrador",
        "secretaria",
        "atendente",
        "financeiro",
      ],
      sexo_tipo: ["masculino", "feminino"],
      status_acrescimo: ["pendente", "aprovado", "rejeitado"],
      status_autorizacao: [
        "pendente",
        "aprovado",
        "bloqueado",
        "cancelado",
        "faturado",
      ],
      status_faturamento: [
        "aberto",
        "enviado",
        "parcialmente_glosado",
        "fechado",
      ],
      status_item_faturamento: ["pendente", "confirmado", "glosado"],
      tipo_procedimento: ["exame", "consulta"],
      tipo_servico_emp: ["laboratorio", "clinica", "hospital", "outro"],
      zona_tipo: ["urbana", "rural"],
    },
  },
} as const
