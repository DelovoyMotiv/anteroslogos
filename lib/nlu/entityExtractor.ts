/**
 * Named Entity Recognition (NER) Engine
 * Production-grade entity extraction using regex patterns and dictionary lookup
 * 
 * Extracts 4 entity types:
 * - Person: Names, titles, roles
 * - Organization: Companies, institutions, groups
 * - Product: Brand names, product names, services
 * - Concept: Abstract concepts, topics, domains
 * 
 * Based on research:
 * - Nadeau & Sekine (2007) "A survey of named entity recognition and classification"
 * - Ratinov & Roth (2009) "Design challenges and misconceptions in named entity recognition"
 * 
 * @module lib/nlu/entityExtractor
 * @version 1.0.0
 */

import { z } from 'zod';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export const EntityTypeSchema = z.enum([
  'Person',
  'Organization',
  'Product',
  'Concept',
]);

export type EntityType = z.infer<typeof EntityTypeSchema>;

export const ExtractedEntitySchema = z.object({
  text: z.string(),
  type: EntityTypeSchema,
  confidence: z.number().min(0).max(1),
  startIndex: z.number(),
  endIndex: z.number(),
  context: z.string().optional(), // Surrounding text
  metadata: z.object({
    matchedPattern: z.string().optional(),
    dictionaryMatch: z.boolean(),
    capitalizedWords: z.number(),
    hasTitle: z.boolean(),
    hasSuffix: z.boolean(),
  }),
});

export type ExtractedEntity = z.infer<typeof ExtractedEntitySchema>;

export const EntityExtractionResultSchema = z.object({
  entities: z.array(ExtractedEntitySchema),
  totalCount: z.number(),
  byType: z.record(EntityTypeSchema, z.number()),
  processingTimeMs: z.number(),
});

export type EntityExtractionResult = z.infer<typeof EntityExtractionResultSchema>;

// =====================================================
// DICTIONARIES & PATTERNS
// =====================================================

/**
 * Person titles (professional, academic, honorific)
 */
const PERSON_TITLES = [
  // Professional titles
  'CEO', 'CTO', 'CFO', 'COO', 'CMO', 'CIO', 'VP', 'SVP', 'EVP',
  'President', 'Director', 'Manager', 'Lead', 'Head', 'Chief',
  'Engineer', 'Developer', 'Designer', 'Architect', 'Analyst',
  'Consultant', 'Specialist', 'Coordinator', 'Administrator',
  // Academic titles
  'Dr', 'Prof', 'Professor', 'PhD', 'MD', 'MSc', 'MA', 'BA', 'BSc',
  // Honorific titles
  'Mr', 'Mrs', 'Ms', 'Miss', 'Sir', 'Madam', 'Lord', 'Lady',
  // Other
  'Founder', 'Co-Founder', 'Partner', 'Member', 'Author', 'Speaker',
] as const;

/**
 * Organization suffixes (legal entity types)
 */
const ORGANIZATION_SUFFIXES = [
  // US entities
  'Inc', 'Incorporated', 'Corp', 'Corporation', 'LLC', 'LLP', 'LP',
  'Ltd', 'Limited', 'Co', 'Company', 'Group', 'Enterprises',
  // Non-profit
  'Foundation', 'Institute', 'Association', 'Society', 'Organization',
  'Trust', 'Council', 'Committee', 'Board',
  // Education
  'University', 'College', 'School', 'Academy', 'Institute of Technology',
  // Government
  'Department', 'Ministry', 'Agency', 'Bureau', 'Commission',
  // Other
  'Partners', 'Ventures', 'Capital', 'Holdings', 'Industries',
] as const;

/**
 * Product/technology keywords
 */
const PRODUCT_KEYWORDS = [
  // Tech products
  'App', 'Software', 'Platform', 'Service', 'Tool', 'System', 'API',
  'Framework', 'Library', 'Engine', 'Browser', 'OS', 'Operating System',
  // Consumer products
  'Phone', 'Laptop', 'Computer', 'Device', 'Gadget', 'Watch', 'Tablet',
  'Camera', 'Console', 'Player', 'Speaker', 'Headphones',
  // Services
  'Suite', 'Pro', 'Premium', 'Enterprise', 'Cloud', 'Online', 'Plus',
  'Edition', 'Version', 'Release',
] as const;

