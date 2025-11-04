/**
 * NLP Content Analysis Module - Hi-End AAA Level
 * Semantic analysis, topic clustering, keyword density, content uniqueness
 */

// ==================== INTERFACES ====================

export interface NLPContentAnalysis {
  // Uniqueness & Quality
  contentUniquenessScore: number; // 0-100
  estimatedOriginality: number; // 0-100
  duplicateContentRisk: 'low' | 'medium' | 'high';
  
  // Keyword Analysis
  primaryKeywords: Array<{ word: string; frequency: number; density: number }>;
  secondaryKeywords: Array<{ word: string; frequency: number; density: number }>;
  keywordDensity: number; // percentage
  keywordStuffingRisk: 'none' | 'low' | 'high';
  keywordDistribution: 'natural' | 'forced' | 'over-optimized';
  
  // Topic Analysis
  detectedTopics: Array<{ topic: string; relevance: number; keywords: string[] }>;
  topicCohesion: number; // 0-100
  topicDiversity: number; // 0-100
  mainTopic: string;
  subtopics: string[];
  
  // Semantic Analysis
  semanticRichness: number; // 0-100
  vocabularyDiversity: number; // unique words / total words
  lexicalDensity: number; // content words / total words
  abstractConceptRatio: number; // abstract terms / total
  
  // Sentence-level Analysis
  averageSentenceLength: number;
  sentenceLengthVariety: 'low' | 'medium' | 'high';
  sentenceComplexityScore: number; // 0-100
  
  // Readability for AI
  aiComprehensionScore: number; // 0-100
  structuralClarity: number; // 0-100
  informationDensity: number; // 0-100
  contextualCoherence: number; // 0-100
  
  // Content Type Classification
  contentType: 'informational' | 'commercial' | 'navigational' | 'transactional' | 'mixed';
  contentIntent: string[];
  targetAudience: 'general' | 'technical' | 'professional' | 'academic';
  
  // Sentiment & Tone
  sentimentScore: number; // -1 to 1 (negative to positive)
  sentimentLabel: 'negative' | 'neutral' | 'positive';
  toneAnalysis: {
    formal: number;
    conversational: number;
    technical: number;
    persuasive: number;
  };
  
  // Entity Recognition (NER)
  entities: {
    people: string[];
    organizations: string[];
    locations: string[];
    products: string[];
    concepts: string[];
  };
  
  // Content Gaps & Opportunities
  missingTopics: string[];
  contentGaps: string[];
  improvementSuggestions: string[];
  
  issues: string[];
  strengths: string[];
}

// ==================== HELPER FUNCTIONS ====================

// Common stop words (expanded list)
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
  'to', 'was', 'will', 'with', 'have', 'this', 'but', 'they', 'not',
  'or', 'had', 'can', 'their', 'which', 'you', 'been', 'than', 'more',
  'when', 'so', 'these', 'would', 'other', 'into', 'could', 'our', 'should',
  'your', 'there', 'some', 'were', 'them', 'his', 'her', 'also', 'about',
  'only', 'may', 'such', 'no', 'what', 'up', 'out', 'if', 'who', 'get',
  'all', 'we', 'my', 'do', 'me', 'one', 'she', 'how', 'am', 'here', 'over',
]);

// Content words (nouns, verbs, adjectives, adverbs) vs function words
const FUNCTION_WORDS = new Set([
  ...STOP_WORDS,
  'then', 'where', 'why', 'just', 'even', 'any', 'through', 'because',
  'those', 'much', 'before', 'after', 'being', 'under', 'while', 'again',
]);

// Abstract concept indicators
const ABSTRACT_TERMS = [
  'concept', 'theory', 'principle', 'approach', 'methodology', 'framework',
  'strategy', 'philosophy', 'ideology', 'paradigm', 'model', 'system',
  'process', 'development', 'innovation', 'transformation', 'evolution',
  'perspective', 'dimension', 'aspect', 'factor', 'element', 'component',
];

// Technical domain keywords
const TECHNICAL_DOMAINS = {
  technology: ['software', 'algorithm', 'database', 'api', 'code', 'programming', 'server', 'cloud', 'data', 'system'],
  business: ['revenue', 'strategy', 'market', 'customer', 'sales', 'growth', 'roi', 'investment', 'profit', 'management'],
  science: ['research', 'study', 'analysis', 'hypothesis', 'experiment', 'data', 'methodology', 'results', 'conclusion', 'evidence'],
  medical: ['patient', 'treatment', 'diagnosis', 'symptoms', 'disease', 'medical', 'health', 'clinical', 'therapy', 'prescription'],
  legal: ['law', 'legal', 'contract', 'agreement', 'rights', 'regulation', 'compliance', 'policy', 'jurisdiction', 'litigation'],
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2);
}

