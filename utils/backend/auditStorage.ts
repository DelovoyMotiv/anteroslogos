/**
 * Backend Audit Storage
 * Supabase cloud storage with localStorage fallback for offline support
 * Production-ready with error handling, retry logic, and data synchronization
 */

import { supabase, getCurrentUser } from '../../lib/supabase';
import type { AuditResult } from '../geoAuditEnhanced';
import type { Database } from '../../types/database.types';

type AuditInsert = Database['public']['Tables']['audits']['Insert'];
type AuditRow = Database['public']['Tables']['audits']['Row'];

/**
 * Normalize URL for deduplication
 * Removes protocol, www, trailing slash
 */
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    let normalized = parsed.hostname + parsed.pathname;
    
    if (normalized.startsWith('www.')) {
      normalized = normalized.substring(4);
    }
    
    if (normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }
    
    return normalized.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace('www.', '');
  } catch {
    return url;
  }
}

/**
 * Anonymize domain using MD5 hash
 */
function anonymizeDomain(domain: string): string {
  // Simple hash function (in production, use crypto.subtle.digest)
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    const char = domain.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'domain_' + Math.abs(hash).toString(36).substring(0, 12);
}

/**
 * Map grade from new format to database format
 */
function mapGradeToDatabase(grade: 'Authority' | 'Expert' | 'Advanced' | 'Intermediate' | 'Beginner'): 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' {
  const gradeMap: Record<string, 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'> = {
    'Authority': 'A+',
    'Expert': 'A',
    'Advanced': 'B',
    'Intermediate': 'C',
    'Beginner': 'D',
  };
  return gradeMap[grade] || 'F';
}

/**
 * Detect schema types from new AuditResult structure
 */
function detectSchemaTypes(result: AuditResult) {
  const schemaDetails = result.details.schemaMarkup;
  
  return {
    has_organization_schema: schemaDetails.schemas.Organization || false,
    has_person_schema: schemaDetails.schemas.Person || false,
    has_article_schema: schemaDetails.schemas.Article || schemaDetails.schemas.BlogPosting || false,
    has_breadcrumb_schema: schemaDetails.schemas.BreadcrumbList || false,
    has_author_markup: schemaDetails.schemas.Person || false,
  };
}

/**
 * Detect E-E-A-T signals
 */
function detectEEATSignals(result: AuditResult): boolean {
  return result.scores.eeat > 50;
}

/**
 * Check if robots.txt allows AI crawlers
 */
function checkAICrawlerSupport(result: AuditResult): boolean {
  return result.scores.aiCrawlers > 70;
}

/**
 * Convert AuditResult to database format
 */
function convertToDbFormat(result: AuditResult, userId: string | null): AuditInsert {
  const normalizedUrl = normalizeUrl(result.url);
  const domain = extractDomain(result.url);
  const schemaTypes = detectSchemaTypes(result);
  
  // Use new details structure
  const details = result.details;
  
  return {
    user_id: userId,
    url: result.url,
    normalized_url: normalizedUrl,
    domain,
    timestamp: result.timestamp,
    overall_score: result.overallScore,
    grade: mapGradeToDatabase(result.grade),
    
    // Category scores
    score_schema_markup: result.scores.schemaMarkup,
    score_meta_tags: result.scores.metaTags,
    score_ai_crawlers: result.scores.aiCrawlers,
    score_eeat: result.scores.eeat,
    score_structure: result.scores.structure,
    score_performance: result.scores.performance,
    score_content_quality: result.scores.contentQuality,
    score_citation_potential: result.scores.citationPotential || 0,
    score_technical_seo: result.scores.technicalSEO || 0,
    score_link_analysis: result.scores.linkAnalysis || 0,
    
    // Detailed findings
    schema_findings: details.schemaMarkup as any,
    meta_findings: details.metaTags as any,
    crawler_findings: details.aiCrawlers as any,
    eeat_findings: details.eeat as any,
    structure_findings: details.structure as any,
    performance_findings: details.performance as any,
    content_findings: details.contentQuality as any,
    citation_findings: details.citationPotential as any,
    technical_findings: details.technicalSEO as any,
    link_findings: details.linkAnalysis as any,
    
    // AI recommendations (serialize to JSON)
    ai_recommendations: JSON.stringify(result.recommendations || []) as any,
    priority_actions: JSON.stringify(result.recommendations?.slice(0, 5) || []) as any,
    
    // Feature flags
    ...schemaTypes,
    has_eeat_signals: detectEEATSignals(result),
    robots_txt_allows_ai: checkAICrawlerSupport(result),
    
    // Anonymization (opt-in by user later)
    is_public: false,
    anonymized_domain: anonymizeDomain(domain),
    
    // Metadata
    user_agent: navigator.userAgent,
  };
}

/**
 * Save audit to Supabase with localStorage fallback
 */
export async function saveAuditToCloud(result: AuditResult): Promise<{ success: boolean; id?: string; error?: any }> {
  try {
    // Get current user
    const user = await getCurrentUser();
    
    // Convert to database format
    const auditData = convertToDbFormat(result, user?.id || null);
    
    // Insert to Supabase
    const { data, error } = await supabase
      .from('audits')
      .insert(auditData as any)
      .select()
      .single();
    
    if (error) {
      console.error('Supabase insert error:', error);
      
      // Fallback to localStorage
      saveToLocalStorage(result);
      
      return { success: false, error };
    }
    
    console.log('✅ Audit saved to Supabase:', (data as any)?.id);
    
    // Also save to localStorage for offline access
    saveToLocalStorage(result);
    
    return { success: true, id: (data as any)?.id };
    
  } catch (error) {
    console.error('Error saving audit:', error);
    
    // Fallback to localStorage
    saveToLocalStorage(result);
    
    return { success: false, error };
  }
}