/**
 * Known brand names (top 500 tech companies/products)
 */
const BRAND_DICTIONARY = new Set([
  // Tech giants
  'Apple', 'Google', 'Microsoft', 'Amazon', 'Meta', 'Facebook', 'Tesla',
  'Netflix', 'Twitter', 'X', 'LinkedIn', 'Instagram', 'WhatsApp', 'TikTok',
  'Snapchat', 'Pinterest', 'Reddit', 'Discord', 'Slack', 'Zoom', 'Salesforce',
  // AI companies
  'OpenAI', 'Anthropic', 'DeepMind', 'Cohere', 'Hugging Face', 'Stability AI',
  'Midjourney', 'Runway', 'Character AI', 'Perplexity', 'Replicate',
  // Cloud/Infrastructure
  'AWS', 'Azure', 'GCP', 'Oracle', 'IBM', 'SAP', 'VMware', 'Cloudflare',
  'DigitalOcean', 'Linode', 'Heroku', 'Vercel', 'Netlify', 'Supabase',
  // Developer tools
  'GitHub', 'GitLab', 'Bitbucket', 'Docker', 'Kubernetes', 'Jenkins',
  'CircleCI', 'Travis CI', 'Terraform', 'Ansible', 'Datadog', 'New Relic',
  // Databases
  'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Elasticsearch', 'Cassandra',
  'DynamoDB', 'Firebase', 'CouchDB', 'Neo4j', 'InfluxDB', 'TimescaleDB',
  // Frameworks/Languages
  'React', 'Angular', 'Vue', 'Next', 'Nuxt', 'Svelte', 'Django', 'Flask',
  'FastAPI', 'Express', 'Spring', 'Laravel', 'Rails', 'Phoenix',
  // Payment/Finance
  'Stripe', 'PayPal', 'Square', 'Coinbase', 'Binance', 'Kraken', 'Robinhood',
  // E-commerce
  'Shopify', 'WooCommerce', 'Magento', 'BigCommerce', 'Etsy', 'eBay',
  // Communication
  'Twilio', 'SendGrid', 'Mailchimp', 'Intercom', 'Zendesk', 'HubSpot',
  // Productivity
  'Notion', 'Asana', 'Trello', 'Jira', 'Confluence', 'Monday', 'ClickUp',
  // Design
  'Figma', 'Sketch', 'Adobe', 'Canva', 'InVision', 'Framer', 'Miro',
  // Security
  'Okta', 'Auth0', 'OneLogin', 'Duo', 'CrowdStrike', 'Palo Alto Networks',
  // Analytics
  'Google Analytics', 'Mixpanel', 'Amplitude', 'Segment', 'Heap', 'Hotjar',
  // CMS
  'WordPress', 'Contentful', 'Sanity', 'Strapi', 'Ghost', 'Drupal',
  // AI/ML
  'TensorFlow', 'PyTorch', 'Keras', 'Scikit-learn', 'XGBoost', 'LightGBM',
]);

/**
 * Concept keywords (abstract topics)
 */
const CONCEPT_KEYWORDS = [
  // Tech concepts
  'Artificial Intelligence', 'Machine Learning', 'Deep Learning', 'Neural Networks',
  'Natural Language Processing', 'Computer Vision', 'Reinforcement Learning',
  'Blockchain', 'Cryptocurrency', 'Decentralization', 'Web3', 'Metaverse',
  'Cloud Computing', 'Edge Computing', 'Quantum Computing', 'IoT', 'Big Data',
  'Cybersecurity', 'DevOps', 'CI/CD', 'Microservices', 'Serverless',
  // Business concepts
  'Digital Transformation', 'Agile', 'Lean', 'Six Sigma', 'Scrum', 'Kanban',
  'Customer Experience', 'User Experience', 'Product Management', 'Growth Hacking',
  'SEO', 'SEM', 'Content Marketing', 'Social Media Marketing', 'Email Marketing',
  // General concepts
  'Innovation', 'Sustainability', 'Scalability', 'Performance', 'Optimization',
  'Automation', 'Integration', 'Collaboration', 'Communication', 'Leadership',
] as const;

