/**
 * GEO Audit Engine
 * Client-side website analysis for Generative Engine Optimization
 */

export interface AuditResult {
  url: string;
  timestamp: string;
  overallScore: number;
  scores: {
    schemaMarkup: number;
    metaTags: number;
    aiCrawlers: number;
    eeat: number;
    structure: number;
    performance: number;
  };
  details: {
    schemaMarkup: SchemaAuditDetails;
    metaTags: MetaTagsDetails;
    aiCrawlers: AICrawlersDetails;
    eeat: EEATDetails;
    structure: StructureDetails;
    performance: PerformanceDetails;
  };
  recommendations: Recommendation[];
}

export interface SchemaAuditDetails {
  hasOrganizationSchema: boolean;
  hasPersonSchema: boolean;
  hasArticleSchema: boolean;
  hasBreadcrumbSchema: boolean;
  hasFAQSchema: boolean;
  hasWebSiteSchema: boolean;
  totalSchemas: number;
  issues: string[];
  strengths: string[];
}

export interface MetaTagsDetails {
  hasTitle: boolean;
  hasDescription: boolean;
  hasOGTags: boolean;
  hasTwitterCard: boolean;
  hasCanonical: boolean;
  titleLength: number;
  descriptionLength: number;
  issues: string[];
  strengths: string[];
}

export interface AICrawlersDetails {
  robotsTxtFound: boolean;
  allowsGPTBot: boolean;
  allowsClaude: boolean;
  allowsPerplexity: boolean;
  allowsGoogleExtended: boolean;
  totalAICrawlers: number;
  issues: string[];
  strengths: string[];
}

export interface EEATDetails {
  hasAuthorInfo: boolean;
  hasCredentials: boolean;
  hasAboutPage: boolean;
  hasContactInfo: boolean;
  issues: string[];
  strengths: string[];
}

export interface StructureDetails {
  hasH1: boolean;
  h1Count: number;
  hasSemanticHTML: boolean;
  headingHierarchy: boolean;
  issues: string[];
  strengths: string[];
}

export interface PerformanceDetails {
  htmlSize: number;
  externalScripts: number;
  externalStyles: number;
  images: number;
  issues: string[];
  strengths: string[];
}

export interface Recommendation {
  category: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
}

/**
 * Main audit function - analyzes a URL for GEO optimization
 */
export async function auditWebsite(url: string): Promise<AuditResult> {
  // Normalize URL
  const normalizedUrl = normalizeUrl(url);
  
  // Fetch HTML content via CORS proxy or direct fetch
  let htmlContent: string;
  try {
    htmlContent = await fetchHTML(normalizedUrl);
  } catch (error) {
    throw new Error('Failed to fetch website. Please check the URL and try again.');
  }

  // Parse HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');

  // Run all audits
  const schemaMarkup = auditSchemaMarkup(doc);
  const metaTags = auditMetaTags(doc);
  const structure = auditStructure(doc);
  const performance = auditPerformance(htmlContent, doc);
  const eeat = auditEEAT(doc);
  
  // Try to fetch robots.txt
  const aiCrawlers = await auditAICrawlers(normalizedUrl);

  // Calculate scores (0-100)
  const scores = {
    schemaMarkup: calculateSchemaScore(schemaMarkup),
    metaTags: calculateMetaScore(metaTags),
    aiCrawlers: calculateAICrawlersScore(aiCrawlers),
    eeat: calculateEEATScore(eeat),
    structure: calculateStructureScore(structure),
    performance: calculatePerformanceScore(performance),
  };

  // Overall score (weighted average)
  const overallScore = Math.round(
    scores.schemaMarkup * 0.25 +
    scores.metaTags * 0.15 +
    scores.aiCrawlers * 0.20 +
    scores.eeat * 0.20 +
    scores.structure * 0.10 +
    scores.performance * 0.10
  );

  // Generate recommendations
  const recommendations = generateRecommendations({
    schemaMarkup,
    metaTags,
    aiCrawlers,
    eeat,
    structure,
    performance,
  });

  return {
    url: normalizedUrl,
    timestamp: new Date().toISOString(),
    overallScore,
    scores,
    details: {
      schemaMarkup,
      metaTags,
      aiCrawlers,
      eeat,
      structure,
      performance,
    },
    recommendations,
  };
}

