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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          created_at: string | null
          detail: string | null
          entity_name: string | null
          id: string
          module: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          detail?: string | null
          entity_name?: string | null
          id?: string
          module: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          detail?: string | null
          entity_name?: string | null
          id?: string
          module?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_price_history: {
        Row: {
          created_at: string
          id: string
          isin: string
          price_date: string
          price_eur: number
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          isin: string
          price_date: string
          price_eur: number
          source?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          isin?: string
          price_date?: string
          price_eur?: number
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_price_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      canvas_edges: {
        Row: {
          canvas_id: string
          color: string | null
          created_at: string | null
          from_node_id: string
          from_side: string | null
          id: string
          label: string | null
          style: string | null
          to_node_id: string
          to_side: string | null
        }
        Insert: {
          canvas_id: string
          color?: string | null
          created_at?: string | null
          from_node_id: string
          from_side?: string | null
          id?: string
          label?: string | null
          style?: string | null
          to_node_id: string
          to_side?: string | null
        }
        Update: {
          canvas_id?: string
          color?: string | null
          created_at?: string | null
          from_node_id?: string
          from_side?: string | null
          id?: string
          label?: string | null
          style?: string | null
          to_node_id?: string
          to_side?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "canvas_edges_canvas_id_fkey"
            columns: ["canvas_id"]
            isOneToOne: false
            referencedRelation: "note_canvases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canvas_edges_from_node_id_fkey"
            columns: ["from_node_id"]
            isOneToOne: false
            referencedRelation: "canvas_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canvas_edges_to_node_id_fkey"
            columns: ["to_node_id"]
            isOneToOne: false
            referencedRelation: "canvas_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      canvas_nodes: {
        Row: {
          canvas_id: string
          collapsed: boolean | null
          color: string | null
          content: string | null
          created_at: string | null
          height: number
          id: string
          label: string | null
          node_type: string
          note_id: string | null
          pos_x: number
          pos_y: number
          url: string | null
          width: number
          z_index: number | null
        }
        Insert: {
          canvas_id: string
          collapsed?: boolean | null
          color?: string | null
          content?: string | null
          created_at?: string | null
          height?: number
          id?: string
          label?: string | null
          node_type?: string
          note_id?: string | null
          pos_x?: number
          pos_y?: number
          url?: string | null
          width?: number
          z_index?: number | null
        }
        Update: {
          canvas_id?: string
          collapsed?: boolean | null
          color?: string | null
          content?: string | null
          created_at?: string | null
          height?: number
          id?: string
          label?: string | null
          node_type?: string
          note_id?: string | null
          pos_x?: number
          pos_y?: number
          url?: string | null
          width?: number
          z_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "canvas_nodes_canvas_id_fkey"
            columns: ["canvas_id"]
            isOneToOne: false
            referencedRelation: "note_canvases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canvas_nodes_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      crypto_assets: {
        Row: {
          avg_buy_price_eur: number | null
          coingecko_id: string | null
          color: string | null
          created_at: string | null
          current_balance: number | null
          current_price_eur: number | null
          id: string
          is_active: boolean | null
          name: string
          network: string | null
          notes: string | null
          price_updated_at: string | null
          sort_order: number | null
          symbol: string
          total_invested_eur: number | null
          user_id: string
          wallet_address: string | null
          wallet_type: string | null
        }
        Insert: {
          avg_buy_price_eur?: number | null
          coingecko_id?: string | null
          color?: string | null
          created_at?: string | null
          current_balance?: number | null
          current_price_eur?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          network?: string | null
          notes?: string | null
          price_updated_at?: string | null
          sort_order?: number | null
          symbol: string
          total_invested_eur?: number | null
          user_id: string
          wallet_address?: string | null
          wallet_type?: string | null
        }
        Update: {
          avg_buy_price_eur?: number | null
          coingecko_id?: string | null
          color?: string | null
          created_at?: string | null
          current_balance?: number | null
          current_price_eur?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          network?: string | null
          notes?: string | null
          price_updated_at?: string | null
          sort_order?: number | null
          symbol?: string
          total_invested_eur?: number | null
          user_id?: string
          wallet_address?: string | null
          wallet_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crypto_assets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crypto_defi_positions: {
        Row: {
          apy: number | null
          asset_id: string | null
          created_at: string | null
          current_amount: number | null
          deposited_amount: number | null
          id: string
          is_active: boolean | null
          last_updated: string | null
          network: string
          protocol: string
          user_id: string
          wallet_address: string
          yield_earned: number | null
        }
        Insert: {
          apy?: number | null
          asset_id?: string | null
          created_at?: string | null
          current_amount?: number | null
          deposited_amount?: number | null
          id?: string
          is_active?: boolean | null
          last_updated?: string | null
          network: string
          protocol: string
          user_id: string
          wallet_address: string
          yield_earned?: number | null
        }
        Update: {
          apy?: number | null
          asset_id?: string | null
          created_at?: string | null
          current_amount?: number | null
          deposited_amount?: number | null
          id?: string
          is_active?: boolean | null
          last_updated?: string | null
          network?: string
          protocol?: string
          user_id?: string
          wallet_address?: string
          yield_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crypto_defi_positions_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "crypto_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crypto_defi_positions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crypto_monthly_plan: {
        Row: {
          asset_id: string | null
          destination: string | null
          id: string
          is_active: boolean | null
          monthly_amount_eur: number | null
          notes: string | null
          started_at: string | null
          user_id: string
        }
        Insert: {
          asset_id?: string | null
          destination?: string | null
          id?: string
          is_active?: boolean | null
          monthly_amount_eur?: number | null
          notes?: string | null
          started_at?: string | null
          user_id: string
        }
        Update: {
          asset_id?: string | null
          destination?: string | null
          id?: string
          is_active?: boolean | null
          monthly_amount_eur?: number | null
          notes?: string | null
          started_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crypto_monthly_plan_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "crypto_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crypto_monthly_plan_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crypto_price_history: {
        Row: {
          created_at: string | null
          id: string
          price_date: string
          price_eur: number | null
          symbol: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          price_date: string
          price_eur?: number | null
          symbol: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          price_date?: string
          price_eur?: number | null
          symbol?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crypto_price_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crypto_transactions: {
        Row: {
          amount_eur: number | null
          asset_id: string | null
          created_at: string | null
          exchange: string | null
          external_id: string | null
          fee_eur: number | null
          id: string
          notes: string | null
          price_eur: number | null
          quantity: number | null
          source: string | null
          transaction_date: string
          tx_hash: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount_eur?: number | null
          asset_id?: string | null
          created_at?: string | null
          exchange?: string | null
          external_id?: string | null
          fee_eur?: number | null
          id?: string
          notes?: string | null
          price_eur?: number | null
          quantity?: number | null
          source?: string | null
          transaction_date: string
          tx_hash?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount_eur?: number | null
          asset_id?: string | null
          created_at?: string | null
          exchange?: string | null
          external_id?: string | null
          fee_eur?: number | null
          id?: string
          notes?: string | null
          price_eur?: number | null
          quantity?: number | null
          source?: string | null
          transaction_date?: string
          tx_hash?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crypto_transactions_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "crypto_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crypto_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          color: string
          created_at: string | null
          icon: string
          id: string
          name: string
          sort_order: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color: string
          created_at?: string | null
          icon: string
          id?: string
          name: string
          sort_order?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string | null
          icon?: string
          id?: string
          name?: string
          sort_order?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      horos_annual_costs: {
        Row: {
          created_at: string
          custody_fee: number | null
          id: string
          management_fee: number | null
          operation_costs: number | null
          other_fees: number | null
          total_costs: number | null
          total_pct: number | null
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          custody_fee?: number | null
          id?: string
          management_fee?: number | null
          operation_costs?: number | null
          other_fees?: number | null
          total_costs?: number | null
          total_pct?: number | null
          user_id: string
          year: number
        }
        Update: {
          created_at?: string
          custody_fee?: number | null
          id?: string
          management_fee?: number | null
          operation_costs?: number | null
          other_fees?: number | null
          total_costs?: number | null
          total_pct?: number | null
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "horos_annual_costs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      horos_fund_distribution: {
        Row: {
          category: string
          created_at: string
          dimension: string
          id: string
          percentage: number
          report_date: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          dimension: string
          id?: string
          percentage: number
          report_date: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          dimension?: string
          id?: string
          percentage?: number
          report_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "horos_fund_distribution_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      horos_monthly_plan: {
        Row: {
          created_at: string
          execution_day: number
          id: string
          is_active: boolean
          monthly_amount: number
          notes: string | null
          started_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          execution_day?: number
          id?: string
          is_active?: boolean
          monthly_amount?: number
          notes?: string | null
          started_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          execution_day?: number
          id?: string
          is_active?: boolean
          monthly_amount?: number
          notes?: string | null
          started_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "horos_monthly_plan_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      horos_nav_history: {
        Row: {
          created_at: string
          id: string
          nav_date: string
          nav_price: number
          portfolio_value: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nav_date: string
          nav_price: number
          portfolio_value?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nav_date?: string
          nav_price?: number
          portfolio_value?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "horos_nav_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      horos_position: {
        Row: {
          account_code: string | null
          fund_name: string
          id: string
          isin: string
          nav_date: string
          nav_price: number
          shares: number
          total_cost: number
          total_value: number
          unrealized_gain: number | null
          unrealized_gain_pct: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_code?: string | null
          fund_name?: string
          id?: string
          isin?: string
          nav_date: string
          nav_price: number
          shares: number
          total_cost: number
          total_value: number
          unrealized_gain?: number | null
          unrealized_gain_pct?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_code?: string | null
          fund_name?: string
          id?: string
          isin?: string
          nav_date?: string
          nav_price?: number
          shares?: number
          total_cost?: number
          total_value?: number
          unrealized_gain?: number | null
          unrealized_gain_pct?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "horos_position_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      horos_transactions: {
        Row: {
          amount: number
          commission: number
          created_at: string
          id: string
          nav_applied: number
          notes: string | null
          request_date: string
          shares: number
          source: string
          type: string
          user_id: string
          value_date: string
        }
        Insert: {
          amount: number
          commission?: number
          created_at?: string
          id?: string
          nav_applied: number
          notes?: string | null
          request_date: string
          shares: number
          source?: string
          type: string
          user_id: string
          value_date: string
        }
        Update: {
          amount?: number
          commission?: number
          created_at?: string
          id?: string
          nav_applied?: number
          notes?: string | null
          request_date?: string
          shares?: number
          source?: string
          type?: string
          user_id?: string
          value_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "horos_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      indexa_funds: {
        Row: {
          annual_cost: number | null
          benchmark: string | null
          color: string | null
          created_at: string
          currency: string
          fund_type: string
          id: string
          is_active: boolean
          isin: string
          name: string
          user_id: string
        }
        Insert: {
          annual_cost?: number | null
          benchmark?: string | null
          color?: string | null
          created_at?: string
          currency?: string
          fund_type: string
          id?: string
          is_active?: boolean
          isin: string
          name: string
          user_id: string
        }
        Update: {
          annual_cost?: number | null
          benchmark?: string | null
          color?: string | null
          created_at?: string
          currency?: string
          fund_type?: string
          id?: string
          is_active?: boolean
          isin?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "indexa_funds_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      indexa_monthly_plan: {
        Row: {
          created_at: string
          execution_day: number
          id: string
          is_active: boolean
          monthly_amount: number
          notes: string | null
          started_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          execution_day?: number
          id?: string
          is_active?: boolean
          monthly_amount: number
          notes?: string | null
          started_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          execution_day?: number
          id?: string
          is_active?: boolean
          monthly_amount?: number
          notes?: string | null
          started_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "indexa_monthly_plan_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      indexa_monthly_returns: {
        Row: {
          benchmark_pct: number | null
          created_at: string
          cumulative_twr: number | null
          id: string
          month: number
          return_pct: number | null
          user_id: string
          year: number
        }
        Insert: {
          benchmark_pct?: number | null
          created_at?: string
          cumulative_twr?: number | null
          id?: string
          month: number
          return_pct?: number | null
          user_id: string
          year: number
        }
        Update: {
          benchmark_pct?: number | null
          created_at?: string
          cumulative_twr?: number | null
          id?: string
          month?: number
          return_pct?: number | null
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "indexa_monthly_returns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      indexa_positions: {
        Row: {
          allocation_pct: number | null
          fund_id: string | null
          fund_type: string | null
          id: string
          price_per_share: number | null
          shares: number | null
          total_cost: number
          total_value: number
          unrealized_gain: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allocation_pct?: number | null
          fund_id?: string | null
          fund_type?: string | null
          id?: string
          price_per_share?: number | null
          shares?: number | null
          total_cost?: number
          total_value?: number
          unrealized_gain?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allocation_pct?: number | null
          fund_id?: string | null
          fund_type?: string | null
          id?: string
          price_per_share?: number | null
          shares?: number | null
          total_cost?: number
          total_value?: number
          unrealized_gain?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "indexa_positions_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "indexa_funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indexa_positions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      indexa_transactions: {
        Row: {
          amount: number
          created_at: string
          fiscal_result: number
          fund_id: string | null
          id: string
          notes: string | null
          price_per_share: number | null
          retention: number
          shares: number | null
          source: string
          transaction_date: string
          type: string
          user_id: string
          value_date: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          fiscal_result?: number
          fund_id?: string | null
          id?: string
          notes?: string | null
          price_per_share?: number | null
          retention?: number
          shares?: number | null
          source?: string
          transaction_date: string
          type: string
          user_id: string
          value_date?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          fiscal_result?: number
          fund_id?: string | null
          id?: string
          notes?: string | null
          price_per_share?: number | null
          retention?: number
          shares?: number | null
          source?: string
          transaction_date?: string
          type?: string
          user_id?: string
          value_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "indexa_transactions_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "indexa_funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indexa_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_platforms: {
        Row: {
          color: string
          created_at: string | null
          icon: string
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          slug: string
          sort_order: number | null
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string | null
          icon?: string
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          slug: string
          sort_order?: number | null
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string | null
          icon?: string
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          slug?: string
          sort_order?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_platforms_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      note_backlinks: {
        Row: {
          created_at: string | null
          id: string
          source_note_id: string
          target_note_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          source_note_id: string
          target_note_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          source_note_id?: string
          target_note_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_backlinks_source_note_id_fkey"
            columns: ["source_note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_backlinks_target_note_id_fkey"
            columns: ["target_note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      note_canvases: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_canvases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      note_folders: {
        Row: {
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          name: string
          sort_order: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name: string
          sort_order?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name?: string
          sort_order?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      note_versions: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          note_id: string
          title: string | null
          user_id: string
          version_number: number
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          note_id: string
          title?: string | null
          user_id: string
          version_number: number
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          note_id?: string
          title?: string | null
          user_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "note_versions_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          archived: boolean
          color: string | null
          content: string | null
          content_tsvector: unknown
          created_at: string | null
          deleted_at: string | null
          favorited: boolean
          folder_id: string | null
          icon: string | null
          id: string
          is_pinned: boolean | null
          project_id: string | null
          sort_order: number | null
          status: string | null
          subscription_id: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string
          word_count: number | null
        }
        Insert: {
          archived?: boolean
          color?: string | null
          content?: string | null
          content_tsvector?: unknown
          created_at?: string | null
          deleted_at?: string | null
          favorited?: boolean
          folder_id?: string | null
          icon?: string | null
          id?: string
          is_pinned?: boolean | null
          project_id?: string | null
          sort_order?: number | null
          status?: string | null
          subscription_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id: string
          word_count?: number | null
        }
        Update: {
          archived?: boolean
          color?: string | null
          content?: string | null
          content_tsvector?: unknown
          created_at?: string | null
          deleted_at?: string | null
          favorited?: boolean
          folder_id?: string | null
          icon?: string | null
          id?: string
          is_pinned?: boolean | null
          project_id?: string | null
          sort_order?: number | null
          status?: string | null
          subscription_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "note_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      passive_income: {
        Row: {
          amount: number
          asset_id: string | null
          created_at: string | null
          currency: string | null
          id: string
          income_date: string
          notes: string | null
          platform_id: string
          type: Database["public"]["Enums"]["passive_income_type"]
          user_id: string
        }
        Insert: {
          amount: number
          asset_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          income_date: string
          notes?: string | null
          platform_id: string
          type: Database["public"]["Enums"]["passive_income_type"]
          user_id: string
        }
        Update: {
          amount?: number
          asset_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          income_date?: string
          notes?: string | null
          platform_id?: string
          type?: Database["public"]["Enums"]["passive_income_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "passive_income_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "portfolio_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passive_income_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "investment_platforms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passive_income_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      phase_tasks: {
        Row: {
          assigned_role: string | null
          color: string | null
          content: string | null
          created_at: string
          description: string | null
          done: boolean
          due_date: string | null
          estimated_hours: number | null
          id: string
          labels: string[] | null
          phase_id: string
          priority: string
          sort_order: number
          start_date: string | null
          status: string | null
          subtasks: Json | null
          text: string
          tracked_seconds: number | null
          updated_at: string
        }
        Insert: {
          assigned_role?: string | null
          color?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          done?: boolean
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          labels?: string[] | null
          phase_id: string
          priority?: string
          sort_order?: number
          start_date?: string | null
          status?: string | null
          subtasks?: Json | null
          text: string
          tracked_seconds?: number | null
          updated_at?: string
        }
        Update: {
          assigned_role?: string | null
          color?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          done?: boolean
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          labels?: string[] | null
          phase_id?: string
          priority?: string
          sort_order?: number
          start_date?: string | null
          status?: string | null
          subtasks?: Json | null
          text?: string
          tracked_seconds?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "phase_tasks_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "project_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_assets: {
        Row: {
          avg_buy_price: number | null
          category: Database["public"]["Enums"]["asset_category"]
          created_at: string | null
          currency: string | null
          current_price: number | null
          current_price_eur: number | null
          current_quantity: number | null
          geographic_region: string | null
          id: string
          is_active: boolean | null
          isin: string | null
          name: string
          notes: string | null
          platform_id: string
          price_updated_at: string | null
          risk_level: Database["public"]["Enums"]["risk_level"] | null
          sector: string | null
          sort_order: number | null
          ticker: string | null
          total_invested: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avg_buy_price?: number | null
          category: Database["public"]["Enums"]["asset_category"]
          created_at?: string | null
          currency?: string | null
          current_price?: number | null
          current_price_eur?: number | null
          current_quantity?: number | null
          geographic_region?: string | null
          id?: string
          is_active?: boolean | null
          isin?: string | null
          name: string
          notes?: string | null
          platform_id: string
          price_updated_at?: string | null
          risk_level?: Database["public"]["Enums"]["risk_level"] | null
          sector?: string | null
          sort_order?: number | null
          ticker?: string | null
          total_invested?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avg_buy_price?: number | null
          category?: Database["public"]["Enums"]["asset_category"]
          created_at?: string | null
          currency?: string | null
          current_price?: number | null
          current_price_eur?: number | null
          current_quantity?: number | null
          geographic_region?: string | null
          id?: string
          is_active?: boolean | null
          isin?: string | null
          name?: string
          notes?: string | null
          platform_id?: string
          price_updated_at?: string | null
          risk_level?: Database["public"]["Enums"]["risk_level"] | null
          sector?: string | null
          sort_order?: number | null
          ticker?: string | null
          total_invested?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_assets_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "investment_platforms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_assets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_snapshots: {
        Row: {
          cash_value: number | null
          created_at: string | null
          id: string
          pl_amount: number | null
          pl_percentage: number | null
          platform_id: string | null
          snapshot_date: string
          total_invested: number
          total_value: number
          user_id: string
        }
        Insert: {
          cash_value?: number | null
          created_at?: string | null
          id?: string
          pl_amount?: number | null
          pl_percentage?: number | null
          platform_id?: string | null
          snapshot_date: string
          total_invested: number
          total_value: number
          user_id: string
        }
        Update: {
          cash_value?: number | null
          created_at?: string | null
          id?: string
          pl_amount?: number | null
          pl_percentage?: number | null
          platform_id?: string | null
          snapshot_date?: string
          total_invested?: number
          total_value?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_snapshots_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "investment_platforms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_transactions: {
        Row: {
          asset_id: string | null
          created_at: string | null
          currency: string | null
          external_id: string | null
          id: string
          notes: string | null
          platform_id: string
          price_per_unit: number | null
          quantity: number | null
          source: string | null
          total_amount: number
          transaction_date: string
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Insert: {
          asset_id?: string | null
          created_at?: string | null
          currency?: string | null
          external_id?: string | null
          id?: string
          notes?: string | null
          platform_id: string
          price_per_unit?: number | null
          quantity?: number | null
          source?: string | null
          total_amount: number
          transaction_date: string
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Update: {
          asset_id?: string | null
          created_at?: string | null
          currency?: string | null
          external_id?: string | null
          id?: string
          notes?: string | null
          platform_id?: string
          price_per_unit?: number | null
          quantity?: number | null
          source?: string | null
          total_amount?: number
          transaction_date?: string
          type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_transactions_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "portfolio_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_transactions_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "investment_platforms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          preferences: Json | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          preferences?: Json | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          preferences?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      project_links: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          label: string
          project_id: string
          sort_order: number | null
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: string
          label: string
          project_id: string
          sort_order?: number | null
          url: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: string
          label?: string
          project_id?: string
          sort_order?: number | null
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_links_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_links_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_phases: {
        Row: {
          color: string | null
          created_at: string
          end_date: string | null
          id: string
          name: string
          notes: string | null
          project_id: string
          sort_order: number
          start_date: string | null
          status: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          name: string
          notes?: string | null
          project_id: string
          sort_order?: number
          start_date?: string | null
          status?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          project_id?: string
          sort_order?: number
          start_date?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_statuses: {
        Row: {
          color: string
          created_at: string
          id: string
          is_default: boolean
          name: string
          sort_order: number
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          sort_order?: number
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_statuses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_templates: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_system: boolean | null
          name: string
          phases: Json
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          phases?: Json
          type?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          phases?: Json
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_templates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_time_entries: {
        Row: {
          created_at: string | null
          duration: number
          ended_at: string | null
          id: string
          note: string | null
          project_id: string
          started_at: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          duration?: number
          ended_at?: string | null
          id?: string
          note?: string | null
          project_id: string
          started_at: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          duration?: number
          ended_at?: string | null
          id?: string
          note?: string | null
          project_id?: string
          started_at?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_time_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "phase_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_time_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_types: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          name: string
          sort_order: number
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name: string
          sort_order?: number
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_types_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          icon: string
          id: string
          logo_url: string | null
          name: string
          repository_url: string | null
          sort_order: number
          stack: string[] | null
          start_date: string | null
          status: string
          tags: string[] | null
          target_date: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          logo_url?: string | null
          name: string
          repository_url?: string | null
          sort_order?: number
          stack?: string[] | null
          start_date?: string | null
          status?: string
          tags?: string[] | null
          target_date?: string | null
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          logo_url?: string | null
          name?: string
          repository_url?: string | null
          sort_order?: number
          stack?: string[] | null
          start_date?: string | null
          status?: string
          tags?: string[] | null
          target_date?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      savings_plan_items: {
        Row: {
          asset_id: string
          created_at: string | null
          ended_at: string | null
          execution_day: number | null
          id: string
          is_active: boolean | null
          monthly_amount: number
          notes: string | null
          sort_order: number | null
          started_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          asset_id: string
          created_at?: string | null
          ended_at?: string | null
          execution_day?: number | null
          id?: string
          is_active?: boolean | null
          monthly_amount: number
          notes?: string | null
          sort_order?: number | null
          started_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          asset_id?: string
          created_at?: string | null
          ended_at?: string | null
          execution_day?: number | null
          id?: string
          is_active?: boolean | null
          monthly_amount?: number
          notes?: string | null
          sort_order?: number | null
          started_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "savings_plan_items_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "portfolio_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "savings_plan_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_payments: {
        Row: {
          amount: number
          auto_generated: boolean | null
          created_at: string | null
          currency: string | null
          cycle: string
          id: string
          notes: string | null
          paid_at: string
          subscription_id: string
          user_id: string
        }
        Insert: {
          amount: number
          auto_generated?: boolean | null
          created_at?: string | null
          currency?: string | null
          cycle: string
          id?: string
          notes?: string | null
          paid_at: string
          subscription_id: string
          user_id: string
        }
        Update: {
          amount?: number
          auto_generated?: boolean | null
          created_at?: string | null
          currency?: string | null
          cycle?: string
          id?: string
          notes?: string | null
          paid_at?: string
          subscription_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_price_history: {
        Row: {
          changed_at: string | null
          id: string
          new_amount: number
          old_amount: number
          subscription_id: string
          user_id: string
        }
        Insert: {
          changed_at?: string | null
          id?: string
          new_amount: number
          old_amount: number
          subscription_id: string
          user_id: string
        }
        Update: {
          changed_at?: string | null
          id?: string
          new_amount?: number
          old_amount?: number
          subscription_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_price_history_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_price_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number
          billing_day: number
          cancelled_at: string | null
          category_id: string | null
          color: string
          created_at: string | null
          currency: string | null
          cycle: string
          icon: string
          icon_url: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          service_key: string | null
          started_at: string | null
          status: string
          tags: string[] | null
          trial_ends_at: string | null
          updated_at: string | null
          url: string | null
          user_id: string
        }
        Insert: {
          amount: number
          billing_day: number
          cancelled_at?: string | null
          category_id?: string | null
          color: string
          created_at?: string | null
          currency?: string | null
          cycle: string
          icon: string
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          service_key?: string | null
          started_at?: string | null
          status?: string
          tags?: string[] | null
          trial_ends_at?: string | null
          updated_at?: string | null
          url?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          billing_day?: number
          cancelled_at?: string | null
          category_id?: string | null
          color?: string
          created_at?: string | null
          currency?: string | null
          cycle?: string
          icon?: string
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          service_key?: string | null
          started_at?: string | null
          status?: string
          tags?: string[] | null
          trial_ends_at?: string | null
          updated_at?: string | null
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string
          created_at: string | null
          id: string
          name: string
          project_id: string
          sort_order: number | null
        }
        Insert: {
          color?: string
          created_at?: string | null
          id?: string
          name: string
          project_id: string
          sort_order?: number | null
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          name?: string
          project_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tags_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "phase_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_links: {
        Row: {
          id: string
          label: string | null
          sort_order: number
          task_id: string
          url: string
        }
        Insert: {
          id?: string
          label?: string | null
          sort_order?: number
          task_id: string
          url: string
        }
        Update: {
          id?: string
          label?: string | null
          sort_order?: number
          task_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_links_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "phase_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_tags: {
        Row: {
          tag_id: string
          task_id: string
        }
        Insert: {
          tag_id: string
          task_id: string
        }
        Update: {
          tag_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_tags_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "phase_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_gastos_settings: {
        Row: {
          alert_days_before: number | null
          alert_enabled: boolean | null
          alert_renewal_days: number | null
          collapsed_categories: string[] | null
          created_at: string | null
          default_currency: string | null
          list_view_mode: string | null
          monthly_budget: number | null
          show_annual_prices: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alert_days_before?: number | null
          alert_enabled?: boolean | null
          alert_renewal_days?: number | null
          collapsed_categories?: string[] | null
          created_at?: string | null
          default_currency?: string | null
          list_view_mode?: string | null
          monthly_budget?: number | null
          show_annual_prices?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alert_days_before?: number | null
          alert_enabled?: boolean | null
          alert_renewal_days?: number | null
          collapsed_categories?: string[] | null
          created_at?: string | null
          default_currency?: string | null
          list_view_mode?: string | null
          monthly_budget?: number | null
          show_annual_prices?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_gastos_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_historical_snapshots: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      seed_crypto_for_user: { Args: { p_user_id: string }; Returns: undefined }
      seed_horos_for_user: { Args: { p_user_id: string }; Returns: undefined }
      seed_indexa_for_user: { Args: { p_user_id: string }; Returns: Json }
      seed_patrimonio_for_user: { Args: { p_user_id: string }; Returns: Json }
      seed_patrimonio_transactions: {
        Args: { p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      asset_category:
        | "etf_index"
        | "etf_thematic"
        | "etf_bond"
        | "etf_commodity"
        | "stock_us"
        | "stock_eu"
        | "stock_asia"
        | "fund"
        | "crypto"
        | "p2p"
        | "cash"
      passive_income_type:
        | "dividend"
        | "interest"
        | "saveback"
        | "coupon"
        | "other"
      risk_level: "very_low" | "low" | "medium" | "high" | "very_high"
      transaction_type:
        | "buy"
        | "sell"
        | "savings_plan"
        | "saveback"
        | "dividend"
        | "transfer_in"
        | "transfer_out"
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
      asset_category: [
        "etf_index",
        "etf_thematic",
        "etf_bond",
        "etf_commodity",
        "stock_us",
        "stock_eu",
        "stock_asia",
        "fund",
        "crypto",
        "p2p",
        "cash",
      ],
      passive_income_type: [
        "dividend",
        "interest",
        "saveback",
        "coupon",
        "other",
      ],
      risk_level: ["very_low", "low", "medium", "high", "very_high"],
      transaction_type: [
        "buy",
        "sell",
        "savings_plan",
        "saveback",
        "dividend",
        "transfer_in",
        "transfer_out",
      ],
    },
  },
} as const
