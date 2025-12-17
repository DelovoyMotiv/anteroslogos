export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      [key: string]: {
        Row: Record<string, any>
        Insert: Record<string, any>
        Update: Record<string, any>
        Relationships: any[]
      }
    }
    Views: {
      [key: string]: {
        Row: Record<string, any>
        Relationships: any[]
      }
    }
    Functions: {
      [key: string]: {
        Args: Record<string, any>
        Returns: any
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<T extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) | { schema: keyof DatabaseWithoutInternals }, N extends T extends { schema: keyof DatabaseWithoutInternals } ? keyof (DatabaseWithoutInternals[T["schema"]]["Tables"] & DatabaseWithoutInternals[T["schema"]]["Views"]) : never = never> = T extends { schema: keyof DatabaseWithoutInternals } ? (DatabaseWithoutInternals[T["schema"]]["Tables"] & DatabaseWithoutInternals[T["schema"]]["Views"])[N] extends { Row: infer R } ? R : never : T extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[T] extends { Row: infer R } ? R : never : never

export type TablesInsert<T extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals }, N extends T extends { schema: keyof DatabaseWithoutInternals } ? keyof DatabaseWithoutInternals[T["schema"]]["Tables"] : never = never> = T extends { schema: keyof DatabaseWithoutInternals } ? DatabaseWithoutInternals[T["schema"]]["Tables"][N] extends { Insert: infer I } ? I : never : T extends keyof DefaultSchema["Tables"] ? DefaultSchema["Tables"][T] extends { Insert: infer I } ? I : never : never

export type TablesUpdate<T extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals }, N extends T extends { schema: keyof DatabaseWithoutInternals } ? keyof DatabaseWithoutInternals[T["schema"]]["Tables"] : never = never> = T extends { schema: keyof DatabaseWithoutInternals } ? DatabaseWithoutInternals[T["schema"]]["Tables"][N] extends { Update: infer U } ? U : never : T extends keyof DefaultSchema["Tables"] ? DefaultSchema["Tables"][T] extends { Update: infer U } ? U : never : never

export type Enums<T extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals }, N extends T extends { schema: keyof DatabaseWithoutInternals } ? keyof DatabaseWithoutInternals[T["schema"]]["Enums"] : never = never> = T extends { schema: keyof DatabaseWithoutInternals } ? DatabaseWithoutInternals[T["schema"]]["Enums"][N] : T extends keyof DefaultSchema["Enums"] ? DefaultSchema["Enums"][T] : never

export type CompositeTypes<T extends keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals }, N extends T extends { schema: keyof DatabaseWithoutInternals } ? keyof DatabaseWithoutInternals[T["schema"]]["CompositeTypes"] : never = never> = T extends { schema: keyof DatabaseWithoutInternals } ? DatabaseWithoutInternals[T["schema"]]["CompositeTypes"][N] : T extends keyof DefaultSchema["CompositeTypes"] ? DefaultSchema["CompositeTypes"][T] : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

// =====================================================
// EXPLICIT ROW TYPE INTERFACES
// =====================================================
// These interfaces provide explicit typing for database rows,
// ensuring type safety throughout the application.

/**
 * Agent Key row from agent_keys table
 */
