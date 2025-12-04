/**
 * SchemaValidationView Component
 * 
 * Displays comprehensive schema validation details, errors, and recommendations.
 * Shows schema types, validation errors, missing schemas, and links to schema.org documentation.
 * 
 * Features:
 * - Schema overview with statistics
 * - Schema types grid with present/missing indicators
 * - Validation errors with detailed messages
 * - Missing critical schemas with recommendations
 * - Issues and strengths display
 * - Links to schema.org documentation
 * - Validation recommendations with implementation guidance
 * - Color-coded status indicators
 * 
 * Requirements:
 * - Display all schema validation errors
 * - Show schema structure
 * - Add validation recommendations
 * - Link to schema.org documentation
 * - Validation details with external links
 * 
 * Usage:
 * ```tsx
 * <SchemaValidationView result={auditResult} />
 * ```
 */

import { 
  Code,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  Info,
  Lightbulb,
  BookOpen,
  Shield,
} from 'lucide-react';
import type { AuditResult } from '../../../../../utils/geoAuditEnhanced';

interface SchemaValidationViewProps {
  /** Complete audit result data */
  result: AuditResult;
}

export function SchemaValidationView({ result }: SchemaValidationViewProps) {
  const schema = result.details.schemaMarkup;

  return (
    <div className="space-y-4">
      {/* Overview */}
      <div className="bg-black/20 border border-slate-800/50 rounded p-4">
        <h3 className="text-xs font-mono text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Code className="w-4 h-4" />
          Schema Markup Overview
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard 
            label="Total Schemas" 
            value={schema.totalSchemas} 
            color="blue" 
            icon={<Code className="w-4 h-4" />}
          />
          <StatCard 
            label="Valid Schemas" 
            value={schema.validSchemas} 
            color="emerald" 
            icon={<CheckCircle className="w-4 h-4" />}
          />
          <StatCard
            label="Graph Structure"
            value={schema.hasGraphStructure ? 'Yes' : 'No'}
            color={schema.hasGraphStructure ? 'emerald' : 'red'}
            icon={schema.hasGraphStructure ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            isText
          />
          <StatCard
            label="Score"
            value={result.scores.schemaMarkup.toFixed(1)}
            color={getScoreColor(result.scores.schemaMarkup)}
            icon={<Shield className="w-4 h-4" />}
            isText
          />
        </div>

        {/* Quick Status */}
        <div className="mt-3 pt-3 border-t border-slate-700/50">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-mono">Validation Status:</span>
            <span className={`text-xs font-mono font-bold ${
              schema.schemaErrors.length === 0 ? 'text-emerald-400' :
              schema.schemaErrors.length <= 2 ? 'text-yellow-400' :
              'text-red-400'
            }`}>
              {schema.schemaErrors.length === 0 ? 'PASSED' :
               schema.schemaErrors.length <= 2 ? 'WARNINGS' :
               'ERRORS'}
            </span>
          </div>
        </div>
      </div>

      {/* Schema Types Grid */}
      <div className="bg-black/20 border border-slate-800/50 rounded p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-mono text-purple-400 uppercase tracking-wider flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Schema Types ({Object.values(schema.schemas).filter(Boolean).length}/{Object.keys(schema.schemas).length})
          </h3>
          <a
            href="https://schema.org/docs/schemas.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:text-blue-300 font-mono flex items-center gap-1 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Schema.org Docs
          </a>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {Object.entries(schema.schemas).map(([type, present]) => (
            <SchemaTypeCard
              key={type}
              type={type}
              present={present}
            />
          ))}
        </div>
      </div>

      {/* Schema Validation Errors */}
      {schema.schemaErrors.length > 0 && (
        <div className="bg-black/20 border border-red-500/30 rounded p-4">
          <h3 className="text-xs font-mono text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            Validation Errors ({schema.schemaErrors.length})
          </h3>
          <div className="space-y-2">
            {schema.schemaErrors.map((error, idx) => (
              <div
                key={idx}
                className="bg-red-500/5 border border-red-500/20 rounded p-3"
              >
                <div className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-xs text-red-400 leading-relaxed">
                      {error}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Validation Tool Link */}
          <div className="mt-3 pt-3 border-t border-red-500/20">
            <a
              href="https://validator.schema.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-red-400 hover:text-red-300 font-mono flex items-center gap-2 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Validate with Schema.org Validator
            </a>
          </div>
        </div>
      )}

      {/* Missing Critical Schemas */}
      {schema.missingCriticalSchemas.length > 0 && (
        <div className="bg-black/20 border border-orange-500/30 rounded p-4">
          <h3 className="text-xs font-mono text-orange-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Missing Critical Schemas ({schema.missingCriticalSchemas.length})
          </h3>
          <div className="space-y-3">
            {schema.missingCriticalSchemas.map((missing, idx) => (
              <MissingSchemaCard
                key={idx}
                schemaType={missing}
              />
            ))}
          </div>
        </div>
      )}

      {/* Issues */}
      {schema.issues.length > 0 && (
        <div className="bg-black/20 border border-yellow-500/30 rounded p-4">
          <h3 className="text-xs font-mono text-yellow-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Issues ({schema.issues.length})
          </h3>
          <div className="space-y-2">
            {schema.issues.map((issue, idx) => (
              <div
                key={idx}
                className="bg-yellow-500/5 border border-yellow-500/20 rounded p-3 flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-yellow-400 leading-relaxed">
                  {issue}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strengths */}
      {schema.strengths.length > 0 && (
        <div className="bg-black/20 border border-emerald-500/30 rounded p-4">
          <h3 className="text-xs font-mono text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Strengths ({schema.strengths.length})
          </h3>
          <div className="space-y-2">
            {schema.strengths.map((strength, idx) => (
              <div
                key={idx}
                className="bg-emerald-500/5 border border-emerald-500/20 rounded p-3 flex items-start gap-2"
              >
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-400 leading-relaxed">
                  {strength}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Validation Recommendations */}
      <div className="bg-black/20 border border-blue-500/30 rounded p-4">
        <h3 className="text-xs font-mono text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Lightbulb className="w-4 h-4" />
          Validation Recommendations
        </h3>
        <div className="space-y-3">
          <RecommendationCard
            title="Use Schema.org Validator"
            description="Validate your structured data using the official Schema.org validator to catch syntax errors and ensure compliance."
            link="https://validator.schema.org/"
            linkText="Open Validator"
          />
          <RecommendationCard
            title="Test with Google Rich Results"
            description="Use Google's Rich Results Test to see how your schema markup appears in search results and identify issues."
            link="https://search.google.com/test/rich-results"
            linkText="Test Rich Results"
          />
          <RecommendationCard
            title="Implement @graph Structure"
            description="Use @graph to organize multiple schema types in a single JSON-LD block for better semantic relationships."
            link="https://schema.org/docs/jsonld.html#advanced-concepts"
            linkText="Learn About @graph"
          />
          <RecommendationCard
            title="Add Critical Schema Types"
            description="Implement Organization, WebSite, and BreadcrumbList schemas as they are essential for AI understanding and search visibility."
            link="https://schema.org/docs/full.html"
            linkText="Browse All Types"
          />
        </div>
      </div>

      {/* Schema Resources */}
      <div className="bg-black/20 border border-slate-800/50 rounded p-4">
        <h3 className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Info className="w-4 h-4" />
          Schema.org Resources
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <ResourceLink
            href="https://schema.org/"
            label="Schema.org Homepage"
            description="Official schema vocabulary"
          />
          <ResourceLink
            href="https://schema.org/docs/schemas.html"
            label="Schema Types"
            description="Browse all schema types"
          />
          <ResourceLink
            href="https://schema.org/docs/gs.html"
            label="Getting Started"
            description="Introduction to schema markup"
          />
          <ResourceLink
            href="https://schema.org/docs/jsonld.html"
            label="JSON-LD Guide"
            description="JSON-LD implementation guide"
          />
          <ResourceLink
            href="https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data"
            label="Google Structured Data"
            description="Google's structured data guide"
          />
          <ResourceLink
            href="https://technicalseo.com/tools/schema-markup-generator/"
            label="Schema Generator"
            description="Generate schema markup"
          />
        </div>
      </div>
    </div>
  );
}

/**
 * StatCard Component
 * 
 * Compact stat display for schema metrics.
 */
interface StatCardProps {
  label: string;
  value: string | number;
  color: 'blue' | 'emerald' | 'purple' | 'red' | 'yellow' | 'slate';
  icon?: React.ReactNode;
  isText?: boolean;
}

function StatCard({ label, value, color, icon, isText = false }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    emerald: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    purple: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
    red: 'bg-red-500/10 border-red-500/30 text-red-400',
    yellow: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
    slate: 'bg-slate-500/10 border-slate-500/30 text-slate-400',
  };

  return (
    <div className={`${colorClasses[color]} border rounded p-3`}>
      <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
        {icon}
        {label}
      </div>
      <div className={`${isText ? 'text-sm' : 'text-xl'} font-bold font-mono leading-none`}>
        {value}
      </div>
    </div>
  );
}

/**
 * SchemaTypeCard Component
 * 
 * Displays a schema type with present/missing indicator and link to documentation.
 */
interface SchemaTypeCardProps {
  type: string;
  present: boolean;
}

function SchemaTypeCard({ type, present }: SchemaTypeCardProps) {
  const schemaUrl = `https://schema.org/${type}`;

  return (
    <a
      href={schemaUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`
        group px-3 py-2 rounded border text-xs font-mono transition-all
        ${present
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/20'
          : 'bg-slate-500/5 border-slate-700/30 text-slate-600 hover:border-slate-600/50 hover:bg-slate-500/10'
        }
      `}
      title={`View ${type} schema documentation`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1">
          {present ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
          {type}
        </span>
        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </a>
  );
}

/**
 * MissingSchemaCard Component
 * 
 * Displays a missing schema with recommendation and documentation link.
 */
interface MissingSchemaCardProps {
  schemaType: string;
}

function MissingSchemaCard({ schemaType }: MissingSchemaCardProps) {
  const schemaUrl = `https://schema.org/${schemaType}`;
  const recommendation = getSchemaRecommendation(schemaType);

  return (
    <div className="bg-orange-500/5 border border-orange-500/20 rounded p-3">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-orange-400 flex-shrink-0" />
          <span className="text-sm text-orange-400 font-mono font-bold">
            {schemaType}
          </span>
        </div>
        <a
          href={schemaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-orange-400 hover:text-orange-300 transition-colors"
          title={`View ${schemaType} documentation`}
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed">
        {recommendation}
      </p>
    </div>
  );
}

/**
 * RecommendationCard Component
 * 
 * Displays a validation recommendation with external link.
 */
interface RecommendationCardProps {
  title: string;
  description: string;
  link: string;
  linkText: string;
}

function RecommendationCard({ title, description, link, linkText }: RecommendationCardProps) {
  return (
    <div className="bg-blue-500/5 border border-blue-500/20 rounded p-3">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm text-blue-400 font-mono font-bold">
          {title}
        </h4>
        <Lightbulb className="w-4 h-4 text-blue-400 flex-shrink-0" />
      </div>
      <p className="text-xs text-slate-400 leading-relaxed mb-2">
        {description}
      </p>
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-blue-400 hover:text-blue-300 font-mono flex items-center gap-1 transition-colors"
      >
        <ExternalLink className="w-3 h-3" />
        {linkText}
      </a>
    </div>
  );
}

/**
 * ResourceLink Component
 * 
 * Displays a resource link with description.
 */
interface ResourceLinkProps {
  href: string;
  label: string;
  description: string;
}

function ResourceLink({ href, label, description }: ResourceLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-slate-500/5 border border-slate-700/30 rounded p-3 hover:border-slate-600/50 hover:bg-slate-500/10 transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-xs text-slate-300 font-mono font-bold">
          {label}
        </span>
        <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-slate-400 transition-colors flex-shrink-0" />
      </div>
      <p className="text-[10px] text-slate-500 leading-relaxed">
        {description}
      </p>
    </a>
  );
}

/**
 * Helper Functions
 */

function getScoreColor(score: number): 'emerald' | 'yellow' | 'red' {
  if (score >= 80) return 'emerald';
  if (score >= 60) return 'yellow';
  return 'red';
}

function getSchemaRecommendation(schemaType: string): string {
  const recommendations: Record<string, string> = {
    'Organization': 'Add Organization schema to establish your business identity and improve brand recognition in AI systems. Include name, logo, contact info, and social profiles.',
    'WebSite': 'Implement WebSite schema to help search engines understand your site structure and enable sitelinks search box in results.',
    'BreadcrumbList': 'Add BreadcrumbList schema to show your site hierarchy and improve navigation understanding for both users and AI systems.',
    'Article': 'Include Article schema for blog posts and articles to enhance content visibility and enable rich snippets in search results.',
    'Person': 'Add Person schema for author information to establish E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness).',
    'Product': 'Implement Product schema for e-commerce items to enable rich product snippets with pricing, availability, and ratings.',
    'FAQPage': 'Add FAQPage schema to make your FAQ content eligible for rich results and improve visibility in voice search.',
    'HowTo': 'Include HowTo schema for instructional content to enable step-by-step rich results and improve discoverability.',
    'LocalBusiness': 'Add LocalBusiness schema for physical locations to improve local search visibility and enable Google Business Profile integration.',
    'Review': 'Implement Review schema to showcase customer feedback and enable star ratings in search results.',
  };

  return recommendations[schemaType] || `Add ${schemaType} schema to improve structured data coverage and AI understanding of your content.`;
}
