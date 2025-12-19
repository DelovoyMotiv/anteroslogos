/**
 * Security utilities for export system
 * Handles sanitization and escaping for various formats
 */

export class ExportSecurity {
  /**
   * Sanitize URL to prevent XSS attacks
   * Removes malicious schemes like javascript:, data:, vbscript:, file:
   */
  static sanitizeURL(url: string): string {
    if (!url) return '';
    
    const maliciousSchemes = ['javascript:', 'data:', 'vbscript:', 'file:'];
    const lowerUrl = url.toLowerCase().trim();
    
    for (const scheme of maliciousSchemes) {
      if (lowerUrl.startsWith(scheme)) {
        return '#'; // Replace with safe anchor
      }
    }
    
    return url;
  }
  
  /**
   * Escape XML/HTML special characters
   * Converts &, <, >, ", ' to their entity equivalents
   */
  static escapeXML(str: string): string {
    if (!str) return '';
    
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
  
  /**
   * Escape CSV special characters according to RFC 4180
   * Wraps fields containing commas, quotes, or newlines in quotes
   * Escapes quotes by doubling them
   */
  static escapeCSV(value: string): string {
    if (!value) return '';
    
    // If value contains comma, quote, or newline, wrap in quotes and escape quotes
    if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    
    return value;
  }
  
  /**
   * Escape YAML special characters
   * Wraps strings containing special YAML characters in quotes
   */
  static escapeYAML(str: string): string {
    if (!str) return '';
    
    // If string contains special YAML characters, wrap in quotes
    if (str.includes(':') || str.includes('#') || str.includes('\n') || 
        str.includes('"') || str.includes('[') || str.includes(']') ||
        str.includes('{') || str.includes('}') || str.includes('|') ||
        str.includes('>') || str.includes('&') || str.includes('*')) {
      return `"${str.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
    }
    
    return str;
  }
  
  /**
   * Validate and sanitize filename
   * Removes path traversal attempts and invalid characters
   */
  static sanitizeFilename(filename: string): string {
    if (!filename) return 'export';
    
    // Remove path traversal attempts
    filename = filename.replace(/\.\./g, '');
    
    // Remove invalid filename characters
    // Windows: < > : " / \ | ? *
    // Also remove control characters (0x00-0x1F)
    filename = filename.replace(/[<>:"/\\|?*\x00-\x1F]/g, '-');
    
    // Limit length (255 is typical filesystem limit)
    if (filename.length > 255) {
      const ext = filename.substring(filename.lastIndexOf('.'));
      filename = filename.substring(0, 255 - ext.length) + ext;
    }
    
    // Ensure filename is not empty after sanitization
    if (!filename || filename.trim() === '') {
      filename = 'export';
    }
    
    return filename;
  }
}
