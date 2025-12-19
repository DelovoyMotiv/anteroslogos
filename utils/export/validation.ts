/**
 * Validation Engine for GEO Audit Export System
 * Validates AuditResult completeness and format correctness
 */

import { AuditResult } from '../geoAuditEnhanced';
import { ValidationResult, ValidationError, ValidationWarning } from './types';

export class ValidationEngine {
  /**
   * Validate complete audit result for all required fields
   */
  validateComplete(result: AuditResult): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Validate required top-level fields
    if (!result.url) {
      errors.push({ field: 'url', message: 'URL is required' });
    }
    
    if (!result.timestamp) {
      errors.push({ field: 'timestamp', message: 'Timestamp is required' });
    }
    
    if (result.overallScore === undefined || result.overallScore === null) {
      errors.push({ field: 'overallScore', message: 'Overall score is required' });
    } else if (result.overallScore < 0 || result.overallScore > 100) {
      errors.push({ 
        field: 'overallScore', 
        message: `Overall score must be between 0 and 100, got ${result.overallScore}` 
      });
    }
    
    if (!result.grade) {
      errors.push({ field: 'grade', message: 'Grade is required' });
    }
    
    // Validate scores object - all 11 categories must be present
    const requiredScores = [
      'schemaMarkup', 'metaTags', 'aiCrawlers', 'eeat', 'structure',
      'performance', 'contentQuality', 'citationPotential', 'technicalSEO',
      'linkAnalysis', 'aidAgent'
    ];
    
    if (!result.scores) {
      errors.push({ field: 'scores', message: 'Scores object is required' });
    } else {
      for (const scoreKey of requiredScores) {
        const score = result.scores[scoreKey as keyof typeof result.scores];
        if (score === undefined || score === null) {
          errors.push({
            field: `scores.${scoreKey}`,
            message: `Score for ${scoreKey} is missing`
          });
        } else if (score < 0 || score > 100) {
          errors.push({
            field: `scores.${scoreKey}`,
            message: `Score must be between 0 and 100, got ${score}`
          });
        }
      }
    }
    
    // Validate details object - all 11 categories must be present
    const requiredDetails = [
      'schemaMarkup', 'metaTags', 'aiCrawlers', 'eeat', 'structure',
      'performance', 'contentQuality', 'citationPotential', 'technicalSEO',
      'linkAnalysis', 'aidAgent'
    ];
    
    if (!result.details) {
      errors.push({ field: 'details', message: 'Details object is required' });
    } else {
      for (const detailKey of requiredDetails) {
        if (!result.details[detailKey as keyof typeof result.details]) {
          errors.push({
            field: `details.${detailKey}`,
            message: `Details for ${detailKey} are missing`
          });
        }
      }
    }
    
    // Validate recommendations array
    if (!Array.isArray(result.recommendations)) {
      errors.push({
        field: 'recommendations',
        message: 'Recommendations must be an array'
      });
    } else {
      result.recommendations.forEach((rec, index) => {
        if (!rec.title) {
          errors.push({ 
            field: `recommendations[${index}].title`, 
            message: 'Title is required' 
          });
        }
        if (!rec.priority) {
          errors.push({ 
            field: `recommendations[${index}].priority`, 
            message: 'Priority is required' 
          });
        }
        if (!rec.description) {
          errors.push({ 
            field: `recommendations[${index}].description`, 
            message: 'Description is required' 
          });
        }
        if (!rec.category) {
          errors.push({ 
            field: `recommendations[${index}].category`, 
            message: 'Category is required' 
          });
        }
        
        // Optional fields - add warnings if missing
        if (!rec.effort) {
          warnings.push({
            field: `recommendations[${index}].effort`,
            message: 'Effort level is recommended'
          });
        }
        if (!rec.impact) {
          warnings.push({
            field: `recommendations[${index}].impact`,
            message: 'Impact description is recommended'
          });
        }
      });
    }
    
    // Validate insights array
    if (!Array.isArray(result.insights)) {
      errors.push({
        field: 'insights',
        message: 'Insights must be an array'
      });
    }
    