/**
 * Normalize URL to ensure proper format
 */
function normalizeUrl(url: string): string {
  let normalized = url.trim();
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized;
  }
  return normalized;
}

/**
 * Fetch HTML content (with CORS handling)
 */
async function fetchHTML(url: string): Promise<string> {
  // Try direct fetch first (will work if target allows CORS)
  try {
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
    });
    if (response.ok) {
      return await response.text();
    }
  } catch {
    // CORS error expected - use proxy fallback
  }

  // Fallback: Use allorigins.win as CORS proxy
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
  const response = await fetch(proxyUrl);
  if (!response.ok) {
    throw new Error('Failed to fetch via proxy');
  }
  const data = await response.json();
  return data.contents;
}

/**
 * Audit Schema.org markup
 */
function auditSchemaMarkup(doc: Document): SchemaAuditDetails {
  const scripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
  const schemas = scripts.map(script => {
    try {
      return JSON.parse(script.textContent || '{}');
    } catch {
      return null;
    }
  }).filter(Boolean);

  const hasOrganizationSchema = schemas.some(s => s['@type'] === 'Organization' || (Array.isArray(s['@type']) && s['@type'].includes('Organization')));
  const hasPersonSchema = schemas.some(s => s['@type'] === 'Person');
  const hasArticleSchema = schemas.some(s => s['@type'] === 'Article' || s['@type'] === 'BlogPosting');
  const hasBreadcrumbSchema = schemas.some(s => s['@type'] === 'BreadcrumbList');
  const hasFAQSchema = schemas.some(s => s['@type'] === 'FAQPage');
  const hasWebSiteSchema = schemas.some(s => s['@type'] === 'WebSite');

  const issues: string[] = [];
  const strengths: string[] = [];

  if (!hasOrganizationSchema) issues.push('Missing Organization schema');
  else strengths.push('Organization schema present');
  
  if (!hasWebSiteSchema) issues.push('Missing WebSite schema');
  else strengths.push('WebSite schema present');

  if (hasArticleSchema) strengths.push('Article/BlogPosting schema found');
  if (hasBreadcrumbSchema) strengths.push('BreadcrumbList schema found');
  if (hasFAQSchema) strengths.push('FAQPage schema found');
  if (hasPersonSchema) strengths.push('Person schema found (E-E-A-T signal)');

  return {
    hasOrganizationSchema,
    hasPersonSchema,
    hasArticleSchema,
    hasBreadcrumbSchema,
    hasFAQSchema,
    hasWebSiteSchema,
    totalSchemas: schemas.length,
    issues,
    strengths,
  };
}

/**
 * Audit meta tags
 */
function auditMetaTags(doc: Document): MetaTagsDetails {
  const title = doc.querySelector('title');
  const description = doc.querySelector('meta[name="description"]');
  const ogTitle = doc.querySelector('meta[property="og:title"]');
  const ogDescription = doc.querySelector('meta[property="og:description"]');
  const twitterCard = doc.querySelector('meta[name="twitter:card"]');
  const canonical = doc.querySelector('link[rel="canonical"]');

  const hasTitle = !!title && title.textContent!!.trim().length > 0;
  const hasDescription = !!description && description.getAttribute('content')!!.length > 0;
  const hasOGTags = !!ogTitle && !!ogDescription;
  const hasTwitterCard = !!twitterCard;
  const hasCanonical = !!canonical;

  const titleLength = title?.textContent?.trim().length || 0;
  const descriptionLength = description?.getAttribute('content')?.length || 0;

  const issues: string[] = [];
  const strengths: string[] = [];

  if (!hasTitle) issues.push('Missing title tag');
  else if (titleLength < 30 || titleLength > 60) issues.push(`Title length (${titleLength}) should be 30-60 characters`);
  else strengths.push('Title tag optimized');

  if (!hasDescription) issues.push('Missing meta description');
  else if (descriptionLength < 120 || descriptionLength > 160) issues.push(`Description length (${descriptionLength}) should be 120-160 characters`);
  else strengths.push('Meta description optimized');

  if (!hasOGTags) issues.push('Missing Open Graph tags');
  else strengths.push('Open Graph tags present');

  if (!hasTwitterCard) issues.push('Missing Twitter Card tags');
  else strengths.push('Twitter Card present');

  if (!hasCanonical) issues.push('Missing canonical URL');
  else strengths.push('Canonical URL present');

  return {
    hasTitle,
    hasDescription,
    hasOGTags,
    hasTwitterCard,
    hasCanonical,
    titleLength,
    descriptionLength,
    issues,
    strengths,
  };
}

