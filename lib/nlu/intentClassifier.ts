/**
 * Intent Classification Engine
 * Production-grade rule-based classifier for query intent detection
 * 
 * Classifies queries into 4 primary intents:
 * - Navigational: User wants to find a specific website/page
 * - Informational: User seeks knowledge/explanation
 * - Transactional: User wants to perform an action (buy, download, signup)
 * - Commercial: User researches before purchase (reviews, comparisons)
 * 
 * Based on research:
 * - Broder (2002) "A Taxonomy of Web Search"
 * - Rose & Levinson (2004) "Understanding User Goals in Web Search"
 * - Jansen et al. (2008) "Determining the informational, navigational, and transactional intent of Web queries"
 * 
 * @module lib/nlu/intentClassifier
 * @version 1.0.0
 */

import { z } from 'zod';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export const IntentTypeSchema = z.enum([
  'navigational',
  'informational', 
  'transactional',
  'commercial',
  'ambiguous', // Multiple intents detected with similar confidence
]);

export type IntentType = z.infer<typeof IntentTypeSchema>;

export const IntentResultSchema = z.object({
  intent: IntentTypeSchema,
  confidence: z.number().min(0).max(1),
  features: z.object({
    hasQuestionWords: z.boolean(),
    hasActionVerbs: z.boolean(),
    hasSuperlatives: z.boolean(),
    hasBrandNames: z.boolean(),
    hasNavigationalKeywords: z.boolean(),
    hasCommercialKeywords: z.boolean(),
    hasTransactionalKeywords: z.boolean(),
    queryLength: z.number(),
    containsURL: z.boolean(),
  }),
  matchedPatterns: z.array(z.string()),
  alternativeIntents: z.array(z.object({
    intent: IntentTypeSchema,
    confidence: z.number(),
  })),
});

export type IntentResult = z.infer<typeof IntentResultSchema>;

// =====================================================
// LINGUISTIC PATTERN DEFINITIONS
// =====================================================

/**
 * Question words indicating informational intent
 */
const QUESTION_WORDS = [
  'what', 'how', 'why', 'when', 'where', 'who', 'which', 'whose',
  'can', 'could', 'should', 'would', 'will', 'do', 'does', 'did',
  'is', 'are', 'was', 'were', 'has', 'have', 'had',
] as const;

/**
 * Action verbs indicating transactional intent
 */
const ACTION_VERBS = [
  'buy', 'purchase', 'order', 'get', 'download', 'install', 'signup',
  'register', 'subscribe', 'join', 'book', 'reserve', 'rent', 'lease',
  'hire', 'apply', 'enroll', 'donate', 'contribute', 'pay', 'upgrade',
  'create', 'start', 'begin', 'launch',
] as const;

/**
 * Superlatives and comparison words indicating commercial intent
 */
const SUPERLATIVES = [
  'best', 'top', 'worst', 'cheapest', 'most', 'least', 'highest', 'lowest',
  'better', 'worse', 'cheaper', 'more', 'less', 'higher', 'lower',
  'versus', 'vs', 'compare', 'comparison', 'alternative', 'alternatives',
  'review', 'reviews', 'rating', 'ratings', 'recommendation', 'recommendations',
] as const;

/**
 * Navigational keywords indicating brand/site search
 */
const NAVIGATIONAL_KEYWORDS = [
  'login', 'signin', 'sign in', 'log in', 'homepage', 'home page', 'website',
  'official', 'site', 'portal', 'dashboard', 'account', 'profile',
  'go to', 'navigate to', 'visit', 'open', 'find',
] as const;

/**
 * Commercial investigation keywords
 */
const COMMERCIAL_KEYWORDS = [
  'price', 'pricing', 'cost', 'expensive', 'cheap', 'affordable', 'value',
  'deal', 'deals', 'discount', 'discounts', 'coupon', 'coupons', 'sale',
  'offer', 'offers', 'promo', 'promotion', 'warranty', 'guarantee',
  'shipping', 'delivery', 'return', 'refund', 'policy',
] as const;

/**
 * Transactional keywords indicating purchase intent
 */
const TRANSACTIONAL_KEYWORDS = [
  'buy now', 'add to cart', 'checkout', 'payment', 'credit card', 'paypal',
  'shop', 'shopping', 'store', 'cart', 'basket', 'order now', 'purchase now',
  'get it now', 'available', 'in stock', 'delivery', 'shipping',
] as const;

