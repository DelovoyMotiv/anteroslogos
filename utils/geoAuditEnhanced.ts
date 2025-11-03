/**
 * Enhanced GEO Audit Engine - AAA Level
 * Advanced website analysis for Generative Engine Optimization
 */

// ==================== INTERFACES ====================

export interface AuditResult {
  url: string;
  timestamp: string;
  overallScore: number;
  grade: 'Authority' | 'Expert' | 'Advanced' | 'Intermediate' | 'Beginner';
  scores: {
    schemaMarkup: number;
    metaTags: number;
    aiCrawlers: number;
    eeat: number;
    structure: number;
    performance: number;
    contentQuality: number;
    citationPotential: number;
  };
  details: {
    schemaMarkup: EnhancedSchemaDetails;
    metaTags: MetaTagsDetails;
    aiCrawlers: AICrawlersDetails;
    eeat: EnhancedEEATDetails;
    structure: StructureDetails;
    performance: PerformanceDetails;
    contentQuality: ContentQualityDetails;
    citationPotential: CitationPotentialDetails;
  };
  recommendations: EnhancedRecommendation[];
  insights: string[];
}

export interface EnhancedSchemaDetails {
  totalSchemas: number;
  validSchemas: number;
  schemas: {
    Organization: boolean;
    Person: boolean;
    Article: boolean;
    BlogPosting: boolean;
    WebSite: boolean;
    BreadcrumbList: boolean;
    FAQPage: boolean;
    Product: boolean;
    Review: boolean;
    AggregateRating: boolean;
    HowTo: boolean;
    VideoObject: boolean;
    ImageObject: boolean;
    LocalBusiness: boolean;
    Event: boolean;
    SoftwareApplication: boolean;
  };
  hasGraphStructure: boolean;
  missingCriticalSchemas: string[];
  schemaErrors: string[];
  issues: string[];
  strengths: string[];
}

export interface ContentQualityDetails {
  wordCount: number;
  readabilityScore: number;
  paragraphCount: number;
  averageParagraphLength: number;
  averageSentenceLength: number;
  hasLists: boolean;
  hasTables: boolean;
  imageCount: number;
  videoCount: number;
  internalLinks: number;
  externalLinks: number;
  linkRatio: number;
  contentDepth: 'shallow' | 'moderate' | 'deep';
  issues: string[];
  strengths: string[];
}

export interface CitationPotentialDetails {
  score: number;
  factualStatements: number;
  dataPoints: number;
  quotes: number;
  references: number;
  definitions: number;
  uniqueInsights: number;
  authorityIndicators: string[];
  issues: string[];
  strengths: string[];
}

export interface EnhancedEEATDetails {
  hasAuthorInfo: boolean;
  hasCredentials: boolean;
  hasAboutPage: boolean;
  hasContactInfo: boolean;
  hasPublicationDate: boolean;
  hasUpdateDate: boolean;
  contentFreshness: number;
  hasCitations: boolean;
  hasExpertQuotes: boolean;
  hasTrustBadges: boolean;
  hasPrivacyPolicy: boolean;
  hasTermsOfService: boolean;
  authorityScore: number;
  issues: string[];
  strengths: string[];
}

export interface EnhancedRecommendation {
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  effort: 'quick-win' | 'strategic' | 'long-term';
  title: string;
  description: string;
  impact: string;
  implementation: string;
  estimatedTime: string;
  codeExample?: string;
}

export interface MetaTagsDetails {
  hasTitle: boolean;
  hasDescription: boolean;
  hasOGTags: boolean;
  hasTwitterCard: boolean;
  hasCanonical: boolean;
  hasViewport: boolean;
  hasCharset: boolean;
  hasLang: boolean;
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
  allowsAnthropicAI: boolean;
  allowsCohere: boolean;
  allowsCCBot: boolean;
  totalAICrawlers: number;
  hasSitemap: boolean;
  issues: string[];
  strengths: string[];
}

export interface StructureDetails {
  hasH1: boolean;
  h1Count: number;
  hasSemanticHTML: boolean;
  headingHierarchy: boolean;
  headingCount: Record<string, number>;
  hasNav: boolean;
  hasMain: boolean;
  hasFooter: boolean;
  issues: string[];
  strengths: string[];
}

export interface PerformanceDetails {
  htmlSize: number;
  externalScripts: number;
  externalStyles: number;
  images: number;
  totalResources: number;
  hasLazyLoading: boolean;
  issues: string[];
  strengths: string[];
}

// ==================== MAIN AUDIT FUNCTION ====================