// =====================================================
// REGEX PATTERNS
// =====================================================

/**
 * Person name patterns
 */
const PERSON_PATTERNS: Array<{ pattern: RegExp; description: string; confidence: number }> = [
  {
    pattern: new RegExp(`(${PERSON_TITLES.join('|')})\\.?\\s+([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*)`, 'g'),
    description: 'Title + Name',
    confidence: 0.95,
  },
  {
    pattern: /\b([A-Z][a-z]+\s+){1,2}([A-Z][a-z]+)\b/g,
    description: 'Capitalized full name (2-3 words)',
    confidence: 0.70,
  },
  {
    pattern: /\b([A-Z][a-z]+)\s+(von|van|de|del|della|di|da|des)\s+([A-Z][a-z]+)\b/g,
    description: 'Name with noble particle',
    confidence: 0.85,
  },
  {
    pattern: /\b([A-Z]\.?\s*){2,}([A-Z][a-z]+)\b/g,
    description: 'Initials + Last name',
    confidence: 0.80,
  },
];

/**
 * Organization name patterns
 */
const ORGANIZATION_PATTERNS: Array<{ pattern: RegExp; description: string; confidence: number }> = [
  {
    pattern: new RegExp(`\\b([A-Z][a-zA-Z0-9&\\s]+?)\\s+(${ORGANIZATION_SUFFIXES.join('|')})\\b`, 'g'),
    description: 'Name + Legal suffix',
    confidence: 0.95,
  },
  {
    pattern: /\b([A-Z][A-Z]+)\b/g,
    description: 'All-caps acronym (3+ letters)',
    confidence: 0.60,
  },
  {
    pattern: /\b(The\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\s+(University|College|Institute|School)\b/g,
    description: 'Educational institution',
    confidence: 0.90,
  },
  {
    pattern: /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\s+(Department|Ministry|Agency|Bureau)\b/g,
    description: 'Government organization',
    confidence: 0.85,
  },
];

/**
 * Product name patterns
 */
const PRODUCT_PATTERNS: Array<{ pattern: RegExp; description: string; confidence: number }> = [
  {
    pattern: new RegExp(`\\b([A-Z][a-zA-Z0-9]+)\\s+(${PRODUCT_KEYWORDS.join('|')})\\b`, 'g'),
    description: 'Brand + Product keyword',
    confidence: 0.85,
  },
  {
    pattern: /\b([A-Z][a-z]+)\s+(\d+(\.\d+)?|[XIV]+|Pro|Plus|Max|Mini|Ultra|Air|Lite)\b/g,
    description: 'Product + Version/Modifier',
    confidence: 0.80,
  },
  {
    pattern: /\biOS|macOS|Windows|Linux|Android\s+\d+/g,
    description: 'Operating system version',
    confidence: 0.95,
  },
];

// =====================================================
// ENTITY EXTRACTION LOGIC
// =====================================================

/**
 * Extract Person entities
 */
function extractPersons(text: string): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];
  const seen = new Set<string>();

  for (const { pattern, description, confidence } of PERSON_PATTERNS) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const entityText = match[0].trim();
      
      // Skip if already extracted
      if (seen.has(entityText.toLowerCase())) continue;
      seen.add(entityText.toLowerCase());

      // Skip common false positives
      if (BRAND_DICTIONARY.has(entityText)) continue;
      if (entityText.split(/\s+/).length > 4) continue; // Too long for a name

      const capitalizedWords = (entityText.match(/\b[A-Z][a-z]+/g) || []).length;
      const hasTitle = PERSON_TITLES.some(title => 
        entityText.toLowerCase().includes(title.toLowerCase())
      );

      entities.push({
        text: entityText,
        type: 'Person',
        confidence: confidence * (hasTitle ? 1.0 : 0.9),
        startIndex: match.index,
        endIndex: match.index + entityText.length,
        context: text.substring(
          Math.max(0, match.index - 30),
          Math.min(text.length, match.index + entityText.length + 30)
        ),
        metadata: {
          matchedPattern: description,
          dictionaryMatch: false,
          capitalizedWords,
          hasTitle,
          hasSuffix: false,
        },
      });
    }
  }

  return entities;
}