// =====================================================
// REGEX PATTERNS
// =====================================================

/**
 * Regex patterns for intent detection
 * Each pattern has weight and intent type
 */
const INTENT_PATTERNS: Array<{
  pattern: RegExp;
  intent: IntentType;
  weight: number;
  description: string;
}> = [
  // Navigational patterns (weight: 0.8-1.0)
  {
    pattern: /^(go to|goto|open|visit|navigate to|find)\s+(\w+\s+)?(website|site|page|homepage)/i,
    intent: 'navigational',
    weight: 0.95,
    description: 'Direct navigation command',
  },
  {
    pattern: /^(\w+\.\w+|www\.\w+)/i,
    intent: 'navigational',
    weight: 0.90,
    description: 'URL-like query',
  },
  {
    pattern: /^(login|signin|sign in|log in)\s+(to\s+)?(\w+)/i,
    intent: 'navigational',
    weight: 0.85,
    description: 'Login intent',
  },
  {
    pattern: /^(\w+)\s+(official\s+)?(website|homepage|site)/i,
    intent: 'navigational',
    weight: 0.85,
    description: 'Brand website search',
  },
  {
    pattern: /^(facebook|twitter|instagram|linkedin|youtube|github)\s+(\w+)/i,
    intent: 'navigational',
    weight: 0.80,
    description: 'Social media profile search',
  },

  // Informational patterns (weight: 0.7-0.95)
  {
    pattern: /^(what|how|why|when|where|who|which)\s+(is|are|was|were|does|do|did|can|could|should|would)/i,
    intent: 'informational',
    weight: 0.95,
    description: 'Question word + auxiliary verb',
  },
  {
    pattern: /^(explain|define|describe|tell me about|information about)\s+/i,
    intent: 'informational',
    weight: 0.90,
    description: 'Explicit information request',
  },
  {
    pattern: /^(tutorial|guide|how to|learn)\s+/i,
    intent: 'informational',
    weight: 0.85,
    description: 'Educational content search',
  },
  {
    pattern: /^(meaning of|definition of|what does)\s+/i,
    intent: 'informational',
    weight: 0.85,
    description: 'Definition request',
  },
  {
    pattern: /\s+(examples?|benefits?|advantages?|disadvantages?|pros and cons)/i,
    intent: 'informational',
    weight: 0.75,
    description: 'Seeking detailed information',
  },
  {
    pattern: /^(difference between|compare)\s+\w+\s+(and|vs)\s+\w+/i,
    intent: 'informational',
    weight: 0.70,
    description: 'Comparison question (informational)',
  },

  // Transactional patterns (weight: 0.8-0.95)
  {
    pattern: /^(buy|purchase|order|get)\s+(\w+\s+)?(now|online|here)/i,
    intent: 'transactional',
    weight: 0.95,
    description: 'Direct purchase intent',
  },
  {
    pattern: /^(download|install|get)\s+(\w+\s+)?(free|trial|now)/i,
    intent: 'transactional',
    weight: 0.90,
    description: 'Download/install intent',
  },
  {
    pattern: /^(signup|register|subscribe|join)\s+(for|to)?\s+/i,
    intent: 'transactional',
    weight: 0.90,
    description: 'Registration intent',
  },
  {
    pattern: /^(book|reserve|schedule|appointment)\s+/i,
    intent: 'transactional',
    weight: 0.85,
    description: 'Booking/reservation intent',
  },
  {
    pattern: /\s+(for sale|to buy|purchase online|order online|buy online)/i,
    intent: 'transactional',
    weight: 0.80,
    description: 'Purchase modifiers',
  },

  // Commercial patterns (weight: 0.7-0.90)
  {
    pattern: /^(best|top|worst)\s+(\d+\s+)?(\w+\s+)*(for|in)\s+/i,
    intent: 'commercial',
    weight: 0.90,
    description: 'Superlative + category',
  },
  {
    pattern: /^(\w+\s+)?(reviews?|ratings?|testimonials?)\s+(for|of|on)\s+/i,
    intent: 'commercial',
    weight: 0.85,
    description: 'Review search',
  },
  {
    pattern: /^(cheap|affordable|budget)\s+(\w+\s+)*(under|below|less than)\s+/i,
    intent: 'commercial',
    weight: 0.80,
    description: 'Price-focused research',
  },
  {
    pattern: /^(\w+\s+)+(vs|versus|compared to|comparison)\s+(\w+)/i,
    intent: 'commercial',
    weight: 0.75,
    description: 'Product comparison',
  },
  {
    pattern: /^(alternatives? to|similar to|like)\s+/i,
    intent: 'commercial',
    weight: 0.75,
    description: 'Alternative search',
  },
  {
    pattern: /\s+(price|pricing|cost|costs|deals?|discounts?|coupons?)/i,
    intent: 'commercial',
    weight: 0.70,
    description: 'Price investigation',
  },
];