export async function auditWebsite(url: string): Promise<AuditResult> {
  const normalizedUrl = normalizeUrl(url);
  
  let htmlContent: string;
  try {
    htmlContent = await fetchHTML(normalizedUrl);
  } catch (error) {
    throw new Error('Failed to fetch website. Please check the URL and try again.');
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');

  // Run all audits
  const schemaMarkup = auditSchemaMarkup(doc);
  const metaTags = auditMetaTags(doc);
  const structure = auditStructure(doc);
  const performance = auditPerformance(htmlContent, doc);
  const eeat = auditEnhancedEEAT(doc, htmlContent);
  const contentQuality = auditContentQuality(doc, htmlContent);
  const citationPotential = auditCitationPotential(doc, htmlContent);
  const aiCrawlers = await auditAICrawlers(normalizedUrl);

  // Calculate scores
  const scores = {
    schemaMarkup: calculateSchemaScore(schemaMarkup),
    metaTags: calculateMetaScore(metaTags),
    aiCrawlers: calculateAICrawlersScore(aiCrawlers),
    eeat: calculateEnhancedEEATScore(eeat),
    structure: calculateStructureScore(structure),
    performance: calculatePerformanceScore(performance),
    contentQuality: calculateContentQualityScore(contentQuality),
    citationPotential: calculateCitationPotentialScore(citationPotential),
  };

  // Advanced weighted scoring with dynamic weights based on content type
  const overallScore = calculateOverallScore(scores, schemaMarkup);
  const grade = getGrade(overallScore);

  // Generate enhanced recommendations
  const recommendations = generateEnhancedRecommendations({
    schemaMarkup,
    metaTags,
    aiCrawlers,
    eeat,
    structure,
    performance,
    contentQuality,
    citationPotential,
  }, scores);

  // Generate insights
  const insights = generateInsights(scores, {
    schemaMarkup,
    contentQuality,
    citationPotential,
    eeat,
  });

  return {
    url: normalizedUrl,
    timestamp: new Date().toISOString(),
    overallScore,
    grade,
    scores,
    details: {
      schemaMarkup,
      metaTags,
      aiCrawlers,
      eeat,
      structure,
      performance,
      contentQuality,
      citationPotential,
    },
    recommendations,
    insights,
  };
}

// ==================== UTILITY FUNCTIONS ====================

function normalizeUrl(url: string): string {
  let normalized = url.trim();
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized;
  }
  return normalized;
}

async function fetchHTML(url: string): Promise<string> {
  // Try direct fetch first
  try {
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
    });
    if (response.ok) {
      const html = await response.text();
      if (html && html.length > 0) {
        return html;
      }
    }
  } catch (error) {
    // Expected CORS error - will use proxy
    console.log('Direct fetch failed, trying proxy:', error);
  }

  // Fallback to proxy
  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    
    if (!response.ok) {
      throw new Error(`Proxy returned status ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.contents || data.contents.length === 0) {
      throw new Error('Proxy returned empty content');
    }
    
    return data.contents;
  } catch (error) {
    console.error('Proxy fetch failed:', error);
    throw new Error(`Unable to fetch website. The site may be blocking automated access or the URL is incorrect.`);
  }
}

// ==================== ENHANCED AUDIT FUNCTIONS ====================

function auditSchemaMarkup(doc: Document): EnhancedSchemaDetails {
  const scripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
  const schemas = scripts.map(script => {
    try {
      return JSON.parse(script.textContent || '{}');
    } catch {
      return null;
    }
  }).filter(Boolean);

  const hasGraphStructure = schemas.some(s => s['@graph']);
  const allSchemas = hasGraphStructure 
    ? schemas.flatMap(s => s['@graph'] || [s])
    : schemas;

  const schemaTypes = {
    Organization: checkSchemaType(allSchemas, 'Organization'),
    Person: checkSchemaType(allSchemas, 'Person'),
    Article: checkSchemaType(allSchemas, ['Article', 'NewsArticle', 'ScholarlyArticle']),
    BlogPosting: checkSchemaType(allSchemas, 'BlogPosting'),
    WebSite: checkSchemaType(allSchemas, 'WebSite'),
    BreadcrumbList: checkSchemaType(allSchemas, 'BreadcrumbList'),
    FAQPage: checkSchemaType(allSchemas, 'FAQPage'),
    Product: checkSchemaType(allSchemas, 'Product'),
    Review: checkSchemaType(allSchemas, 'Review'),
    AggregateRating: checkSchemaType(allSchemas, 'AggregateRating'),
    HowTo: checkSchemaType(allSchemas, 'HowTo'),
    VideoObject: checkSchemaType(allSchemas, 'VideoObject'),
    ImageObject: checkSchemaType(allSchemas, 'ImageObject'),
    LocalBusiness: checkSchemaType(allSchemas, 'LocalBusiness'),
    Event: checkSchemaType(allSchemas, 'Event'),
    SoftwareApplication: checkSchemaType(allSchemas, 'SoftwareApplication'),
  };

  const validSchemas = Object.values(schemaTypes).filter(Boolean).length;
  const missingCriticalSchemas: string[] = [];
  
  if (!schemaTypes.Organization) missingCriticalSchemas.push('Organization');
  if (!schemaTypes.WebSite) missingCriticalSchemas.push('WebSite');

  const issues: string[] = [];
  const strengths: string[] = [];
  const schemaErrors: string[] = [];

  if (schemas.length === 0) {
    issues.push('No structured data found');
  } else {
    strengths.push(`${schemas.length} schema markup blocks found`);
  }

  if (hasGraphStructure) {
    strengths.push('Using @graph structure for linked data');
  }

  if (!schemaTypes.Organization) issues.push('Missing Organization schema');
  else strengths.push('Organization schema present');

  if (!schemaTypes.WebSite) issues.push('Missing WebSite schema');
  else strengths.push('WebSite schema present');

  if (schemaTypes.Person) strengths.push('Person schema found (strong E-E-A-T signal)');
  if (schemaTypes.Article || schemaTypes.BlogPosting) strengths.push('Article markup present');
  if (schemaTypes.FAQPage) strengths.push('FAQ schema found (AI-friendly)');
  if (schemaTypes.HowTo) strengths.push('HowTo schema found (high citation potential)');
  if (schemaTypes.Product) strengths.push('Product schema present');
  if (schemaTypes.Review || schemaTypes.AggregateRating) strengths.push('Review/Rating schema found');

  // Validate schema completeness
  allSchemas.forEach((schema, index) => {
    if (schema['@type'] === 'Organization') {
      if (!schema.name) schemaErrors.push(`Organization schema #${index + 1}: missing 'name'`);
      if (!schema.url) schemaErrors.push(`Organization schema #${index + 1}: missing 'url'`);
    }
    if (schema['@type'] === 'Person') {
      if (!schema.name) schemaErrors.push(`Person schema #${index + 1}: missing 'name'`);
    }
  });

  if (schemaErrors.length > 0) {
    issues.push(`${schemaErrors.length} schema validation errors found`);
  }

  return {
    totalSchemas: schemas.length,
    validSchemas,
    schemas: schemaTypes,
    hasGraphStructure,
    missingCriticalSchemas,
    schemaErrors,
    issues,
    strengths,
  };
}