export interface AgentKeyRow {
  id: string;
  user_id: string;
  tenant_id?: string;
  aid_registry_id?: string;
  name: string;
  aid_uri: string;
  public_key: string;
  key_algorithm: string;
  permissions: string[];
  metadata: Json;
  revoked: boolean;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * API Key row from api_keys table
 */
export interface APIKeyRow {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
  rate_limit_per_minute: number;
  allowed_origins: string[] | null;
  expires_at: string | null;
  scopes: string[];
  metadata: Json | null;
  tenant_id: string | null;
}

/**
 * Credit Package row from credit_packages table
 */
export interface CreditPackageRow {
  id: string;
  name: string;
  ccc_amount: number;
  usd_cost: number;
  bonus_percentage: number;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  description: string | null;
}

/**
 * Usage Event row from usage_events table
 */
export interface UsageEventRow {
  id: string;
  user_id: string;
  api_key_id: string;
  tool_name: string;
  status: 'success' | 'error';
  error_message: string | null;
  response_time_ms: number;
  tokens_used: number | null;
  cost_ccc: number;
  metadata: Json | null;
  created_at: string;
  tenant_id: string | null;
  ucpt_hash: string | null;
}

/**
 * Daily Usage aggregated statistics
 */
export interface DailyUsageRow {
  date: string;
  user_id: string;
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  total_tokens: number;
  total_cost_ccc: number;
  unique_tools: number;
  avg_response_time_ms: number;
  p95_response_time_ms: number;
  p99_response_time_ms: number;
}

/**
 * Wallet row from a2a_wallets table
 */
export interface WalletRow {
  id: string;
  user_id: string;
  address: string;
  chain_id: number;
  is_custodial: boolean;
  agent_id: string | null;
  encrypted_private_key: string | null;
  encryption_algorithm: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Ledger Entry row from a2a_ledger table
 */
export interface LedgerRow {
  id: string;
  user_id: string;
  wallet_id: string;
  amount: number;
  entry_type: 'deposit' | 'debit' | 'refund';
  balance_after: number;
  tx_hash: string | null;
  reference_type: string | null;
  reference_id: string | null;
  description: string | null;
  token: 'USDC' | 'ETH';
  created_at: string;
}

/**
 * Invoice row from a2a_invoices table
 */
export interface InvoiceRow {
  id: string;
  invoice_id: string;
  user_id: string;
  subscription_id: string | null;
  amount_due: number;
  amount_paid: number;
  token: 'USDC';
  status: 'pending' | 'paid' | 'expired';
  due_date: string;
  paid_at: string | null;
  tx_hash: string | null;
  wallet_address: string | null;
  metadata: Json | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

/**
 * Subscription Plan row from subscription_plans table
 */
export interface SubscriptionPlanRow {
  id: string;
  plan_name: 'free' | 'starter' | 'pro' | 'enterprise';
  display_name: string;
  description: string | null;
  price_usd: number;
  billing_cycle_days: number;
  audit_quota: number;
  features: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * User Subscription row from user_subscriptions table
 */
export interface UserSubscriptionRow {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'cancelled' | 'expired' | 'pending_payment';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  billing_wallet_address: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Subscription Invoice row from subscription_invoices table
 */
export interface SubscriptionInvoiceRow {
  id: string;
  invoice_id: string;
  subscription_id: string;
  user_id: string;
  amount_due: number;
  amount_paid: number;
  token: 'USDC';
  status: 'pending' | 'paid' | 'expired';
  due_date: string;
  paid_at: string | null;
  tx_hash: string | null;
  wallet_address: string | null;
  payment_method: string | null;
  stripe_invoice_id: string | null;
  metadata: Json | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

/**
 * Subscription Usage Log row from subscription_usage_logs table
 */
export interface SubscriptionUsageLogRow {
  id: string;
  subscription_id: string;
  user_id: string;
  event_type: 'audit_completed' | 'audit_failed';
  resource_type: 'geo_audit';
  audit_id: string | null;
  cost_units: number;
  quota_remaining: number;
  metadata: Json | null;
  timestamp: string;
}

/**
 * Tenant Member row from tenant_members table
 */
export interface TenantMemberRow {
  id: string;
  tenant_id: string;
  user_id: string;
  role: string;
  created_at: string;
  updated_at: string;
  tenants: {
    slug: string;
  } | null;
}

/**
 * USDC Subscription row from usdc_subscriptions table
 */
export interface USDCSubscriptionRow {
  subscription_id: string;
  user_id: string;
  plan_tier: 'free' | 'starter' | 'pro' | 'enterprise';
  status: 'active' | 'cancelled' | 'expired';
  wallet_address: string;
  current_period_start: string;
  current_period_end: string;
  created_at: string;
  updated_at: string;
  auto_renew: boolean;
  payment_token: 'USDC';
}

/**
 * Usage Stats aggregated view
 */
export interface UsageStatsRow {
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  total_tokens: number;
  total_cost_ccc: number;
  unique_tools: number;
  avg_response_time_ms: number;
}

// =====================================================
// BLOG CMS TYPES
// =====================================================
// Type definitions for the blog content management system

/**
 * Blog Post row from blog_posts table
 */
export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author_id: string;
  author?: BlogAuthor;
  category_id?: string | null;
  category?: BlogCategory;
  tags?: BlogTag[];
  featured: boolean;
  status: 'draft' | 'published' | 'archived';
  published_date?: string | null;
  modified_date: string;
  read_time: number;
  meta_description?: string | null;
  meta_keywords?: string[] | null;
  og_image_url?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

/**
 * Blog Author row from blog_authors table
 */
export interface BlogAuthor {
  id: string;
  slug: string;
  name: string;
  bio?: string | null;
  image_url?: string | null;
  email?: string | null;
  job_title?: string | null;
  expertise?: string[] | null;
  knows_about?: string[] | null;
  created_at: string;
  updated_at: string;
}

/**
 * Blog Category row from blog_categories table
 */
export interface BlogCategory {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  display_order: number;
  post_count?: number;
  created_at: string;
  updated_at: string;
}

/**
 * Blog Tag row from blog_tags table
 */
export interface BlogTag {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

/**
 * Blog Post Tag junction row from blog_post_tags table
 */
export interface BlogPostTag {
  post_id: string;
  tag_id: string;
  created_at: string;
}
