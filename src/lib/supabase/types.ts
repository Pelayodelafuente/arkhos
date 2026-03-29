// Supabase Database types — aligned with migrations 001 + 002 + 003 + 004 + 005 + 006 + 010 + 012

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
          description: string | null;
          target_date: string | null;
          repository_url: string | null;
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
          description?: string | null;
          target_date?: string | null;
          repository_url?: string | null;
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
          description?: string | null;
          target_date?: string | null;
          repository_url?: string | null;
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
          start_date: string | null;
          end_date: string | null;
          color: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          status?: string;
          notes?: string;
          sort_order?: number;
          created_at?: string;
          start_date?: string | null;
          end_date?: string | null;
          color?: string;
        };
        Update: {
          name?: string;
          status?: string;
          notes?: string;
          sort_order?: number;
          start_date?: string | null;
          end_date?: string | null;
          color?: string;
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
          status: string;
          description: string;
          due_date: string | null;
          start_date: string | null;
          estimated_hours: number;
          tracked_seconds: number;
          labels: string[];
          subtasks: Json;
          assigned_role: string;
          color: string;
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
          status?: string;
          description?: string;
          due_date?: string | null;
          start_date?: string | null;
          estimated_hours?: number;
          tracked_seconds?: number;
          labels?: string[];
          subtasks?: Json;
          assigned_role?: string;
          color?: string;
        };
        Update: {
          text?: string;
          done?: boolean;
          priority?: string;
          content?: string;
          sort_order?: number;
          updated_at?: string;
          status?: string;
          description?: string;
          due_date?: string | null;
          start_date?: string | null;
          estimated_hours?: number;
          tracked_seconds?: number;
          labels?: string[];
          subtasks?: Json;
          assigned_role?: string;
          color?: string;
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
      project_time_entries: {
        Row: {
          id: string;
          task_id: string;
          project_id: string;
          user_id: string;
          started_at: string;
          ended_at: string | null;
          duration: number;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          project_id: string;
          user_id: string;
          started_at: string;
          ended_at?: string | null;
          duration?: number;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          ended_at?: string | null;
          duration?: number;
          note?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "project_time_entries_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "phase_tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_time_entries_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_time_entries_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      project_links: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          label: string;
          url: string;
          icon: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          label: string;
          url: string;
          icon?: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          label?: string;
          url?: string;
          icon?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "project_links_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_links_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      project_templates: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          description: string | null;
          type: string;
          phases: Json;
          is_system: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          description?: string | null;
          type?: string;
          phases?: Json;
          is_system?: boolean;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          type?: string;
          phases?: Json;
          is_system?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "project_templates_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
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
      notes: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          content: string;
          color: string;
          icon: string;
          is_pinned: boolean;
          word_count: number;
          tags: string[];
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          content?: string;
          color?: string;
          icon?: string;
          is_pinned?: boolean;
          word_count?: number;
          tags?: string[];
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          content?: string;
          color?: string;
          icon?: string;
          is_pinned?: boolean;
          word_count?: number;
          tags?: string[];
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "notes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      note_canvases: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name?: string;
          description?: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string;
          is_default?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "note_canvases_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      canvas_nodes: {
        Row: {
          id: string;
          canvas_id: string;
          note_id: string | null;
          node_type: string;
          pos_x: number;
          pos_y: number;
          width: number;
          height: number;
          content: string;
          url: string;
          label: string;
          color: string;
          z_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          canvas_id: string;
          note_id?: string | null;
          node_type?: string;
          pos_x?: number;
          pos_y?: number;
          width?: number;
          height?: number;
          content?: string;
          url?: string;
          label?: string;
          color?: string;
          z_index?: number;
          created_at?: string;
        };
        Update: {
          note_id?: string | null;
          node_type?: string;
          pos_x?: number;
          pos_y?: number;
          width?: number;
          height?: number;
          content?: string;
          url?: string;
          label?: string;
          color?: string;
          z_index?: number;
        };
        Relationships: [
          {
            foreignKeyName: "canvas_nodes_canvas_id_fkey";
            columns: ["canvas_id"];
            isOneToOne: false;
            referencedRelation: "note_canvases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "canvas_nodes_note_id_fkey";
            columns: ["note_id"];
            isOneToOne: false;
            referencedRelation: "notes";
            referencedColumns: ["id"];
          },
        ];
      };
      canvas_edges: {
        Row: {
          id: string;
          canvas_id: string;
          from_node_id: string;
          to_node_id: string;
          label: string;
          color: string;
          from_side: string;
          to_side: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          canvas_id: string;
          from_node_id: string;
          to_node_id: string;
          label?: string;
          color?: string;
          from_side?: string;
          to_side?: string;
          created_at?: string;
        };
        Update: {
          label?: string;
          color?: string;
          from_side?: string;
          to_side?: string;
        };
        Relationships: [
          {
            foreignKeyName: "canvas_edges_canvas_id_fkey";
            columns: ["canvas_id"];
            isOneToOne: false;
            referencedRelation: "note_canvases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "canvas_edges_from_node_id_fkey";
            columns: ["from_node_id"];
            isOneToOne: false;
            referencedRelation: "canvas_nodes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "canvas_edges_to_node_id_fkey";
            columns: ["to_node_id"];
            isOneToOne: false;
            referencedRelation: "canvas_nodes";
            referencedColumns: ["id"];
          },
        ];
      };
      tags: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          color: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          color?: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          name?: string;
          color?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "tags_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      task_comments: {
        Row: {
          id: string;
          task_id: string;
          user_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          user_id: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          user_id?: string;
          content?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "phase_tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_comments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      task_tags: {
        Row: {
          task_id: string;
          tag_id: string;
        };
        Insert: {
          task_id: string;
          tag_id: string;
        };
        Update: {
          task_id?: string;
          tag_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "task_tags_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "phase_tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_tags_tag_id_fkey";
            columns: ["tag_id"];
            isOneToOne: false;
            referencedRelation: "tags";
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