function checkSchemaType(schemas: any[], types: string | string[]): boolean {
  const typeArray = Array.isArray(types) ? types : [types];
  return schemas.some(s => {
    const schemaType = s['@type'];
    if (Array.isArray(schemaType)) {
      return schemaType.some(t => typeArray.includes(t));
    }
    return typeArray.includes(schemaType);
  });
}

function auditContentQuality(doc: Document, _html: string): ContentQualityDetails {
  const bodyText = doc.body?.textContent || '';
  const words = bodyText.trim().split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;

  const paragraphs = doc.querySelectorAll('p');
  const paragraphCount = paragraphs.length;
  
  let totalParagraphWords = 0;
  paragraphs.forEach(p => {
    const pWords = (p.textContent || '').trim().split(/\s+/).length;
    totalParagraphWords += pWords;
  });
  const averageParagraphLength = paragraphCount > 0 ? Math.round(totalParagraphWords / paragraphCount) : 0;

  // Estimate sentences
  const sentences = bodyText.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const averageSentenceLength = sentences.length > 0 ? Math.round(words.length / sentences.length) : 0;

  // Readability score (simplified Flesch-Kincaid)
  const readabilityScore = calculateReadability(words.length, sentences.length, countSyllables(bodyText));

  const hasLists = doc.querySelectorAll('ul, ol').length > 0;
  const hasTables = doc.querySelectorAll('table').length > 0;
  
  const imageCount = doc.querySelectorAll('img').length;
  const videoCount = doc.querySelectorAll('video, iframe[src*="youtube"], iframe[src*="vimeo"]').length;

  const allLinks = doc.querySelectorAll('a[href]');
  const internalLinks = Array.from(allLinks).filter(a => {
    const href = a.getAttribute('href') || '';
    return href.startsWith('/') || href.startsWith('#') || href.includes(window.location.hostname);
  }).length;
  const externalLinks = allLinks.length - internalLinks;
  const linkRatio = wordCount > 0 ? (allLinks.length / wordCount) * 100 : 0;

  let contentDepth: 'shallow' | 'moderate' | 'deep' = 'shallow';
  if (wordCount > 2000 && paragraphCount > 15) contentDepth = 'deep';
  else if (wordCount > 800 && paragraphCount > 8) contentDepth = 'moderate';

  const issues: string[] = [];
  const strengths: string[] = [];

  if (wordCount < 300) issues.push('Content is too short (< 300 words) - AI systems prefer comprehensive content');
  else if (wordCount < 800) issues.push('Content could be more detailed (< 800 words)');
  else if (wordCount > 1500) strengths.push('Comprehensive content length');

  if (readabilityScore < 30) issues.push('Content may be too complex - aim for readability score 30-60');
  else if (readabilityScore > 70) issues.push('Content may be too simple - add more depth');
  else strengths.push('Good readability for AI parsing');

  if (averageParagraphLength > 150) issues.push('Paragraphs too long - break into smaller chunks');
  else if (averageParagraphLength > 50 && averageParagraphLength <= 150) strengths.push('Well-structured paragraphs');

  if (!hasLists && wordCount > 500) issues.push('Consider adding lists for better scanability');
  else if (hasLists) strengths.push('Includes lists for better structure');

  if (imageCount === 0 && wordCount > 500) issues.push('No images found - visual content improves engagement');
  else if (imageCount > 0) strengths.push(`${imageCount} images enhance content`);

  if (videoCount > 0) strengths.push(`${videoCount} video(s) found - rich media signals`);

  if (linkRatio < 1 && wordCount > 500) issues.push('Low internal/external linking');
  else if (linkRatio > 5) issues.push('Too many links - may dilute authority');
  else strengths.push('Good link distribution');

  return {
    wordCount,
    readabilityScore,
    paragraphCount,
    averageParagraphLength,
    averageSentenceLength,
    hasLists,
    hasTables,
    imageCount,
    videoCount,
    internalLinks,
    externalLinks,
    linkRatio,
    contentDepth,
    issues,
    strengths,
  };
}

function calculateReadability(words: number, sentences: number, syllables: number): number {
  if (sentences === 0 || words === 0) return 0;
  // Flesch Reading Ease: 206.835 - 1.015 * (words/sentences) - 84.6 * (syllables/words)
  const score = 206.835 - (1.015 * (words / sentences)) - (84.6 * (syllables / words));
  return Math.max(0, Math.min(100, Math.round(score)));
}