function calculateWordFrequency(words: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  words.forEach(word => {
    if (!STOP_WORDS.has(word)) {
      freq.set(word, (freq.get(word) || 0) + 1);
    }
  });
  return freq;
}

function extractKeywords(words: string[], topN: number = 10): Array<{ word: string; frequency: number; density: number }> {
  const freq = calculateWordFrequency(words);
  const totalWords = words.filter(w => !STOP_WORDS.has(w)).length;
  
  return Array.from(freq.entries())
    .map(([word, frequency]) => ({
      word,
      frequency,
      density: (frequency / totalWords) * 100,
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, topN);
}

function calculateKeywordDensity(keywords: Array<{ word: string; frequency: number; density: number }>): number {
  return keywords.reduce((sum, kw) => sum + kw.density, 0);
}

function detectKeywordStuffing(keywords: Array<{ word: string; frequency: number; density: number }>): 'none' | 'low' | 'high' {
  const maxDensity = Math.max(...keywords.map(kw => kw.density));
  if (maxDensity > 5) return 'high';
  if (maxDensity > 3) return 'low';
  return 'none';
}

function analyzeKeywordDistribution(text: string, keywords: string[]): 'natural' | 'forced' | 'over-optimized' {
  if (keywords.length === 0) return 'natural';
  
  const paragraphs = text.split(/\n\n+/);
  const keywordCounts = paragraphs.map(para => {
    return keywords.filter(kw => para.toLowerCase().includes(kw.toLowerCase())).length;
  });
  
  const avgCount = keywordCounts.reduce((a, b) => a + b, 0) / paragraphs.length;
  const maxCount = Math.max(...keywordCounts);
  
  if (maxCount > avgCount * 3) return 'over-optimized';
  if (avgCount > 2) return 'forced';
  return 'natural';
}

function clusterTopics(keywords: Array<{ word: string; frequency: number }>): Array<{ topic: string; relevance: number; keywords: string[] }> {
  // Simple topic clustering based on domain detection
  const topics: Array<{ topic: string; relevance: number; keywords: string[] }> = [];
  
  Object.entries(TECHNICAL_DOMAINS).forEach(([domain, domainKeywords]) => {
    const matchingKeywords = keywords.filter(kw =>
      domainKeywords.some(dk => kw.word.includes(dk) || dk.includes(kw.word))
    );
    
    if (matchingKeywords.length > 0) {
      topics.push({
        topic: domain.charAt(0).toUpperCase() + domain.slice(1),
        relevance: (matchingKeywords.length / keywords.length) * 100,
        keywords: matchingKeywords.map(kw => kw.word).slice(0, 5),
      });
    }
  });
  
  // Add "General" topic if no specific domain detected
  if (topics.length === 0) {
    topics.push({
      topic: 'General',
      relevance: 100,
      keywords: keywords.slice(0, 5).map(kw => kw.word),
    });
  }
  
  return topics.sort((a, b) => b.relevance - a.relevance);
}

function calculateVocabularyDiversity(words: string[]): number {
  const uniqueWords = new Set(words.filter(w => !STOP_WORDS.has(w)));
  const totalWords = words.filter(w => !STOP_WORDS.has(w)).length;
  return totalWords > 0 ? uniqueWords.size / totalWords : 0;
}

function calculateLexicalDensity(words: string[]): number {
  const contentWords = words.filter(w => !FUNCTION_WORDS.has(w));
  return words.length > 0 ? contentWords.length / words.length : 0;
}

function calculateAbstractConceptRatio(text: string): number {
  const lowerText = text.toLowerCase();
  const abstractCount = ABSTRACT_TERMS.filter(term => lowerText.includes(term)).length;
  const totalWords = text.split(/\s+/).length;
  return totalWords > 0 ? (abstractCount / totalWords) * 100 : 0;
}

function analyzeSentences(text: string): { avg: number; variety: 'low' | 'medium' | 'high' } {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const lengths = sentences.map(s => s.split(/\s+/).length);
  
  const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length || 0;
  const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avg, 2), 0) / lengths.length;
  const stdDev = Math.sqrt(variance);
  
  let variety: 'low' | 'medium' | 'high' = 'medium';
  if (stdDev < 5) variety = 'low';
  else if (stdDev > 10) variety = 'high';
  
  return { avg, variety };
}

