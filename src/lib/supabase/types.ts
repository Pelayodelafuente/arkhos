// Placeholder — regenerar con: npx supabase gen types typescript --project-id <id> > src/lib/supabase/types.ts

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
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
