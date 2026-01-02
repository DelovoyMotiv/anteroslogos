/**
 * Manifest Generator Orchestrator
 * Orchestrates the entire manifest generation pipeline with error handling and logging
 * 
 * @module lib/agentManifest/orchestrator
 * @version 1.0.0
 */

import type { AgentsJSON, ScrapedContent } from './types';
import { ManifestGenerationError, ErrorCode, ScrapeError } from './errors';
import { ScrapingService } from './scraping';
import { LivenessValidator, EnhancedValidator } from './validation';
import { TruthEnginePromptBuilder } from './prompts';
import { createSimpleOpenRouterClient, type ChatMessage } from './openRouterClient';

/**
 * ManifestGeneratorOrchestrator class
 * Orchestrates the entire pipeline: scraping → validation → LLM generation → validation
 */
export class ManifestGeneratorOrchestrator {
  private readonly scrapingService: ScrapingService;
  private readonly livenessValidator: LivenessValidator;
  private readonly enhancedValidator: EnhancedValidator;
  private readonly promptBuilder: TruthEnginePromptBuilder;

  /**
   * Constructor
   * @param scrapingService - Optional ScrapingService instance
   * @param livenessValidator - Optional LivenessValidator instance
   * @param enhancedValidator - Optional EnhancedValidator instance
   * @param promptBuilder - Optional TruthEnginePromptBuilder instance
   */
  constructor(
    scrapingService?: ScrapingService,
    livenessValidator?: LivenessValidator,
    enhancedValidator?: EnhancedValidator,
    promptBuilder?: TruthEnginePromptBuilder
  ) {
    this.scrapingService = scrapingService || new ScrapingService();
    this.livenessValidator = livenessValidator || new LivenessValidator();
    this.enhancedValidator = enhancedValidator || new EnhancedValidator();
    this.promptBuilder = promptBuilder || new TruthEnginePromptBuilder();
  }

  /**
   * Generates a manifest for a URL
   * Orchestrates the entire pipeline with comprehensive error handling and logging
   * 
   * @param url - Target URL to generate manifest for
   * @returns Generated and validated manifest
   * @throws ManifestGenerationError with specific error codes
   */
  async generate(url: string): Promise<AgentsJSON> {
    const startTime = Date.now();
    
    // Step 1: Log start
    console.log(`[ManifestGeneratorOrchestrator] Starting manifest generation for ${url} at ${new Date().toISOString()}`);

    let scrapedContent: ScrapedContent;

    try {
      // Step 2: Scrape content
      console.log(`[ManifestGeneratorOrchestrator] Scraping content from ${url}...`);
      scrapedContent = await this.scrapingService.scrapeForManifest(url);
      
      // Step 3: Log scrape result
      console.log(
        `[ManifestGeneratorOrchestrator] Scrape completed: ` +
        `contentLength=${scrapedContent.metadata.contentLength} chars, ` +
        `textLength=${scrapedContent.metadata.textLength} chars, ` +
        `extractionMethod=${scrapedContent.metadata.extractionMethod}`
      );

    } catch (error) {
      // Handle scraping errors
      if (error instanceof ScrapeError) {
        console.error(`[ManifestGeneratorOrchestrator] Scraping failed: ${error.message}`);
        
        // Map ScrapeError codes to ManifestGenerationError codes
        let errorCode: ErrorCode;
        if (error.code === 'INSUFFICIENT_CONTENT' || error.code === 'NO_TEXT') {
          errorCode = ErrorCode.INSUFFICIENT_CONTENT;
        } else {
          errorCode = ErrorCode.SCRAPE_FAILED;
        }
        
        throw new ManifestGenerationError(
          error.message,
          errorCode,
          {
            url: error.metadata.url,
            contentLength: error.metadata.contentLength,
            textLength: error.metadata.textLength,
          },
          error
        );
      }
      
      // Handle network errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[ManifestGeneratorOrchestrator] Network error: ${errorMessage}`);
      
      // Check for specific error patterns
      if (errorMessage.includes('403') || errorMessage.includes('401')) {
        throw new ManifestGenerationError(
          'The website blocks automated access. Manual manifest creation required.',
          ErrorCode.BOT_BLOCKED,
          { url },
          error instanceof Error ? error : undefined
        );
      }
      
      if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
        throw new ManifestGenerationError(
          'Request timed out while trying to reach the website.',
          ErrorCode.NETWORK_ERROR,
          { url, operation: 'scraping' },
          error instanceof Error ? error : undefined
        );
      }
      
      throw new ManifestGenerationError(
        'Failed to scrape the website. Please check the URL and try again.',
        ErrorCode.NETWORK_ERROR,
        { url },
        error instanceof Error ? error : undefined
      );
    }

    try {
      // Step 4: Validate content liveness
      console.log(`[ManifestGeneratorOrchestrator] Validating content liveness...`);
      this.livenessValidator.validate(scrapedContent);
      
      // Step 5: Log validation result
      console.log(`[ManifestGeneratorOrchestrator] Liveness validation passed`);

    } catch (error) {
      // Handle liveness validation errors
      if (error instanceof ScrapeError) {
        console.error(`[ManifestGeneratorOrchestrator] Liveness validation failed: ${error.message}`);
        
        throw new ManifestGenerationError(
          error.message,
          ErrorCode.INSUFFICIENT_CONTENT,
          {
            url: error.metadata.url,
            contentLength: error.metadata.contentLength,
            textLength: error.metadata.textLength,
          },
          error
        );
      }
      
      throw error;
    }

    // Step 6: Build prompts
    console.log(`[ManifestGeneratorOrchestrator] Building prompts for LLM...`);
    const systemPrompt = this.promptBuilder.buildSystemPrompt();
    const userPrompt = this.promptBuilder.buildUserPrompt(scrapedContent);