function countSyllables(text: string): number {
  // Simplified syllable counting
  const words = text.toLowerCase().split(/\s+/);
  let count = 0;
  words.forEach(word => {
    word = word.replace(/[^a-z]/g, '');
    if (word.length <= 3) {
      count += 1;
    } else {
      const vowels = word.match(/[aeiouy]+/g);
      count += vowels ? vowels.length : 1;
    }
  });
  return count;
}

function auditCitationPotential(doc: Document, html: string): CitationPotentialDetails {
  const bodyText = doc.body?.textContent || '';
  
  // Count factual statements (sentences with numbers, dates, percentages)
  const factualStatements = (bodyText.match(/\d+%|\d+\s*(million|billion|thousand)|in\s+\d{4}|\$\d+/gi) || []).length;
  
  // Count data points (numbers in context)
  const dataPoints = (bodyText.match(/\d{1,3}(,\d{3})*(\.\d+)?/g) || []).length;
  
  // Count quotes
  const quotes = (bodyText.match(/["""].*?["""]/g) || []).length;
  
  // Count references (citations, sources mentioned)
  const references = (html.match(/according to|research shows|study found|survey revealed|data from|source:/gi) || []).length;
  
  // Count definitions (clear explanatory patterns)
  const definitions = (bodyText.match(/is defined as|refers to|means that|is a\s+\w+\s+that/gi) || []).length;
  
  // Unique insights (original analysis indicators)
  const uniqueInsights = (bodyText.match(/we found|our analysis|we discovered|our research|we observed/gi) || []).length;

  // Authority indicators
  const authorityIndicators: string[] = [];
  if (bodyText.match(/years of experience/i)) authorityIndicators.push('Experience stated');
  if (bodyText.match(/certified|certification/i)) authorityIndicators.push('Certifications mentioned');
  if (bodyText.match(/published|author of/i)) authorityIndicators.push('Publications referenced');
  if (bodyText.match(/expert in|specialist in/i)) authorityIndicators.push('Expertise claimed');

  const score = calculateCitationScore(factualStatements, dataPoints, quotes, references, definitions, uniqueInsights);

  const issues: string[] = [];
  const strengths: string[] = [];

  if (factualStatements < 3) issues.push('Limited factual statements - add data and statistics');
  else if (factualStatements >= 10) strengths.push('Rich factual content');

  if (dataPoints < 5) issues.push('Few data points - quantify claims when possible');
  else strengths.push('Good use of data');

  if (quotes === 0 && references === 0) issues.push('No expert quotes or citations - reduce citation potential');
  else if (quotes > 0 || references > 0) strengths.push('Includes attributions and references');

  if (definitions < 2) issues.push('Add clear definitions for key terms');
  else strengths.push('Provides clear definitions');

  if (uniqueInsights === 0) issues.push('No original analysis detected - AI prefers unique insights');
  else strengths.push('Contains original insights');

  if (authorityIndicators.length === 0) issues.push('No authority indicators found');
  else strengths.push(`${authorityIndicators.length} authority signals detected`);

  return {
    score,
    factualStatements,
    dataPoints,
    quotes,
    references,
    definitions,
    uniqueInsights,
    authorityIndicators,
    issues,
    strengths,
  };
}

function calculateCitationScore(factual: number, data: number, quotes: number, refs: number, defs: number, insights: number): number {
  let score = 0;
  score += Math.min(factual * 5, 25);
  score += Math.min(data * 2, 20);
  score += Math.min(quotes * 8, 20);
  score += Math.min(refs * 7, 15);
  score += Math.min(defs * 5, 10);
  score += Math.min(insights * 10, 10);
  return Math.min(100, score);
}

