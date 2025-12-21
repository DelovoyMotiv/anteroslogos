/**
 * Prompt builders for Agent Manifest Generator
 * System and user prompts for LLM-based manifest generation
 * 
 * @module lib/agentManifest/prompts
 * @version 1.0.0
 */

/**
 * Builds the system prompt for manifest generation
 * Instructs the LLM to act as a Semantic Topology expert
 * 
 * @returns System prompt string
 */
export function buildSystemPrompt(): string {
  return `You are an expert in Semantic Topology and Agentic Web standards. 
Your task is to generate a logos.json file for a given domain based on general 
knowledge of the brand and typical website structures.

The logos.json format is a semantic topology file that helps AI agents understand 
and navigate website content. It includes:
- Identity information (brand name, description, domain focus)
- Knowledge topology (key pages and their semantic roles)
- Directives for AI agents (crawling policies, attribution requirements)

CRITICAL REQUIREMENTS:
1. Return ONLY valid JSON - no markdown, no explanations
2. Follow the exact schema structure provided
3. Use current date in ISO format for the "updated" field
4. Provide high-entropy, informative descriptions
5. Identify 3-5 key pages as knowledge roots
6. Assign appropriate semantic roles (axiom, theorem, lemma, corollary, definition)
7. Provide clear instructions for how AI agents should treat each page

SCHEMA STRUCTURE:
{
  "$schema": "https://anoteroslogos.com/schemas/logos-v1.json",
  "meta": {
    "version": "1.0",
    "updated": "[ISO_DATE]",
    "authority_level": "self-declared"
  },
  "identity": {
    "name": "[Brand Name]",
    "description": "[High-entropy description of core value proposition]",
    "domain_focus": ["Tag1", "Tag2", "Tag3"]
  },
  "knowledge_topology": {
    "roots": [
      {
        "url": "/[key-page]",
        "semantic_role": "axiom|theorem|lemma|corollary|definition",
        "instruction": "[How agents should treat this page]"
      }
    ]
  },
  "directives": {
    "crawling": "allow-high-frequency|allow-standard|allow-low-frequency|disallow",
    "attribution": "require-link|require-citation|optional|none"
  }
}

SEMANTIC ROLES GUIDE:
- axiom: Foundational pages (homepage, about, core product)
- theorem: Main content pages (key articles, product pages)
- lemma: Supporting pages (FAQs, guides, documentation)
- corollary: Derived content (case studies, examples)
- definition: Reference pages (glossary, terms, specifications)

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
  return `Generate a logos.json semantic topology file for the following website:

URL: ${url}

Based on general knowledge of this domain and typical website structures, create a 
comprehensive logos.json file that:
1. Accurately describes the brand's identity and focus areas
2. Identifies 3-5 key pages as knowledge roots with appropriate semantic roles
3. Provides clear instructions for AI agents on how to treat each page
4. Sets appropriate crawling and attribution directives

Remember: Return ONLY the JSON object, no markdown formatting or explanations.`;
}