function analyzeSentiment(text: string): { score: number; label: 'negative' | 'neutral' | 'positive' } {
  // Simple sentiment analysis using positive/negative word lists
  const positiveWords = ['good', 'great', 'excellent', 'best', 'amazing', 'wonderful', 'fantastic', 'perfect', 'outstanding', 'superior', 'innovative', 'effective', 'powerful', 'successful', 'beneficial'];
  const negativeWords = ['bad', 'poor', 'worst', 'terrible', 'awful', 'horrible', 'fail', 'failure', 'weak', 'inferior', 'ineffective', 'useless', 'problematic', 'difficult', 'issue'];
  
  const lowerText = text.toLowerCase();
  const positiveCount = positiveWords.filter(w => lowerText.includes(w)).length;
  const negativeCount = negativeWords.filter(w => lowerText.includes(w)).length;
  
  const totalSentimentWords = positiveCount + negativeCount;
  const score = totalSentimentWords > 0 ? (positiveCount - negativeCount) / totalSentimentWords : 0;
  
  let label: 'negative' | 'neutral' | 'positive' = 'neutral';
  if (score > 0.2) label = 'positive';
  else if (score < -0.2) label = 'negative';
  
  return { score, label };
}

function analyzeTone(text: string): { formal: number; conversational: number; technical: number; persuasive: number } {
  const lowerText = text.toLowerCase();
  const totalWords = text.split(/\s+/).length;
  
  // Formal indicators
  const formalTerms = ['therefore', 'furthermore', 'consequently', 'nevertheless', 'moreover', 'thus', 'hence', 'accordingly'];
  const formalCount = formalTerms.filter(term => lowerText.includes(term)).length;
  
  // Conversational indicators
  const conversationalTerms = ["you're", "we're", "let's", "you'll", 'really', 'very', 'pretty', 'quite', 'basically'];
  const conversationalCount = conversationalTerms.filter(term => lowerText.includes(term)).length;
  
  // Technical indicators
  const technicalCount = Object.values(TECHNICAL_DOMAINS).flat().filter(term => lowerText.includes(term)).length;
  
  // Persuasive indicators
  const persuasiveTerms = ['should', 'must', 'need', 'can', 'will help', 'best', 'proven', 'guarantee', 'ensure', 'improve'];
  const persuasiveCount = persuasiveTerms.filter(term => lowerText.includes(term)).length;
  
  const normalize = (count: number) => Math.min((count / totalWords) * 1000, 100);
  
  return {
    formal: normalize(formalCount),
    conversational: normalize(conversationalCount),
    technical: normalize(technicalCount),
    persuasive: normalize(persuasiveCount),
  };
}

function extractEntities(text: string): {
  people: string[];
  organizations: string[];
  locations: string[];
  products: string[];
  concepts: string[];
} {
  // Simple entity extraction using capitalization and context
  const sentences = text.split(/[.!?]+/);
  const capitalizedWords = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
  
  // Filter out sentence-starting words
  const entities = capitalizedWords.filter((word, idx) => {
    // Skip if it's the first word of a sentence
    const precedingText = text.substring(0, text.indexOf(word));
    return !precedingText.endsWith('. ') && !precedingText.endsWith('? ') && !precedingText.endsWith('! ');
  });
  
  const uniqueEntities = Array.from(new Set(entities));
  
  // Basic classification (simplified - in production would use ML model)
  return {
    people: uniqueEntities.filter(e => e.split(' ').length === 2 && !e.includes('Inc') && !e.includes('LLC')).slice(0, 5),
    organizations: uniqueEntities.filter(e => e.includes('Inc') || e.includes('LLC') || e.includes('Corp') || e.length > 15).slice(0, 5),
    locations: [], // Would require geo-database
    products: uniqueEntities.filter(e => e.split(' ').length <= 2 && e.length < 20).slice(0, 5),
    concepts: ABSTRACT_TERMS.filter(term => text.includes(term)).slice(0, 5),
  };
}