function auditEnhancedEEAT(doc: Document, html: string): EnhancedEEATDetails {
  const bodyText = doc.body?.textContent || '';
  
  const hasAuthorInfo = !!doc.querySelector('[rel="author"], [itemprop="author"], .author, .by-author, .author-bio');
  const hasAboutPage = !!doc.querySelector('a[href*="about"]');
  const hasContactInfo = !!doc.querySelector('a[href*="contact"], [itemprop="email"], [itemprop="telephone"], a[href^="mailto:"]');
  
  // Check for dates
  const hasPublicationDate = !!doc.querySelector('[itemprop="datePublished"], .published, time[datetime], .date');
  const hasUpdateDate = !!doc.querySelector('[itemprop="dateModified"], .updated, .modified');
  
  // Content freshness (try to extract date)
  const dateMatches = html.match(/20\d{2}-\d{2}-\d{2}|20\d{2}\/\d{2}\/\d{2}/);
  let contentFreshness = 0;
  if (dateMatches) {
    const date = new Date(dateMatches[0]);
    const now = new Date();
    const daysSince = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
    contentFreshness = Math.max(0, 100 - Math.floor(daysSince / 3.65)); // Decay over year
  }

  // Enhanced signals
  const hasCitations = (bodyText.match(/\[\d+\]|citation|reference/gi) || []).length > 0;
  const hasExpertQuotes = (bodyText.match(/dr\.|professor|expert|phd|according to.*said/gi) || []).length > 0;
  const hasTrustBadges = !!doc.querySelector('[alt*="secure"], [alt*="verified"], [alt*="certified"], [alt*="badge"]');
  const hasPrivacyPolicy = !!doc.querySelector('a[href*="privacy"]');
  const hasTermsOfService = !!doc.querySelector('a[href*="terms"]');

  // Check schema credentials
  const scripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
  const hasCredentials = scripts.some(script => {
    try {
      const schema = JSON.parse(script.textContent || '{}');
      const allSchemas = schema['@graph'] || [schema];
      return allSchemas.some((s: any) => s.hasCredential || s.expertise || s.knowsAbout || s.award);
    } catch {
      return false;
    }
  });

  // Calculate authority score
  let authorityScore = 0;
  if (hasAuthorInfo) authorityScore += 15;
  if (hasCredentials) authorityScore += 20;
  if (hasAboutPage) authorityScore += 10;
  if (hasContactInfo) authorityScore += 10;
  if (hasPublicationDate) authorityScore += 10;
  if (hasUpdateDate) authorityScore += 5;
  if (hasCitations) authorityScore += 10;
  if (hasExpertQuotes) authorityScore += 10;
  if (hasTrustBadges) authorityScore += 5;
  if (hasPrivacyPolicy && hasTermsOfService) authorityScore += 5;

  const issues: string[] = [];
  const strengths: string[] = [];

  if (!hasAuthorInfo) issues.push('No author attribution found');
  else strengths.push('Author information present');

  if (!hasCredentials) issues.push('No credentials in structured data');
  else strengths.push('Credentials documented');

  if (!hasAboutPage) issues.push('No About page detected');
  else strengths.push('About page found');

  if (!hasContactInfo) issues.push('No contact information');
  else strengths.push('Contact details available');

  if (!hasPublicationDate && !hasUpdateDate) issues.push('No publication/update dates');
  else strengths.push('Content dates present');

  if (contentFreshness < 50) issues.push('Content may be outdated');
  else if (contentFreshness > 80) strengths.push('Recently published/updated content');

  if (!hasCitations) issues.push('No citations or references');
  else strengths.push('Includes citations');

  if (!hasExpertQuotes) issues.push('No expert quotes detected');
  else strengths.push('Features expert opinions');

  if (!hasPrivacyPolicy || !hasTermsOfService) issues.push('Missing legal pages');
  else strengths.push('Legal pages present');

  return {
    hasAuthorInfo,
    hasCredentials,
    hasAboutPage,
    hasContactInfo,
    hasPublicationDate,
    hasUpdateDate,
    contentFreshness,
    hasCitations,
    hasExpertQuotes,
    hasTrustBadges,
    hasPrivacyPolicy,
    hasTermsOfService,
    authorityScore,
    issues,
    strengths,
  };
}

function auditMetaTags(doc: Document): MetaTagsDetails {
  const title = doc.querySelector('title');
  const description = doc.querySelector('meta[name="description"]');
  const ogTitle = doc.querySelector('meta[property="og:title"]');
  const ogDescription = doc.querySelector('meta[property="og:description"]');
  const twitterCard = doc.querySelector('meta[name="twitter:card"]');
  const canonical = doc.querySelector('link[rel="canonical"]');
  const viewport = doc.querySelector('meta[name="viewport"]');
  const charset = doc.querySelector('meta[charset]');
  const lang = doc.documentElement.getAttribute('lang');

  const hasTitle = !!title && !!title.textContent?.trim();
  const hasDescription = !!description && !!description.getAttribute('content');
  const hasOGTags = !!ogTitle && !!ogDescription;
  const hasTwitterCard = !!twitterCard;
  const hasCanonical = !!canonical;
  const hasViewport = !!viewport;
  const hasCharset = !!charset;
  const hasLang = !!lang;

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

  if (!hasTwitterCard) issues.push('Missing Twitter Card');
  else strengths.push('Twitter Card present');

  if (!hasCanonical) issues.push('Missing canonical URL');
  else strengths.push('Canonical URL set');

  if (!hasViewport) issues.push('Missing viewport meta tag');
  else strengths.push('Mobile-optimized viewport');

  if (!hasCharset) issues.push('Missing charset declaration');
  else strengths.push('Charset declared');

  if (!hasLang) issues.push('Missing lang attribute');
  else strengths.push('Language specified');

  return {
    hasTitle,
    hasDescription,
    hasOGTags,
    hasTwitterCard,
    hasCanonical,
    hasViewport,
    hasCharset,
    hasLang,
    titleLength,
    descriptionLength,
    issues,
    strengths,
  };
}

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
  
  // Check for specific AI crawlers
  const checkCrawler = (name: string) => robotsTxt.includes(name.toLowerCase()) && !robotsTxt.includes(`user-agent: ${name.toLowerCase()}\ndisallow: /`);
  
  const allowsGPTBot = checkCrawler('gptbot');
  const allowsClaude = checkCrawler('claude-web') || checkCrawler('claudebot');
  const allowsPerplexity = checkCrawler('perplexitybot');
  const allowsGoogleExtended = checkCrawler('google-extended');
  const allowsAnthropicAI = checkCrawler('anthropic-ai');
  const allowsCohere = checkCrawler('cohere-ai');
  const allowsCCBot = checkCrawler('ccbot');

  const aiCrawlers = [
    'gptbot', 'claude', 'perplexity', 'google-extended', 
    'anthropic', 'cohere', 'ccbot', 'bingbot', 'applebot'
  ];
  const totalAICrawlers = aiCrawlers.filter(c => robotsTxt.includes(c)).length;

  // Check for sitemap
  const hasSitemap = robotsTxt.includes('sitemap:');

  const issues: string[] = [];
  const strengths: string[] = [];

  if (!robotsTxtFound) {
    issues.push('robots.txt not found');
  } else {
    strengths.push('robots.txt present');
  }

  if (!hasSitemap) issues.push('No sitemap declared in robots.txt');
  else strengths.push('Sitemap declared');

  if (!allowsGPTBot) issues.push('GPTBot not explicitly allowed');
  else strengths.push('ChatGPT crawler allowed');

  if (!allowsClaude) issues.push('Claude crawler not allowed');
  else strengths.push('Claude crawler allowed');

  if (!allowsPerplexity) issues.push('Perplexity crawler not allowed');
  else strengths.push('Perplexity crawler allowed');

  if (totalAICrawlers < 3) issues.push('Limited AI crawler support');
  else if (totalAICrawlers >= 5) strengths.push('Comprehensive AI crawler support');

  return {
    robotsTxtFound,
    allowsGPTBot,
    allowsClaude,
    allowsPerplexity,
    allowsGoogleExtended,
    allowsAnthropicAI,
    allowsCohere,
    allowsCCBot,
    totalAICrawlers,
    hasSitemap,
    issues,
    strengths,
  };
}

