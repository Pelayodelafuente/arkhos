// Supabase Database types — aligned with migrations 001 + 002 + 003 + 004 + 005

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          preferences: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          preferences?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      activity_log: {
        Row: {
          id: string;
          user_id: string;
          module: string;
          action: string;
          entity_name: string | null;
          detail: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          module: string;
          action: string;
          entity_name?: string | null;
          detail?: string | null;
          created_at?: string;
        };
        Update: {
          module?: string;
          action?: string;
          entity_name?: string | null;
          detail?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "activity_log_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          icon: string;
          type: string;
          status: string;
          stack: string[];
          tags: string[];
          start_date: string | null;
          sort_order: number;
          created_at: string;
          logo_url: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          icon?: string;
          type?: string;
          status?: string;
          stack?: string[];
          tags?: string[];
          start_date?: string | null;
          logo_url?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          icon?: string;
          type?: string;
          status?: string;
          stack?: string[];
          tags?: string[];
          start_date?: string | null;
          logo_url?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      project_types: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          icon: string;
          color: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          icon?: string;
          color?: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          name?: string;
          icon?: string;
          color?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "project_types_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      project_statuses: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string;
          is_default: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color?: string;
          is_default?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          name?: string;
          color?: string;
          is_default?: boolean;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "project_statuses_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      project_phases: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          status: string;
          notes: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          status?: string;
          notes?: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          name?: string;
          status?: string;
          notes?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "project_phases_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      phase_tasks: {
        Row: {
          id: string;
          phase_id: string;
          text: string;
          done: boolean;
          priority: string;
          content: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          phase_id: string;
          text: string;
          done?: boolean;
          priority?: string;
          content?: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          text?: string;
          done?: boolean;
          priority?: string;
          content?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "phase_tasks_phase_id_fkey";
            columns: ["phase_id"];
            isOneToOne: false;
            referencedRelation: "project_phases";
            referencedColumns: ["id"];
          },
        ];
      };
      task_links: {
        Row: {
          id: string;
          task_id: string;
          url: string;
          label: string;
          sort_order: number;
        };
        Insert: {
          id?: string;
          task_id: string;
          url: string;
          label?: string;
          sort_order?: number;
        };
        Update: {
          url?: string;
          label?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "task_links_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "phase_tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      expense_categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          icon: string;
          color: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          icon: string;
          color: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          icon?: string;
          color?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "expense_categories_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          category_id: string | null;
          name: string;
          icon: string;
          color: string;
          amount: number;
          currency: string;
          cycle: string;
          billing_day: number;
          is_active: boolean;
          status: string;
          trial_ends_at: string | null;
          service_key: string | null;
          url: string | null;
          notes: string | null;
          started_at: string | null;
          cancelled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id?: string | null;
          name: string;
          icon: string;
          color: string;
          amount: number;
          currency?: string;
          cycle: string;
          billing_day: number;
          is_active?: boolean;
          status?: string;
          trial_ends_at?: string | null;
          service_key?: string | null;
          url?: string | null;
          notes?: string | null;
          started_at?: string | null;
        };
        Update: {
          category_id?: string | null;
          name?: string;
          icon?: string;
          color?: string;
          amount?: number;
          currency?: string;
          cycle?: string;
          billing_day?: number;
          is_active?: boolean;
          status?: string;
          trial_ends_at?: string | null;
          service_key?: string | null;
          url?: string | null;
          notes?: string | null;
          started_at?: string | null;
          cancelled_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscriptions_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "expense_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      subscription_price_history: {
        Row: {
          id: string;
          subscription_id: string;
          user_id: string;
          old_amount: number;
          new_amount: number;
          changed_at: string;
        };
        Insert: {
          id?: string;
          subscription_id: string;
          user_id: string;
          old_amount: number;
          new_amount: number;
          changed_at?: string;
        };
        Update: {
          old_amount?: number;
          new_amount?: number;
        };
        Relationships: [
          {
            foreignKeyName: "subscription_price_history_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "subscriptions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscription_price_history_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_gastos_settings: {
        Row: {
          user_id: string;
          monthly_budget: number | null;
          default_currency: string;
          show_annual_prices: boolean;
          list_view_mode: string;
          collapsed_categories: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          monthly_budget?: number | null;
          default_currency?: string;
          show_annual_prices?: boolean;
          list_view_mode?: string;
          collapsed_categories?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          monthly_budget?: number | null;
          default_currency?: string;
          show_annual_prices?: boolean;
          list_view_mode?: string;
          collapsed_categories?: string[];
        };
        Relationships: [
          {
            foreignKeyName: "user_gastos_settings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