function classifyContentType(text: string, keywords: string[]): {
  type: 'informational' | 'commercial' | 'navigational' | 'transactional' | 'mixed';
  intent: string[];
} {
  const lowerText = text.toLowerCase();
  
  const informationalSignals = ['what is', 'how to', 'guide', 'tutorial', 'learn', 'understand', 'explain', 'definition'];
  const commercialSignals = ['buy', 'price', 'cost', 'discount', 'sale', 'offer', 'deal', 'shop', 'product'];
  const transactionalSignals = ['download', 'register', 'signup', 'subscribe', 'order', 'purchase', 'contact', 'request'];
  const navigationalSignals = ['home', 'about', 'contact', 'services', 'products', 'login', 'account'];
  
  const scores = {
    informational: informationalSignals.filter(s => lowerText.includes(s)).length,
    commercial: commercialSignals.filter(s => lowerText.includes(s)).length,
    transactional: transactionalSignals.filter(s => lowerText.includes(s)).length,
    navigational: navigationalSignals.filter(s => lowerText.includes(s)).length,
  };
  
  const maxScore = Math.max(...Object.values(scores));
  const dominantTypes = Object.entries(scores).filter(([_, score]) => score === maxScore && score > 0);
  
  const type: 'informational' | 'commercial' | 'navigational' | 'transactional' | 'mixed' = 
    dominantTypes.length > 1 ? 'mixed' : 
    (dominantTypes[0]?.[0] as any) || 'informational';
  
  const intent: string[] = [];
  if (scores.informational > 0) intent.push('educate');
  if (scores.commercial > 0) intent.push('sell');
  if (scores.transactional > 0) intent.push('convert');
  if (scores.navigational > 0) intent.push('navigate');
  
  return { type, intent };
}

// ==================== MAIN ANALYSIS FUNCTION ====================