function auditStructure(doc: Document): StructureDetails {
  const h1 = doc.querySelectorAll('h1');
  const hasH1 = h1.length > 0;
  const h1Count = h1.length;

  const headingCount = {
    h1: doc.querySelectorAll('h1').length,
    h2: doc.querySelectorAll('h2').length,
    h3: doc.querySelectorAll('h3').length,
    h4: doc.querySelectorAll('h4').length,
    h5: doc.querySelectorAll('h5').length,
    h6: doc.querySelectorAll('h6').length,
  };

  const semanticTags = ['header', 'nav', 'main', 'article', 'section', 'aside', 'footer'];
  const hasSemanticHTML = semanticTags.some(tag => doc.querySelector(tag));

  const hasNav = !!doc.querySelector('nav');
  const hasMain = !!doc.querySelector('main');
  const hasFooter = !!doc.querySelector('footer');

  const headings = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6'));
  const headingLevels = headings.map(h => parseInt(h.tagName.substring(1)));
  const headingHierarchy = headingLevels.length === 0 || checkHeadingHierarchy(headingLevels);

  const issues: string[] = [];
  const strengths: string[] = [];

  if (!hasH1) issues.push('No H1 heading');
  else if (h1Count > 1) issues.push(`Multiple H1 tags (${h1Count})`);
  else strengths.push('Single H1 present');

  if (!hasSemanticHTML) issues.push('Limited semantic HTML5');
  else strengths.push('Semantic HTML5 structure');

  if (!hasNav) issues.push('No <nav> element');
  if (!hasMain) issues.push('No <main> element');
  if (!hasFooter) issues.push('No <footer> element');

  if (hasNav && hasMain && hasFooter) {
    strengths.push('Complete semantic structure');
  }

  if (!headingHierarchy) issues.push('Heading hierarchy broken');
  else if (headings.length > 0) strengths.push('Proper heading hierarchy');

  return {
    hasH1,
    h1Count,
    hasSemanticHTML,
    headingHierarchy,
    headingCount,
    hasNav,
    hasMain,
    hasFooter,
    issues,
    strengths,
  };
}

function checkHeadingHierarchy(levels: number[]): boolean {
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] > levels[i - 1] + 1) return false;
  }
  return true;
}

function auditPerformance(html: string, doc: Document): PerformanceDetails {
  const htmlSize = new Blob([html]).size;
  const externalScripts = doc.querySelectorAll('script[src]').length;
  const externalStyles = doc.querySelectorAll('link[rel="stylesheet"]').length;
  const images = doc.querySelectorAll('img').length;
  const totalResources = externalScripts + externalStyles + images;
  
  const hasLazyLoading = Array.from(doc.querySelectorAll('img')).some(img => 
    img.getAttribute('loading') === 'lazy' || img.hasAttribute('data-src')
  );

  const issues: string[] = [];
  const strengths: string[] = [];

  if (htmlSize > 500000) issues.push(`Large HTML (${Math.round(htmlSize / 1024)}KB)`);
  else if (htmlSize < 100000) strengths.push('Optimized HTML size');

  if (externalScripts > 10) issues.push(`Many scripts (${externalScripts})`);
  else if (externalScripts < 5) strengths.push('Minimal scripts');

  if (externalStyles > 5) issues.push(`Multiple stylesheets (${externalStyles})`);
  else strengths.push('Optimized CSS');

  if (images > 20 && !hasLazyLoading) issues.push('Consider lazy loading for images');
  else if (hasLazyLoading) strengths.push('Lazy loading implemented');

  return {
    htmlSize,
    externalScripts,
    externalStyles,
    images,
    totalResources,
    hasLazyLoading,
    issues,
    strengths,
  };
}

// ==================== SCORING FUNCTIONS ====================

function calculateSchemaScore(details: EnhancedSchemaDetails): number {
  let score = 0;
  if (details.schemas.Organization) score += 20;
  if (details.schemas.WebSite) score += 20;
  if (details.schemas.Person) score += 15;
  if (details.schemas.Article || details.schemas.BlogPosting) score += 10;
  if (details.schemas.BreadcrumbList) score += 5;
  if (details.schemas.FAQPage) score += 10;
  if (details.schemas.Product) score += 5;
  if (details.schemas.Review || details.schemas.AggregateRating) score += 5;
  if (details.schemas.HowTo) score += 5;
  if (details.hasGraphStructure) score += 5;
  
  // Deduct for errors
  score -= Math.min(details.schemaErrors.length * 2, 10);
  
  return Math.max(0, Math.min(100, score));
}