/**
 * Audit AI crawler support via robots.txt
 */
async function auditAICrawlers(baseUrl: string): Promise<AICrawlersDetails> {
  const robotsUrl = new URL('/robots.txt', baseUrl).href;
  
  let robotsTxt = '';
  try {
    const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(robotsUrl)}`);
    if (response.ok) {
      const data = await response.json();
      robotsTxt = data.contents.toLowerCase();
    }
  } catch {
    // robots.txt not accessible
  }

  const robotsTxtFound = robotsTxt.length > 0;
  const allowsGPTBot = robotsTxt.includes('gptbot') && !robotsTxt.includes('user-agent: gptbot\ndisallow');
  const allowsClaude = robotsTxt.includes('claude') && !robotsTxt.includes('user-agent: claude-web\ndisallow');
  const allowsPerplexity = robotsTxt.includes('perplexity') && !robotsTxt.includes('user-agent: perplexitybot\ndisallow');
  const allowsGoogleExtended = robotsTxt.includes('google-extended') && !robotsTxt.includes('user-agent: google-extended\ndisallow');

  let totalAICrawlers = 0;
  const aiCrawlers = ['gptbot', 'claude', 'perplexity', 'google-extended', 'anthropic', 'cohere', 'ccbot'];
  aiCrawlers.forEach(crawler => {
    if (robotsTxt.includes(crawler)) totalAICrawlers++;
  });

  const issues: string[] = [];
  const strengths: string[] = [];

  if (!robotsTxtFound) {
    issues.push('robots.txt not found');
  } else {
    strengths.push('robots.txt present');
  }

  if (!allowsGPTBot) issues.push('GPTBot (ChatGPT) not explicitly allowed');
  else strengths.push('GPTBot (ChatGPT) allowed');

  if (!allowsClaude) issues.push('Claude crawler not explicitly allowed');
  else strengths.push('Claude crawler allowed');

  if (!allowsPerplexity) issues.push('Perplexity crawler not explicitly allowed');
  else strengths.push('Perplexity crawler allowed');

  if (totalAICrawlers < 3) issues.push('Limited AI crawler support');
  else if (totalAICrawlers >= 5) strengths.push('Comprehensive AI crawler support');

  return {
    robotsTxtFound,
    allowsGPTBot,
    allowsClaude,
    allowsPerplexity,
    allowsGoogleExtended,
    totalAICrawlers,
    issues,
    strengths,
  };
}

/**
 * Audit E-E-A-T signals
 */
function auditEEAT(doc: Document): EEATDetails {
  const hasAuthorInfo = !!doc.querySelector('[rel="author"], [itemprop="author"], .author, .by-author');
  const hasAboutPage = !!doc.querySelector('a[href*="about"], a[href*="About"]');
  const hasContactInfo = !!doc.querySelector('a[href*="contact"], [itemprop="email"], [itemprop="telephone"]');
  
  // Check for credentials in schema
  const scripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
  const hasCredentials = scripts.some(script => {
    try {
      const schema = JSON.parse(script.textContent || '{}');
      return schema.hasCredential || schema.expertise || schema.knowsAbout;
    } catch {
      return false;
    }
  });

  const issues: string[] = [];
  const strengths: string[] = [];

  if (!hasAuthorInfo) issues.push('No author information found');
  else strengths.push('Author attribution present');

  if (!hasCredentials) issues.push('No credentials or expertise signals in schema');
  else strengths.push('Credentials/expertise in structured data');

  if (!hasAboutPage) issues.push('No About page link found');
  else strengths.push('About page present');

  if (!hasContactInfo) issues.push('No contact information found');
  else strengths.push('Contact information available');

  return {
    hasAuthorInfo,
    hasCredentials,
    hasAboutPage,
    hasContactInfo,
    issues,
    strengths,
  };
}

/**
 * Audit HTML structure
 */
function auditStructure(doc: Document): StructureDetails {
  const h1 = doc.querySelectorAll('h1');
  const hasH1 = h1.length > 0;
  const h1Count = h1.length;

  const semanticTags = ['header', 'nav', 'main', 'article', 'section', 'aside', 'footer'];
  const hasSemanticHTML = semanticTags.some(tag => doc.querySelector(tag));

  // Check heading hierarchy
  const headings = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6'));
  const headingLevels = headings.map(h => parseInt(h.tagName.substring(1)));
  const headingHierarchy = headingLevels.length === 0 || checkHeadingHierarchy(headingLevels);

  const issues: string[] = [];
  const strengths: string[] = [];

  if (!hasH1) issues.push('No H1 heading found');
  else if (h1Count > 1) issues.push(`Multiple H1 tags (${h1Count}) - should have only one`);
  else strengths.push('Single H1 heading present');

  if (!hasSemanticHTML) issues.push('Limited semantic HTML5 tags');
  else strengths.push('Semantic HTML5 structure');

  if (!headingHierarchy) issues.push('Heading hierarchy not properly structured');
  else if (headings.length > 0) strengths.push('Proper heading hierarchy');

  return {
    hasH1,
    h1Count,
    hasSemanticHTML,
    headingHierarchy,
    issues,
    strengths,
  };
}

/**
 * Check if heading hierarchy is proper
 */
function checkHeadingHierarchy(levels: number[]): boolean {
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] > levels[i - 1] + 1) {
      return false; // Skipped a level
    }
  }
  return true;
}

/**
 * Audit performance indicators
 */
function auditPerformance(html: string, doc: Document): PerformanceDetails {
  const htmlSize = new Blob([html]).size;
  const externalScripts = doc.querySelectorAll('script[src]').length;
  const externalStyles = doc.querySelectorAll('link[rel="stylesheet"]').length;
  const images = doc.querySelectorAll('img').length;

  const issues: string[] = [];
  const strengths: string[] = [];

  if (htmlSize > 500000) issues.push(`Large HTML size (${Math.round(htmlSize / 1024)}KB) - consider optimization`);
  else if (htmlSize < 100000) strengths.push('Optimized HTML size');

  if (externalScripts > 10) issues.push(`Many external scripts (${externalScripts}) - consider bundling`);
  else if (externalScripts < 5) strengths.push('Minimal external scripts');

  if (externalStyles > 5) issues.push(`Multiple external stylesheets (${externalStyles})`);
  else strengths.push('Optimized stylesheet loading');

  return {
    htmlSize,
    externalScripts,
    externalStyles,
    images,
    issues,
    strengths,
  };
}

/**
 * Calculate individual scores
 */
function calculateSchemaScore(details: SchemaAuditDetails): number {
  let score = 0;
  if (details.hasOrganizationSchema) score += 25;
  if (details.hasWebSiteSchema) score += 25;
  if (details.hasPersonSchema) score += 15;
  if (details.hasArticleSchema) score += 15;
  if (details.hasBreadcrumbSchema) score += 10;
  if (details.hasFAQSchema) score += 10;
  return Math.min(100, score);
}

function calculateMetaScore(details: MetaTagsDetails): number {
  let score = 0;
  if (details.hasTitle) score += 30;
  if (details.hasDescription) score += 30;
  if (details.hasOGTags) score += 20;
  if (details.hasTwitterCard) score += 10;
  if (details.hasCanonical) score += 10;
  return score;
}

function calculateAICrawlersScore(details: AICrawlersDetails): number {
  let score = 0;
  if (details.robotsTxtFound) score += 20;
  if (details.allowsGPTBot) score += 20;
  if (details.allowsClaude) score += 20;
  if (details.allowsPerplexity) score += 20;
  if (details.allowsGoogleExtended) score += 20;
  return score;
}

function calculateEEATScore(details: EEATDetails): number {
  let score = 0;
  if (details.hasAuthorInfo) score += 30;
  if (details.hasCredentials) score += 30;
  if (details.hasAboutPage) score += 20;
  if (details.hasContactInfo) score += 20;
  return score;
}

function calculateStructureScore(details: StructureDetails): number {
  let score = 0;
  if (details.hasH1 && details.h1Count === 1) score += 40;
  else if (details.hasH1) score += 20;
  if (details.hasSemanticHTML) score += 30;
  if (details.headingHierarchy) score += 30;
  return score;
}

function calculatePerformanceScore(details: PerformanceDetails): number {
  let score = 100;
  if (details.htmlSize > 500000) score -= 30;
  else if (details.htmlSize > 200000) score -= 15;
  if (details.externalScripts > 10) score -= 20;
  else if (details.externalScripts > 5) score -= 10;
  if (details.externalStyles > 5) score -= 10;
  return Math.max(0, score);
}

/**
 * Generate actionable recommendations
 */
function generateRecommendations(details: {
  schemaMarkup: SchemaAuditDetails;
  metaTags: MetaTagsDetails;
  aiCrawlers: AICrawlersDetails;
  eeat: EEATDetails;
  structure: StructureDetails;
  performance: PerformanceDetails;
}): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Schema recommendations
  if (!details.schemaMarkup.hasOrganizationSchema) {
    recommendations.push({
      category: 'Schema Markup',
      priority: 'high',
      title: 'Add Organization Schema',
      description: 'Implement Schema.org Organization markup to help AI systems understand your brand identity.',
      impact: 'AI systems will better recognize and cite your organization as an authoritative source.',
    });
  }

  if (!details.schemaMarkup.hasPersonSchema && details.eeat.hasAuthorInfo) {
    recommendations.push({
      category: 'E-E-A-T',
      priority: 'high',
      title: 'Add Person Schema for Authors',
      description: 'Add Person schema with credentials, expertise, and affiliation for all content authors.',
      impact: 'Increases E-E-A-T signals and author authority in AI citations.',
    });
  }

  // AI Crawler recommendations
  if (!details.aiCrawlers.allowsGPTBot) {
    recommendations.push({
      category: 'AI Crawlers',
      priority: 'high',
      title: 'Allow GPTBot in robots.txt',
      description: 'Explicitly allow GPTBot (ChatGPT crawler) to index your content.',
      impact: 'Enables ChatGPT to include your content in its knowledge base and cite your brand.',
    });
  }

  if (!details.aiCrawlers.allowsClaude) {
    recommendations.push({
      category: 'AI Crawlers',
      priority: 'high',
      title: 'Allow Claude Crawler',
      description: 'Add Claude-Web crawler to your robots.txt allow list.',
      impact: 'Enables Anthropic\'s Claude to access and cite your content.',
    });
  }

  // Meta tag recommendations
  if (!details.metaTags.hasOGTags) {
    recommendations.push({
      category: 'Meta Tags',
      priority: 'medium',
      title: 'Add Open Graph Tags',
      description: 'Implement og:title, og:description, og:image for better social sharing.',
      impact: 'Improves content visibility when shared on social platforms and messaging apps.',
    });
  }

  // E-E-A-T recommendations
  if (!details.eeat.hasCredentials) {
    recommendations.push({
      category: 'E-E-A-T',
      priority: 'high',
      title: 'Add Credentials to Schema',
      description: 'Include hasCredential, expertise, and knowsAbout properties in Person/Organization schema.',
      impact: 'Strengthens E-E-A-T signals, increasing trust and authority for AI systems.',
    });
  }

  // Structure recommendations
  if (!details.structure.hasH1 || details.structure.h1Count > 1) {
    recommendations.push({
      category: 'HTML Structure',
      priority: 'medium',
      title: 'Fix H1 Heading Structure',
      description: 'Ensure each page has exactly one H1 tag that clearly describes the main topic.',
      impact: 'Improves content hierarchy understanding for both AI systems and search engines.',
    });
  }

  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}