/**
 * Extract Organization entities
 */
function extractOrganizations(text: string): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];
  const seen = new Set<string>();

  for (const { pattern, description, confidence } of ORGANIZATION_PATTERNS) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const entityText = match[0].trim();
      
      if (seen.has(entityText.toLowerCase())) continue;
      seen.add(entityText.toLowerCase());

      const hasSuffix = ORGANIZATION_SUFFIXES.some(suffix =>
        entityText.toLowerCase().includes(suffix.toLowerCase())
      );

      const capitalizedWords = (entityText.match(/\b[A-Z]/g) || []).length;

      entities.push({
        text: entityText,
        type: 'Organization',
        confidence: confidence * (hasSuffix ? 1.0 : 0.85),
        startIndex: match.index,
        endIndex: match.index + entityText.length,
        context: text.substring(
          Math.max(0, match.index - 30),
          Math.min(text.length, match.index + entityText.length + 30)
        ),
        metadata: {
          matchedPattern: description,
          dictionaryMatch: BRAND_DICTIONARY.has(entityText),
          capitalizedWords,
          hasTitle: false,
          hasSuffix,
        },
      });
    }
  }

  // Dictionary-based extraction for known brands
  for (const brand of BRAND_DICTIONARY) {
    const regex = new RegExp(`\\b${brand}\\b`, 'gi');
    let match;
    while ((match = regex.exec(text)) !== null) {
      const entityText = match[0];
      if (seen.has(entityText.toLowerCase())) continue;
      seen.add(entityText.toLowerCase());

      entities.push({
        text: entityText,
        type: 'Organization',
        confidence: 0.90,
        startIndex: match.index,
        endIndex: match.index + entityText.length,
        context: text.substring(
          Math.max(0, match.index - 30),
          Math.min(text.length, match.index + entityText.length + 30)
        ),
        metadata: {
          matchedPattern: 'Brand dictionary',
          dictionaryMatch: true,
          capitalizedWords: 1,
          hasTitle: false,
          hasSuffix: false,
        },
      });
    }
  }

  return entities;
}

/**
 * Extract Product entities
 */
function extractProducts(text: string): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];
  const seen = new Set<string>();

  for (const { pattern, description, confidence } of PRODUCT_PATTERNS) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const entityText = match[0].trim();
      
      if (seen.has(entityText.toLowerCase())) continue;
      seen.add(entityText.toLowerCase());

      entities.push({
        text: entityText,
        type: 'Product',
        confidence,
        startIndex: match.index,
        endIndex: match.index + entityText.length,
        context: text.substring(
          Math.max(0, match.index - 30),
          Math.min(text.length, match.index + entityText.length + 30)
        ),
        metadata: {
          matchedPattern: description,
          dictionaryMatch: false,
          capitalizedWords: (entityText.match(/\b[A-Z]/g) || []).length,
          hasTitle: false,
          hasSuffix: false,
        },
      });
    }
  }

  return entities;
}

/**
 * Extract Concept entities
 */
function extractConcepts(text: string): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];
  const seen = new Set<string>();

  for (const concept of CONCEPT_KEYWORDS) {
    const regex = new RegExp(`\\b${concept}\\b`, 'gi');
    let match;
    while ((match = regex.exec(text)) !== null) {
      const entityText = match[0];
      if (seen.has(entityText.toLowerCase())) continue;
      seen.add(entityText.toLowerCase());

      entities.push({
        text: entityText,
        type: 'Concept',
        confidence: 0.85,
        startIndex: match.index,
        endIndex: match.index + entityText.length,
        context: text.substring(
          Math.max(0, match.index - 30),
          Math.min(text.length, match.index + entityText.length + 30)
        ),
        metadata: {
          matchedPattern: 'Concept dictionary',
          dictionaryMatch: true,
          capitalizedWords: (entityText.match(/\b[A-Z]/g) || []).length,
          hasTitle: false,
          hasSuffix: false,
        },
      });
    }
  }

  return entities;
}

