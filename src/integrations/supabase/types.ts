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
      ai_followups: {
        Row: {
          channel: string | null
          created_at: string
          customer_id: string | null
          deleted_at: string | null
          id: string
          lead_id: string | null
          model: string | null
          output: string | null
          owner_user_id: string | null
          project_id: string | null
          prompt: string | null
          scenario: string | null
          scheduled_at: string | null
          sent_at: string | null
          status: string | null
          subject: string | null
          tenant_id: string
          tokens: number | null
          updated_at: string
        }
        Insert: {
          channel?: string | null
          created_at?: string
          customer_id?: string | null
          deleted_at?: string | null
          id?: string
          lead_id?: string | null
          model?: string | null
          output?: string | null
          owner_user_id?: string | null
          project_id?: string | null
          prompt?: string | null
          scenario?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          tenant_id: string
          tokens?: number | null
          updated_at?: string
        }
        Update: {
          channel?: string | null
          created_at?: string
          customer_id?: string | null
          deleted_at?: string | null
          id?: string
          lead_id?: string | null
          model?: string | null
          output?: string | null
          owner_user_id?: string | null
          project_id?: string | null
          prompt?: string | null
          scenario?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          tenant_id?: string
          tokens?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_followups_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_followups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_followups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_lead_scores: {
        Row: {
          computed_at: string
          factors: Json
          id: string
          lead_id: string
          model: string | null
          score: number
          tenant_id: string
        }
        Insert: {
          computed_at?: string
          factors?: Json
          id?: string
          lead_id: string
          model?: string | null
          score: number
          tenant_id: string
        }
        Update: {
          computed_at?: string
          factors?: Json
          id?: string
          lead_id?: string
          model?: string | null
          score?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_lead_scores_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_lead_scores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_sales_pages: {
        Row: {
          audience: string | null
          created_at: string
          cta: string | null
          customer_id: string | null
          deleted_at: string | null
          id: string
          industry: string | null
          is_published: boolean
          lead_id: string | null
          model: string | null
          output: Json | null
          owner_user_id: string | null
          project_id: string | null
          prompt: string | null
          slug: string | null
          status: string
          tenant_id: string
          title: string | null
          tokens: number | null
          tone: string | null
          updated_at: string
          views_count: number
        }
        Insert: {
          audience?: string | null
          created_at?: string
          cta?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          id?: string
          industry?: string | null
          is_published?: boolean
          lead_id?: string | null
          model?: string | null
          output?: Json | null
          owner_user_id?: string | null
          project_id?: string | null
          prompt?: string | null
          slug?: string | null
          status?: string
          tenant_id: string
          title?: string | null
          tokens?: number | null
          tone?: string | null
          updated_at?: string
          views_count?: number
        }
        Update: {
          audience?: string | null
          created_at?: string
          cta?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          id?: string
          industry?: string | null
          is_published?: boolean
          lead_id?: string | null
          model?: string | null
          output?: Json | null
          owner_user_id?: string | null
          project_id?: string | null
          prompt?: string | null
          slug?: string | null
          status?: string
          tenant_id?: string
          title?: string | null
          tokens?: number | null
          tone?: string | null
          updated_at?: string
          views_count?: number
        }
        Relationships: []
      }
      airdrop_shares: {
        Row: {
          card_id: string | null
          created_at: string
          device_kind: string
          device_name: string
          direction: string
          distance_m: number | null
          id: string
          notes: string | null
          recipient_name: string | null
          sender_id: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          card_id?: string | null
          created_at?: string
          device_kind?: string
          device_name: string
          direction?: string
          distance_m?: number | null
          id?: string
          notes?: string | null
          recipient_name?: string | null
          sender_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          card_id?: string | null
          created_at?: string
          device_kind?: string
          device_name?: string
          direction?: string
          distance_m?: number | null
          id?: string
          notes?: string | null
          recipient_name?: string | null
          sender_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      analytics_daily: {
        Row: {
          card_id: string
          day: string
          event_count: number
          source: string
          tenant_id: string
          unique_visitors: number
        }
        Insert: {
          card_id: string
          day: string
          event_count?: number
          source: string
          tenant_id: string
          unique_visitors?: number
        }
        Update: {
          card_id?: string
          day?: string
          event_count?: number
          source?: string
          tenant_id?: string
          unique_visitors?: number
        }
        Relationships: [
          {
            foreignKeyName: "analytics_daily_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_daily_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          ends_at: string
          id: string
          lead_id: string | null
          location: string | null
          notes: string | null
          reminder_minutes: number | null
          starts_at: string
          status: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          ends_at: string
          id?: string
          lead_id?: string | null
          location?: string | null
          notes?: string | null
          reminder_minutes?: number | null
          starts_at: string
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          ends_at?: string
          id?: string
          lead_id?: string | null
          location?: string | null
          notes?: string | null
          reminder_minutes?: number | null
          starts_at?: string
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          batch_id: string | null
          diff: Json | null
          entity: string
          entity_id: string | null
          id: number
          ip_hash: string | null
          occurred_at: string
          tenant_id: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          batch_id?: string | null
          diff?: Json | null
          entity: string
          entity_id?: string | null
          id?: number
          ip_hash?: string | null
          occurred_at?: string
          tenant_id: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          batch_id?: string | null
          diff?: Json | null
          entity?: string
          entity_id?: string | null
          id?: number
          ip_hash?: string | null
          occurred_at?: string
          tenant_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_settings: {
        Row: {
          allowed_email_domains: string[]
          enforce_domain_allowlist: boolean
          google_oauth_mode: string
          id: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allowed_email_domains?: string[]
          enforce_domain_allowlist?: boolean
          google_oauth_mode?: string
          id?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allowed_email_domains?: string[]
          enforce_domain_allowlist?: boolean
          google_oauth_mode?: string
          id?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      brochures: {
        Row: {
          created_at: string
          deleted_at: string | null
          download_count: number
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          project_id: string | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          download_count?: number
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          project_id?: string | null
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          download_count?: number
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          project_id?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brochures_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brochures_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          audience: Json
          channel: string
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          scheduled_at: string | null
          stats: Json
          status: string
          template: Json
          tenant_id: string
          updated_at: string
        }
        Insert: {
          audience?: Json
          channel: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          scheduled_at?: string | null
          stats?: Json
          status?: string
          template?: Json
          tenant_id: string
          updated_at?: string
        }
        Update: {
          audience?: Json
          channel?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          scheduled_at?: string | null
          stats?: Json
          status?: string
          template?: Json
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      card_blocks: {
        Row: {
          block_type: string
          card_id: string
          config: Json
          created_at: string
          deleted_at: string | null
          id: string
          is_visible: boolean
          position: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          block_type: string
          card_id: string
          config?: Json
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_visible?: boolean
          position?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          block_type?: string
          card_id?: string
          config?: Json
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_visible?: boolean
          position?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_blocks_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_blocks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      card_projects: {
        Row: {
          card_id: string
          created_at: string
          position: number
          project_id: string
          tenant_id: string
        }
        Insert: {
          card_id: string
          created_at?: string
          position?: number
          project_id: string
          tenant_id: string
        }
        Update: {
          card_id?: string
          created_at?: string
          position?: number
          project_id?: string
          tenant_id?: string
        }
        Relationships: []
      }
      card_templates: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          is_global: boolean
          name: string
          preview_url: string | null
          tenant_id: string | null
          theme: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_global?: boolean
          name: string
          preview_url?: string | null
          tenant_id?: string | null
          theme?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_global?: boolean
          name?: string
          preview_url?: string | null
          tenant_id?: string | null
          theme?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cards: {
        Row: {
          avatar_url: string | null
          bio: string | null
          company: string | null
          created_at: string
          deleted_at: string | null
          display_name: string
          fields: Json
          id: string
          is_published: boolean
          owner_user_id: string
          slug: string
          team_id: string | null
          template_id: string | null
          tenant_id: string
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
          deleted_at?: string | null
          display_name: string
          fields?: Json
          id?: string
          is_published?: boolean
          owner_user_id: string
          slug: string
          team_id?: string | null
          template_id?: string | null
          tenant_id: string
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
          deleted_at?: string | null
          display_name?: string
          fields?: Json
          id?: string
          is_published?: boolean
          owner_user_id?: string
          slug?: string
          team_id?: string | null
          template_id?: string | null
          tenant_id?: string
          theme?: Json
          title?: string | null
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "cards_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_template_fk"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "card_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
      customers: {
        Row: {
          company: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          full_name: string
          id: string
          meta: Json
          notes: string | null
          owner_user_id: string | null
          phone: string | null
          tags: string[] | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          meta?: Json
          notes?: string | null
          owner_user_id?: string | null
          phone?: string | null
          tags?: string[] | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          meta?: Json
          notes?: string | null
          owner_user_id?: string | null
          phone?: string | null
          tags?: string[] | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      dynamic_qr_codes: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label: string | null
          scan_count: number
          short_code: string
          target_url: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          scan_count?: number
          short_code: string
          target_url: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          scan_count?: number
          short_code?: string
          target_url?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dynamic_qr_codes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          bucket: string
          created_at: string
          deleted_at: string | null
          folder: string | null
          id: string
          mime: string | null
          name: string
          path: string
          related_id: string | null
          related_type: string | null
          size: number
          tag: string | null
          tenant_id: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          bucket?: string
          created_at?: string
          deleted_at?: string | null
          folder?: string | null
          id?: string
          mime?: string | null
          name: string
          path: string
          related_id?: string | null
          related_type?: string | null
          size?: number
          tag?: string | null
          tenant_id: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          bucket?: string
          created_at?: string
          deleted_at?: string | null
          folder?: string | null
          id?: string
          mime?: string | null
          name?: string
          path?: string
          related_id?: string | null
          related_type?: string | null
          size?: number
          tag?: string | null
          tenant_id?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "files_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          tenant_id: string
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
          tenant_id: string
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
          tenant_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interaction_events_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: string
          tenant_id: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role: Database["public"]["Enums"]["app_role"]
          status?: string
          tenant_id: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          tenant_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_forms: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          fields: Json
          id: string
          is_active: boolean
          name: string
          project_id: string | null
          redirect_url: string | null
          slug: string
          submit_count: number
          success_message: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          fields?: Json
          id?: string
          is_active?: boolean
          name: string
          project_id?: string | null
          redirect_url?: string | null
          slug: string
          submit_count?: number
          success_message?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          fields?: Json
          id?: string
          is_active?: boolean
          name?: string
          project_id?: string | null
          redirect_url?: string | null
          slug?: string
          submit_count?: number
          success_message?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_forms_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_forms_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_submissions: {
        Row: {
          created_at: string
          created_lead_id: string | null
          form_id: string
          id: string
          ip_hash: string | null
          payload: Json
          referrer: string | null
          tenant_id: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          created_lead_id?: string | null
          form_id: string
          id?: string
          ip_hash?: string | null
          payload?: Json
          referrer?: string | null
          tenant_id: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          created_lead_id?: string | null
          form_id?: string
          id?: string
          ip_hash?: string | null
          payload?: Json
          referrer?: string | null
          tenant_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_submissions_created_lead_id_fkey"
            columns: ["created_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "lead_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_submissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          budget: string | null
          card_id: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          full_name: string | null
          id: string
          meta: Json
          need_type: string | null
          notes: string | null
          owner_user_id: string | null
          phone: string | null
          project_id: string | null
          score: number | null
          source: string | null
          status: Database["public"]["Enums"]["lead_status"]
          tags: string[] | null
          team_id: string | null
          tenant_id: string
          timeline: string | null
          updated_at: string
        }
        Insert: {
          budget?: string | null
          card_id?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          meta?: Json
          need_type?: string | null
          notes?: string | null
          owner_user_id?: string | null
          phone?: string | null
          project_id?: string | null
          score?: number | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          tags?: string[] | null
          team_id?: string | null
          tenant_id: string
          timeline?: string | null
          updated_at?: string
        }
        Update: {
          budget?: string | null
          card_id?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          meta?: Json
          need_type?: string | null
          notes?: string | null
          owner_user_id?: string | null
          phone?: string | null
          project_id?: string | null
          score?: number | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          tags?: string[] | null
          team_id?: string | null
          tenant_id?: string
          timeline?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_deals: {
        Row: {
          closed_at: string | null
          created_at: string
          currency: string | null
          deleted_at: string | null
          expected_close_date: string | null
          id: string
          last_activity_at: string
          lead_id: string | null
          meta: Json
          next_action: string | null
          next_action_at: string | null
          owner_user_id: string | null
          project_id: string | null
          stage_id: string
          status: Database["public"]["Enums"]["deal_status"]
          tenant_id: string
          title: string
          updated_at: string
          value: number | null
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          currency?: string | null
          deleted_at?: string | null
          expected_close_date?: string | null
          id?: string
          last_activity_at?: string
          lead_id?: string | null
          meta?: Json
          next_action?: string | null
          next_action_at?: string | null
          owner_user_id?: string | null
          project_id?: string | null
          stage_id: string
          status?: Database["public"]["Enums"]["deal_status"]
          tenant_id: string
          title: string
          updated_at?: string
          value?: number | null
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          currency?: string | null
          deleted_at?: string | null
          expected_close_date?: string | null
          id?: string
          last_activity_at?: string
          lead_id?: string | null
          meta?: Json
          next_action?: string | null
          next_action_at?: string | null
          owner_user_id?: string | null
          project_id?: string | null
          stage_id?: string
          status?: Database["public"]["Enums"]["deal_status"]
          tenant_id?: string
          title?: string
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_deals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_deals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          position: number
          tenant_id: string
          updated_at: string
          win_probability: number | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          position?: number
          tenant_id: string
          updated_at?: string
          win_probability?: number | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          position?: number
          tenant_id?: string
          updated_at?: string
          win_probability?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          attributes: Json
          category: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          price: number
          sku: string | null
          status: string
          tenant_id: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          attributes?: Json
          category?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price?: number
          sku?: string | null
          status?: string
          tenant_id: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          attributes?: Json
          category?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          sku?: string | null
          status?: string
          tenant_id?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          default_tenant_id: string | null
          email: string | null
          full_name: string | null
          locale: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          default_tenant_id?: string | null
          email?: string | null
          full_name?: string | null
          locale?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          default_tenant_id?: string | null
          email?: string | null
          full_name?: string | null
          locale?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_tenant_id_fkey"
            columns: ["default_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          brochure_name: string | null
          brochure_url: string | null
          city: string | null
          cover_url: string | null
          created_at: string
          cta_form_enabled: boolean
          cta_phone: string | null
          currency: string | null
          deleted_at: string | null
          description: string | null
          developer: string | null
          gallery: Json
          id: string
          location: string | null
          meta: Json
          name: string
          price_from: number | null
          price_to: number | null
          property_type: string | null
          sales_policy: string | null
          slug: string | null
          status: string | null
          tenant_id: string
          unit_highlights: Json
          updated_at: string
        }
        Insert: {
          brochure_name?: string | null
          brochure_url?: string | null
          city?: string | null
          cover_url?: string | null
          created_at?: string
          cta_form_enabled?: boolean
          cta_phone?: string | null
          currency?: string | null
          deleted_at?: string | null
          description?: string | null
          developer?: string | null
          gallery?: Json
          id?: string
          location?: string | null
          meta?: Json
          name: string
          price_from?: number | null
          price_to?: number | null
          property_type?: string | null
          sales_policy?: string | null
          slug?: string | null
          status?: string | null
          tenant_id: string
          unit_highlights?: Json
          updated_at?: string
        }
        Update: {
          brochure_name?: string | null
          brochure_url?: string | null
          city?: string | null
          cover_url?: string | null
          created_at?: string
          cta_form_enabled?: boolean
          cta_phone?: string | null
          currency?: string | null
          deleted_at?: string | null
          description?: string | null
          developer?: string | null
          gallery?: Json
          id?: string
          location?: string | null
          meta?: Json
          name?: string
          price_from?: number | null
          price_to?: number | null
          property_type?: string | null
          sales_policy?: string | null
          slug?: string | null
          status?: string | null
          tenant_id?: string
          unit_highlights?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_page_views: {
        Row: {
          conversions: number
          day: string
          page_id: string
          tenant_id: string
          views: number
        }
        Insert: {
          conversions?: number
          day?: string
          page_id: string
          tenant_id: string
          views?: number
        }
        Update: {
          conversions?: number
          day?: string
          page_id?: string
          tenant_id?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_page_views_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "ai_sales_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_page_views_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_prompt_uses: {
        Row: {
          id: number
          note: string | null
          page_id: string | null
          prompt_id: string
          tenant_id: string
          used_at: string
          used_by: string | null
        }
        Insert: {
          id?: number
          note?: string | null
          page_id?: string | null
          prompt_id: string
          tenant_id: string
          used_at?: string
          used_by?: string | null
        }
        Update: {
          id?: number
          note?: string | null
          page_id?: string | null
          prompt_id?: string
          tenant_id?: string
          used_at?: string
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_prompt_uses_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "sales_prompts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_prompt_uses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_prompts: {
        Row: {
          audience: string | null
          category: string
          created_at: string
          created_by: string | null
          cta: string | null
          deleted_at: string | null
          id: string
          industry: string | null
          last_used_at: string | null
          name: string
          prompt: string
          request: string | null
          source_page_id: string | null
          stage_id: string | null
          tags: string[]
          tenant_id: string
          tone: string | null
          updated_at: string
          use_count: number
          variables: Json
        }
        Insert: {
          audience?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          cta?: string | null
          deleted_at?: string | null
          id?: string
          industry?: string | null
          last_used_at?: string | null
          name: string
          prompt: string
          request?: string | null
          source_page_id?: string | null
          stage_id?: string | null
          tags?: string[]
          tenant_id: string
          tone?: string | null
          updated_at?: string
          use_count?: number
          variables?: Json
        }
        Update: {
          audience?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          cta?: string | null
          deleted_at?: string | null
          id?: string
          industry?: string | null
          last_used_at?: string | null
          name?: string
          prompt?: string
          request?: string | null
          source_page_id?: string | null
          stage_id?: string | null
          tags?: string[]
          tenant_id?: string
          tone?: string | null
          updated_at?: string
          use_count?: number
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "sales_prompts_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_prompts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          created_at: string
          key: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          created_at?: string
          key: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          created_at?: string
          key?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          is_lead: boolean
          team_id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          is_lead?: boolean
          team_id: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          is_lead?: boolean
          team_id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          plan: string
          settings: Json
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          plan?: string
          settings?: Json
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          plan?: string
          settings?: Json
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_resend_log: {
        Row: {
          email: string
          id: string
          ip: string | null
          sent_at: string
        }
        Insert: {
          email: string
          id?: string
          ip?: string | null
          sent_at?: string
        }
        Update: {
          email?: string
          id?: string
          ip?: string | null
          sent_at?: string
        }
        Relationships: []
      }
      wallet_cards: {
        Row: {
          card_id: string
          created_at: string
          deleted_at: string | null
          id: string
          install_count: number
          last_updated_at: string | null
          pass_url: string | null
          platform: string
          serial_number: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          card_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          install_count?: number
          last_updated_at?: string | null
          pass_url?: string | null
          platform: string
          serial_number?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          card_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          install_count?: number
          last_updated_at?: string | null
          pass_url?: string | null
          platform?: string
          serial_number?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_cards_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_cards_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
      bump_sales_page_conversion: {
        Args: { _page_id: string; _tenant_id: string }
        Returns: undefined
      }
      bump_sales_page_view: {
        Args: { _page_id: string; _tenant_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "owner"
        | "admin"
        | "manager"
        | "agent"
        | "viewer"
        | "platform_admin"
      deal_status: "open" | "won" | "lost"
      lead_status:
        | "new"
        | "contacted"
        | "qualified"
        | "proposal"
        | "won"
        | "lost"
        | "consulting"
        | "quoted"
        | "deposit"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: [
        "owner",
        "admin",
        "manager",
        "agent",
        "viewer",
        "platform_admin",
      ],
      deal_status: ["open", "won", "lost"],
      lead_status: [
        "new",
        "contacted",
        "qualified",
        "proposal",
        "won",
        "lost",
        "consulting",
        "quoted",
        "deposit",
      ],
    },
  },
} as const