// =====================================================
// FEATURE EXTRACTION
// =====================================================

/**
 * Extract linguistic features from query text
 */
function extractFeatures(query: string): IntentResult['features'] {
  const lowerQuery = query.toLowerCase();
  const tokens = lowerQuery.split(/\s+/);

  return {
    hasQuestionWords: QUESTION_WORDS.some(word => tokens.includes(word)),
    hasActionVerbs: ACTION_VERBS.some(verb => lowerQuery.includes(verb)),
    hasSuperlatives: SUPERLATIVES.some(sup => lowerQuery.includes(sup)),
    hasBrandNames: /^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/.test(query.trim()), // Capitalized words
    hasNavigationalKeywords: NAVIGATIONAL_KEYWORDS.some(kw => lowerQuery.includes(kw)),
    hasCommercialKeywords: COMMERCIAL_KEYWORDS.some(kw => lowerQuery.includes(kw)),
    hasTransactionalKeywords: TRANSACTIONAL_KEYWORDS.some(kw => lowerQuery.includes(kw)),
    queryLength: tokens.length,
    containsURL: /https?:\/\/|www\.|\.com|\.org|\.net/i.test(query),
  };
}

// =====================================================
// INTENT CLASSIFICATION LOGIC
// =====================================================

/**
 * Score query against all patterns and aggregate by intent
 */
function scoreIntents(query: string): Map<IntentType, number> {
  const scores = new Map<IntentType, number>([
    ['navigational', 0],
    ['informational', 0],
    ['transactional', 0],
    ['commercial', 0],
    ['ambiguous', 0],
  ]);

  const matchedPatterns: string[] = [];

  // Pattern-based scoring
  for (const { pattern, intent, weight, description } of INTENT_PATTERNS) {
    if (pattern.test(query)) {
      scores.set(intent, scores.get(intent)! + weight);
      matchedPatterns.push(description);
    }
  }

  // Feature-based scoring (fallback if no patterns match)
  const features = extractFeatures(query);
  
  if (matchedPatterns.length === 0) {
    // Navigational heuristics
    if (features.containsURL || features.hasBrandNames) {
      scores.set('navigational', scores.get('navigational')! + 0.6);
    }
    if (features.hasNavigationalKeywords) {
      scores.set('navigational', scores.get('navigational')! + 0.5);
    }

    // Informational heuristics
    if (features.hasQuestionWords) {
      scores.set('informational', scores.get('informational')! + 0.7);
    }
    if (features.queryLength > 5) {
      scores.set('informational', scores.get('informational')! + 0.3);
    }

    // Transactional heuristics
    if (features.hasActionVerbs && features.hasTransactionalKeywords) {
      scores.set('transactional', scores.get('transactional')! + 0.8);
    } else if (features.hasTransactionalKeywords) {
      scores.set('transactional', scores.get('transactional')! + 0.5);
    }

    // Commercial heuristics
    if (features.hasSuperlatives || features.hasCommercialKeywords) {
      scores.set('commercial', scores.get('commercial')! + 0.6);
    }
  }

  return scores;
}

/**
 * Normalize scores to confidence values (0-1)
 */
function normalizeScores(scores: Map<IntentType, number>): Map<IntentType, number> {
  const total = Array.from(scores.values()).reduce((sum, score) => sum + score, 0);
  
  if (total === 0) {
    // Default to informational if no clear signals
    return new Map([
      ['navigational', 0.1],
      ['informational', 0.6],
      ['transactional', 0.1],
      ['commercial', 0.2],
      ['ambiguous', 0],
    ]);
  }

  const normalized = new Map<IntentType, number>();
  for (const [intent, score] of scores.entries()) {
    normalized.set(intent, score / total);
  }

  return normalized;
}

