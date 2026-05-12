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
      analytics_daily: {
        Row: {
          card_id: string
          day: string
          event_count: number
          source: string
          tenant_id: string | null
          unique_visitors: number
        }
        Insert: {
          card_id: string
          day: string
          event_count?: number
          source: string
          tenant_id?: string | null
          unique_visitors?: number
        }
        Update: {
          card_id?: string
          day?: string
          event_count?: number
          source?: string
          tenant_id?: string | null
          unique_visitors?: number
        }
        Relationships: [
          {
            foreignKeyName: "analytics_daily_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "digital_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_leads: {
        Row: {
          conversation: Json | null
          created_at: string
          email: string | null
          id: string
          interest: string | null
          name: string | null
          notes: string | null
          phone: string | null
          role: string | null
          source: string | null
        }
        Insert: {
          conversation?: Json | null
          created_at?: string
          email?: string | null
          id?: string
          interest?: string | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          role?: string | null
          source?: string | null
        }
        Update: {
          conversation?: Json | null
          created_at?: string
          email?: string | null
          id?: string
          interest?: string | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          role?: string | null
          source?: string | null
        }
        Relationships: []
      }
      digital_cards: {
        Row: {
          avatar_url: string | null
          bio: string | null
          company: string | null
          created_at: string
          display_name: string
          fields: Json
          id: string
          is_published: boolean
          owner_user_id: string | null
          slug: string
          tenant_id: string | null
          theme: Json
          title: string | null
          updated_at: string
          view_count: number
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          created_at?: string
          display_name: string
          fields?: Json
          id?: string
          is_published?: boolean
          owner_user_id?: string | null
          slug: string
          tenant_id?: string | null
          theme?: Json
          title?: string | null
          updated_at?: string
          view_count?: number
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          created_at?: string
          display_name?: string
          fields?: Json
          id?: string
          is_published?: boolean
          owner_user_id?: string | null
          slug?: string
          tenant_id?: string | null
          theme?: Json
          title?: string | null
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      interaction_events: {
        Row: {
          browser: string | null
          card_id: string
          country: string | null
          device_type: string | null
          id: number
          ip_hash: string | null
          occurred_at: string
          os: string | null
          referrer: string | null
          short_code: string | null
          source: string
          tenant_id: string | null
          user_agent: string | null
        }
        Insert: {
          browser?: string | null
          card_id: string
          country?: string | null
          device_type?: string | null
          id?: number
          ip_hash?: string | null
          occurred_at?: string
          os?: string | null
          referrer?: string | null
          short_code?: string | null
          source: string
          tenant_id?: string | null
          user_agent?: string | null
        }
        Update: {
          browser?: string | null
          card_id?: string
          country?: string | null
          device_type?: string | null
          id?: number
          ip_hash?: string | null
          occurred_at?: string
          os?: string | null
          referrer?: string | null
          short_code?: string | null
          source?: string
          tenant_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interaction_events_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "digital_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      nfc_short_codes: {
        Row: {
          card_id: string
          code: string
          created_at: string
          is_active: boolean
          label: string | null
          source: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          card_id: string
          code: string
          created_at?: string
          is_active?: boolean
          label?: string | null
          source?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          card_id?: string
          code?: string
          created_at?: string
          is_active?: boolean
          label?: string | null
          source?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nfc_short_codes_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "digital_cards"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      aggregate_interaction_events_daily: {
        Args: { _day?: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
