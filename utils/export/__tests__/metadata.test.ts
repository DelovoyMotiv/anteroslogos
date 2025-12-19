/**
 * Tests for export metadata compliance
 * Validates Requirements 6.1-6.5
 */

import { describe, it, expect } from 'vitest';
import { 
  getExportMetadata, 
  getToolVersion, 
  getToolName, 
  getCurrentTimestamp,
  isStructuredFormat,
  getSchemaVersion,
  formatMetadataAsJSON,
  formatMetadataAsXML,
  formatMetadataAsYAML,
  formatMetadataAsHTMLMeta,
  formatMetadataForFooter
} from '../metadata';
import { ExportFormat } from '../types';

describe('Export Metadata', () => {
  describe('Basic metadata functions', () => {
    it('should return correct tool version', () => {
      const version = getToolVersion();
      expect(version).toBe('1.0.0');
    });

    it('should return correct tool name', () => {
      const name = getToolName();
      expect(name).toBe('Anóteros Lógos GEO Audit Tool');
    });

    it('should return ISO 8601 timestamp (Requirement 6.1)', () => {
      const timestamp = getCurrentTimestamp();
      // ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('Format detection', () => {
    it('should identify structured formats', () => {
      expect(isStructuredFormat(ExportFormat.JSON)).toBe(true);
      expect(isStructuredFormat(ExportFormat.XML)).toBe(true);
      expect(isStructuredFormat(ExportFormat.YAML)).toBe(true);
      expect(isStructuredFormat(ExportFormat.CSV)).toBe(false);
      expect(isStructuredFormat(ExportFormat.MARKDOWN)).toBe(false);
      expect(isStructuredFormat(ExportFormat.HTML)).toBe(false);
      expect(isStructuredFormat(ExportFormat.PLAIN_TEXT)).toBe(false);
      expect(isStructuredFormat(ExportFormat.PDF)).toBe(false);
    });

    it('should return schema version for structured formats (Requirement 6.5)', () => {
      const jsonSchema = getSchemaVersion(ExportFormat.JSON);
      expect(jsonSchema).toBe('geo-audit-schema-v1.0.0');
      
      const xmlSchema = getSchemaVersion(ExportFormat.XML);
      expect(xmlSchema).toBe('geo-audit-schema-v1.0.0');
      
      const yamlSchema = getSchemaVersion(ExportFormat.YAML);
      expect(yamlSchema).toBe('geo-audit-schema-v1.0.0');
    });
  });

  describe('Metadata generation', () => {
    it('should generate complete metadata for JSON format (Requirements 6.1, 6.2, 6.5)', () => {
      const metadata = getExportMetadata(ExportFormat.JSON);
      
      expect(metadata.generatedBy).toBe('Anóteros Lógos GEO Audit Tool');
      expect(metadata.toolVersion).toBe('1.0.0');
      expect(metadata.exportFormat).toBe('json');
      expect(metadata.exportVersion).toBe('1.0.0');
      expect(metadata.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(metadata.schemaVersion).toBe('geo-audit-schema-v1.0.0');
    });

    it('should generate complete metadata for CSV format (Requirements 6.1, 6.2)', () => {
      const metadata = getExportMetadata(ExportFormat.CSV);
      
      expect(metadata.generatedBy).toBe('Anóteros Lógos GEO Audit Tool');
      expect(metadata.toolVersion).toBe('1.0.0');
      expect(metadata.exportFormat).toBe('csv');
      expect(metadata.exportVersion).toBe('1.0.0');
      expect(metadata.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(metadata.schemaVersion).toBeUndefined(); // CSV is not structured
    });

    it('should generate complete metadata for Markdown format (Requirements 6.1, 6.2)', () => {
      const metadata = getExportMetadata(ExportFormat.MARKDOWN);
      
      expect(metadata.generatedBy).toBe('Anóteros Lógos GEO Audit Tool');
      expect(metadata.toolVersion).toBe('1.0.0');
      expect(metadata.exportFormat).toBe('markdown');
      expect(metadata.exportVersion).toBe('1.0.0');
      expect(metadata.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should generate complete metadata for HTML format (Requirements 6.1, 6.2, 6.4)', () => {
      const metadata = getExportMetadata(ExportFormat.HTML);
      
      expect(metadata.generatedBy).toBe('Anóteros Lógos GEO Audit Tool');
      expect(metadata.toolVersion).toBe('1.0.0');
      expect(metadata.exportFormat).toBe('html');
      expect(metadata.exportVersion).toBe('1.0.0');
      expect(metadata.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should generate complete metadata for XML format (Requirements 6.1, 6.2, 6.5)', () => {
      const metadata = getExportMetadata(ExportFormat.XML);
      
      expect(metadata.generatedBy).toBe('Anóteros Lógos GEO Audit Tool');
      expect(metadata.toolVersion).toBe('1.0.0');
      expect(metadata.exportFormat).toBe('xml');
      expect(metadata.exportVersion).toBe('1.0.0');
      expect(metadata.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(metadata.schemaVersion).toBe('geo-audit-schema-v1.0.0');
    });

    it('should generate complete metadata for YAML format (Requirements 6.1, 6.2, 6.5)', () => {
      const metadata = getExportMetadata(ExportFormat.YAML);
      
      expect(metadata.generatedBy).toBe('Anóteros Lógos GEO Audit Tool');
      expect(metadata.toolVersion).toBe('1.0.0');
      expect(metadata.exportFormat).toBe('yaml');
      expect(metadata.exportVersion).toBe('1.0.0');
      expect(metadata.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(metadata.schemaVersion).toBe('geo-audit-schema-v1.0.0');
    });

    it('should generate complete metadata for PDF format (Requirements 6.1, 6.2, 6.4)', () => {
      const metadata = getExportMetadata(ExportFormat.PDF);
      
      expect(metadata.generatedBy).toBe('Anóteros Lógos GEO Audit Tool');
      expect(metadata.toolVersion).toBe('1.0.0');
      expect(metadata.exportFormat).toBe('pdf');
      expect(metadata.exportVersion).toBe('1.0.0');
      expect(metadata.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('Metadata formatting', () => {
    it('should format metadata as JSON object', () => {
      const metadata = getExportMetadata(ExportFormat.JSON);
      const json = formatMetadataAsJSON(metadata);
      
      expect(json.generatedBy).toBe('Anóteros Lógos GEO Audit Tool');
      expect(json.toolVersion).toBe('1.0.0');
      expect(json.exportFormat).toBe('json');
      expect(json.exportVersion).toBe('1.0.0');
      expect(json.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(json.schemaVersion).toBe('geo-audit-schema-v1.0.0');
    });

    it('should format metadata as XML elements', () => {
      const metadata = getExportMetadata(ExportFormat.XML);
      const xml = formatMetadataAsXML(metadata);
      
      expect(xml).toContain('<metadata>');
      expect(xml).toContain('</metadata>');
      expect(xml).toContain('<generatedBy>Anóteros Lógos GEO Audit Tool</generatedBy>');
      expect(xml).toContain('<toolVersion>1.0.0</toolVersion>');
      expect(xml).toContain('<exportFormat>xml</exportFormat>');
      expect(xml).toContain('<exportVersion>1.0.0</exportVersion>');
      expect(xml).toContain('<schemaVersion>geo-audit-schema-v1.0.0</schemaVersion>');
    });

    it('should format metadata as YAML', () => {
      const metadata = getExportMetadata(ExportFormat.YAML);
      const yaml = formatMetadataAsYAML(metadata);
      
      expect(yaml).toContain('metadata:');
      expect(yaml).toContain('generatedBy: "Anóteros Lógos GEO Audit Tool"');
      expect(yaml).toContain('toolVersion: "1.0.0"');
      expect(yaml).toContain('exportFormat: "yaml"');
      expect(yaml).toContain('exportVersion: "1.0.0"');
      expect(yaml).toContain('schemaVersion: "geo-audit-schema-v1.0.0"');
    });

    it('should format metadata as HTML meta tags (Requirement 6.4)', () => {
      const metadata = getExportMetadata(ExportFormat.HTML);
      const html = formatMetadataAsHTMLMeta(metadata);
      
      expect(html).toContain('<meta name="generator"');
      expect(html).toContain('Anóteros Lógos GEO Audit Tool v1.0.0');
      expect(html).toContain('<meta name="export-format" content="html"');
      expect(html).toContain('<meta name="export-version" content="1.0.0"');
      expect(html).toContain('<meta name="generated-at"');
    });

    it('should format metadata for footer with page number (Requirement 6.4)', () => {
      const metadata = getExportMetadata(ExportFormat.PDF);
      const footer = formatMetadataForFooter(metadata, 5);
      
      expect(footer).toContain('Generated by Anóteros Lógos GEO Audit Tool');
      expect(footer).toContain('Page 5');
    });

    it('should format metadata for footer without page number', () => {
      const metadata = getExportMetadata(ExportFormat.HTML);
      const footer = formatMetadataForFooter(metadata);
      
      expect(footer).toContain('Generated by Anóteros Lógos GEO Audit Tool');
      expect(footer).not.toContain('Page');
    });
  });

  describe('Special character escaping', () => {
    it('should escape XML special characters', () => {
      const metadata = getExportMetadata(ExportFormat.XML);
      // Temporarily modify metadata to test escaping
      const testMetadata = {
        ...metadata,
        generatedBy: 'Test & <Company> "Name"'
      };
      
      const xml = formatMetadataAsXML(testMetadata);
      expect(xml).toContain('&amp;');
      expect(xml).toContain('&lt;');
      expect(xml).toContain('&gt;');
      expect(xml).toContain('&quot;');
    });

    it('should escape HTML special characters', () => {
      const metadata = getExportMetadata(ExportFormat.HTML);
      const testMetadata = {
        ...metadata,
        generatedBy: 'Test & <Company> "Name"'
      };
      
      const html = formatMetadataAsHTMLMeta(testMetadata);
      expect(html).toContain('&amp;');
      expect(html).toContain('&lt;');
      expect(html).toContain('&gt;');
      expect(html).toContain('&quot;');
    });
  });
});
