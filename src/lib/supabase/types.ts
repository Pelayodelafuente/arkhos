// Supabase Database types — aligned with migrations 001 + 002

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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
