/**
 * Database Types
 * TypeScript types generated from PostgreSQL schema
 * Provides full type safety for Supabase queries
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          company_name: string | null
          industry: string | null
          website_url: string | null
          avatar_url: string | null
          plan_type: 'free' | 'premium' | 'enterprise'
          stripe_customer_id: string | null
          subscription_status: 'active' | 'inactive' | 'canceled' | 'past_due'
          subscription_ends_at: string | null
          credits_remaining: number
          total_audits: number
          created_at: string
          updated_at: string
          metadata: Json
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          company_name?: string | null
          industry?: string | null
          website_url?: string | null
          avatar_url?: string | null
          plan_type?: 'free' | 'premium' | 'enterprise'
          stripe_customer_id?: string | null
          subscription_status?: 'active' | 'inactive' | 'canceled' | 'past_due'
          subscription_ends_at?: string | null
          credits_remaining?: number
          total_audits?: number
          created_at?: string
          updated_at?: string
          metadata?: Json
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          company_name?: string | null
          industry?: string | null
          website_url?: string | null
          avatar_url?: string | null
          plan_type?: 'free' | 'premium' | 'enterprise'
          stripe_customer_id?: string | null
          subscription_status?: 'active' | 'inactive' | 'canceled' | 'past_due'
          subscription_ends_at?: string | null
          credits_remaining?: number
          total_audits?: number
          created_at?: string
          updated_at?: string
          metadata?: Json
        }
      }
      audits: {
        Row: {
          id: string
          user_id: string | null
          url: string
          normalized_url: string
          domain: string
          timestamp: string
          duration_ms: number | null
          user_agent: string | null
          ip_address: string | null
          overall_score: number
          grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'
          score_schema_markup: number
          score_meta_tags: number
          score_ai_crawlers: number
          score_eeat: number
          score_structure: number
          score_performance: number
          score_content_quality: number
          score_citation_potential: number
          score_technical_seo: number
          score_link_analysis: number
          schema_findings: Json
          meta_findings: Json
          crawler_findings: Json
          eeat_findings: Json
          structure_findings: Json
          performance_findings: Json
          content_findings: Json
          citation_findings: Json
          technical_findings: Json
          link_findings: Json
          ai_recommendations: Json
          priority_actions: Json
          has_organization_schema: boolean
          has_person_schema: boolean
          has_article_schema: boolean
          has_breadcrumb_schema: boolean
          has_author_markup: boolean
          has_eeat_signals: boolean
          robots_txt_allows_ai: boolean
          is_public: boolean
          anonymized_domain: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          url: string
          normalized_url: string
          domain: string
          timestamp?: string
          duration_ms?: number | null
          user_agent?: string | null
          ip_address?: string | null
          overall_score: number
          grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'
          score_schema_markup?: number
          score_meta_tags?: number
          score_ai_crawlers?: number
          score_eeat?: number
          score_structure?: number
          score_performance?: number
          score_content_quality?: number
          score_citation_potential?: number
          score_technical_seo?: number
          score_link_analysis?: number
          schema_findings?: Json
          meta_findings?: Json
          crawler_findings?: Json
          eeat_findings?: Json
          structure_findings?: Json
          performance_findings?: Json
          content_findings?: Json
          citation_findings?: Json
          technical_findings?: Json
          link_findings?: Json
          ai_recommendations?: Json
          priority_actions?: Json
          has_organization_schema?: boolean
          has_person_schema?: boolean
          has_article_schema?: boolean
          has_breadcrumb_schema?: boolean
          has_author_markup?: boolean
          has_eeat_signals?: boolean
          robots_txt_allows_ai?: boolean
          is_public?: boolean
          anonymized_domain?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          url?: string
          normalized_url?: string
          domain?: string
          timestamp?: string
          duration_ms?: number | null
          user_agent?: string | null
          ip_address?: string | null
          overall_score?: number
          grade?: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'
          score_schema_markup?: number
          score_meta_tags?: number
          score_ai_crawlers?: number
          score_eeat?: number
          score_structure?: number
          score_performance?: number
          score_content_quality?: number
          score_citation_potential?: number
          score_technical_seo?: number
          score_link_analysis?: number
          schema_findings?: Json
          meta_findings?: Json
          crawler_findings?: Json
          eeat_findings?: Json
          structure_findings?: Json
          performance_findings?: Json
          content_findings?: Json
          citation_findings?: Json
          technical_findings?: Json
          link_findings?: Json
          ai_recommendations?: Json
          priority_actions?: Json
          has_organization_schema?: boolean
          has_person_schema?: boolean
          has_article_schema?: boolean
          has_breadcrumb_schema?: boolean
          has_author_markup?: boolean
          has_eeat_signals?: boolean
          robots_txt_allows_ai?: boolean
          is_public?: boolean
          anonymized_domain?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      global_insights: {
        Row: {
          id: string
          insight_type: 'industry' | 'score_range' | 'schema_type' | 'best_practices' | 'trends'
          segment: string
          timeframe: '7d' | '30d' | '90d' | 'all'
          total_audits: number
          average_score: number | null
          median_score: number | null
          avg_schema_score: number | null
          avg_eeat_score: number | null
          avg_content_score: number | null
          avg_technical_score: number | null
          organization_schema_rate: number | null
          person_schema_rate: number | null
          eeat_signals_rate: number | null
          ai_crawler_allowed_rate: number | null
          top_scoring_features: Json
          common_issues: Json
          computed_at: string
          sample_size: number
          confidence_level: number | null
          expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          insight_type: 'industry' | 'score_range' | 'schema_type' | 'best_practices' | 'trends'
          segment: string
          timeframe: '7d' | '30d' | '90d' | 'all'
          total_audits?: number
          average_score?: number | null
          median_score?: number | null
          avg_schema_score?: number | null
          avg_eeat_score?: number | null
          avg_content_score?: number | null
          avg_technical_score?: number | null
          organization_schema_rate?: number | null
          person_schema_rate?: number | null
          eeat_signals_rate?: number | null
          ai_crawler_allowed_rate?: number | null
          top_scoring_features?: Json
          common_issues?: Json
          computed_at?: string
          sample_size: number
          confidence_level?: number | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          insight_type?: 'industry' | 'score_range' | 'schema_type' | 'best_practices' | 'trends'
          segment?: string
          timeframe?: '7d' | '30d' | '90d' | 'all'
          total_audits?: number
          average_score?: number | null
          median_score?: number | null
          avg_schema_score?: number | null
          avg_eeat_score?: number | null
          avg_content_score?: number | null
          avg_technical_score?: number | null
          organization_schema_rate?: number | null
          person_schema_rate?: number | null
          eeat_signals_rate?: number | null
          ai_crawler_allowed_rate?: number | null
          top_scoring_features?: Json
          common_issues?: Json
          computed_at?: string
          sample_size?: number
          confidence_level?: number | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      audit_alerts: {
        Row: {
          id: string
          user_id: string
          audit_id: string
          alert_type: 'score_drop' | 'critical_issue' | 'improvement' | 'anomaly'
          severity: 'low' | 'medium' | 'high' | 'critical'
          title: string
          message: string
          category: string | null
          metadata: Json
          is_read: boolean
          is_resolved: boolean
          resolved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          audit_id: string
          alert_type: 'score_drop' | 'critical_issue' | 'improvement' | 'anomaly'
          severity: 'low' | 'medium' | 'high' | 'critical'
          title: string
          message: string
          category?: string | null
          metadata?: Json
          is_read?: boolean
          is_resolved?: boolean
          resolved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          audit_id?: string
          alert_type?: 'score_drop' | 'critical_issue' | 'improvement' | 'anomaly'
          severity?: 'low' | 'medium' | 'high' | 'critical'
          title?: string
          message?: string
          category?: string | null
          metadata?: Json
          is_read?: boolean
          is_resolved?: boolean
          resolved_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      user_audit_summary: {
        Row: {
          user_id: string | null
          total_audits: number | null
          avg_score: number | null
          best_score: number | null
          worst_score: number | null
          unique_domains: number | null
          last_audit_at: string | null
        }
      }
      domain_trends: {
        Row: {
          normalized_url: string | null
          domain: string | null
          audit_count: number | null
          avg_score: number | null
          score_range: number | null
          score_history: Json | null
        }
      }
      global_stats: {
        Row: {
          total_users: number | null
          total_audits: number | null
          avg_score: number | null
          org_schema_count: number | null
          eeat_count: number | null
          ai_friendly_count: number | null
          computed_at: string | null
        }
      }
    }
    Functions: {
      anonymize_domain: {
        Args: { input_domain: string }
        Returns: string
      }
      refresh_global_stats: {
        Args: Record<string, never>
        Returns: void
      }
    }
    Enums: {
      plan_type: 'free' | 'premium' | 'enterprise'
      subscription_status: 'active' | 'inactive' | 'canceled' | 'past_due'
      grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'
      insight_type: 'industry' | 'score_range' | 'schema_type' | 'best_practices' | 'trends'
      timeframe: '7d' | '30d' | '90d' | 'all'
      alert_type: 'score_drop' | 'critical_issue' | 'improvement' | 'anomaly'
      severity: 'low' | 'medium' | 'high' | 'critical'
    }
  }
}