    // Optional fields - add warnings if missing but don't fail validation
    if (!result.preciseScore) {
      warnings.push({
        field: 'preciseScore',
        message: 'Precise score is recommended for high-precision reporting'
      });
    }
    
    if (!result.knowledgeGraph) {
      warnings.push({
        field: 'knowledgeGraph',
        message: 'Knowledge graph data enhances export completeness'
      });
    }
    
    // Calculate completeness score
    const totalRequiredFields = 50; // Approximate number of important fields
    const missingFields = errors.length;
    const completeness = Math.max(0, Math.round(((totalRequiredFields - missingFields) / totalRequiredFields) * 100));
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      completeness
    };
  }
  
  /**
   * Validate scores object
   */
  validateScores(scores: AuditResult['scores']): boolean {
    if (!scores) return false;
    
    const requiredScores = [
      'schemaMarkup', 'metaTags', 'aiCrawlers', 'eeat', 'structure',
      'performance', 'contentQuality', 'citationPotential', 'technicalSEO',
      'linkAnalysis', 'aidAgent'
    ];
    
    for (const scoreKey of requiredScores) {
      const score = scores[scoreKey as keyof typeof scores];
      if (score === undefined || score === null || score < 0 || score > 100) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Validate details object
   */
  validateDetails(details: AuditResult['details']): boolean {
    if (!details) return false;
    
    const requiredDetails = [
      'schemaMarkup', 'metaTags', 'aiCrawlers', 'eeat', 'structure',
      'performance', 'contentQuality', 'citationPotential', 'technicalSEO',
      'linkAnalysis', 'aidAgent'
    ];
    
    for (const detailKey of requiredDetails) {
      if (!details[detailKey as keyof typeof details]) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Validate recommendations array
   */
  validateRecommendations(recommendations: AuditResult['recommendations']): boolean {
    if (!Array.isArray(recommendations)) return false;
    
    for (const rec of recommendations) {
      if (!rec.title || !rec.priority || !rec.description || !rec.category) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Validate JSON format
   */
  validateJSON(json: string): boolean {
    try {
      JSON.parse(json);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Validate CSV format (basic check)
   */
  validateCSV(csv: string): boolean {
    if (!csv || typeof csv !== 'string') return false;
    
    const lines = csv.split('\n');
    if (lines.length < 2) return false;
    
    // Check for required sections
    const hasScoreBreakdown = csv.includes('Score Breakdown');
    const hasRecommendations = csv.includes('Recommendations');
    
    return hasScoreBreakdown && hasRecommendations;
  }
  
  /**
   * Validate XML format
   */
  validateXML(xml: string): boolean {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'text/xml');
      const parseError = doc.querySelector('parsererror');
      return !parseError;
    } catch {
      return false;
    }
  }
  
  /**
   * Validate HTML format
   */
  validateHTML(html: string): boolean {
    try {
      const parser = new DOMParser();
      parser.parseFromString(html, 'text/html');
      // Check for DOCTYPE
      return html.trim().toLowerCase().startsWith('<!doctype html');
    } catch {
      return false;
    }
  }
  
  /**
   * Validate YAML format
   */
  validateYAML(yaml: string): boolean {
    try {
      // Basic YAML validation - check for proper structure
      if (!yaml || typeof yaml !== 'string') return false;
      
      // Check for YAML document start
      const hasDocStart = yaml.trim().startsWith('---');
      
      // Check for basic YAML structure (key: value pairs)
      const hasKeyValuePairs = /^\s*\w+:\s*.+$/m.test(yaml);
      
      return hasDocStart && hasKeyValuePairs;
    } catch {
      return false;
    }
  }
  
  /**
   * Validate Markdown format
   */
  validateMarkdown(md: string): boolean {
    if (!md || typeof md !== 'string') return false;
    
    // Check for basic markdown structure
    const hasHeadings = /^#+ .+$/m.test(md);
    const hasContent = md.length > 100;
    
    return hasHeadings && hasContent;
  }
}
