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
      agencies: {
        Row: {
          accepted_at: string | null
          address: string | null
          code: string
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          partner_tenant_id: string | null
          phone: string | null
          status: string
          tax_code: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          address?: string | null
          code: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          partner_tenant_id?: string | null
          phone?: string | null
          status?: string
          tax_code?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          address?: string | null
          code?: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          partner_tenant_id?: string | null
          phone?: string | null
          status?: string
          tax_code?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agencies_partner_tenant_id_fkey"
            columns: ["partner_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agencies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_access: {
        Row: {
          agency_id: string
          created_at: string
          id: string
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          agency_id: string
          created_at?: string
          id?: string
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          agency_id?: string
          created_at?: string
          id?: string
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_access_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_access_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_allocations: {
        Row: {
          agency_id: string
          assigned_by: string
          created_at: string
          expires_at: string | null
          id: string
          product_id: string
          project_id: string
          revoked_at: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          agency_id: string
          assigned_by: string
          created_at?: string
          expires_at?: string | null
          id?: string
          product_id: string
          project_id: string
          revoked_at?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          agency_id?: string
          assigned_by?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          product_id?: string
          project_id?: string
          revoked_at?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_allocations_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_allocations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_allocations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_commission_entries: {
        Row: {
          agency_id: string
          amount: number
          base_amount: number
          contract_code: string
          contract_id: string
          created_at: string
          currency: string
          dispute_note: string | null
          due_date: string | null
          history: Json
          id: string
          level: string
          payer_tenant_id: string
          rate: number
          receiver_tenant_id: string
          sale_user_id: string | null
          status: string
        }
        Insert: {
          agency_id: string
          amount: number
          base_amount: number
          contract_code: string
          contract_id: string
          created_at?: string
          currency: string
          dispute_note?: string | null
          due_date?: string | null
          history?: Json
          id?: string
          level: string
          payer_tenant_id: string
          rate: number
          receiver_tenant_id: string
          sale_user_id?: string | null
          status?: string
        }
        Update: {
          agency_id?: string
          amount?: number
          base_amount?: number
          contract_code?: string
          contract_id?: string
          created_at?: string
          currency?: string
          dispute_note?: string | null
          due_date?: string | null
          history?: Json
          id?: string
          level?: string
          payer_tenant_id?: string
          rate?: number
          receiver_tenant_id?: string
          sale_user_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_commission_entries_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_commission_entries_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_commission_entries_payer_tenant_id_fkey"
            columns: ["payer_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_commission_entries_receiver_tenant_id_fkey"
            columns: ["receiver_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_commission_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          entry_id: string
          id: string
          paid_date: string
          received_at: string | null
          reference: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by: string
          entry_id: string
          id?: string
          paid_date: string
          received_at?: string | null
          reference: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          entry_id?: string
          id?: string
          paid_date?: string
          received_at?: string | null
          reference?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_commission_payments_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "agency_commission_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_lead_referrals: {
        Row: {
          agency_id: string
          created_at: string
          history: Json
          id: string
          lead_id: string
          partner_tenant_id: string
          project_id: string
          responded_at: string | null
          sale_user_id: string
          sla_due_at: string
          status: string
          team_id: string | null
          tenant_id: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          history?: Json
          id?: string
          lead_id: string
          partner_tenant_id: string
          project_id: string
          responded_at?: string | null
          sale_user_id: string
          sla_due_at: string
          status?: string
          team_id?: string | null
          tenant_id: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          history?: Json
          id?: string
          lead_id?: string
          partner_tenant_id?: string
          project_id?: string
          responded_at?: string | null
          sale_user_id?: string
          sla_due_at?: string
          status?: string
          team_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_lead_referrals_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_lead_referrals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_lead_referrals_partner_tenant_id_fkey"
            columns: ["partner_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_lead_referrals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_lead_referrals_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_lead_referrals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_lead_rules: {
        Row: {
          agency_id: string
          enabled: boolean
          id: string
          project_id: string
          sla_minutes: number
          tenant_id: string
        }
        Insert: {
          agency_id: string
          enabled?: boolean
          id?: string
          project_id: string
          sla_minutes?: number
          tenant_id: string
        }
        Update: {
          agency_id?: string
          enabled?: boolean
          id?: string
          project_id?: string
          sla_minutes?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_lead_rules_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_lead_rules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_lead_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_referral_handovers: {
        Row: {
          actor: string
          created_at: string
          from_agency_id: string
          from_partner_id: string
          from_sale_id: string
          from_team_id: string | null
          id: string
          master_tenant_id: string
          reason: string
          referral_id: string
          to_agency_id: string
          to_partner_id: string
          to_sale_id: string
          to_team_id: string | null
        }
        Insert: {
          actor: string
          created_at?: string
          from_agency_id: string
          from_partner_id: string
          from_sale_id: string
          from_team_id?: string | null
          id?: string
          master_tenant_id: string
          reason: string
          referral_id: string
          to_agency_id: string
          to_partner_id: string
          to_sale_id: string
          to_team_id?: string | null
        }
        Update: {
          actor?: string
          created_at?: string
          from_agency_id?: string
          from_partner_id?: string
          from_sale_id?: string
          from_team_id?: string | null
          id?: string
          master_tenant_id?: string
          reason?: string
          referral_id?: string
          to_agency_id?: string
          to_partner_id?: string
          to_sale_id?: string
          to_team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_referral_handovers_master_tenant_id_fkey"
            columns: ["master_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_referral_handovers_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "agency_lead_referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_team_routing: {
        Row: {
          agency_id: string
          id: string
          partner_tenant_id: string
          project_id: string
          team_ids: string[]
        }
        Insert: {
          agency_id: string
          id?: string
          partner_tenant_id: string
          project_id: string
          team_ids?: string[]
        }
        Update: {
          agency_id?: string
          id?: string
          partner_tenant_id?: string
          project_id?: string
          team_ids?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "agency_team_routing_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_team_routing_partner_tenant_id_fkey"
            columns: ["partner_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_team_routing_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
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
          is_published: boolean
          lead_id: string | null
          location: string | null
          notes: string | null
          project_id: string | null
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
          is_published?: boolean
          lead_id?: string | null
          location?: string | null
          notes?: string | null
          project_id?: string | null
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
          is_published?: boolean
          lead_id?: string | null
          location?: string | null
          notes?: string | null
          project_id?: string | null
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
            foreignKeyName: "appointments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      bank_transactions: {
        Row: {
          account_number: string | null
          allocation: Json
          amount: number
          bank_name: string | null
          content: string | null
          created_at: string
          external_id: string
          id: string
          matched_at: string | null
          matched_by: string | null
          matched_contract_id: string | null
          note: string | null
          provider: string
          raw: Json
          reference_code: string | null
          status: string
          tenant_id: string
          transferred_at: string
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          allocation?: Json
          amount?: number
          bank_name?: string | null
          content?: string | null
          created_at?: string
          external_id: string
          id?: string
          matched_at?: string | null
          matched_by?: string | null
          matched_contract_id?: string | null
          note?: string | null
          provider?: string
          raw?: Json
          reference_code?: string | null
          status?: string
          tenant_id: string
          transferred_at?: string
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          allocation?: Json
          amount?: number
          bank_name?: string | null
          content?: string | null
          created_at?: string
          external_id?: string
          id?: string
          matched_at?: string | null
          matched_by?: string | null
          matched_contract_id?: string | null
          note?: string | null
          provider?: string
          raw?: Json
          reference_code?: string | null
          status?: string
          tenant_id?: string
          transferred_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_matched_contract_id_fkey"
            columns: ["matched_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      call_logs: {
        Row: {
          agent_user_id: string | null
          conversation_id: string | null
          created_at: string
          customer_id: string | null
          direction: Database["public"]["Enums"]["conv_direction"]
          duration_seconds: number
          ended_at: string | null
          external_call_id: string | null
          id: string
          lead_id: string | null
          meta: Json
          notes: string | null
          outcome: string | null
          phone: string | null
          provider: string
          recording_url: string | null
          started_at: string
          status: string
          tenant_id: string
          transcript: string | null
          updated_at: string
        }
        Insert: {
          agent_user_id?: string | null
          conversation_id?: string | null
          created_at?: string
          customer_id?: string | null
          direction?: Database["public"]["Enums"]["conv_direction"]
          duration_seconds?: number
          ended_at?: string | null
          external_call_id?: string | null
          id?: string
          lead_id?: string | null
          meta?: Json
          notes?: string | null
          outcome?: string | null
          phone?: string | null
          provider?: string
          recording_url?: string | null
          started_at?: string
          status?: string
          tenant_id: string
          transcript?: string | null
          updated_at?: string
        }
        Update: {
          agent_user_id?: string | null
          conversation_id?: string | null
          created_at?: string
          customer_id?: string | null
          direction?: Database["public"]["Enums"]["conv_direction"]
          duration_seconds?: number
          ended_at?: string | null
          external_call_id?: string | null
          id?: string
          lead_id?: string | null
          meta?: Json
          notes?: string | null
          outcome?: string | null
          phone?: string | null
          provider?: string
          recording_url?: string | null
          started_at?: string
          status?: string
          tenant_id?: string
          transcript?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_recipients: {
        Row: {
          campaign_id: string
          channel: string
          created_at: string
          error: string | null
          id: string
          lead_id: string
          sent_at: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          campaign_id: string
          channel: string
          created_at?: string
          error?: string | null
          id?: string
          lead_id: string
          sent_at?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          campaign_id?: string
          channel?: string
          created_at?: string
          error?: string | null
          id?: string
          lead_id?: string
          sent_at?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
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
      channel_events: {
        Row: {
          account_id: string
          channel: string
          event_id: string
          received_at: string
          tenant_id: string
        }
        Insert: {
          account_id: string
          channel: string
          event_id: string
          received_at?: string
          tenant_id: string
        }
        Update: {
          account_id?: string
          channel?: string
          event_id?: string
          received_at?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_identities: {
        Row: {
          account_id: string
          channel: string
          conversation_id: string
          created_at: string
          external_user_id: string
          id: string
          last_inbound_at: string | null
          lead_id: string | null
          tenant_id: string
        }
        Insert: {
          account_id: string
          channel: string
          conversation_id: string
          created_at?: string
          external_user_id: string
          id?: string
          last_inbound_at?: string | null
          lead_id?: string | null
          tenant_id: string
        }
        Update: {
          account_id?: string
          channel?: string
          conversation_id?: string
          created_at?: string
          external_user_id?: string
          id?: string
          last_inbound_at?: string | null
          lead_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_identities_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_identities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_identities_tenant_id_fkey"
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
      collaborator_payments: {
        Row: {
          actor_user_id: string
          amount: number
          id: string
          paid_at: string
          reference: string
          referral_id: string
          tenant_id: string
        }
        Insert: {
          actor_user_id: string
          amount: number
          id?: string
          paid_at?: string
          reference: string
          referral_id: string
          tenant_id: string
        }
        Update: {
          actor_user_id?: string
          amount?: number
          id?: string
          paid_at?: string
          reference?: string
          referral_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaborator_payments_tenant_id_referral_id_fkey"
            columns: ["tenant_id", "referral_id"]
            isOneToOne: false
            referencedRelation: "collaborator_referrals"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      collaborator_portal_invites: {
        Row: {
          collaborator_id: string
          created_at: string
          created_by: string
          email: string
          expires_at: string
          id: string
          tenant_id: string
          token_hash: string
          used_at: string | null
        }
        Insert: {
          collaborator_id: string
          created_at?: string
          created_by: string
          email: string
          expires_at?: string
          id?: string
          tenant_id: string
          token_hash: string
          used_at?: string | null
        }
        Update: {
          collaborator_id?: string
          created_at?: string
          created_by?: string
          email?: string
          expires_at?: string
          id?: string
          tenant_id?: string
          token_hash?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collaborator_portal_invites_tenant_id_collaborator_id_fkey"
            columns: ["tenant_id", "collaborator_id"]
            isOneToOne: false
            referencedRelation: "sales_collaborators"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      collaborator_referrals: {
        Row: {
          approved: boolean
          collaborator_id: string
          commission_amount: number
          contract_id: string | null
          created_at: string
          id: string
          lead_id: string
          note: string | null
          tenant_id: string
        }
        Insert: {
          approved?: boolean
          collaborator_id: string
          commission_amount?: number
          contract_id?: string | null
          created_at?: string
          id?: string
          lead_id: string
          note?: string | null
          tenant_id: string
        }
        Update: {
          approved?: boolean
          collaborator_id?: string
          commission_amount?: number
          contract_id?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          note?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaborator_referrals_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborator_referrals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborator_referrals_tenant_id_collaborator_id_fkey"
            columns: ["tenant_id", "collaborator_id"]
            isOneToOne: false
            referencedRelation: "sales_collaborators"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      contract_commissions: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          beneficiary_name: string | null
          beneficiary_user_id: string | null
          contract_id: string
          created_at: string
          id: string
          note: string | null
          paid_at: string | null
          percent: number | null
          role_label: string | null
          status: Database["public"]["Enums"]["commission_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          beneficiary_name?: string | null
          beneficiary_user_id?: string | null
          contract_id: string
          created_at?: string
          id?: string
          note?: string | null
          paid_at?: string | null
          percent?: number | null
          role_label?: string | null
          status?: Database["public"]["Enums"]["commission_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          beneficiary_name?: string | null
          beneficiary_user_id?: string | null
          contract_id?: string
          created_at?: string
          id?: string
          note?: string | null
          paid_at?: string | null
          percent?: number | null
          role_label?: string | null
          status?: Database["public"]["Enums"]["commission_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_commissions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_commissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_installments: {
        Row: {
          amount: number
          contract_id: string
          created_at: string
          due_date: string | null
          id: string
          name: string
          note: string | null
          paid_amount: number
          paid_at: string | null
          percent: number | null
          position: number
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          contract_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          name: string
          note?: string | null
          paid_amount?: number
          paid_at?: string | null
          percent?: number | null
          position?: number
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          contract_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          name?: string
          note?: string | null
          paid_amount?: number
          paid_at?: string | null
          percent?: number | null
          position?: number
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_installments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_installments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          code: string
          completed_at: string | null
          contract_kind: string
          created_at: string
          created_by: string | null
          currency: string
          customer_id: string | null
          deal_id: string | null
          deleted_at: string | null
          deposit_amount: number | null
          discount_amount: number
          discount_policy_id: string | null
          id: string
          lead_id: string | null
          lease_end: string | null
          lease_start: string | null
          monthly_rent: number | null
          net_price: number
          note: string | null
          owner_user_id: string | null
          product_id: string | null
          project_id: string | null
          rent_cycle_day: number | null
          sale_price: number
          signed_at: string | null
          status: Database["public"]["Enums"]["contract_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          code: string
          completed_at?: string | null
          contract_kind?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id?: string | null
          deal_id?: string | null
          deleted_at?: string | null
          deposit_amount?: number | null
          discount_amount?: number
          discount_policy_id?: string | null
          id?: string
          lead_id?: string | null
          lease_end?: string | null
          lease_start?: string | null
          monthly_rent?: number | null
          net_price?: number
          note?: string | null
          owner_user_id?: string | null
          product_id?: string | null
          project_id?: string | null
          rent_cycle_day?: number | null
          sale_price?: number
          signed_at?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          completed_at?: string | null
          contract_kind?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id?: string | null
          deal_id?: string | null
          deleted_at?: string | null
          deposit_amount?: number | null
          discount_amount?: number
          discount_policy_id?: string | null
          id?: string
          lead_id?: string | null
          lease_end?: string | null
          lease_start?: string | null
          monthly_rent?: number | null
          net_price?: number
          note?: string | null
          owner_user_id?: string | null
          product_id?: string | null
          project_id?: string | null
          rent_cycle_day?: number | null
          sale_price?: number
          signed_at?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "pipeline_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_discount_policy_id_fkey"
            columns: ["discount_policy_id"]
            isOneToOne: false
            referencedRelation: "payment_discount_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_messages: {
        Row: {
          attachment_url: string | null
          body: string | null
          channel: Database["public"]["Enums"]["conv_channel"]
          conversation_id: string
          created_at: string
          delivery_status: string
          direction: Database["public"]["Enums"]["conv_direction"]
          error_message: string | null
          external_id: string | null
          id: string
          meta: Json
          sender_name: string | null
          sender_user_id: string | null
          tenant_id: string
        }
        Insert: {
          attachment_url?: string | null
          body?: string | null
          channel?: Database["public"]["Enums"]["conv_channel"]
          conversation_id: string
          created_at?: string
          delivery_status?: string
          direction: Database["public"]["Enums"]["conv_direction"]
          error_message?: string | null
          external_id?: string | null
          id?: string
          meta?: Json
          sender_name?: string | null
          sender_user_id?: string | null
          tenant_id: string
        }
        Update: {
          attachment_url?: string | null
          body?: string | null
          channel?: Database["public"]["Enums"]["conv_channel"]
          conversation_id?: string
          created_at?: string
          delivery_status?: string
          direction?: Database["public"]["Enums"]["conv_direction"]
          error_message?: string | null
          external_id?: string | null
          id?: string
          meta?: Json
          sender_name?: string | null
          sender_user_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          card_id: string | null
          channel: Database["public"]["Enums"]["conv_channel"]
          contact_name: string | null
          contact_phone: string | null
          contact_zalo_id: string | null
          created_at: string
          customer_id: string | null
          id: string
          last_message_at: string
          last_message_preview: string | null
          lead_id: string | null
          meta: Json
          owner_user_id: string | null
          project_id: string | null
          status: string
          tenant_id: string
          unread_count: number
          updated_at: string
          visitor_key: string | null
        }
        Insert: {
          card_id?: string | null
          channel?: Database["public"]["Enums"]["conv_channel"]
          contact_name?: string | null
          contact_phone?: string | null
          contact_zalo_id?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          last_message_at?: string
          last_message_preview?: string | null
          lead_id?: string | null
          meta?: Json
          owner_user_id?: string | null
          project_id?: string | null
          status?: string
          tenant_id: string
          unread_count?: number
          updated_at?: string
          visitor_key?: string | null
        }
        Update: {
          card_id?: string | null
          channel?: Database["public"]["Enums"]["conv_channel"]
          contact_name?: string | null
          contact_phone?: string | null
          contact_zalo_id?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          last_message_at?: string
          last_message_preview?: string | null
          lead_id?: string | null
          meta?: Json
          owner_user_id?: string | null
          project_id?: string | null
          status?: string
          tenant_id?: string
          unread_count?: number
          updated_at?: string
          visitor_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cron_tokens: {
        Row: {
          created_at: string
          name: string
          token: string
        }
        Insert: {
          created_at?: string
          name: string
          token?: string
        }
        Update: {
          created_at?: string
          name?: string
          token?: string
        }
        Relationships: []
      }
      customer_transactions: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          currency: string
          customer_id: string
          deal_id: string | null
          deleted_at: string | null
          id: string
          kind: string
          note: string | null
          occurred_at: string
          project_id: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id: string
          deal_id?: string | null
          deleted_at?: string | null
          id?: string
          kind?: string
          note?: string | null
          occurred_at?: string
          project_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id?: string
          deal_id?: string | null
          deleted_at?: string | null
          id?: string
          kind?: string
          note?: string | null
          occurred_at?: string
          project_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_transactions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "pipeline_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      event_tickets: {
        Row: {
          checked_in_at: string | null
          checked_in_by: string | null
          code: string
          created_at: string
          event_id: string
          guest_email: string | null
          guest_name: string
          guest_phone: string | null
          id: string
          invited_by: string | null
          lead_id: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          code: string
          created_at?: string
          event_id: string
          guest_email?: string | null
          guest_name: string
          guest_phone?: string | null
          id?: string
          invited_by?: string | null
          lead_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          code?: string
          created_at?: string
          event_id?: string
          guest_email?: string | null
          guest_name?: string
          guest_phone?: string | null
          id?: string
          invited_by?: string | null
          lead_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "sales_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_tickets_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_tickets_tenant_id_fkey"
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
      handovers: {
        Row: {
          counts: Json
          created_at: string
          created_by: string
          from_user_id: string
          id: string
          reason: string | null
          team_id: string | null
          tenant_id: string
          to_user_ids: string[]
        }
        Insert: {
          counts?: Json
          created_at?: string
          created_by: string
          from_user_id: string
          id?: string
          reason?: string | null
          team_id?: string | null
          tenant_id: string
          to_user_ids?: string[]
        }
        Update: {
          counts?: Json
          created_at?: string
          created_by?: string
          from_user_id?: string
          id?: string
          reason?: string | null
          team_id?: string | null
          tenant_id?: string
          to_user_ids?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "handovers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      installment_history: {
        Row: {
          action: string
          actor_user_id: string | null
          after_row: Json | null
          before_row: Json | null
          contract_id: string
          id: string
          installment_id: string
          occurred_at: string
          tenant_id: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          after_row?: Json | null
          before_row?: Json | null
          contract_id: string
          id?: string
          installment_id: string
          occurred_at?: string
          tenant_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          after_row?: Json | null
          before_row?: Json | null
          contract_id?: string
          id?: string
          installment_id?: string
          occurred_at?: string
          tenant_id?: string
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
      job_locks: {
        Row: {
          key: string
          locked_by: string | null
          locked_until: string
          note: string | null
          updated_at: string
        }
        Insert: {
          key: string
          locked_by?: string | null
          locked_until: string
          note?: string | null
          updated_at?: string
        }
        Update: {
          key?: string
          locked_by?: string | null
          locked_until?: string
          note?: string | null
          updated_at?: string
        }
        Relationships: []
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
      lead_push_jobs: {
        Row: {
          attempts: number
          created_at: string
          deadline: string | null
          finished_at: string | null
          id: string
          kind: string
          last_error: string | null
          lead_id: string
          referral_id: string | null
          run_at: string
          state: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          deadline?: string | null
          finished_at?: string | null
          id?: string
          kind: string
          last_error?: string | null
          lead_id: string
          referral_id?: string | null
          run_at: string
          state?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          deadline?: string | null
          finished_at?: string | null
          id?: string
          kind?: string
          last_error?: string | null
          lead_id?: string
          referral_id?: string | null
          run_at?: string
          state?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_push_jobs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_push_jobs_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "agency_lead_referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_push_runtime: {
        Row: {
          callback_url: string
          id: boolean
        }
        Insert: {
          callback_url: string
          id?: boolean
        }
        Update: {
          callback_url?: string
          id?: boolean
        }
        Relationships: []
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
      message_tickets: {
        Row: {
          assignee_user_id: string | null
          code: string
          conversation_id: string | null
          created_at: string
          created_by: string | null
          due_at: string | null
          id: string
          kind: string
          priority: string
          resolved_at: string | null
          source: string | null
          status: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_user_id?: string | null
          code?: string
          conversation_id?: string | null
          created_at?: string
          created_by?: string | null
          due_at?: string | null
          id?: string
          kind?: string
          priority?: string
          resolved_at?: string | null
          source?: string | null
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_user_id?: string | null
          code?: string
          conversation_id?: string | null
          created_at?: string
          created_by?: string | null
          due_at?: string | null
          id?: string
          kind?: string
          priority?: string
          resolved_at?: string | null
          source?: string | null
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_tickets_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_tickets_tenant_id_fkey"
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
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          lead_id: string | null
          link: string | null
          tenant_id: string
          title: string
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          lead_id?: string | null
          link?: string | null
          tenant_id: string
          title: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          lead_id?: string | null
          link?: string | null
          tenant_id?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nurture_messages: {
        Row: {
          body: string | null
          channel: string
          conversation_id: string | null
          created_at: string
          error_message: string | null
          id: string
          lead_id: string | null
          owner_user_id: string | null
          product_id: string | null
          sent_at: string
          status: string
          step_key: string
          tenant_id: string
        }
        Insert: {
          body?: string | null
          channel: string
          conversation_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          owner_user_id?: string | null
          product_id?: string | null
          sent_at?: string
          status?: string
          step_key: string
          tenant_id: string
        }
        Update: {
          body?: string | null
          channel?: string
          conversation_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          owner_user_id?: string | null
          product_id?: string | null
          sent_at?: string
          status?: string
          step_key?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nurture_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nurture_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nurture_messages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nurture_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_discount_policies: {
        Row: {
          active: boolean
          created_at: string
          discount_percent: number
          id: string
          name: string
          product_kinds: string[]
          project_id: string | null
          sort: number
          tenant_id: string
          within_days: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          discount_percent?: number
          id?: string
          name: string
          product_kinds?: string[]
          project_id?: string | null
          sort?: number
          tenant_id: string
          within_days?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          discount_percent?: number
          id?: string
          name?: string
          product_kinds?: string[]
          project_id?: string | null
          sort?: number
          tenant_id?: string
          within_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "payment_discount_policies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_discount_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_reminders: {
        Row: {
          amount: number
          contract_id: string
          created_at: string
          days_overdue: number
          id: string
          installment_id: string
          kind: string
          notified_user_id: string | null
          tenant_id: string
        }
        Insert: {
          amount?: number
          contract_id: string
          created_at?: string
          days_overdue?: number
          id?: string
          installment_id: string
          kind: string
          notified_user_id?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number
          contract_id?: string
          created_at?: string
          days_overdue?: number
          id?: string
          installment_id?: string
          kind?: string
          notified_user_id?: string | null
          tenant_id?: string
        }
        Relationships: []
      }
      pipeline_deals: {
        Row: {
          closed_at: string | null
          created_at: string
          currency: string | null
          customer_id: string | null
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
          customer_id?: string | null
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
          customer_id?: string | null
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
            foreignKeyName: "pipeline_deals_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
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
      plot_transform_events: {
        Row: {
          action: string
          child_ids: string[]
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          parent_ids: string[]
          project_id: string | null
          tenant_id: string
        }
        Insert: {
          action: string
          child_ids: string[]
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          parent_ids: string[]
          project_id?: string | null
          tenant_id: string
        }
        Update: {
          action?: string
          child_ids?: string[]
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          parent_ids?: string[]
          project_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plot_transform_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plot_transform_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_status_history: {
        Row: {
          changed_by: string | null
          from_status: Database["public"]["Enums"]["listing_status"] | null
          id: number
          note: string | null
          occurred_at: string
          product_id: string
          tenant_id: string
          to_status: Database["public"]["Enums"]["listing_status"]
        }
        Insert: {
          changed_by?: string | null
          from_status?: Database["public"]["Enums"]["listing_status"] | null
          id?: number
          note?: string | null
          occurred_at?: string
          product_id: string
          tenant_id: string
          to_status: Database["public"]["Enums"]["listing_status"]
        }
        Update: {
          changed_by?: string | null
          from_status?: Database["public"]["Enums"]["listing_status"] | null
          id?: number
          note?: string | null
          occurred_at?: string
          product_id?: string
          tenant_id?: string
          to_status?: Database["public"]["Enums"]["listing_status"]
        }
        Relationships: [
          {
            foreignKeyName: "product_status_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_status_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          area: number | null
          attributes: Json
          bathrooms: number | null
          bedrooms: number | null
          category: string | null
          code: string | null
          created_at: string
          created_by: string | null
          currency: string
          deal_id: string | null
          description: string | null
          direction: string | null
          floor: number | null
          hold_expires_at: string | null
          hold_owner_user_id: string | null
          id: string
          image_url: string | null
          is_public: boolean
          legal_status: string | null
          listing_status: Database["public"]["Enums"]["listing_status"]
          map_col: number | null
          map_row: number | null
          name: string
          price: number
          product_type: Database["public"]["Enums"]["property_kind"] | null
          project_id: string | null
          sku: string | null
          status: string
          tenant_id: string
          unit: string | null
          updated_at: string
          usable_area: number | null
          zone: string | null
        }
        Insert: {
          area?: number | null
          attributes?: Json
          bathrooms?: number | null
          bedrooms?: number | null
          category?: string | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deal_id?: string | null
          description?: string | null
          direction?: string | null
          floor?: number | null
          hold_expires_at?: string | null
          hold_owner_user_id?: string | null
          id?: string
          image_url?: string | null
          is_public?: boolean
          legal_status?: string | null
          listing_status?: Database["public"]["Enums"]["listing_status"]
          map_col?: number | null
          map_row?: number | null
          name: string
          price?: number
          product_type?: Database["public"]["Enums"]["property_kind"] | null
          project_id?: string | null
          sku?: string | null
          status?: string
          tenant_id: string
          unit?: string | null
          updated_at?: string
          usable_area?: number | null
          zone?: string | null
        }
        Update: {
          area?: number | null
          attributes?: Json
          bathrooms?: number | null
          bedrooms?: number | null
          category?: string | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deal_id?: string | null
          description?: string | null
          direction?: string | null
          floor?: number | null
          hold_expires_at?: string | null
          hold_owner_user_id?: string | null
          id?: string
          image_url?: string | null
          is_public?: boolean
          legal_status?: string | null
          listing_status?: Database["public"]["Enums"]["listing_status"]
          map_col?: number | null
          map_row?: number | null
          name?: string
          price?: number
          product_type?: Database["public"]["Enums"]["property_kind"] | null
          project_id?: string | null
          sku?: string | null
          status?: string
          tenant_id?: string
          unit?: string | null
          updated_at?: string
          usable_area?: number | null
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "pipeline_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
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
      project_qr_codes: {
        Row: {
          channel: string
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          label: string | null
          project_id: string
          scan_count: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          channel?: string
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          project_id: string
          scan_count?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          channel?: string
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          project_id?: string
          scan_count?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_qr_codes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_qr_codes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_touchpoints: {
        Row: {
          channel: string | null
          device_type: string | null
          event_type: string
          id: number
          ip_hash: string | null
          lead_id: string | null
          meta: Json
          occurred_at: string
          project_id: string
          qr_code_id: string | null
          referrer: string | null
          session_id: string
          tenant_id: string
        }
        Insert: {
          channel?: string | null
          device_type?: string | null
          event_type: string
          id?: number
          ip_hash?: string | null
          lead_id?: string | null
          meta?: Json
          occurred_at?: string
          project_id: string
          qr_code_id?: string | null
          referrer?: string | null
          session_id: string
          tenant_id: string
        }
        Update: {
          channel?: string | null
          device_type?: string | null
          event_type?: string
          id?: number
          ip_hash?: string | null
          lead_id?: string | null
          meta?: Json
          occurred_at?: string
          project_id?: string
          qr_code_id?: string | null
          referrer?: string | null
          session_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_touchpoints_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_touchpoints_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_touchpoints_qr_code_id_fkey"
            columns: ["qr_code_id"]
            isOneToOne: false
            referencedRelation: "project_qr_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_touchpoints_tenant_id_fkey"
            columns: ["tenant_id"]
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
          cover_mobile_url: string | null
          cover_url: string | null
          created_at: string
          cta_form_enabled: boolean
          cta_phone: string | null
          currency: string | null
          deleted_at: string | null
          description: string | null
          developer: string | null
          gallery: Json
          gallery_mobile: string[]
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
          cover_mobile_url?: string | null
          cover_url?: string | null
          created_at?: string
          cta_form_enabled?: boolean
          cta_phone?: string | null
          currency?: string | null
          deleted_at?: string | null
          description?: string | null
          developer?: string | null
          gallery?: Json
          gallery_mobile?: string[]
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
          cover_mobile_url?: string | null
          cover_url?: string | null
          created_at?: string
          cta_form_enabled?: boolean
          cta_phone?: string | null
          currency?: string | null
          deleted_at?: string | null
          description?: string | null
          developer?: string | null
          gallery?: Json
          gallery_mobile?: string[]
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
      push_devices: {
        Row: {
          auth: string
          created_at: string
          enabled: boolean
          endpoint: string
          id: string
          label: string | null
          last_error: string | null
          last_seen_at: string | null
          p256dh: string
          tenant_id: string | null
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          enabled?: boolean
          endpoint: string
          id?: string
          label?: string | null
          last_error?: string | null
          last_seen_at?: string | null
          p256dh: string
          tenant_id?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          enabled?: boolean
          endpoint?: string
          id?: string
          label?: string | null
          last_error?: string | null
          last_seen_at?: string | null
          p256dh?: string
          tenant_id?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      sales_collaborators: {
        Row: {
          code: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          note: string | null
          owner_user_id: string
          phone: string | null
          portal_user_id: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          note?: string | null
          owner_user_id: string
          phone?: string | null
          portal_user_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          note?: string | null
          owner_user_id?: string
          phone?: string | null
          portal_user_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_collaborators_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_events: {
        Row: {
          capacity: number | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          ends_at: string | null
          id: string
          kind: string
          location: string | null
          project_id: string | null
          starts_at: string
          status: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          kind?: string
          location?: string | null
          project_id?: string | null
          starts_at: string
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          kind?: string
          location?: string | null
          project_id?: string | null
          starts_at?: string
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_events_tenant_id_fkey"
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
      social_comment_logs: {
        Row: {
          author_id: string | null
          author_name: string | null
          comment_id: string
          created_at: string
          errors: Json
          hidden: boolean
          id: string
          lead_id: string | null
          message: string | null
          messaged: boolean
          page_id: string
          phone: string | null
          post_id: string | null
          replied: boolean
          tenant_id: string
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          comment_id: string
          created_at?: string
          errors?: Json
          hidden?: boolean
          id?: string
          lead_id?: string | null
          message?: string | null
          messaged?: boolean
          page_id: string
          phone?: string | null
          post_id?: string | null
          replied?: boolean
          tenant_id: string
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          comment_id?: string
          created_at?: string
          errors?: Json
          hidden?: boolean
          id?: string
          lead_id?: string | null
          message?: string | null
          messaged?: boolean
          page_id?: string
          phone?: string | null
          post_id?: string | null
          replied?: boolean
          tenant_id?: string
        }
        Relationships: []
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
      telegram_bot_bindings: {
        Row: {
          bot_id: string
          enabled: boolean
          key_digest: string
          tenant_id: string
        }
        Insert: {
          bot_id: string
          enabled?: boolean
          key_digest: string
          tenant_id: string
        }
        Update: {
          bot_id?: string
          enabled?: boolean
          key_digest?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "telegram_bot_bindings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_credentials: {
        Row: {
          ciphertext: string
          iv: string
          key: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ciphertext: string
          iv: string
          key: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ciphertext?: string
          iv?: string
          key?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      tenant_email_domains: {
        Row: {
          checked_at: string | null
          dns_records: Json
          domain: string
          enabled: boolean
          provider_domain_id: string
          reply_to: string | null
          sender_email: string
          sender_name: string
          status: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          checked_at?: string | null
          dns_records?: Json
          domain: string
          enabled?: boolean
          provider_domain_id: string
          reply_to?: string | null
          sender_email: string
          sender_name: string
          status?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          checked_at?: string | null
          dns_records?: Json
          domain?: string
          enabled?: boolean
          provider_domain_id?: string
          reply_to?: string | null
          sender_email?: string
          sender_name?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_email_domains_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_email_send_logs: {
        Row: {
          created_at: string
          error: string | null
          id: string
          provider_id: string | null
          recipient: string
          status: string
          subject: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          provider_id?: string | null
          recipient: string
          status: string
          subject: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          provider_id?: string | null
          recipient?: string
          status?: string
          subject?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_email_send_logs_tenant_id_fkey"
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
      accept_crm_invitation: { Args: { p_token: string }; Returns: string }
      acquire_job_lock: {
        Args: { _key: string; _seconds: number }
        Returns: boolean
      }
      agency_catalog: {
        Args: { p_page?: number; p_project?: string; p_tenant: string }
        Returns: Json
      }
      agency_command: {
        Args: { p_action: string; p_data: Json; p_tenant: string }
        Returns: string
      }
      agency_commission_command: {
        Args: {
          p_action: string
          p_agency: string
          p_data: Json
          p_tenant: string
        }
        Returns: string
      }
      agency_commission_view: {
        Args: {
          p_agency: string
          p_level: string
          p_page?: number
          p_tenant: string
        }
        Returns: Json
      }
      agency_project_pick: {
        Args: { p_agency: string; p_project: string }
        Returns: {
          team_id: string
          user_id: string
        }[]
      }
      agency_project_pool: {
        Args: { p_agency: string; p_project: string }
        Returns: {
          team_id: string
          user_id: string
        }[]
      }
      agency_push_target: { Args: { p_job: string }; Returns: Json }
      agency_referral_action: {
        Args: { p_action: string; p_id: string; p_sale?: string }
        Returns: undefined
      }
      agency_referral_handover: {
        Args: {
          p_agency: string
          p_id: string
          p_reason?: string
          p_sale?: string
          p_team?: string
          p_tenant: string
        }
        Returns: undefined
      }
      agency_routing_extended: {
        Args: { p_agency: string; p_tenant: string }
        Returns: Json
      }
      agency_routing_save: {
        Args: {
          p_agency: string
          p_enabled: boolean
          p_project: string
          p_sla: number
          p_tenant: string
        }
        Returns: undefined
      }
      agency_routing_view: {
        Args: { p_agency: string; p_tenant: string }
        Returns: Json
      }
      agency_sale_pool: {
        Args: { p_agency: string }
        Returns: {
          user_id: string
        }[]
      }
      agency_team_rule_save: {
        Args: {
          p_agency: string
          p_project: string
          p_teams: string[]
          p_tenant: string
        }
        Returns: undefined
      }
      agency_workspace: {
        Args: { p_agency?: string; p_tenant: string }
        Returns: Json
      }
      aggregate_interaction_events_daily: {
        Args: { _day?: string }
        Returns: undefined
      }
      bump_project_qr_scan: { Args: { _code: string }; Returns: undefined }
      bump_sales_page_conversion: {
        Args: { _page_id: string; _tenant_id: string }
        Returns: undefined
      }
      bump_sales_page_view: {
        Args: { _page_id: string; _tenant_id: string }
        Returns: undefined
      }
      can_read_agency_allocation: {
        Args: {
          p_agency: string
          p_expires: string
          p_status: string
          p_tenant: string
        }
        Returns: boolean
      }
      can_view_agency_inventory: {
        Args: { p_agency: string }
        Returns: boolean
      }
      change_product_listing_status: {
        Args: {
          p_expected: string
          p_id: string
          p_note?: string
          p_status: Database["public"]["Enums"]["listing_status"]
          p_until?: string
        }
        Returns: {
          area: number | null
          attributes: Json
          bathrooms: number | null
          bedrooms: number | null
          category: string | null
          code: string | null
          created_at: string
          created_by: string | null
          currency: string
          deal_id: string | null
          description: string | null
          direction: string | null
          floor: number | null
          hold_expires_at: string | null
          hold_owner_user_id: string | null
          id: string
          image_url: string | null
          is_public: boolean
          legal_status: string | null
          listing_status: Database["public"]["Enums"]["listing_status"]
          map_col: number | null
          map_row: number | null
          name: string
          price: number
          product_type: Database["public"]["Enums"]["property_kind"] | null
          project_id: string | null
          sku: string | null
          status: string
          tenant_id: string
          unit: string | null
          updated_at: string
          usable_area: number | null
          zone: string | null
        }
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_lead_push_jobs: {
        Args: never
        Returns: {
          attempts: number
          created_at: string
          deadline: string | null
          finished_at: string | null
          id: string
          kind: string
          last_error: string | null
          lead_id: string
          referral_id: string | null
          run_at: string
          state: string
          tenant_id: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "lead_push_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_push_jobs_v2: {
        Args: never
        Returns: {
          attempts: number
          created_at: string
          deadline: string | null
          finished_at: string | null
          id: string
          kind: string
          last_error: string | null
          lead_id: string
          referral_id: string | null
          run_at: string
          state: string
          tenant_id: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "lead_push_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      collaborator_command: {
        Args: { p_action: string; p_data: Json; p_tenant: string }
        Returns: string
      }
      collaborator_contracts: {
        Args: { p_referral: string; p_tenant: string }
        Returns: {
          code: string
          id: string
          net_price: number
        }[]
      }
      collaborator_portal_accept: { Args: { p_token: string }; Returns: string }
      collaborator_portal_invite: {
        Args: { p_collaborator: string; p_tenant: string }
        Returns: string
      }
      collaborator_portal_submit: {
        Args: {
          p_email?: string
          p_name: string
          p_need?: string
          p_phone: string
          p_request?: string
        }
        Returns: string
      }
      collaborator_portal_workspace: { Args: never; Returns: Json }
      collaborator_workspace: {
        Args: { p_search?: string; p_tenant: string }
        Returns: Json
      }
      create_rental_contract: {
        Args: {
          p_code: string
          p_customer: string
          p_cycle_day: number
          p_deposit: number
          p_lead: string
          p_lease_end: string
          p_lease_start: string
          p_monthly_rent: number
          p_note: string
          p_owner: string
          p_product: string
          p_schedule: Json
          p_tenant: string
        }
        Returns: string
      }
      dispatch_lead_push: { Args: never; Returns: undefined }
      ingest_channel_message: {
        Args: {
          p_account: string
          p_attachment?: string
          p_body: string
          p_channel: string
          p_event: string
          p_name: string
          p_owner: string
          p_phone: string
          p_project: string
          p_tenant: string
          p_user: string
        }
        Returns: Json
      }
      link_channel_profile: {
        Args: { p_conversation: string; p_lead: string; p_tenant: string }
        Returns: boolean
      }
      merge_plots: {
        Args: { p_child: Json; p_ids: string[] }
        Returns: {
          area: number | null
          attributes: Json
          bathrooms: number | null
          bedrooms: number | null
          category: string | null
          code: string | null
          created_at: string
          created_by: string | null
          currency: string
          deal_id: string | null
          description: string | null
          direction: string | null
          floor: number | null
          hold_expires_at: string | null
          hold_owner_user_id: string | null
          id: string
          image_url: string | null
          is_public: boolean
          legal_status: string | null
          listing_status: Database["public"]["Enums"]["listing_status"]
          map_col: number | null
          map_row: number | null
          name: string
          price: number
          product_type: Database["public"]["Enums"]["property_kind"] | null
          project_id: string | null
          sku: string | null
          status: string
          tenant_id: string
          unit: string | null
          updated_at: string
          usable_area: number | null
          zone: string | null
        }
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      refresh_lead_push_schedule: { Args: never; Returns: undefined }
      release_expired_product_holds: { Args: never; Returns: number }
      release_job_lock: { Args: { _key: string }; Returns: undefined }
      route_agency_lead: { Args: { p_lead: string }; Returns: string }
      save_contract_installments: {
        Args: { p_contract: string; p_rows: Json }
        Returns: number
      }
      split_plot: {
        Args: { p_children: Json; p_expected: string; p_id: string }
        Returns: {
          area: number | null
          attributes: Json
          bathrooms: number | null
          bedrooms: number | null
          category: string | null
          code: string | null
          created_at: string
          created_by: string | null
          currency: string
          deal_id: string | null
          description: string | null
          direction: string | null
          floor: number | null
          hold_expires_at: string | null
          hold_owner_user_id: string | null
          id: string
          image_url: string | null
          is_public: boolean
          legal_status: string | null
          listing_status: Database["public"]["Enums"]["listing_status"]
          map_col: number | null
          map_row: number | null
          name: string
          price: number
          product_type: Database["public"]["Enums"]["property_kind"] | null
          project_id: string | null
          sku: string | null
          status: string
          tenant_id: string
          unit: string | null
          updated_at: string
          usable_area: number | null
          zone: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: false
          isSetofReturn: true
        }
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
      commission_status: "pending" | "approved" | "paid"
      contract_status: "draft" | "active" | "completed" | "cancelled"
      conv_channel:
        | "web_chat"
        | "zalo"
        | "call"
        | "sms"
        | "email"
        | "note"
        | "messenger"
        | "telegram"
      conv_direction: "in" | "out"
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
      listing_status:
        | "available"
        | "locked"
        | "reserved"
        | "negotiating"
        | "deposited"
        | "contracted"
        | "sold"
        | "liquidated"
        | "retired"
        | "rented"
      property_kind:
        | "apartment"
        | "land_plot"
        | "townhouse"
        | "social_housing"
        | "subdivision"
        | "house_land"
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
      commission_status: ["pending", "approved", "paid"],
      contract_status: ["draft", "active", "completed", "cancelled"],
      conv_channel: [
        "web_chat",
        "zalo",
        "call",
        "sms",
        "email",
        "note",
        "messenger",
        "telegram",
      ],
      conv_direction: ["in", "out"],
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
      listing_status: [
        "available",
        "locked",
        "reserved",
        "negotiating",
        "deposited",
        "contracted",
        "sold",
        "liquidated",
        "retired",
        "rented",
      ],
      property_kind: [
        "apartment",
        "land_plot",
        "townhouse",
        "social_housing",
        "subdivision",
        "house_land",
      ],
    },
  },
} as const
