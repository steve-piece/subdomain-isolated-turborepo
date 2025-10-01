export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      capabilities: {
        Row: {
          category: string | null;
          created_at: string;
          description: string | null;
          id: string;
          key: string;
          name: string;
          requires_tier_id: string | null;
          updated_at: string;
        };
        Insert: {
          category?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          key: string;
          name: string;
          requires_tier_id?: string | null;
          updated_at?: string;
        };
        Update: {
          category?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          key?: string;
          name?: string;
          requires_tier_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "capabilities_requires_tier_id_fkey";
            columns: ["requires_tier_id"];
            isOneToOne: false;
            referencedRelation: "subscription_tiers";
            referencedColumns: ["id"];
          },
        ];
      };
      codebase_embeddings: {
        Row: {
          content: string | null;
          created_at: string;
          embedding: string | null;
          file_path: string;
          id: number;
          metadata: Json | null;
          updated_at: string;
        };
        Insert: {
          content?: string | null;
          created_at?: string;
          embedding?: string | null;
          file_path: string;
          id?: number;
          metadata?: Json | null;
          updated_at?: string;
        };
        Update: {
          content?: string | null;
          created_at?: string;
          embedding?: string | null;
          file_path?: string;
          id?: number;
          metadata?: Json | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      customer_billing_profiles: {
        Row: {
          billing_address: Json | null;
          billing_email: string | null;
          billing_name: string | null;
          created_at: string;
          default_payment_method_id: string | null;
          id: string;
          org_id: string;
          stripe_customer_id: string | null;
          tax_id: string | null;
          updated_at: string;
        };
        Insert: {
          billing_address?: Json | null;
          billing_email?: string | null;
          billing_name?: string | null;
          created_at?: string;
          default_payment_method_id?: string | null;
          id?: string;
          org_id: string;
          stripe_customer_id?: string | null;
          tax_id?: string | null;
          updated_at?: string;
        };
        Update: {
          billing_address?: Json | null;
          billing_email?: string | null;
          billing_name?: string | null;
          created_at?: string;
          default_payment_method_id?: string | null;
          id?: string;
          org_id?: string;
          stripe_customer_id?: string | null;
          tax_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customer_billing_profiles_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: true;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      feature_limits: {
        Row: {
          created_at: string;
          feature_key: string;
          id: string;
          limit_per_period: number | null;
          tier_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          feature_key: string;
          id?: string;
          limit_per_period?: number | null;
          tier_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          feature_key?: string;
          id?: string;
          limit_per_period?: number | null;
          tier_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "feature_limits_tier_id_fkey";
            columns: ["tier_id"];
            isOneToOne: false;
            referencedRelation: "subscription_tiers";
            referencedColumns: ["id"];
          },
        ];
      };
      invoices: {
        Row: {
          amount_due: number;
          amount_paid: number | null;
          amount_remaining: number | null;
          created_at: string;
          due_date: string | null;
          hosted_invoice_url: string | null;
          id: string;
          invoice_pdf: string | null;
          metadata: Json | null;
          number: string | null;
          org_id: string;
          paid_at: string | null;
          period_end: string | null;
          period_start: string | null;
          status: string;
          stripe_customer_id: string | null;
          stripe_invoice_id: string;
          subscription_id: string | null;
          subtotal: number;
          tax: number | null;
          total: number;
          updated_at: string;
        };
        Insert: {
          amount_due: number;
          amount_paid?: number | null;
          amount_remaining?: number | null;
          created_at?: string;
          due_date?: string | null;
          hosted_invoice_url?: string | null;
          id?: string;
          invoice_pdf?: string | null;
          metadata?: Json | null;
          number?: string | null;
          org_id: string;
          paid_at?: string | null;
          period_end?: string | null;
          period_start?: string | null;
          status: string;
          stripe_customer_id?: string | null;
          stripe_invoice_id: string;
          subscription_id?: string | null;
          subtotal: number;
          tax?: number | null;
          total: number;
          updated_at?: string;
        };
        Update: {
          amount_due?: number;
          amount_paid?: number | null;
          amount_remaining?: number | null;
          created_at?: string;
          due_date?: string | null;
          hosted_invoice_url?: string | null;
          id?: string;
          invoice_pdf?: string | null;
          metadata?: Json | null;
          number?: string | null;
          org_id?: string;
          paid_at?: string | null;
          period_end?: string | null;
          period_start?: string | null;
          status?: string;
          stripe_customer_id?: string | null;
          stripe_invoice_id?: string;
          subscription_id?: string | null;
          subtotal?: number;
          tax?: number | null;
          total?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "subscriptions";
            referencedColumns: ["id"];
          },
        ];
      };
      org_role_capabilities: {
        Row: {
          capability_id: string;
          created_at: string;
          granted: boolean;
          id: string;
          org_id: string;
          requires_min_tier_id: string | null;
          role: Database["public"]["Enums"]["user_role"];
          updated_at: string;
        };
        Insert: {
          capability_id: string;
          created_at?: string;
          granted: boolean;
          id?: string;
          org_id: string;
          requires_min_tier_id?: string | null;
          role: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Update: {
          capability_id?: string;
          created_at?: string;
          granted?: boolean;
          id?: string;
          org_id?: string;
          requires_min_tier_id?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "org_role_capabilities_capability_id_fkey";
            columns: ["capability_id"];
            isOneToOne: false;
            referencedRelation: "capabilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "org_role_capabilities_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "org_role_capabilities_requires_min_tier_id_fkey";
            columns: ["requires_min_tier_id"];
            isOneToOne: false;
            referencedRelation: "subscription_tiers";
            referencedColumns: ["id"];
          },
        ];
      };
      organization_team_settings: {
        Row: {
          allow_guest_access: boolean | null;
          allow_member_invites: boolean | null;
          auto_assign_default_role:
            | Database["public"]["Enums"]["user_role"]
            | null;
          created_at: string;
          guest_link_expiry_days: number | null;
          id: string;
          max_team_size: number | null;
          org_id: string;
          require_admin_approval: boolean | null;
          updated_at: string;
        };
        Insert: {
          allow_guest_access?: boolean | null;
          allow_member_invites?: boolean | null;
          auto_assign_default_role?:
            | Database["public"]["Enums"]["user_role"]
            | null;
          created_at?: string;
          guest_link_expiry_days?: number | null;
          id?: string;
          max_team_size?: number | null;
          org_id: string;
          require_admin_approval?: boolean | null;
          updated_at?: string;
        };
        Update: {
          allow_guest_access?: boolean | null;
          allow_member_invites?: boolean | null;
          auto_assign_default_role?:
            | Database["public"]["Enums"]["user_role"]
            | null;
          created_at?: string;
          guest_link_expiry_days?: number | null;
          id?: string;
          max_team_size?: number | null;
          org_id?: string;
          require_admin_approval?: boolean | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_team_settings_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: true;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          address: string | null;
          business_address: string | null;
          company_name: string;
          company_size: string | null;
          created_at: string | null;
          description: string | null;
          force_logout_after: string | null;
          id: string;
          industry: string | null;
          is_active: boolean;
          logo_url: string | null;
          metadata: Json | null;
          onboarding_completed: boolean;
          owner_id: string | null;
          permissions_updated_at: string | null;
          settings: Json | null;
          subdomain: string;
          support_email: string | null;
          updated_at: string | null;
          website: string | null;
          website_url: string | null;
        };
        Insert: {
          address?: string | null;
          business_address?: string | null;
          company_name: string;
          company_size?: string | null;
          created_at?: string | null;
          description?: string | null;
          force_logout_after?: string | null;
          id?: string;
          industry?: string | null;
          is_active?: boolean;
          logo_url?: string | null;
          metadata?: Json | null;
          onboarding_completed?: boolean;
          owner_id?: string | null;
          permissions_updated_at?: string | null;
          settings?: Json | null;
          subdomain: string;
          support_email?: string | null;
          updated_at?: string | null;
          website?: string | null;
          website_url?: string | null;
        };
        Update: {
          address?: string | null;
          business_address?: string | null;
          company_name?: string;
          company_size?: string | null;
          created_at?: string | null;
          description?: string | null;
          force_logout_after?: string | null;
          id?: string;
          industry?: string | null;
          is_active?: boolean;
          logo_url?: string | null;
          metadata?: Json | null;
          onboarding_completed?: boolean;
          owner_id?: string | null;
          permissions_updated_at?: string | null;
          settings?: Json | null;
          subdomain?: string;
          support_email?: string | null;
          updated_at?: string | null;
          website?: string | null;
          website_url?: string | null;
        };
        Relationships: [];
      };
      payment_methods: {
        Row: {
          card_brand: string | null;
          card_exp_month: number | null;
          card_exp_year: number | null;
          card_last4: string | null;
          created_at: string;
          id: string;
          is_default: boolean | null;
          metadata: Json | null;
          org_id: string;
          stripe_customer_id: string | null;
          stripe_payment_method_id: string;
          type: string;
          updated_at: string;
        };
        Insert: {
          card_brand?: string | null;
          card_exp_month?: number | null;
          card_exp_year?: number | null;
          card_last4?: string | null;
          created_at?: string;
          id?: string;
          is_default?: boolean | null;
          metadata?: Json | null;
          org_id: string;
          stripe_customer_id?: string | null;
          stripe_payment_method_id: string;
          type: string;
          updated_at?: string;
        };
        Update: {
          card_brand?: string | null;
          card_exp_month?: number | null;
          card_exp_year?: number | null;
          card_last4?: string | null;
          created_at?: string;
          id?: string;
          is_default?: boolean | null;
          metadata?: Json | null;
          org_id?: string;
          stripe_customer_id?: string | null;
          stripe_payment_method_id?: string;
          type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payment_methods_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      project_permissions: {
        Row: {
          created_at: string;
          granted_at: string;
          granted_by: string | null;
          id: string;
          permission_level: Database["public"]["Enums"]["project_permission_level"];
          project_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          granted_at?: string;
          granted_by?: string | null;
          id?: string;
          permission_level?: Database["public"]["Enums"]["project_permission_level"];
          project_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          granted_at?: string;
          granted_by?: string | null;
          id?: string;
          permission_level?: Database["public"]["Enums"]["project_permission_level"];
          project_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_permissions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          archived_at: string | null;
          created_at: string;
          description: string | null;
          id: string;
          metadata: Json;
          name: string;
          org_id: string;
          owner_id: string;
          settings: Json;
          status: string;
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          metadata?: Json;
          name: string;
          org_id: string;
          owner_id: string;
          settings?: Json;
          status?: string;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          metadata?: Json;
          name?: string;
          org_id?: string;
          owner_id?: string;
          settings?: Json;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      role_capabilities: {
        Row: {
          capability_id: string;
          created_at: string;
          id: string;
          is_default: boolean;
          role: Database["public"]["Enums"]["user_role"];
        };
        Insert: {
          capability_id: string;
          created_at?: string;
          id?: string;
          is_default?: boolean;
          role: Database["public"]["Enums"]["user_role"];
        };
        Update: {
          capability_id?: string;
          created_at?: string;
          id?: string;
          is_default?: boolean;
          role?: Database["public"]["Enums"]["user_role"];
        };
        Relationships: [
          {
            foreignKeyName: "role_capabilities_capability_id_fkey";
            columns: ["capability_id"];
            isOneToOne: false;
            referencedRelation: "capabilities";
            referencedColumns: ["id"];
          },
        ];
      };
      security_audit_log: {
        Row: {
          created_at: string;
          event_action: string;
          event_metadata: Json | null;
          event_type: string;
          id: string;
          ip_address: unknown | null;
          location_data: Json | null;
          org_id: string | null;
          severity: string | null;
          user_agent: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          event_action: string;
          event_metadata?: Json | null;
          event_type: string;
          id?: string;
          ip_address?: unknown | null;
          location_data?: Json | null;
          org_id?: string | null;
          severity?: string | null;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          event_action?: string;
          event_metadata?: Json | null;
          event_type?: string;
          id?: string;
          ip_address?: unknown | null;
          location_data?: Json | null;
          org_id?: string | null;
          severity?: string | null;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "security_audit_log_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      settings_usage_tracking: {
        Row: {
          created_at: string;
          feature_key: string;
          id: string;
          last_used_at: string | null;
          org_id: string;
          updated_at: string;
          usage_count: number | null;
        };
        Insert: {
          created_at?: string;
          feature_key: string;
          id?: string;
          last_used_at?: string | null;
          org_id: string;
          updated_at?: string;
          usage_count?: number | null;
        };
        Update: {
          created_at?: string;
          feature_key?: string;
          id?: string;
          last_used_at?: string | null;
          org_id?: string;
          updated_at?: string;
          usage_count?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "settings_usage_tracking_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      stripe_webhook_events: {
        Row: {
          created_at: string;
          error: string | null;
          event_type: string;
          id: string;
          payload: Json;
          processed: boolean | null;
          processed_at: string | null;
          stripe_event_id: string;
        };
        Insert: {
          created_at?: string;
          error?: string | null;
          event_type: string;
          id?: string;
          payload: Json;
          processed?: boolean | null;
          processed_at?: string | null;
          stripe_event_id: string;
        };
        Update: {
          created_at?: string;
          error?: string | null;
          event_type?: string;
          id?: string;
          payload?: Json;
          processed?: boolean | null;
          processed_at?: string | null;
          stripe_event_id?: string;
        };
        Relationships: [];
      };
      subscription_tiers: {
        Row: {
          allows_custom_permissions: boolean | null;
          created_at: string;
          id: string;
          max_projects: number | null;
          max_team_members: number | null;
          name: string;
          price_monthly: number | null;
          price_yearly: number | null;
          stripe_price_id: string | null;
          stripe_product_id: string | null;
          updated_at: string;
        };
        Insert: {
          allows_custom_permissions?: boolean | null;
          created_at?: string;
          id?: string;
          max_projects?: number | null;
          max_team_members?: number | null;
          name: string;
          price_monthly?: number | null;
          price_yearly?: number | null;
          stripe_price_id?: string | null;
          stripe_product_id?: string | null;
          updated_at?: string;
        };
        Update: {
          allows_custom_permissions?: boolean | null;
          created_at?: string;
          id?: string;
          max_projects?: number | null;
          max_team_members?: number | null;
          name?: string;
          price_monthly?: number | null;
          price_yearly?: number | null;
          stripe_price_id?: string | null;
          stripe_product_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          billing_cycle: string | null;
          cancel_at_period_end: boolean | null;
          canceled_at: string | null;
          created_at: string;
          current_period_end: string | null;
          current_period_start: string | null;
          id: string;
          metadata: Json | null;
          org_id: string;
          period_end: string;
          period_start: string;
          status: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          tier_id: string;
          trial_end: string | null;
          updated_at: string;
        };
        Insert: {
          billing_cycle?: string | null;
          cancel_at_period_end?: boolean | null;
          canceled_at?: string | null;
          created_at?: string;
          current_period_end?: string | null;
          current_period_start?: string | null;
          id?: string;
          metadata?: Json | null;
          org_id: string;
          period_end: string;
          period_start: string;
          status: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          tier_id: string;
          trial_end?: string | null;
          updated_at?: string;
        };
        Update: {
          billing_cycle?: string | null;
          cancel_at_period_end?: boolean | null;
          canceled_at?: string | null;
          created_at?: string;
          current_period_end?: string | null;
          current_period_start?: string | null;
          id?: string;
          metadata?: Json | null;
          org_id?: string;
          period_end?: string;
          period_start?: string;
          status?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          tier_id?: string;
          trial_end?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: true;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscriptions_tier_id_fkey";
            columns: ["tier_id"];
            isOneToOne: false;
            referencedRelation: "subscription_tiers";
            referencedColumns: ["id"];
          },
        ];
      };
      tenants: {
        Row: {
          company_name: string;
          created_at: string | null;
          id: string;
          subdomain: string;
        };
        Insert: {
          company_name: string;
          created_at?: string | null;
          id: string;
          subdomain: string;
        };
        Update: {
          company_name?: string;
          created_at?: string | null;
          id?: string;
          subdomain?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tenants_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tenants_subdomain_fkey";
            columns: ["subdomain"];
            isOneToOne: true;
            referencedRelation: "organizations";
            referencedColumns: ["subdomain"];
          },
          {
            foreignKeyName: "tenants_subdomain_fkey";
            columns: ["subdomain"];
            isOneToOne: true;
            referencedRelation: "tenants_public";
            referencedColumns: ["subdomain"];
          },
        ];
      };
      usage_counters: {
        Row: {
          count: number;
          feature_key: string;
          org_id: string;
          updated_at: string;
          window_start: string;
        };
        Insert: {
          count?: number;
          feature_key: string;
          org_id: string;
          updated_at?: string;
          window_start: string;
        };
        Update: {
          count?: number;
          feature_key?: string;
          org_id?: string;
          updated_at?: string;
          window_start?: string;
        };
        Relationships: [
          {
            foreignKeyName: "usage_counters_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      usage_metrics: {
        Row: {
          created_at: string;
          current_value: number;
          id: string;
          limit_value: number | null;
          metric_name: string;
          org_id: string;
          period_end: string | null;
          period_start: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          current_value?: number;
          id?: string;
          limit_value?: number | null;
          metric_name: string;
          org_id: string;
          period_end?: string | null;
          period_start?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          current_value?: number;
          id?: string;
          limit_value?: number | null;
          metric_name?: string;
          org_id?: string;
          period_end?: string | null;
          period_start?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "usage_metrics_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      user_active_sessions: {
        Row: {
          city: string | null;
          country: string | null;
          created_at: string;
          device_info: Json | null;
          expires_at: string | null;
          id: string;
          ip_address: unknown | null;
          is_current: boolean | null;
          last_active_at: string;
          session_token: string;
          updated_at: string;
          user_agent: string | null;
          user_id: string;
        };
        Insert: {
          city?: string | null;
          country?: string | null;
          created_at?: string;
          device_info?: Json | null;
          expires_at?: string | null;
          id?: string;
          ip_address?: unknown | null;
          is_current?: boolean | null;
          last_active_at?: string;
          session_token: string;
          updated_at?: string;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          city?: string | null;
          country?: string | null;
          created_at?: string;
          device_info?: Json | null;
          expires_at?: string | null;
          id?: string;
          ip_address?: unknown | null;
          is_current?: boolean | null;
          last_active_at?: string;
          session_token?: string;
          updated_at?: string;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      user_notification_preferences: {
        Row: {
          created_at: string;
          email_account_activity: boolean | null;
          email_digest_frequency: string | null;
          email_marketing: boolean | null;
          email_project_activity: boolean | null;
          email_team_updates: boolean | null;
          id: string;
          inapp_push_enabled: boolean | null;
          inapp_sound_enabled: boolean | null;
          quiet_hours_enabled: boolean | null;
          quiet_hours_end: string | null;
          quiet_hours_start: string | null;
          quiet_hours_timezone: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          email_account_activity?: boolean | null;
          email_digest_frequency?: string | null;
          email_marketing?: boolean | null;
          email_project_activity?: boolean | null;
          email_team_updates?: boolean | null;
          id?: string;
          inapp_push_enabled?: boolean | null;
          inapp_sound_enabled?: boolean | null;
          quiet_hours_enabled?: boolean | null;
          quiet_hours_end?: string | null;
          quiet_hours_start?: string | null;
          quiet_hours_timezone?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          email_account_activity?: boolean | null;
          email_digest_frequency?: string | null;
          email_marketing?: boolean | null;
          email_project_activity?: boolean | null;
          email_team_updates?: boolean | null;
          id?: string;
          inapp_push_enabled?: boolean | null;
          inapp_sound_enabled?: boolean | null;
          quiet_hours_enabled?: boolean | null;
          quiet_hours_end?: string | null;
          quiet_hours_start?: string | null;
          quiet_hours_timezone?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_profiles: {
        Row: {
          bio: string | null;
          created_at: string;
          email: string;
          force_logout_after: string | null;
          full_name: string | null;
          language: string | null;
          last_active_at: string | null;
          org_id: string | null;
          phone_number: string | null;
          profile_picture_url: string | null;
          role: Database["public"]["Enums"]["user_role"];
          timezone: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          bio?: string | null;
          created_at?: string;
          email: string;
          force_logout_after?: string | null;
          full_name?: string | null;
          language?: string | null;
          last_active_at?: string | null;
          org_id?: string | null;
          phone_number?: string | null;
          profile_picture_url?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          timezone?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          bio?: string | null;
          created_at?: string;
          email?: string;
          force_logout_after?: string | null;
          full_name?: string | null;
          language?: string | null;
          last_active_at?: string | null;
          org_id?: string | null;
          phone_number?: string | null;
          profile_picture_url?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          timezone?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_profiles_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      user_security_settings: {
        Row: {
          created_at: string;
          id: string;
          login_notifications: boolean | null;
          max_active_sessions: number | null;
          mfa_enabled: boolean | null;
          mfa_enrolled_at: string | null;
          mfa_factor_id: string | null;
          password_changed_at: string | null;
          require_password_change: boolean | null;
          session_timeout_minutes: number | null;
          unusual_activity_alerts: boolean | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          login_notifications?: boolean | null;
          max_active_sessions?: number | null;
          mfa_enabled?: boolean | null;
          mfa_enrolled_at?: string | null;
          mfa_factor_id?: string | null;
          password_changed_at?: string | null;
          require_password_change?: boolean | null;
          session_timeout_minutes?: number | null;
          unusual_activity_alerts?: boolean | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          login_notifications?: boolean | null;
          max_active_sessions?: number | null;
          mfa_enabled?: boolean | null;
          mfa_enrolled_at?: string | null;
          mfa_factor_id?: string | null;
          password_changed_at?: string | null;
          require_password_change?: boolean | null;
          session_timeout_minutes?: number | null;
          unusual_activity_alerts?: boolean | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      org_entitlements: {
        Row: {
          feature_key: string | null;
          limit_per_period: number | null;
          org_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: true;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      tenants_public: {
        Row: {
          company_name: string | null;
          subdomain: string | null;
        };
        Insert: {
          company_name?: string | null;
          subdomain?: string | null;
        };
        Update: {
          company_name?: string | null;
          subdomain?: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      analyze_directory_patterns: {
        Args: { directory_path: string };
        Returns: {
          avg_size: number;
          directory: string;
          file_count: number;
        }[];
      };
      bootstrap_organization: {
        Args: { p_subdomain: string; p_user_id: string };
        Returns: string;
      };
      check_usage_limit: {
        Args: { p_metric_name: string; p_org_id: string };
        Returns: boolean;
      };
      custom_access_token_hook: {
        Args: { event: Json };
        Returns: Json;
      };
      custom_claims_hook: {
        Args: { event: Json };
        Returns: Json;
      };
      feature_increment_if_within_limit: {
        Args: { p_feature_key: string; p_org_id: string };
        Returns: Json;
      };
      find_architecture_patterns: {
        Args: {
          match_count?: number;
          match_threshold?: number;
          query_embedding: string;
        };
        Returns: {
          content: string;
          file_path: string;
          similarity: number;
        }[];
      };
      find_existing_implementations: {
        Args: {
          file_pattern?: string;
          match_threshold?: number;
          query_embedding: string;
        };
        Returns: {
          content: string;
          file_path: string;
          similarity: number;
        }[];
      };
      force_logout_organization: {
        Args: { p_org_id: string };
        Returns: Json;
      };
      force_logout_user: {
        Args: { p_user_id: string };
        Returns: Json;
      };
      get_codebase_overview: {
        Args: Record<PropertyKey, never>;
        Returns: {
          avg_file_size: number;
          total_files: number;
          total_size: number;
        }[];
      };
      get_org_subscription: {
        Args: { p_org_id: string };
        Returns: {
          cancel_at_period_end: boolean;
          current_period_end: string;
          status: string;
          subscription_id: string;
          tier_name: string;
        }[];
      };
      get_org_subscription_status: {
        Args: { p_org_id: string };
        Returns: {
          current_period_end: string;
          current_period_start: string;
          is_active: boolean;
          org_subdomain: string;
          subscription_status: string;
          tier_name: string;
          trial_end: string;
        }[];
      };
      get_org_team_settings: {
        Args: { p_org_id: string };
        Returns: {
          allow_guest_access: boolean;
          allow_member_invites: boolean;
          auto_assign_default_role: Database["public"]["Enums"]["user_role"];
          guest_link_expiry_days: number;
          max_team_size: number;
          require_admin_approval: boolean;
        }[];
      };
      get_user_context: {
        Args: { p_org_id: string; p_user_id: string };
        Returns: Json;
      };
      get_user_profile_data: {
        Args: { p_user_id: string };
        Returns: {
          bio: string;
          full_name: string;
          language: string;
          last_active_at: string;
          phone_number: string;
          profile_picture_url: string;
          timezone: string;
        }[];
      };
      increment_usage: {
        Args: { p_increment?: number; p_metric_name: string; p_org_id: string };
        Returns: boolean;
      };
      initialize_org_capabilities: {
        Args: { p_org_id: string };
        Returns: undefined;
      };
      log_security_event: {
        Args: {
          p_event_action: string;
          p_event_type: string;
          p_metadata?: Json;
          p_org_id: string;
          p_severity?: string;
          p_user_id: string;
        };
        Returns: string;
      };
      match_documents: {
        Args: { filter?: Json; match_count: number; query_embedding: string };
        Returns: {
          content: string;
          file_path: string;
          id: number;
          metadata: Json;
          similarity: number;
        }[];
      };
      should_force_logout: {
        Args: { p_jwt_issued_at: string; p_org_id: string; p_user_id: string };
        Returns: Json;
      };
      user_can_edit_org_settings: {
        Args: { p_org_id: string; p_user_id: string };
        Returns: boolean;
      };
      user_can_view_org_audit: {
        Args: { p_org_id: string; p_user_id: string };
        Returns: boolean;
      };
      user_org_access: {
        Args: {
          p_org_id: string;
          p_required_roles?: Database["public"]["Enums"]["user_role"][];
          p_user_id: string;
        };
        Returns: boolean;
      };
      user_org_capability: {
        Args: { p_capability_key: string; p_org_id: string; p_user_id: string };
        Returns: boolean;
      };
      user_project_access: {
        Args: {
          p_project_id: string;
          p_required_permission?: Database["public"]["Enums"]["project_permission_level"];
          p_user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      project_permission_level: "read" | "write" | "admin";
      user_role: "superadmin" | "admin" | "member" | "view-only" | "owner";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      project_permission_level: ["read", "write", "admin"],
      user_role: ["superadmin", "admin", "member", "view-only", "owner"],
    },
  },
} as const;