function calculateMetaScore(details: MetaTagsDetails): number {
  let score = 0;
  if (details.hasTitle) score += 20;
  if (details.hasDescription) score += 20;
  if (details.hasOGTags) score += 15;
  if (details.hasTwitterCard) score += 10;
  if (details.hasCanonical) score += 10;
  if (details.hasViewport) score += 10;
  if (details.hasCharset) score += 5;
  if (details.hasLang) score += 10;
  return score;
}

function calculateAICrawlersScore(details: AICrawlersDetails): number {
  let score = 0;
  if (details.robotsTxtFound) score += 15;
  if (details.hasSitemap) score += 10;
  if (details.allowsGPTBot) score += 20;
  if (details.allowsClaude) score += 15;
  if (details.allowsPerplexity) score += 15;
  if (details.allowsGoogleExtended) score += 10;
  if (details.allowsAnthropicAI) score += 5;
  if (details.allowsCohere) score += 5;
  if (details.allowsCCBot) score += 5;
  return Math.min(100, score);
}

function calculateEnhancedEEATScore(details: EnhancedEEATDetails): number {
  return details.authorityScore;
}

function calculateStructureScore(details: StructureDetails): number {
  let score = 0;
  if (details.hasH1 && details.h1Count === 1) score += 30;
  else if (details.hasH1) score += 15;
  if (details.hasSemanticHTML) score += 20;
  if (details.headingHierarchy) score += 20;
  if (details.hasNav) score += 10;
  if (details.hasMain) score += 10;
  if (details.hasFooter) score += 10;
  return score;
}

function calculatePerformanceScore(details: PerformanceDetails): number {
  let score = 100;
  if (details.htmlSize > 500000) score -= 30;
  else if (details.htmlSize > 200000) score -= 15;
  if (details.externalScripts > 10) score -= 20;
  else if (details.externalScripts > 5) score -= 10;
  if (details.externalStyles > 5) score -= 10;
  if (details.images > 20 && !details.hasLazyLoading) score -= 10;
  return Math.max(0, score);
}

function calculateContentQualityScore(details: ContentQualityDetails): number {
  let score = 0;
  
  // Word count (0-25 points)
  if (details.wordCount >= 2000) score += 25;
  else if (details.wordCount >= 1000) score += 20;
  else if (details.wordCount >= 500) score += 15;
  else if (details.wordCount >= 300) score += 10;
  
  // Readability (0-20 points)
  if (details.readabilityScore >= 30 && details.readabilityScore <= 60) score += 20;
  else if (details.readabilityScore >= 20 && details.readabilityScore <= 70) score += 15;
  else score += 10;
  
  // Structure (0-20 points)
  if (details.hasLists) score += 10;
  if (details.hasTables) score += 5;
  if (details.paragraphCount > 10) score += 5;
  
  // Media (0-15 points)
  if (details.imageCount > 0) score += 10;
  if (details.videoCount > 0) score += 5;
  
  // Links (0-10 points)
  if (details.internalLinks > 3) score += 5;
  if (details.externalLinks > 2) score += 5;
  
  // Depth (0-10 points)
  if (details.contentDepth === 'deep') score += 10;
  else if (details.contentDepth === 'moderate') score += 7;
  else score += 3;
  
  return Math.min(100, score);
}

function calculateCitationPotentialScore(details: CitationPotentialDetails): number {
  return details.score;
}

function calculateOverallScore(scores: any, _schemaDetails: EnhancedSchemaDetails): number {
  // Dynamic weighting based on content type
  let weights = {
    schemaMarkup: 0.20,
    metaTags: 0.12,
    aiCrawlers: 0.18,
    eeat: 0.18,
    structure: 0.08,
    performance: 0.08,
    contentQuality: 0.10,
    citationPotential: 0.06,
  };

  // Adjust weights for content-heavy sites
  if (scores.contentQuality > 70) {
    weights.contentQuality = 0.15;
    weights.citationPotential = 0.10;
    weights.schemaMarkup = 0.15;
  }

  const overall = 
    scores.schemaMarkup * weights.schemaMarkup +
    scores.metaTags * weights.metaTags +
    scores.aiCrawlers * weights.aiCrawlers +
    scores.eeat * weights.eeat +
    scores.structure * weights.structure +
    scores.performance * weights.performance +
    scores.contentQuality * weights.contentQuality +
    scores.citationPotential * weights.citationPotential;

  return Math.round(overall);
}

function getGrade(score: number): 'Authority' | 'Expert' | 'Advanced' | 'Intermediate' | 'Beginner' {
  if (score >= 96) return 'Authority';
  if (score >= 86) return 'Expert';
  if (score >= 71) return 'Advanced';
  if (score >= 41) return 'Intermediate';
  return 'Beginner';
}

// ==================== RECOMMENDATIONS ====================