// =====================================================
// PUBLIC API
// =====================================================

/**
 * Classify query intent with confidence scores
 */
export function classifyIntent(query: string): IntentResult {
  if (!query || query.trim().length === 0) {
    throw new Error('Query cannot be empty');
  }

  const normalizedQuery = query.trim();
  const features = extractFeatures(normalizedQuery);
  const rawScores = scoreIntents(normalizedQuery);
  const scores = normalizeScores(rawScores);

  // Find primary intent (highest confidence)
  let primaryIntent: IntentType = 'informational'; // Default
  let maxConfidence = 0;
  const alternativeIntents: Array<{ intent: IntentType; confidence: number }> = [];

  for (const [intent, confidence] of scores.entries()) {
    if (intent === 'ambiguous') continue;

    if (confidence > maxConfidence) {
      if (maxConfidence > 0.2) {
        // Previous max becomes alternative
        alternativeIntents.push({ intent: primaryIntent, confidence: maxConfidence });
      }
      primaryIntent = intent;
      maxConfidence = confidence;
    } else if (confidence > 0.2) {
      alternativeIntents.push({ intent, confidence });
    }
  }

  // Check for ambiguous intent (multiple intents with similar high confidence)
  const highConfidenceIntents = Array.from(scores.entries())
    .filter(([intent, conf]) => intent !== 'ambiguous' && conf > 0.35);
  
  if (highConfidenceIntents.length >= 2) {
    const [first, second] = highConfidenceIntents
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2);
    
    if (Math.abs(first[1] - second[1]) < 0.15) {
      primaryIntent = 'ambiguous';
      maxConfidence = (first[1] + second[1]) / 2;
      alternativeIntents.unshift(
        { intent: first[0] as IntentType, confidence: first[1] },
        { intent: second[0] as IntentType, confidence: second[1] }
      );
    }
  }

  // Sort alternatives by confidence
  alternativeIntents.sort((a, b) => b.confidence - a.confidence);

  const matchedPatterns = INTENT_PATTERNS
    .filter(p => p.pattern.test(normalizedQuery))
    .map(p => p.description);

  return {
    intent: primaryIntent,
    confidence: Math.min(maxConfidence, 1.0),
    features,
    matchedPatterns,
    alternativeIntents: alternativeIntents.slice(0, 3), // Top 3 alternatives
  };
}

/**
 * Batch classify multiple queries
 */
export function classifyIntentBatch(queries: string[]): IntentResult[] {
  return queries.map(query => {
    try {
      return classifyIntent(query);
    } catch (error) {
      // Return default informational intent on error
      return {
        intent: 'informational',
        confidence: 0.5,
        features: {
          hasQuestionWords: false,
          hasActionVerbs: false,
          hasSuperlatives: false,
          hasBrandNames: false,
          hasNavigationalKeywords: false,
          hasCommercialKeywords: false,
          hasTransactionalKeywords: false,
          queryLength: 0,
          containsURL: false,
        },
        matchedPatterns: [],
        alternativeIntents: [],
      };
    }
  });
}

/**
 * Get intent confidence threshold for filtering
 */
export function getConfidenceThreshold(intent: IntentType): number {
  const thresholds: Record<IntentType, number> = {
    navigational: 0.70, // High confidence needed (avoid false positives)
    informational: 0.50, // Medium confidence (most common)
    transactional: 0.75, // High confidence needed (business critical)
    commercial: 0.60, // Medium-high confidence
    ambiguous: 0.40, // Lower threshold (indicates uncertainty)
  };
  return thresholds[intent];
}

/**
 * Check if intent is confident enough for given threshold
 */
export function isConfidentIntent(result: IntentResult, customThreshold?: number): boolean {
  const threshold = customThreshold ?? getConfidenceThreshold(result.intent);
  return result.confidence >= threshold;
}

// =====================================================
// EXPORTS
// =====================================================

export const IntentClassifier = {
  classify: classifyIntent,
  classifyBatch: classifyIntentBatch,
  isConfident: isConfidentIntent,
  getThreshold: getConfidenceThreshold,
  QUESTION_WORDS,
  ACTION_VERBS,
  SUPERLATIVES,
};

export default IntentClassifier;