    // Step 7: Call LLM service with timeout
    console.log(`[ManifestGeneratorOrchestrator] Calling LLM service...`);
    const llmStartTime = Date.now();
    
    let llmResponse: string;
    
    try {
      // Create LLM client
      const client = createSimpleOpenRouterClient();
      
      if (!client) {
        throw new ManifestGenerationError(
          'AI service is not configured. Please ensure OPENROUTER_API_KEY is set.',
          ErrorCode.SCRAPE_FAILED,
          { url }
        );
      }
      
      // Prepare messages
      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];
      
      // Call LLM with 8-second timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('LLM request timed out after 8 seconds')), 8000);
      });
      
      const llmPromise = client.chat(messages, {
        temperature: 0.7,
        max_tokens: 2000,
      });
      
      llmResponse = await Promise.race([llmPromise, timeoutPromise]);
      
      // Step 8: Log LLM result
      const llmDuration = Date.now() - llmStartTime;
      console.log(
        `[ManifestGeneratorOrchestrator] LLM generation completed: ` +
        `responseTime=${llmDuration}ms`
      );

    } catch (error) {
      const llmDuration = Date.now() - llmStartTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      console.error(
        `[ManifestGeneratorOrchestrator] LLM generation failed after ${llmDuration}ms: ${errorMessage}`
      );
      
      // Check for timeout
      if (errorMessage.includes('timed out') || errorMessage.includes('timeout')) {
        throw new ManifestGenerationError(
          'AI generation timed out. Please try again.',
          ErrorCode.LLM_TIMEOUT,
          { url, duration: llmDuration },
          error instanceof Error ? error : undefined
        );
      }
      
      // Check for insufficient context error from LLM
      if (errorMessage.includes('INSUFFICIENT_CONTEXT') || errorMessage.includes('insufficient')) {
        throw new ManifestGenerationError(
          'The provided content is insufficient to generate a meaningful manifest.',
          ErrorCode.INSUFFICIENT_CONTENT,
          { url },
          error instanceof Error ? error : undefined
        );
      }
      
      throw new ManifestGenerationError(
        'AI generation failed. Please try again.',
        ErrorCode.SCRAPE_FAILED,
        { url },
        error instanceof Error ? error : undefined
      );
    }

    // Step 9: Parse JSON response (handle markdown-wrapped JSON)
    console.log(`[ManifestGeneratorOrchestrator] Parsing JSON response...`);
    let parsedManifest: unknown;
    
    try {
      parsedManifest = this.parseManifestResponse(llmResponse);
      
      // Check if LLM returned an error
      if (
        typeof parsedManifest === 'object' &&
        parsedManifest !== null &&
        'error' in parsedManifest
      ) {
        const errorObj = parsedManifest as { error: string; message?: string };
        
        if (errorObj.error === 'INSUFFICIENT_CONTEXT') {
          throw new ManifestGenerationError(
            errorObj.message || 'The provided content is insufficient to generate a meaningful manifest.',
            ErrorCode.INSUFFICIENT_CONTENT,
            { url }
          );
        }
      }
      
    } catch (error) {
      if (error instanceof ManifestGenerationError) {
        throw error;
      }
      
      console.error(`[ManifestGeneratorOrchestrator] JSON parsing failed: ${error instanceof Error ? error.message : String(error)}`);
      
      throw new ManifestGenerationError(
        'AI generated invalid response. Please try again.',
        ErrorCode.INVALID_JSON,
        { url, rawResponse: llmResponse.substring(0, 200) },
        error instanceof Error ? error : undefined
      );
    }

    // Step 10: Validate manifest
    console.log(`[ManifestGeneratorOrchestrator] Validating generated manifest...`);
    const validationResult = this.enhancedValidator.validate(parsedManifest, scrapedContent);
    
    // Step 11: Log validation result
    if (validationResult.success) {
      console.log(`[ManifestGeneratorOrchestrator] Validation passed`);
      
      // Log warnings if present
      if (validationResult.errors && validationResult.errors.length > 0) {
        const warnings = validationResult.errors.filter(e => e.severity === 'warning');
        if (warnings.length > 0) {
          console.warn(
            `[ManifestGeneratorOrchestrator] Validation warnings: ` +
            warnings.map(w => `${w.path}: ${w.message}`).join('; ')
          );
        }
      }
    } else {
      console.error(
        `[ManifestGeneratorOrchestrator] Validation failed: ` +
        validationResult.errors?.map(e => `${e.path}: ${e.message}`).join('; ')
      );
      
      throw new ManifestGenerationError(
        'Generated manifest failed validation.',
        ErrorCode.VALIDATION_FAILED,
        {
          url,
          validationErrors: validationResult.errors,
        }
      );
    }

    // Step 12: Log completion and return
    const totalDuration = Date.now() - startTime;
    console.log(
      `[ManifestGeneratorOrchestrator] Manifest generation completed successfully in ${totalDuration}ms`
    );

    return validationResult.data!;
  }

  /**
   * Parses the LLM response and extracts JSON
   * Handles cases where LLM returns markdown-wrapped JSON
   * 
   * @param response - Raw LLM response
   * @returns Parsed JSON object
   * @throws Error if response cannot be parsed
   */
  private parseManifestResponse(response: string): unknown {
    let jsonString = response.trim();
    
    // Remove markdown code blocks if present
    if (jsonString.startsWith('```')) {
      // Extract content between ```json and ``` or ``` and ```
      const match = jsonString.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (match && match[1]) {
        jsonString = match[1].trim();
      }
    }
    
    // Try to parse JSON
    return JSON.parse(jsonString);
  }

  /**
   * Cleanup resources (browser instances)
   */
  async cleanup(): Promise<void> {
    await this.scrapingService.cleanup();
  }
}
