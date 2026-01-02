/**
 * Prompt builders for Agent Manifest Generator
 * System and user prompts for LLM-based manifest generation
 * 
 * @module lib/agentManifest/prompts
 * @version 2.0.0
 */

import type { ScrapedContent } from './types';

/**
 * Truth Engine Prompt Builder
 * Builds prompts that enforce content-only analysis without inference
 * 
 * This class ensures the LLM operates as a "Truth Engine" that:
 * - Analyzes ONLY provided scraped content
 * - Does NOT infer functionality from URLs or domain names
 * - Does NOT use general knowledge about brands
 * - Returns errors when context is insufficient
 */
export class TruthEnginePromptBuilder {
  /**
   * Builds the system prompt for Truth Engine mode
   * Enforces strict constraints against hallucination and inference
   * 
   * @returns System prompt string with Truth Engine constraints
   */
  buildSystemPrompt(): string {
    return `You are a Truth Engine for generating agents.json manifests.

Your task is to analyze scraped website content and generate a structured agents.json file 
that represents ONLY what is explicitly present in the provided content.

CRITICAL CONSTRAINTS:
1. Analyze ONLY the provided scraped content
2. Do NOT infer functionality from the URL or domain name
3. Do NOT use general knowledge about the brand or company
4. If the provided content is insufficient to generate a meaningful manifest, return an error status
5. Base ALL descriptions on actual text from the scraped page
6. Extract identity information from the actual page title and description
7. Identify knowledge entries from actual links and headings found on the page

FORBIDDEN ACTIONS:
- Inferring features from domain names (e.g., "stripe.com" → payment processing)
- Using general knowledge about companies or brands
- Inventing capabilities not explicitly mentioned in the content
- Creating generic descriptions not based on page text
- Assuming typical website structures without evidence

REQUIRED ACTIONS:
- Extract identity information from the provided page title and description
- Identify knowledge entries from actual links and headings in the content
- Use exact or paraphrased text from the page for all descriptions
- Return an error if the content is too vague, generic, or insufficient
- Ensure all knowledge entry URLs are from the actual links found on the page

The agents.json format includes:
- Identity information (brand name, description, tags)
- Knowledge entries (key pages with their roles and descriptions)
- Actions (available API endpoints or interactive features)

SCHEMA STRUCTURE:
{
  "$schema": "https://anoteroslogos.com/schemas/agents-v1.json",
  "version": "1.0",
  "identity": {
    "name": "[Brand Name from page title]",
    "description": "[Description from page content]",
    "tags": ["Tags based on page content"]
  },
  "knowledge": [
    {
      "role": "documentation|pricing|about|product|contact|support",
      "url": "/[path from actual links]",
      "description": "[Description from page content]"
    }
  ],
  "actions": []
}

SEMANTIC ROLES (use these for knowledge entries):
- documentation: Technical guides, API docs, developer resources
- pricing: Cost structure, plans, pricing information
- about: Company information, team, mission, history
- product: Product pages, features, specifications
- contact: Contact forms, support channels, communication
- support: Help center, FAQs, troubleshooting guides

FORBIDDEN TERMS (do NOT use):
- axiom, theorem, lemma, corollary, definition
- semantic topology, knowledge topology
- Any academic or mathematical terminology

ERROR HANDLING:
If the provided content is insufficient (too short, too generic, or lacks clear structure), 
respond with:
{
  "error": "INSUFFICIENT_CONTEXT",
  "message": "The provided content is insufficient to generate a meaningful manifest."
}

Otherwise, return ONLY valid JSON following the schema above - no markdown, no explanations.`;
  }

  /**
   * Builds the user prompt with scraped content
   * Includes all scraped content elements for analysis
   * 
   * @param content - Scraped content from the website
   * @returns User prompt string with scraped content
   */
  buildUserPrompt(content: ScrapedContent): string {
    // Truncate text content to first 1000 characters for prompt
    const textExcerpt = content.textContent.substring(0, 1000);
    
    // Format headings as a numbered list
    const headingsList = content.headings.length > 0
      ? content.headings.map((h, i) => `${i + 1}. ${h}`).join('\n')
      : '(No headings found)';
    
    // Format links as a numbered list (limit to first 20 for prompt size)
    const linksList = content.links.length > 0
      ? content.links.slice(0, 20).map((link, i) => `${i + 1}. ${link}`).join('\n')
      : '(No links found)';
    
    return `Generate an agents.json manifest based ONLY on the following scraped content:

URL: ${content.url}

TITLE: ${content.title}

DESCRIPTION: ${content.description}

HEADINGS:
${headingsList}

LINKS (first 20):
${linksList}

TEXT EXCERPT (first 1000 characters):
${textExcerpt}

INSTRUCTIONS:
1. Use the title and description for identity information
2. Identify 3-5 knowledge entries from the links and headings above
3. Use actual text from the page for all descriptions
4. Ensure all knowledge entry URLs are from the links listed above
5. If you cannot identify clear knowledge entries from this content, return an error

Remember: Analyze ONLY the content provided above. Do NOT use general knowledge about this domain.
Return ONLY the JSON object, no markdown formatting or explanations.`;
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use TruthEnginePromptBuilder.buildSystemPrompt() instead
 */
export function buildSystemPrompt(): string {
  const builder = new TruthEnginePromptBuilder();
  return builder.buildSystemPrompt();
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use TruthEnginePromptBuilder.buildUserPrompt() instead
 */
export function buildUserPrompt(url: string): string {
  // Legacy function only accepts URL, not scraped content
  // This is maintained for backward compatibility but should not be used
  return `Generate an agents.json file for the following website:

URL: ${url}

Note: This is a legacy prompt format. New implementations should use TruthEnginePromptBuilder with scraped content.

Remember: Return ONLY the JSON object, no markdown formatting or explanations.`;
}
