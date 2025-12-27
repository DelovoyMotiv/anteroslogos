/**
 * Prompt builders for Agent Manifest Generator
 * System and user prompts for LLM-based manifest generation
 * 
 * @module lib/agentManifest/prompts
 * @version 1.0.0
 */

/**
 * Builds the system prompt for manifest generation
 * Instructs the LLM to act as an Agent-Native Web standards expert
 * 
 * @returns System prompt string
 */
export function buildSystemPrompt(): string {
  return `You are an expert in Agent-Native Web standards and AI discoverability. 
Your task is to generate an agents.json file for a given domain based on general 
knowledge of the brand and typical website structures.

The agents.json format is an industry-standard file that helps AI agents understand 
and navigate website content. It includes:
- Identity information (brand name, description, tags)
- Knowledge entries (key pages with their roles and descriptions)
- Actions (available API endpoints or interactive features)

CRITICAL REQUIREMENTS:
1. Return ONLY valid JSON - no markdown, no explanations
2. Follow the exact schema structure provided
3. Use clear, accessible language - NO academic terminology
4. Provide high-entropy, informative descriptions
5. Identify 3-5 key pages as knowledge entries
6. Use standard web semantic roles (documentation, pricing, about, product, contact, support)
7. Include actions array (can be empty if no APIs are known)

SCHEMA STRUCTURE:
{
  "$schema": "https://anoteroslogos.com/schemas/agents-v1.json",
  "version": "1.0",
  "identity": {
    "name": "[Brand Name]",
    "description": "[High-entropy description of core value proposition]",
    "tags": ["Industry", "Focus", "Category"]
  },
  "knowledge": [
    {
      "role": "documentation|pricing|about|product|contact|support",
      "url": "/[path]",
      "description": "[What this page contains]"
    }
  ],
  "actions": [
    {
      "name": "[action_name]",
      "type": "GET|POST|PUT|DELETE",
      "path": "/api/[endpoint]"
    }
  ]
}

SEMANTIC ROLES GUIDE (use these, NOT academic terms):
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

Respond with ONLY the JSON object, no additional text.`;
}

/**
 * Builds the user prompt for manifest generation
 * Provides the URL and specific instructions for generation
 * 
 * @param url - The website URL to generate manifest for
 * @returns User prompt string
 */
export function buildUserPrompt(url: string): string {
  return `Generate an agents.json file for the following website:

URL: ${url}

Based on general knowledge of this domain and typical website structures, create a 
comprehensive agents.json file that:
1. Accurately describes the brand's identity and focus areas (use 2-4 tags)
2. Identifies 3-5 key pages as knowledge entries with appropriate roles
3. Uses standard web terminology (documentation, pricing, about, product, contact, support)
4. Includes an actions array (empty array [] if no known APIs)

Remember: Return ONLY the JSON object, no markdown formatting or explanations.`;
}
