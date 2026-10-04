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
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          available_balance: number | null
          balance_as_of: string | null
          card_id: string | null
          created_at: string
          credit_limit: number | null
          currency: string
          current_balance: number | null
          id: string
          include_in_cash_flow: boolean
          include_in_net_worth: boolean
          institution_name: string
          is_active: boolean
          kind: Database["public"]["Enums"]["account_kind"]
          mask: string | null
          name: string
          official_name: string | null
          plaid_account_id: string | null
          plaid_item_id: string | null
          source: Database["public"]["Enums"]["data_source"]
          subtype: string | null
          updated_at: string
        }
        Insert: {
          available_balance?: number | null
          balance_as_of?: string | null
          card_id?: string | null
          created_at?: string
          credit_limit?: number | null
          currency?: string
          current_balance?: number | null
          id?: string
          include_in_cash_flow?: boolean
          include_in_net_worth?: boolean
          institution_name: string
          is_active?: boolean
          kind: Database["public"]["Enums"]["account_kind"]
          mask?: string | null
          name: string
          official_name?: string | null
          plaid_account_id?: string | null
          plaid_item_id?: string | null
          source: Database["public"]["Enums"]["data_source"]
          subtype?: string | null
          updated_at?: string
        }
        Update: {
          available_balance?: number | null
          balance_as_of?: string | null
          card_id?: string | null
          created_at?: string
          credit_limit?: number | null
          currency?: string
          current_balance?: number | null
          id?: string
          include_in_cash_flow?: boolean
          include_in_net_worth?: boolean
          institution_name?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["account_kind"]
          mask?: string | null
          name?: string
          official_name?: string | null
          plaid_account_id?: string | null
          plaid_item_id?: string | null
          source?: Database["public"]["Enums"]["data_source"]
          subtype?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_plaid_item_id_fkey"
            columns: ["plaid_item_id"]
            isOneToOne: false
            referencedRelation: "plaid_items"
            referencedColumns: ["id"]
          },
        ]
      }
      allowed_users: {
        Row: {
          created_at: string
          email: string
        }
        Insert: {
          created_at?: string
          email: string
        }
        Update: {
          created_at?: string
          email?: string
        }
        Relationships: []
      }
      analytics_cache: {
        Row: {
          computed_at: string
          key: string
          payload: Json
        }
        Insert: {
          computed_at?: string
          key: string
          payload: Json
        }
        Update: {
          computed_at?: string
          key?: string
          payload?: Json
        }
        Relationships: []
      }
      balance_snapshots: {
        Row: {
          account_id: string
          as_of: string
          available: number | null
          created_at: string
          credit_limit: number | null
          current: number | null
          id: number
          source: Database["public"]["Enums"]["data_source"]
        }
        Insert: {
          account_id: string
          as_of: string
          available?: number | null
          created_at?: string
          credit_limit?: number | null
          current?: number | null
          id?: never
          source?: Database["public"]["Enums"]["data_source"]
        }
        Update: {
          account_id?: string
          as_of?: string
          available?: number | null
          created_at?: string
          credit_limit?: number | null
          current?: number | null
          id?: never
          source?: Database["public"]["Enums"]["data_source"]
        }
        Relationships: [
          {
            foreignKeyName: "balance_snapshots_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      cards: {
        Row: {
          annual_fee: number
          created_at: string
          credit_limit: number | null
          due_day: number | null
          id: string
          issuer: string
          name: string
          network: string | null
          notes: string | null
          opened_on: string | null
          reward_program: Json
          sort: number
          statement_close_day: number | null
        }
        Insert: {
          annual_fee?: number
          created_at?: string
          credit_limit?: number | null
          due_day?: number | null
          id: string
          issuer: string
          name: string
          network?: string | null
          notes?: string | null
          opened_on?: string | null
          reward_program?: Json
          sort?: number
          statement_close_day?: number | null
        }
        Update: {
          annual_fee?: number
          created_at?: string
          credit_limit?: number | null
          due_day?: number | null
          id?: string
          issuer?: string
          name?: string
          network?: string | null
          notes?: string | null
          opened_on?: string | null
          reward_program?: Json
          sort?: number
          statement_close_day?: number | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          bucket: Database["public"]["Enums"]["budget_bucket"]
          color: string
          created_at: string
          icon: string | null
          id: string
          kind: Database["public"]["Enums"]["category_kind"]
          name: string
          parent_id: string | null
          sort: number
        }
        Insert: {
          bucket: Database["public"]["Enums"]["budget_bucket"]
          color: string
          created_at?: string
          icon?: string | null
          id: string
          kind: Database["public"]["Enums"]["category_kind"]
          name: string
          parent_id?: string | null
          sort?: number
        }
        Update: {
          bucket?: Database["public"]["Enums"]["budget_bucket"]
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["category_kind"]
          name?: string
          parent_id?: string | null
          sort?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      category_rules: {
        Row: {
          account_id: string | null
          amount_max: number | null
          amount_min: number | null
          category_id: string | null
          created_at: string
          enabled: boolean
          hit_count: number
          id: string
          is_regex: boolean
          mark_excluded: boolean
          mark_transfer: boolean
          match_field: string
          pattern: string
          priority: number
          set_display_name: string | null
        }
        Insert: {
          account_id?: string | null
          amount_max?: number | null
          amount_min?: number | null
          category_id?: string | null
          created_at?: string
          enabled?: boolean
          hit_count?: number
          id?: string
          is_regex?: boolean
          mark_excluded?: boolean
          mark_transfer?: boolean
          match_field?: string
          pattern: string
          priority?: number
          set_display_name?: string | null
        }
        Update: {
          account_id?: string | null
          amount_max?: number | null
          amount_min?: number | null
          category_id?: string | null
          created_at?: string
          enabled?: boolean
          hit_count?: number
          id?: string
          is_regex?: boolean
          mark_excluded?: boolean
          mark_transfer?: boolean
          match_field?: string
          pattern?: string
          priority?: number
          set_display_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "category_rules_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_statements: {
        Row: {
          account_id: string
          as_of: string
          created_at: string
          id: number
          is_overdue: boolean | null
          last_payment_amount: number | null
          last_payment_date: string | null
          last_statement_balance: number | null
          last_statement_issue_date: string | null
          minimum_payment_amount: number | null
          next_payment_due_date: string | null
          purchase_apr: number | null
          raw: Json | null
        }
        Insert: {
          account_id: string
          as_of: string
          created_at?: string
          id?: never
          is_overdue?: boolean | null
          last_payment_amount?: number | null
          last_payment_date?: string | null
          last_statement_balance?: number | null
          last_statement_issue_date?: string | null
          minimum_payment_amount?: number | null
          next_payment_due_date?: string | null
          purchase_apr?: number | null
          raw?: Json | null
        }
        Update: {
          account_id?: string
          as_of?: string
          created_at?: string
          id?: never
          is_overdue?: boolean | null
          last_payment_amount?: number | null
          last_payment_date?: string | null
          last_statement_balance?: number | null
          last_statement_issue_date?: string | null
          minimum_payment_amount?: number | null
          next_payment_due_date?: string | null
          purchase_apr?: number | null
          raw?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_statements_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      csv_imports: {
        Row: {
          account_id: string | null
          file_hash: string
          filename: string
          id: string
          imported_at: string
          importer: string
          inserted: number
          row_count: number
          skipped: number
        }
        Insert: {
          account_id?: string | null
          file_hash: string
          filename: string
          id?: string
          imported_at?: string
          importer: string
          inserted?: number
          row_count?: number
          skipped?: number
        }
        Update: {
          account_id?: string | null
          file_hash?: string
          filename?: string
          id?: string
          imported_at?: string
          importer?: string
          inserted?: number
          row_count?: number
          skipped?: number
        }
        Relationships: [
          {
            foreignKeyName: "csv_imports_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      holdings: {
        Row: {
          account_id: string
          as_of: string
          cost_basis: number | null
          created_at: string
          id: number
          institution_price: number | null
          institution_value: number | null
          quantity: number
          security_id: string
          source: Database["public"]["Enums"]["data_source"]
        }
        Insert: {
          account_id: string
          as_of: string
          cost_basis?: number | null
          created_at?: string
          id?: never
          institution_price?: number | null
          institution_value?: number | null
          quantity: number
          security_id: string
          source?: Database["public"]["Enums"]["data_source"]
        }
        Update: {
          account_id?: string
          as_of?: string
          cost_basis?: number | null
          created_at?: string
          id?: never
          institution_price?: number | null
          institution_value?: number | null
          quantity?: number
          security_id?: string
          source?: Database["public"]["Enums"]["data_source"]
        }
        Relationships: [
          {
            foreignKeyName: "holdings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holdings_security_id_fkey"
            columns: ["security_id"]
            isOneToOne: false
            referencedRelation: "securities"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_transactions: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          currency: string
          date: string
          fees: number | null
          id: string
          name: string | null
          price: number | null
          quantity: number | null
          raw: Json | null
          security_id: string | null
          source: Database["public"]["Enums"]["data_source"]
          source_id: string
          subtype: string | null
          type: string
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string
          currency?: string
          date: string
          fees?: number | null
          id?: string
          name?: string | null
          price?: number | null
          quantity?: number | null
          raw?: Json | null
          security_id?: string | null
          source: Database["public"]["Enums"]["data_source"]
          source_id: string
          subtype?: string | null
          type: string
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          currency?: string
          date?: string
          fees?: number | null
          id?: string
          name?: string | null
          price?: number | null
          quantity?: number | null
          raw?: Json | null
          security_id?: string | null
          source?: Database["public"]["Enums"]["data_source"]
          source_id?: string
          subtype?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investment_transactions_security_id_fkey"
            columns: ["security_id"]
            isOneToOne: false
            referencedRelation: "securities"
            referencedColumns: ["id"]
          },
        ]
      }
      llm_cache: {
        Row: {
          created_at: string
          id: string
          input_hash: string
          kind: string
          model: string
          output: Json
        }
        Insert: {
          created_at?: string
          id?: string
          input_hash: string
          kind: string
          model: string
          output: Json
        }
        Update: {
          created_at?: string
          id?: string
          input_hash?: string
          kind?: string
          model?: string
          output?: Json
        }
        Relationships: []
      }
      merchants: {
        Row: {
          category_id: string | null
          confidence: number | null
          created_at: string
          display_name: string
          id: string
          locked: boolean
          logo_url: string | null
          normalized_name: string
          reason: string | null
          source: Database["public"]["Enums"]["category_source"]
          txn_count: number
          updated_at: string
          website: string | null
        }
        Insert: {
          category_id?: string | null
          confidence?: number | null
          created_at?: string
          display_name: string
          id?: string
          locked?: boolean
          logo_url?: string | null
          normalized_name: string
          reason?: string | null
          source?: Database["public"]["Enums"]["category_source"]
          txn_count?: number
          updated_at?: string
          website?: string | null
        }
        Update: {
          category_id?: string | null
          confidence?: number | null
          created_at?: string
          display_name?: string
          id?: string
          locked?: boolean
          logo_url?: string | null
          normalized_name?: string
          reason?: string | null
          source?: Database["public"]["Enums"]["category_source"]
          txn_count?: number
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merchants_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      plaid_items: {
        Row: {
          access_token: string
          consent_expires_at: string | null
          created_at: string
          error_code: string | null
          error_message: string | null
          id: string
          institution_color: string | null
          institution_id: string | null
          institution_logo: string | null
          institution_name: string | null
          item_id: string
          last_synced_at: string | null
          products: string[]
          status: string
          transactions_cursor: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          consent_expires_at?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          institution_color?: string | null
          institution_id?: string | null
          institution_logo?: string | null
          institution_name?: string | null
          item_id: string
          last_synced_at?: string | null
          products?: string[]
          status?: string
          transactions_cursor?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          consent_expires_at?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          institution_color?: string | null
          institution_id?: string | null
          institution_logo?: string | null
          institution_name?: string | null
          item_id?: string
          last_synced_at?: string | null
          products?: string[]
          status?: string
          transactions_cursor?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      securities: {
        Row: {
          asset_class: string | null
          close_price: number | null
          close_price_as_of: string | null
          created_at: string
          cusip: string | null
          expense_ratio: number | null
          id: string
          is_cash_equivalent: boolean
          isin: string | null
          name: string | null
          plaid_security_id: string | null
          ticker: string | null
          type: string | null
          updated_at: string
        }
        Insert: {
          asset_class?: string | null
          close_price?: number | null
          close_price_as_of?: string | null
          created_at?: string
          cusip?: string | null
          expense_ratio?: number | null
          id?: string
          is_cash_equivalent?: boolean
          isin?: string | null
          name?: string | null
          plaid_security_id?: string | null
          ticker?: string | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          asset_class?: string | null
          close_price?: number | null
          close_price_as_of?: string | null
          created_at?: string
          cusip?: string | null
          expense_ratio?: number | null
          id?: string
          is_cash_equivalent?: boolean
          isin?: string | null
          name?: string | null
          plaid_security_id?: string | null
          ticker?: string | null
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      security_prices: {
        Row: {
          close: number
          date: string
          security_id: string
        }
        Insert: {
          close: number
          date: string
          security_id: string
        }
        Update: {
          close?: number
          date?: string
          security_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_prices_security_id_fkey"
            columns: ["security_id"]
            isOneToOne: false
            referencedRelation: "securities"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_runs: {
        Row: {
          added: number
          categorized: number
          error: string | null
          finished_at: string | null
          id: string
          modified: number
          plaid_item_id: string | null
          removed: number
          started_at: string
          status: string
          trigger: string
        }
        Insert: {
          added?: number
          categorized?: number
          error?: string | null
          finished_at?: string | null
          id?: string
          modified?: number
          plaid_item_id?: string | null
          removed?: number
          started_at?: string
          status?: string
          trigger?: string
        }
        Update: {
          added?: number
          categorized?: number
          error?: string | null
          finished_at?: string | null
          id?: string
          modified?: number
          plaid_item_id?: string | null
          removed?: number
          started_at?: string
          status?: string
          trigger?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_runs_plaid_item_id_fkey"
            columns: ["plaid_item_id"]
            isOneToOne: false
            referencedRelation: "plaid_items"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          authorized_date: string | null
          category_confidence: number | null
          category_id: string | null
          category_source: Database["public"]["Enums"]["category_source"]
          created_at: string
          currency: string
          id: string
          is_excluded: boolean
          is_transfer: boolean
          location: Json | null
          logo_url: string | null
          merchant_id: string | null
          merchant_norm: string
          merchant_raw: string | null
          needs_review: boolean
          notes: string | null
          payment_channel: string | null
          pending: boolean
          pending_source_id: string | null
          plaid_pfc_confidence: string | null
          plaid_pfc_detailed: string | null
          plaid_pfc_primary: string | null
          posted_date: string
          raw: Json | null
          raw_description: string
          source: Database["public"]["Enums"]["data_source"]
          source_id: string
          superseded_by: string | null
          transfer_group_id: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          account_id: string
          amount: number
          authorized_date?: string | null
          category_confidence?: number | null
          category_id?: string | null
          category_source?: Database["public"]["Enums"]["category_source"]
          created_at?: string
          currency?: string
          id?: string
          is_excluded?: boolean
          is_transfer?: boolean
          location?: Json | null
          logo_url?: string | null
          merchant_id?: string | null
          merchant_norm: string
          merchant_raw?: string | null
          needs_review?: boolean
          notes?: string | null
          payment_channel?: string | null
          pending?: boolean
          pending_source_id?: string | null
          plaid_pfc_confidence?: string | null
          plaid_pfc_detailed?: string | null
          plaid_pfc_primary?: string | null
          posted_date: string
          raw?: Json | null
          raw_description: string
          source: Database["public"]["Enums"]["data_source"]
          source_id: string
          superseded_by?: string | null
          transfer_group_id?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          account_id?: string
          amount?: number
          authorized_date?: string | null
          category_confidence?: number | null
          category_id?: string | null
          category_source?: Database["public"]["Enums"]["category_source"]
          created_at?: string
          currency?: string
          id?: string
          is_excluded?: boolean
          is_transfer?: boolean
          location?: Json | null
          logo_url?: string | null
          merchant_id?: string | null
          merchant_norm?: string
          merchant_raw?: string | null
          needs_review?: boolean
          notes?: string | null
          payment_channel?: string | null
          pending?: boolean
          pending_source_id?: string | null
          plaid_pfc_confidence?: string | null
          plaid_pfc_detailed?: string | null
          plaid_pfc_primary?: string | null
          posted_date?: string
          raw?: Json | null
          raw_description?: string
          source?: Database["public"]["Enums"]["data_source"]
          source_id?: string
          superseded_by?: string | null
          transfer_group_id?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "v_ledger"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          id: string
          settings: Json
          updated_at: string
        }
        Insert: {
          id: string
          settings?: Json
          updated_at?: string
        }
        Update: {
          id?: string
          settings?: Json
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_ledger: {
        Row: {
          account_id: string | null
          account_kind: Database["public"]["Enums"]["account_kind"] | null
          account_name: string | null
          amount: number | null
          authorized_date: string | null
          card_id: string | null
          category_bucket: Database["public"]["Enums"]["budget_bucket"] | null
          category_color: string | null
          category_confidence: number | null
          category_id: string | null
          category_kind: Database["public"]["Enums"]["category_kind"] | null
          category_name: string | null
          category_primary: string | null
          category_primary_name: string | null
          category_source: Database["public"]["Enums"]["category_source"] | null
          created_at: string | null
          currency: string | null
          id: string | null
          institution_name: string | null
          is_excluded: boolean | null
          is_transfer: boolean | null
          location: Json | null
          logo_url: string | null
          merchant_id: string | null
          merchant_norm: string | null
          merchant_raw: string | null
          needs_review: boolean | null
          notes: string | null
          payment_channel: string | null
          pending: boolean | null
          pending_source_id: string | null
          plaid_pfc_confidence: string | null
          plaid_pfc_detailed: string | null
          plaid_pfc_primary: string | null
          posted_date: string | null
          raw: Json | null
          raw_description: string | null
          source: Database["public"]["Enums"]["data_source"] | null
          source_id: string | null
          superseded_by: string | null
          transfer_group_id: string | null
          updated_at: string | null
          website: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["category_primary"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "v_ledger"
            referencedColumns: ["id"]
          },
        ]
      }
      v_monthly_cash_flow: {
        Row: {
          income: number | null
          month: string | null
          needs: number | null
          spending: number | null
          txn_count: number | null
          wants: number | null
        }
        Relationships: []
      }
      v_net_worth_daily: {
        Row: {
          as_of: string | null
          assets: number | null
          cash: number | null
          invested: number | null
          liabilities: number | null
          net_worth: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      is_owner: { Args: never; Returns: boolean }
    }
    Enums: {
      account_kind: "depository" | "credit" | "investment" | "loan" | "other"
      budget_bucket: "need" | "want" | "save" | "income" | "transfer"
      category_kind: "income" | "expense" | "transfer" | "investment"
      category_source:
        | "user"
        | "rule"
        | "merchant"
        | "plaid"
        | "llm"
        | "transfer"
        | "none"
      data_source: "plaid" | "csv" | "manual"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_kind: ["depository", "credit", "investment", "loan", "other"],
      budget_bucket: ["need", "want", "save", "income", "transfer"],
      category_kind: ["income", "expense", "transfer", "investment"],
      category_source: [
        "user",
        "rule",
        "merchant",
        "plaid",
        "llm",
        "transfer",
        "none",
      ],
      data_source: ["plaid", "csv", "manual"],
    },
  },
} as const