function generateEnhancedRecommendations(
  details: any,
  scores: any
): EnhancedRecommendation[] {
  const recommendations: EnhancedRecommendation[] = [];

  // Critical: Schema issues
  if (!details.schemaMarkup.schemas.Organization) {
    recommendations.push({
      category: 'Schema Markup',
      priority: 'critical',
      effort: 'strategic',
      title: 'Add Organization Schema',
      description: 'Implement Schema.org Organization markup to establish your brand identity for AI systems.',
      impact: 'AI systems will recognize and cite your organization as an authoritative source. Increases citation probability by up to 40%.',
      implementation: 'Add JSON-LD script to your HTML <head> section with Organization type.',
      estimatedTime: '30 minutes',
      codeExample: `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Your Company Name",
  "url": "https://yoursite.com",
  "logo": "https://yoursite.com/logo.png",
  "description": "Brief company description",
  "sameAs": ["https://twitter.com/yourcompany"]
}
</script>`,
    });
  }

  // High: Content quality
  if (scores.contentQuality < 60) {
    recommendations.push({
      category: 'Content Quality',
      priority: 'high',
      effort: 'long-term',
      title: 'Improve Content Depth and Quality',
      description: 'Current content is insufficient for AI citation. Aim for 1000+ words with clear structure.',
      impact: 'Comprehensive content is 3x more likely to be cited by AI systems.',
      implementation: 'Expand articles with: factual data, expert quotes, clear definitions, and original insights.',
      estimatedTime: '2-4 hours per page',
    });
  }

  // High: AI Crawlers
  if (!details.aiCrawlers.allowsGPTBot) {
    recommendations.push({
      category: 'AI Crawlers',
      priority: 'high',
      effort: 'quick-win',
      title: 'Allow GPTBot in robots.txt',
      description: 'Explicitly permit ChatGPT crawler to index your content.',
      impact: 'Enables ChatGPT to include your site in training and citations.',
      implementation: 'Add GPTBot allow directive to robots.txt',
      estimatedTime: '5 minutes',
      codeExample: `User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /`,
    });
  }

  // High: Citation potential
  if (scores.citationPotential < 50) {
    recommendations.push({
      category: 'Citation Potential',
      priority: 'high',
      effort: 'strategic',
      title: 'Add Factual Data and Citations',
      description: 'Include statistics, data points, and attributed quotes to increase citation worthiness.',
      impact: 'Factual content with citations is 5x more likely to be referenced by AI.',
      implementation: 'Add: specific numbers/percentages, research references, expert quotes, and clear definitions.',
      estimatedTime: '1-2 hours',
    });
  }

  // Medium: E-E-A-T
  if (!details.eeat.hasCredentials) {
    recommendations.push({
      category: 'E-E-A-T',
      priority: 'high',
      effort: 'strategic',
      title: 'Document Expertise in Schema',
      description: 'Add credentials, expertise areas, and professional background to Person schema.',
      impact: 'Strengthens trust signals for AI evaluation.',
      implementation: 'Add hasCredential, expertise, knowsAbout properties to Person schema.',
      estimatedTime: '45 minutes',
      codeExample: `{
  "@type": "Person",
  "name": "Expert Name",
  "jobTitle": "Position",
  "expertise": "Area of expertise",
  "knowsAbout": ["Topic 1", "Topic 2"],
  "hasCredential": {
    "@type": "EducationalOccupationalCredential",
    "name": "Certification/Degree"
  }
}`,
    });
  }

  // Medium: Meta tags
  if (!details.metaTags.hasOGTags) {
    recommendations.push({
      category: 'Meta Tags',
      priority: 'medium',
      effort: 'quick-win',
      title: 'Add Open Graph Tags',
      description: 'Implement OG tags for better social sharing and AI preview generation.',
      impact: 'Improves content visibility when shared on platforms.',
      implementation: 'Add og:title, og:description, og:image, og:url meta tags.',
      estimatedTime: '15 minutes',
    });
  }

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  return recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

function generateInsights(scores: any, details: any): string[] {
  const insights: string[] = [];

  const overall = (scores.schemaMarkup + scores.contentQuality + scores.citationPotential + scores.eeat) / 4;

  if (overall >= 80) {
    insights.push('Your site shows strong GEO optimization. Focus on maintaining content freshness.');
  } else if (overall >= 60) {
    insights.push('Good foundation. Prioritize schema markup and content depth for better AI visibility.');
  } else if (overall >= 40) {
    insights.push('Moderate GEO readiness. Focus on critical improvements: schema markup and E-E-A-T signals.');
  } else {
    insights.push('Significant GEO gaps detected. Start with Organization schema and comprehensive content.');
  }

  if (scores.schemaMarkup < 50) {
    insights.push('Structured data is your biggest opportunity. AI systems rely heavily on schema markup for understanding.');
  }

  if (scores.citationPotential < 40) {
    insights.push('Low citation potential. Add factual data, statistics, and expert quotes to increase reference likelihood.');
  }

  if (scores.contentQuality < 50) {
    insights.push('Content quality needs improvement. AI prefers comprehensive, well-structured content over thin pages.');
  }

  if (scores.aiCrawlers < 60) {
    insights.push('Limited AI crawler access. Ensure robots.txt explicitly allows GPTBot, Claude, and Perplexity.');
  }

  if (details.contentQuality.wordCount > 1500 && scores.contentQuality > 70) {
    insights.push('Excellent content depth. This positions you well for AI citations.');
  }

  if (details.schemaMarkup.hasGraphStructure) {
    insights.push('Advanced: Using @graph structure shows sophisticated semantic markup.');
  }

  return insights;
}
