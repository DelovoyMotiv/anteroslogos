/**
 * Default/fallback data structures for GEO audit
 * Used when specific audit functions fail
 */

import type {
  EnhancedSchemaDetails,
  MetaTagsDetails,
  AICrawlersDetails,
  EnhancedEEATDetails,
  StructureDetails,
  PerformanceDetails,
  ContentQualityDetails,
  CitationPotentialDetails,
  TechnicalSEODetails,
  LinkAnalysisDetails,
} from './geoAuditEnhanced';

export function getDefaultSchemaDetails(): EnhancedSchemaDetails {
  return {
    totalSchemas: 0,
    validSchemas: 0,
    schemas: {
      Organization: false,
      Person: false,
      Article: false,
      BlogPosting: false,
      WebSite: false,
      BreadcrumbList: false,
      FAQPage: false,
      Product: false,
      Review: false,
      AggregateRating: false,
      HowTo: false,
      VideoObject: false,
      ImageObject: false,
      LocalBusiness: false,
      Event: false,
      SoftwareApplication: false,
    },
    hasGraphStructure: false,
    missingCriticalSchemas: ['Organization', 'WebSite'],
    schemaErrors: [],
    issues: ['Schema audit failed - unable to analyze structured data'],
    strengths: [],
  };
}

export function getDefaultMetaTagsDetails(): MetaTagsDetails {
  return {
    hasTitle: false,
    hasDescription: false,
    hasOGTags: false,
    hasTwitterCard: false,
    hasCanonical: false,
    hasViewport: false,
    hasCharset: false,
    hasLang: false,
    titleLength: 0,
    descriptionLength: 0,
    issues: ['Meta tags audit failed - unable to analyze metadata'],
    strengths: [],
  };
}

export function getDefaultAICrawlersDetails(): AICrawlersDetails {
  return {
    robotsTxtFound: false,
    allowsGPTBot: false,
    allowsClaude: false,
    allowsPerplexity: false,
    allowsGoogleExtended: false,
    allowsAnthropicAI: false,
    allowsCohere: false,
    allowsCCBot: false,
    totalAICrawlers: 0,
    hasSitemap: false,
    issues: ['AI crawlers audit failed - unable to check robots.txt'],
    strengths: [],
  };
}

export function getDefaultEEATDetails(): EnhancedEEATDetails {
  return {
    hasAuthorInfo: false,
    hasCredentials: false,
    hasAboutPage: false,
    hasContactInfo: false,
    hasPublicationDate: false,
    hasUpdateDate: false,
    contentFreshness: 0,
    hasCitations: false,
    hasExpertQuotes: false,
    hasTrustBadges: false,
    hasPrivacyPolicy: false,
    hasTermsOfService: false,
    authorityScore: 0,
    issues: ['E-E-A-T audit failed - unable to analyze authority signals'],
    strengths: [],
  };
}

export function getDefaultStructureDetails(): StructureDetails {
  return {
    hasH1: false,
    h1Count: 0,
    hasSemanticHTML: false,
    headingHierarchy: false,
    headingCount: { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 },
    hasNav: false,
    hasMain: false,
    hasFooter: false,
    issues: ['Structure audit failed - unable to analyze HTML structure'],
    strengths: [],
  };
}

export function getDefaultPerformanceDetails(): PerformanceDetails {
  return {
    htmlSize: 0,
    externalScripts: 0,
    externalStyles: 0,
    images: 0,
    totalResources: 0,
    hasLazyLoading: false,
    issues: ['Performance audit failed - unable to analyze resources'],
    strengths: [],
  };
}

export function getDefaultContentQualityDetails(): ContentQualityDetails {
  return {
    wordCount: 0,
    readabilityScore: 50,
    paragraphCount: 0,
    averageParagraphLength: 0,
    averageSentenceLength: 0,
    hasLists: false,
    hasTables: false,
    imageCount: 0,
    videoCount: 0,
    internalLinks: 0,
    externalLinks: 0,
    linkRatio: 0,
    contentDepth: 'shallow',
    aiReadabilityScore: 50,
    passiveVoicePercentage: 0,
    jargonDensity: 0,
    sentenceComplexity: 'moderate',
    informationDensity: 0,
    hasHeadings: false,
    hasClearStructure: false,
    technicalTermCount: 0,
    transitionWords: 0,
    issues: ['Content quality audit failed - unable to analyze text content'],
    strengths: [],
  };
}

export function getDefaultCitationPotentialDetails(): CitationPotentialDetails {
  return {
    score: 0,
    factualStatements: 0,
    dataPoints: 0,
    quotes: 0,
    references: 0,
    definitions: 0,
    uniqueInsights: 0,
    authorityIndicators: [],
    issues: ['Citation potential audit failed - unable to analyze content'],
    strengths: [],
  };
}

export function getDefaultTechnicalSEODetails(): TechnicalSEODetails {
  return {
    hasViewport: false,
    hasCharset: false,
    hasLang: false,
    hasHreflang: false,
    hasAlternateMobile: false,
    hasAMP: false,
    isHTTPS: false,
    hasSecurityHeaders: false,
    hasSitemapXML: false,
    sitemapAccessible: false,
    hasRobotsTxt: false,
    hasCanonical: false,
    hasNoIndex: false,
    httpStatus: null,
    redirectChain: false,
    viewport: '',
    charset: '',
    lang: '',
    securityHeaders: [],
    issues: ['Technical SEO audit failed - unable to analyze technical elements'],
    strengths: [],
  };
}

export function getDefaultLinkAnalysisDetails(): LinkAnalysisDetails {
  return {
    totalLinks: 0,
    internalLinks: 0,
    externalLinks: 0,
    nofollowLinks: 0,
    nofollowRatio: 0,
    uniqueInternalLinks: 0,
    uniqueExternalLinks: 0,
    brokenLinks: 0,
    linkDepth: 'shallow',
    anchorTextQuality: 50,
    emptyAnchors: 0,
    imageLinks: 0,
    externalDomains: [],
    topInternalPages: [],
    linkDistribution: 'poor',
    issues: ['Link analysis failed - unable to analyze links'],
    strengths: [],
  };
}