/**
 * Remove overlapping entities (keep highest confidence)
 */
function deduplicateEntities(entities: ExtractedEntity[]): ExtractedEntity[] {
  // Sort by confidence descending
  const sorted = [...entities].sort((a, b) => b.confidence - a.confidence);
  const result: ExtractedEntity[] = [];
  
  for (const entity of sorted) {
    // Check if overlaps with any already selected entity
    const overlaps = result.some(existing => {
      const overlap = Math.max(
        0,
        Math.min(entity.endIndex, existing.endIndex) - 
        Math.max(entity.startIndex, existing.startIndex)
      );
      const minLength = Math.min(
        entity.endIndex - entity.startIndex,
        existing.endIndex - existing.startIndex
      );
      return overlap / minLength > 0.5; // 50% overlap threshold
    });

    if (!overlaps) {
      result.push(entity);
    }
  }

  // Sort by position in text
  return result.sort((a, b) => a.startIndex - b.startIndex);
}

// =====================================================
// PUBLIC API
// =====================================================

/**
 * Extract all named entities from text
 */
export function extractEntities(text: string): EntityExtractionResult {
  if (!text || text.trim().length === 0) {
    return {
      entities: [],
      totalCount: 0,
      byType: {
        Person: 0,
        Organization: 0,
        Product: 0,
        Concept: 0,
      },
      processingTimeMs: 0,
    };
  }

  const startTime = performance.now();

  // Extract each entity type
  const persons = extractPersons(text);
  const organizations = extractOrganizations(text);
  const products = extractProducts(text);
  const concepts = extractConcepts(text);

  // Combine and deduplicate
  const allEntities = [
    ...persons,
    ...organizations,
    ...products,
    ...concepts,
  ];

  const deduplicated = deduplicateEntities(allEntities);

  // Count by type
  const byType = {
    Person: deduplicated.filter(e => e.type === 'Person').length,
    Organization: deduplicated.filter(e => e.type === 'Organization').length,
    Product: deduplicated.filter(e => e.type === 'Product').length,
    Concept: deduplicated.filter(e => e.type === 'Concept').length,
  };

  const processingTimeMs = performance.now() - startTime;

  return {
    entities: deduplicated,
    totalCount: deduplicated.length,
    byType,
    processingTimeMs,
  };
}

/**
 * Extract entities of specific type only
 */
export function extractEntitiesByType(
  text: string,
  entityType: EntityType
): ExtractedEntity[] {
  const extractors: Record<EntityType, (text: string) => ExtractedEntity[]> = {
    Person: extractPersons,
    Organization: extractOrganizations,
    Product: extractProducts,
    Concept: extractConcepts,
  };

  return extractors[entityType](text);
}

/**
 * Filter entities by confidence threshold
 */
export function filterByConfidence(
  entities: ExtractedEntity[],
  minConfidence: number = 0.7
): ExtractedEntity[] {
  return entities.filter(entity => entity.confidence >= minConfidence);
}

/**
 * Get unique entity texts (case-insensitive)
 */
export function getUniqueEntityTexts(entities: ExtractedEntity[]): string[] {
  const seen = new Set<string>();
  return entities
    .filter(entity => {
      const lower = entity.text.toLowerCase();
      if (seen.has(lower)) return false;
      seen.add(lower);
      return true;
    })
    .map(entity => entity.text);
}

// =====================================================
// EXPORTS
// =====================================================

export const EntityExtractor = {
  extract: extractEntities,
  extractByType: extractEntitiesByType,
  filterByConfidence,
  getUniqueTexts: getUniqueEntityTexts,
  PERSON_TITLES,
  ORGANIZATION_SUFFIXES,
  BRAND_DICTIONARY,
};

export default EntityExtractor;
