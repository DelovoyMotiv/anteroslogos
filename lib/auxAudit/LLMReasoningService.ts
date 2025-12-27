/**
 * LLM Reasoning Service
 * 
 * This service uses OpenRouter to analyze scraped website data and provide
 * AI-powered insights about agent actionability.
 * 
 * The service:
 * 1. Builds a comprehensive prompt with scraped data
 * 2. Sends the prompt to OpenRouter for LLM analysis
 * 3. Parses and validates the structured JSON response
 * 4. Returns actionable insights including AUX Score, recommendations, and intent triggers
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { createEnhancedOpenRouterClient } from '../citationIntelligence/llm/enhancedClient';
import type {
  ScrapedData,
  LLMAnalysis,
  Recommendation,
  IntentTrigger,
  RiskLevel,
} from './types';

/**
 * LLMReasoningService
 * 
 * Analyzes scraped website data using LLM reasoning to generate
 * AUX Score, recommendations, and intent triggers.
 */
export class LLMReasoningService {
  /**
   * Analyze scraped data using LLM reasoning
   * 
   * @param data - Scraped website data
   * @returns Promise resolving to LLM analysis results
   * @throws Error if LLM service is unavailable or response is invalid
   * 
   * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
   */
  async analyzeAUX(data: ScrapedData): Promise<LLMAnalysis> {
    // Create OpenRouter client
    const client = createEnhancedOpenRouterClient();
    
    if (!client) {
      throw new Error('LLM service is not configured. Please set OPENROUTER_API_KEY environment variable.');
    }
    
    try {
      // Build the prompt with scraped data
      const prompt = this.buildPrompt(data);
      
      // Call OpenRouter API
      const response = await client.chatWithModel(
        'anthropic/claude-sonnet-4.5', // Use Claude for structured reasoning
        [
          {
            role: 'system',
            content: this.getSystemPrompt(),
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        {
          temperature: 0.3, // Lower temperature for more consistent structured output
          maxTokens: 2000,
          taskType: 'analysis',
        }
      );
      
      // Parse and validate the response
      const analysis = this.parseResponse(response);
      
      return analysis;
    } catch (error) {
      // Re-throw with more context
      if (error instanceof Error) {
        throw new Error(`LLM analysis failed: ${error.message}`);
      }
      throw new Error('LLM analysis failed with unknown error');
    }
  }
  
  /**
   * Build prompt with scraped data
   * 
   * Creates a comprehensive prompt that includes all relevant scraped data
   * for the LLM to analyze.
   * 
   * @param data - Scraped website data
   * @returns Formatted prompt string
   * 
   * Requirements: 7.3
   */
  buildPrompt(data: ScrapedData): string {
    const {
      ariaScore,
      protocols,
      interactiveElements,
      frictionPoints,
      forms,
    } = data;
    
    // Build protocol summary
    const protocolSummary = protocols.length > 0
      ? protocols.map(p => `- ${p.name}: ${p.available ? '✓ Available' : '✗ Not Found'}`).join('\n')
      : 'No agent-specific protocols detected';
    
    // Build interactive elements summary
    const elementsSummary = interactiveElements.length > 0
      ? `Found ${interactiveElements.length} interactive elements:\n` +
        interactiveElements.slice(0, 10).map(el => 
          `- ${el.tag} (${el.selector}): ${el.hasAriaLabel ? `aria-label="${el.ariaLabel}"` : 'no aria-label'}${el.role ? `, role="${el.role}"` : ''}`
        ).join('\n') +
        (interactiveElements.length > 10 ? `\n... and ${interactiveElements.length - 10} more` : '')
      : 'No interactive elements found';
    
    // Build friction points summary
    const frictionSummary = frictionPoints.length > 0
      ? frictionPoints.map(fp => `- ${fp.type} (${fp.severity}): ${fp.description}`).join('\n')
      : 'No friction points detected';
    
    // Build forms summary
    const formsSummary = forms.length > 0
      ? `Found ${forms.length} forms:\n` +
        forms.map(f => `- Form: ${f.action || 'no action'} (${f.method || 'GET'}), ${f.inputs.length} inputs`).join('\n')
      : 'No forms found';
    
    return `Analyze the following website data for autonomous agent actionability:

## ARIA Accessibility Score
${ariaScore.toFixed(1)}% of interactive elements have proper ARIA labels or roles

## Agent Protocols
${protocolSummary}

## Interactive Elements
${elementsSummary}

## Friction Points
${frictionSummary}

## Forms
${formsSummary}

Based on this data, provide a comprehensive analysis of how well this website supports autonomous AI agents (like OpenAI Operator or Claude Computer Use) in completing tasks such as purchasing, booking, or logging in.

Your response must be valid JSON with the following structure:
{
  "score": <number 0-100>,
  "frictionPoints": [<array of strings describing friction points>],
  "riskLevel": "<low|medium|high>",
  "summary": "<string summarizing the analysis>",
  "recommendations": [
    {
      "title": "<string>",
      "description": "<string>",
      "priority": "<low|medium|high>",
      "impact": <number 0-100>,
      "codeExample": "<optional string>",
      "docLink": "<optional string>"
    }
  ],
  "intentTriggers": [
    {
      "intent": "<string: buy|book|login|signup|search|contact|etc>",
      "selector": "<string: CSS selector>",
      "confidence": "<low|medium|high>",
      "element": {
        "tag": "<string>",
        "selector": "<string>",
        "hasAriaLabel": <boolean>,
        "ariaLabel": "<optional string>",
        "role": "<optional string>",
        "text": "<optional string>"
      }
    }
  ]
}`;
  }
  
  /**
   * Get system prompt for LLM
   * 
   * Returns the system prompt that instructs the LLM to act as an
   * autonomous agent evaluating website actionability.
   * 
   * @returns System prompt string
   * 
   * Requirements: 7.2
   */
  private getSystemPrompt(): string {
    return `You are an expert autonomous AI agent evaluating website actionability. Your role is to assess how well websites support autonomous agents (like OpenAI Operator, Claude Computer Use, or similar systems) in completing tasks.

You understand:
- Agent-specific protocols (agents.json, ai-plugin.json, mcp.json)
- ARIA accessibility and semantic HTML
- Common friction points (CAPTCHAs, interstitials, canvas-based UIs)
- Intent detection and action triggers
- Best practices for agent-friendly web design

Your analysis should be:
- Objective and data-driven
- Focused on actionability (can agents complete tasks?)
- Practical with specific, implementable recommendations
- Structured and consistent

When scoring (0-100):
- 0-49: Agent-Blind (major barriers, agents cannot complete tasks)
- 50-80: Agent-Capable (some support, agents can complete basic tasks with difficulty)
- 81-100: Agent-Ready (excellent support, agents can easily complete tasks)

Consider:
- Protocol availability (higher score if protocols present)
- ARIA density (higher score if elements are well-labeled)
- Friction points (lower score for CAPTCHAs, interstitials, etc.)
- Form accessibility (higher score if forms are semantic and labeled)
- Intent clarity (higher score if actions are clearly identifiable)

Always respond with valid JSON matching the specified structure.`;
  }
  
  /**
   * Parse and validate LLM response
   * 
   * Extracts JSON from the response and validates it has all required fields.
   * 
   * @param response - Raw LLM response string
   * @returns Parsed and validated LLM analysis
   * @throws Error if response is invalid or missing required fields
   * 
   * Requirements: 7.5
   */
  parseResponse(response: string): LLMAnalysis {
    try {
      // Try to extract JSON from response (handle markdown code blocks)
      let jsonStr = response.trim();
      
      // Remove markdown code blocks if present
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Parse JSON
      const parsed = JSON.parse(jsonStr);
      
      // Validate required fields
      if (typeof parsed.score !== 'number') {
        throw new Error('Missing or invalid "score" field');
      }
      
      if (!Array.isArray(parsed.frictionPoints)) {
        throw new Error('Missing or invalid "frictionPoints" field');
      }
      
      if (!['low', 'medium', 'high'].includes(parsed.riskLevel)) {
        throw new Error('Missing or invalid "riskLevel" field');
      }
      
      if (typeof parsed.summary !== 'string') {
        throw new Error('Missing or invalid "summary" field');
      }
      
      if (!Array.isArray(parsed.recommendations)) {
        throw new Error('Missing or invalid "recommendations" field');
      }
      
      if (!Array.isArray(parsed.intentTriggers)) {
        throw new Error('Missing or invalid "intentTriggers" field');
      }
      
      // Validate score range
      if (parsed.score < 0 || parsed.score > 100) {
        throw new Error('Score must be between 0 and 100');
      }
      
      // Validate recommendations structure
      for (const rec of parsed.recommendations) {
        if (!rec.title || !rec.description || !rec.priority || typeof rec.impact !== 'number') {
          throw new Error('Invalid recommendation structure');
        }
        if (!['low', 'medium', 'high'].includes(rec.priority)) {
          throw new Error('Invalid recommendation priority');
        }
        if (rec.impact < 0 || rec.impact > 100) {
          throw new Error('Recommendation impact must be between 0 and 100');
        }
      }
      
      // Validate intent triggers structure
      for (const trigger of parsed.intentTriggers) {
        if (!trigger.intent || !trigger.selector || !trigger.confidence || !trigger.element) {
          throw new Error('Invalid intent trigger structure');
        }
        if (!['low', 'medium', 'high'].includes(trigger.confidence)) {
          throw new Error('Invalid intent trigger confidence');
        }
      }
      
      // Return validated analysis
      return {
        score: parsed.score,
        frictionPoints: parsed.frictionPoints,
        riskLevel: parsed.riskLevel as RiskLevel,
        summary: parsed.summary,
        recommendations: parsed.recommendations as Recommendation[],
        intentTriggers: parsed.intentTriggers as IntentTrigger[],
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Failed to parse LLM response as JSON: ${error.message}`);
      }
      throw error;
    }
  }
}
