// Hand-written to match the Supabase schema. Regenerate with:
//   npx supabase gen types typescript --project-id <ref> --schema public > src/lib/supabase/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type TransactionType = "income" | "expense" | "transfer";
type AccountType = "bank" | "wallet" | "cash" | "card" | "savings";
type EmiStatus = "active" | "closed" | "overdue";
type EmiKind = "loan" | "sip";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          username: string | null;
          full_name: string;
          phone: string | null;
          avatar_url: string | null;
          currency: string;
          monthly_salary: number;
          savings_target: number;
          onboarding_complete: boolean;
          streak_count: number;
          major_account_id: string | null;
          daily_account_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          username?: string | null;
          full_name?: string;
          phone?: string | null;
          avatar_url?: string | null;
          currency?: string;
          monthly_salary?: number;
          savings_target?: number;
          onboarding_complete?: boolean;
          streak_count?: number;
          major_account_id?: string | null;
          daily_account_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      accounts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: AccountType;
          balance: number;
          institution: string | null;
          color_tag: string;
          is_primary: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type?: AccountType;
          balance?: number;
          institution?: string | null;
          color_tag?: string;
          is_primary?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["accounts"]["Insert"]>;
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          account_id: string;
          type: TransactionType;
          amount: number;
          category: string;
          note: string | null;
          merchant: string | null;
          is_big_expense: boolean;
          occurred_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          account_id: string;
          type: TransactionType;
          amount: number;
          category: string;
          note?: string | null;
          merchant?: string | null;
          is_big_expense?: boolean;
          occurred_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["transactions"]["Insert"]>;
        Relationships: [];
      };
      emis: {
        Row: {
          id: string;
          user_id: string;
          account_id: string | null;
          name: string;
          kind: EmiKind;
          start_month: string;
          principal: number;
          monthly_amount: number;
          remaining_months: number;
          total_months: number;
          paid_months: number;
          interest_rate: number;
          due_day: number;
          status: EmiStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          account_id?: string | null;
          name: string;
          kind?: EmiKind;
          start_month?: string;
          principal?: number;
          monthly_amount?: number;
          remaining_months?: number;
          total_months?: number;
          paid_months?: number;
          interest_rate?: number;
          due_day?: number;
          status?: EmiStatus;
        };
        Update: Partial<Database["public"]["Tables"]["emis"]["Insert"]>;
        Relationships: [];
      };
      emi_payments: {
        Row: {
          id: string;
          emi_id: string;
          user_id: string;
          month: string;
          amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          emi_id: string;
          user_id: string;
          month: string;
          amount?: number;
        };
        Update: Partial<Database["public"]["Tables"]["emi_payments"]["Insert"]>;
        Relationships: [];
      };
      budgets: {
        Row: {
          id: string;
          user_id: string;
          category: string;
          limit: number;
          spent: number;
          month: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category: string;
          limit?: number;
          spent?: number;
          month: string;
        };
        Update: Partial<Database["public"]["Tables"]["budgets"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      email_for_username: { Args: { uname: string }; Returns: string };
      username_available: { Args: { uname: string }; Returns: boolean };
    };
    Enums: {
      transaction_type: TransactionType;
      account_type: AccountType;
      emi_status: EmiStatus;
      emi_kind: EmiKind;
    };
    CompositeTypes: Record<never, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