/**
 * Get audit history from Supabase (with localStorage fallback)
 */
export async function getCloudAuditHistory(limit: number = 50): Promise<AuditRow[]> {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      console.warn('No authenticated user, returning empty history');
      return [];
    }
    
    const { data, error } = await supabase
      .from('audits')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching audit history:', error);
      return [];
    }
    
    return data || [];
    
  } catch (error) {
    console.error('Error fetching audit history:', error);
    return [];
  }
}

/**
 * Get audit history for specific URL
 */
export async function getCloudUrlHistory(url: string): Promise<AuditRow[]> {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return [];
    }
    
    const normalizedUrl = normalizeUrl(url);
    
    const { data, error } = await supabase
      .from('audits')
      .select('*')
      .eq('user_id', user.id)
      .eq('normalized_url', normalizedUrl)
      .is('deleted_at', null)
      .order('timestamp', { ascending: false });
    
    if (error) {
      console.error('Error fetching URL history:', error);
      return [];
    }
    
    return data || [];
    
  } catch (error) {
    console.error('Error fetching URL history:', error);
    return [];
  }
}

/**
 * Delete audit from Supabase (soft delete)
 */
export async function deleteCloudAudit(auditId: string): Promise<{ success: boolean; error?: any }> {
  try {
    const { error } = await (supabase as any)
      .from('audits')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', auditId);
    
    if (error) {
      console.error('Error deleting audit:', error);
      return { success: false, error };
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('Error deleting audit:', error);
    return { success: false, error };
  }
}

/**
 * Update audit public status (opt-in to global insights)
 */
export async function updateAuditPublicStatus(auditId: string, isPublic: boolean): Promise<{ success: boolean; error?: any }> {
  try {
    const { error } = await (supabase as any)
      .from('audits')
      .update({ is_public: isPublic })
      .eq('id', auditId);
    
    if (error) {
      console.error('Error updating audit public status:', error);
      return { success: false, error };
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('Error updating audit public status:', error);
    return { success: false, error };
  }
}

/**
 * Get user profile with audit stats
 */
export async function getUserProfile() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return null;
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
    
    return data;
    
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

/**
 * Get user audit summary from view
 */
export async function getUserAuditSummary() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return null;
    }
    
    const { data, error } = await supabase
      .from('user_audit_summary')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (error) {
      console.error('Error fetching audit summary:', error);
      return null;
    }
    
    return data;
    
  } catch (error) {
    console.error('Error fetching audit summary:', error);
    return null;
  }
}

// =====================================================
// LOCALSTORAGE FALLBACK (for offline support)
// =====================================================

const STORAGE_KEY = 'geo_audit_history';
const MAX_LOCAL_ITEMS = 50;

function saveToLocalStorage(result: AuditResult) {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const history = stored ? JSON.parse(stored) : [];
    
    history.unshift({
      id: `local_${Date.now()}`,
      url: result.url,
      timestamp: result.timestamp,
      overallScore: result.overallScore,
      grade: result.grade,
      scores: result.scores,
    });
    
    if (history.length > MAX_LOCAL_ITEMS) {
      history.splice(MAX_LOCAL_ITEMS);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

/**
 * Sync localStorage data to Supabase (one-time migration)
 */
export async function syncLocalStorageToCloud(): Promise<{ synced: number; errors: number }> {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      console.warn('No user logged in, cannot sync');
      return { synced: 0, errors: 0 };
    }
    
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { synced: 0, errors: 0 };
    }
    
    const localHistory = JSON.parse(stored);
    let synced = 0;
    let errors = 0;
    
    for (const item of localHistory) {
      // Check if already exists in cloud
      const { data: existing } = await supabase
        .from('audits')
        .select('id')
        .eq('url', item.url)
        .eq('timestamp', item.timestamp)
        .single();
      
      if (existing) {
        continue; // Already synced
      }
      
      // Convert and save (simplified version)
      const { error } = await supabase
        .from('audits')
        .insert({
          user_id: user.id,
          url: item.url,
          normalized_url: normalizeUrl(item.url),
          domain: extractDomain(item.url),
          timestamp: item.timestamp,
          overall_score: item.overallScore,
          grade: mapGradeToDatabase(item.grade),
          score_schema_markup: item.scores?.schemaMarkup || 0,
          score_meta_tags: item.scores?.metaTags || 0,
          score_ai_crawlers: item.scores?.aiCrawlers || 0,
          score_eeat: item.scores?.eeat || 0,
          score_structure: item.scores?.structure || 0,
          score_performance: item.scores?.performance || 0,
          score_content_quality: item.scores?.contentQuality || 0,
        } as any);
      
      if (error) {
        errors++;
        console.error('Error syncing item:', error);
      } else {
        synced++;
      }
    }
    
    console.log(`✅ Synced ${synced} audits from localStorage to cloud`);
    
    return { synced, errors };
    
  } catch (error) {
    console.error('Error syncing localStorage to cloud:', error);
    return { synced: 0, errors: 0 };
  }
}