export function analyzeNLPContent(text: string, htmlContent: string): NLPContentAnalysis {
  const issues: string[] = [];
  const strengths: string[] = [];
  
  // Tokenization
  const words = tokenize(text);
  const totalWords = words.length;
  
  // Keyword extraction
  const primaryKeywords = extractKeywords(words, 10);
  const secondaryKeywords = extractKeywords(words, 20).slice(10);
  const keywordDensity = calculateKeywordDensity(primaryKeywords);
  const keywordStuffingRisk = detectKeywordStuffing(primaryKeywords);
  const keywordDistribution = analyzeKeywordDistribution(text, primaryKeywords.map(kw => kw.word));
  
  // Topic analysis
  const detectedTopics = clusterTopics(primaryKeywords);
  const mainTopic = detectedTopics[0]?.topic || 'General';
  const subtopics = detectedTopics.slice(1, 4).map(t => t.topic);
  const topicCohesion = detectedTopics.length > 0 ? Math.min(detectedTopics[0].relevance * 1.5, 100) : 50;
  const topicDiversity = Math.min(detectedTopics.length * 25, 100);
  
  // Semantic analysis
  const vocabularyDiversity = calculateVocabularyDiversity(words);
  const lexicalDensity = calculateLexicalDensity(words);
  const abstractConceptRatio = calculateAbstractConceptRatio(text);
  const semanticRichness = Math.round((vocabularyDiversity + lexicalDensity) * 50);
  
  // Sentence analysis
  const sentenceAnalysis = analyzeSentences(text);
  const sentenceComplexityScore = Math.min(sentenceAnalysis.avg * 3, 100);
  
  // Content uniqueness (based on vocabulary diversity and semantic richness)
  const contentUniquenessScore = Math.round((vocabularyDiversity * 0.6 + semanticRichness * 0.004) * 100);
  const estimatedOriginality = Math.min(contentUniquenessScore + (vocabularyDiversity * 20), 100);
  const duplicateContentRisk: 'low' | 'medium' | 'high' = 
    estimatedOriginality > 70 ? 'low' : estimatedOriginality > 50 ? 'medium' : 'high';
  
  // AI comprehension scores
  const aiComprehensionScore = Math.round(
    (lexicalDensity * 0.3 + vocabularyDiversity * 0.3 + (sentenceComplexityScore / 100) * 0.2 + topicCohesion * 0.002) * 100
  );
  const structuralClarity = totalWords > 500 ? 85 : 70;
  const informationDensity = Math.min(lexicalDensity * 150, 100);
  const contextualCoherence = Math.min(topicCohesion + (topicDiversity / 2), 100);
  
  // Content type classification
  const { type: contentType, intent: contentIntent } = classifyContentType(text, primaryKeywords.map(kw => kw.word));
  
  // Target audience detection
  const targetAudience: 'general' | 'technical' | 'professional' | 'academic' = 
    abstractConceptRatio > 3 ? 'academic' :
    lexicalDensity > 0.6 ? 'technical' :
    vocabularyDiversity > 0.5 ? 'professional' :
    'general';
  
  // Sentiment & tone
  const sentiment = analyzeSentiment(text);
  const toneAnalysis = analyzeTone(text);
  
  // Entity recognition
  const entities = extractEntities(htmlContent);
  
  // Issues and strengths
  if (keywordStuffingRisk === 'high') {
    issues.push(`Keyword stuffing detected. Primary keyword density is ${primaryKeywords[0]?.density.toFixed(2)}%. Keep it under 3%.`);
  } else if (keywordStuffingRisk === 'none') {
    strengths.push('✓ Natural keyword usage without stuffing');
  }
  
  if (keywordDistribution === 'over-optimized') {
    issues.push('Keywords appear unevenly distributed. Distribute keywords naturally throughout content.');
  } else if (keywordDistribution === 'natural') {
    strengths.push('✓ Keywords naturally distributed across content');
  }
  
  if (vocabularyDiversity < 0.3) {
    issues.push(`Low vocabulary diversity (${(vocabularyDiversity * 100).toFixed(1)}%). Use more varied terminology.`);
  } else if (vocabularyDiversity > 0.5) {
    strengths.push(`✓ High vocabulary diversity (${(vocabularyDiversity * 100).toFixed(1)}%) - rich language`);
  }
  
  if (semanticRichness < 40) {
    issues.push('Content lacks semantic richness. Add more descriptive and contextual terms.');
  } else if (semanticRichness > 70) {
    strengths.push('✓ High semantic richness - content is detailed and contextual');
  }
  
  if (topicCohesion < 50) {
    issues.push('Low topic cohesion. Focus content more clearly on main topic.');
  } else {
    strengths.push('✓ Strong topic cohesion - content stays focused');
  }
  
  if (contentUniquenessScore < 50) {
    issues.push('Content appears generic. Add unique insights, data, or perspectives.');
  } else if (contentUniquenessScore > 75) {
    strengths.push('✓ High content uniqueness score - original and distinctive');
  }
  
  if (aiComprehensionScore < 60) {
    issues.push('Content may be difficult for AI to comprehend. Improve structure and clarity.');
  } else if (aiComprehensionScore > 80) {
    strengths.push('✓ Excellent AI comprehension score - highly parseable content');
  }
  
  // Content gaps
  const missingTopics: string[] = [];
  const contentGaps: string[] = [];
  
  if (totalWords < 500) {
    contentGaps.push('Short content. Consider expanding to 1000+ words for better AI citation potential.');
  }
  
  if (entities.people.length === 0 && entities.organizations.length === 0) {
    contentGaps.push('No named entities detected. Add references to experts, organizations, or specific sources.');
  }
  
  if (primaryKeywords.length < 5) {
    contentGaps.push('Limited keyword coverage. Expand content to cover more related terms.');
  }
  
  // Improvement suggestions
  const improvementSuggestions: string[] = [];
  
  if (vocabularyDiversity < 0.4) {
    improvementSuggestions.push('Use synonyms and varied terminology to increase vocabulary richness');
  }
  
  if (sentenceAnalysis.variety === 'low') {
    improvementSuggestions.push('Vary sentence length for better readability and engagement');
  }
  
  if (topicDiversity < 50) {
    improvementSuggestions.push('Cover related subtopics to demonstrate comprehensive expertise');
  }
  
  if (abstractConceptRatio < 0.5 && targetAudience !== 'general') {
    improvementSuggestions.push('Add conceptual frameworks or theoretical perspectives to increase depth');
  }
  
  return {
    contentUniquenessScore,
    estimatedOriginality,
    duplicateContentRisk,
    primaryKeywords,
    secondaryKeywords,
    keywordDensity,
    keywordStuffingRisk,
    keywordDistribution,
    detectedTopics,
    topicCohesion,
    topicDiversity,
    mainTopic,
    subtopics,
    semanticRichness,
    vocabularyDiversity,
    lexicalDensity,
    abstractConceptRatio,
    averageSentenceLength: sentenceAnalysis.avg,
    sentenceLengthVariety: sentenceAnalysis.variety,
    sentenceComplexityScore,
    aiComprehensionScore,
    structuralClarity,
    informationDensity,
    contextualCoherence,
    contentType,
    contentIntent,
    targetAudience,
    sentimentScore: sentiment.score,
    sentimentLabel: sentiment.label,
    toneAnalysis,
    entities,
    missingTopics,
    contentGaps,
    improvementSuggestions,
    issues,
    strengths,
  };
}
