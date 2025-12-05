# Citation Intelligence Configuration

This directory contains configuration modules for the Citation Intelligence Engine's LLM integration.

## Model Registry

The `modelRegistry.ts` module provides centralized configuration for multi-model LLM integration via OpenRouter.

### Features

- **Model Pricing**: Comprehensive pricing information for all supported models (USD per 1M tokens)
- **Model Registry**: Task-specific model configurations with fallback options
- **Model Selection**: Automatic model selection based on task type
- **Cost Calculation**: Utilities for estimating API costs
- **Environment Integration**: Support for environment variable overrides

### Supported Models

#### Content Optimization (`content_opt`)
- **Primary**: `anthropic/claude-sonnet-4.5` ($3/$15 per 1M tokens)
- **Fallback**: `anthropic/claude-3.5-sonnet`
- **Use Case**: Generating citation-optimized content variations

#### Fact Checking (`fact_check`)
- **Primary**: `openai/gpt-5.1` ($10/$30 per 1M tokens)
- **Fallback**: `openai/gpt-4-turbo`
- **Use Case**: Validating factual accuracy and entity extraction

#### Schema Generation (`schema_gen`)
- **Primary**: `google/gemini-3-pro-preview` ($1.25/$5 per 1M tokens)
- **Fallback**: `google/gemini-pro-1.5`
- **Use Case**: Generating structured JSON-LD schema

#### Analysis (`analysis`)
- **Primary**: `x-ai/grok-4` ($5/$15 per 1M tokens)
- **Fallback**: `anthropic/claude-3.5-sonnet`
- **Use Case**: Competitive analysis and strategic insights

### Usage Examples

```typescript
import {
  getModelForTask,
  getFallbackModel,
  getModelPricing,
  calculateEstimatedCost,
} from './modelRegistry';

// Get model for a specific task
const model = getModelForTask('content_opt');
// Returns: 'anthropic/claude-sonnet-4.5'

// Get fallback model
const fallback = getFallbackModel(model);
// Returns: 'anthropic/claude-3.5-sonnet'

// Get pricing information
const pricing = getModelPricing(model);
// Returns: { input: 3.0, output: 15.0, cached: 0.3 }

// Calculate estimated cost
const cost = calculateEstimatedCost(model, 1000, 500);
// Returns: 0.0105 (in USD)
```

### Environment Variables

The model registry supports environment variable overrides:

```bash
# Override default models
VITE_OPENROUTER_MODEL_CONTENT_OPT=anthropic/claude-sonnet-4.5
VITE_OPENROUTER_MODEL_FACT_CHECK=openai/gpt-5.1
VITE_OPENROUTER_MODEL_SCHEMA=google/gemini-3-pro-preview
VITE_OPENROUTER_MODEL_ANALYSIS=x-ai/grok-4

# Rate limiting and budget
VITE_OPENROUTER_RATE_LIMIT_RPM=10
VITE_OPENROUTER_BUDGET_LIMIT=100
VITE_OPENROUTER_ALERT_THRESHOLD=80
```

### Testing

Comprehensive unit tests are provided in `__tests__/modelRegistry.test.ts`:

```bash
npm test lib/citationIntelligence/config/__tests__/modelRegistry.test.ts
```

All tests passing (35/35) ✅

### API Reference

#### Constants

- `MODEL_PRICING`: Pricing information for all supported models
- `MODEL_REGISTRY`: Complete model configurations by task type

#### Functions

- `getModelForTask(taskType)`: Get primary model for a task type
- `getFallbackModel(model)`: Get fallback model for a given model
- `getModelPricing(model)`: Get pricing information for a model
- `getModelConfig(taskType)`: Get complete configuration for a task type
- `getAvailableTaskTypes()`: Get all supported task types
- `isTaskTypeSupported(taskType)`: Check if a task type is supported
- `getAllModels()`: Get all primary models in the registry
- `calculateEstimatedCost(model, promptTokens, completionTokens, cachedTokens?)`: Calculate estimated cost
- `getModelFromEnv(taskType)`: Get model from environment or registry default
- `validateEnvironmentConfig()`: Validate environment configuration

### Next Steps

This module is part of Task 3.1.1 (Multi-Model Configuration System). Next steps:

1. ✅ Task 3.1.1: Multi-Model Configuration System (COMPLETED)
2. Task 3.1.2: Rate Limiting (Token Bucket)
3. Task 3.1.3: Cost Tracking & Budget Alerts
4. Task 3.1.4: Enhanced Retry Logic
5. Task 3.1.5: Parallel Request Capability
6. Task 3.1.6: Enhanced OpenRouter Client Wrapper

### Related Files

- `../types/llm.types.ts`: TypeScript type definitions
- `__tests__/modelRegistry.test.ts`: Unit tests
- `../../README.md`: Citation Intelligence Engine overview
