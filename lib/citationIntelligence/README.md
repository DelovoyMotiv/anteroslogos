# Citation Intelligence Engine - Core Infrastructure

This directory contains the core infrastructure and data models for the Predictive Citation Intelligence Engine.

## Overview

The Citation Intelligence Engine transforms the GEO Audit system from reactive analysis to proactive prediction and automated optimization. It predicts AI citation probability and generates optimized content automatically.

## Components

### 1. Type Definitions (`types/citation-intelligence.types.ts`)

Complete TypeScript interfaces for all core data models:

- **CitationProbabilityResult**: Citation probability scores with confidence intervals
- **ForecastResult**: Temporal forecasts for future performance
- **ContentVariation**: AI-generated optimized content variations
- **EntityAuthority**: Entity credibility and citation-worthiness scores
- **TemporalData**: Historical audit data with interventions
- **KnowledgeGraph**: Structured representation of entities, relationships, and claims
- **Intervention**: Optimization interventions and causal effects
- **CitationProbabilityModel**: ML model metadata and versioning

### 2. Database Schema (`supabase/migrations/029_citation_intelligence_schema.sql`)

PostgreSQL schema with TimescaleDB extension for time series data:

#### Tables

- **citation_predictions**: Stores citation probability scores and contributing factors
- **temporal_data**: Time series data (hypertable) for historical scores and interventions
- **citation_forecasts**: Temporal forecasts for citation performance
- **kg_entities**: Knowledge graph entities with authority scores
- **kg_relationships**: Relationships between entities
- **kg_claims**: Factual claims with evidence
- **content_variations**: AI-generated optimized content variations
- **ml_models**: ML model registry with versioning
- **interventions**: Optimization interventions and causal impact
- **competitor_analysis**: Competitive intelligence data

#### Features

- **TimescaleDB Hypertables**: Optimized time series storage for temporal_data
- **Continuous Aggregates**: Pre-computed daily aggregations for performance
- **Row Level Security (RLS)**: User data isolation
- **Indexes**: Optimized for common query patterns
- **Triggers**: Automatic timestamp updates

### 3. Model Registry (`lib/citationIntelligence/modelRegistry.ts`)

Custom ML model versioning and management system:

#### Features

- Model registration and versioning
- Performance tracking (precision, recall, F1, AUC)
- Model deployment and activation
- Rollback to previous versions
- Performance degradation detection
- Model comparison

#### Usage

```typescript
import { modelRegistry } from './lib/citationIntelligence';

// Register a new model
const modelId = await modelRegistry.registerModel({
  version: 'v1.0.0',
  trainedAt: new Date(),
  features: [...],
  performance: {
    precision: 0.85,
    recall: 0.82,
    f1Score: 0.83,
    auc: 0.88,
  },
  hyperparameters: {...},
  status: 'testing',
});

// Activate model
await modelRegistry.activateModel(modelId);

// Get active model
const activeModel = await modelRegistry.getActiveModel();

// Rollback if needed
await modelRegistry.rollbackToPreviousVersion();
```

### 4. Graph Database Configuration (`lib/citationIntelligence/graphDatabase.config.ts`)

Flexible configuration supporting multiple graph database backends:

- **PostgreSQL** (default): Uses existing Supabase infrastructure
- **Neo4j** (optional): For advanced graph queries
- **ArangoDB** (optional): For multi-model support

#### Configuration

Set environment variables to configure:

```bash
# Use PostgreSQL (default)
GRAPH_DB_TYPE=postgresql

# Or use Neo4j
GRAPH_DB_TYPE=neo4j
NEO4J_HOST=localhost
NEO4J_PORT=7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password

# Or use ArangoDB
GRAPH_DB_TYPE=arangodb
ARANGODB_HOST=localhost
ARANGODB_PORT=8529
ARANGODB_USERNAME=root
ARANGODB_PASSWORD=your_password
```

### 5. PostgreSQL Graph Adapter (`lib/citationIntelligence/postgresGraphAdapter.ts`)

Graph database operations using PostgreSQL/Supabase:

#### Features

- Entity and relationship management
- Graph traversal (shortest path, BFS)
- Community detection
- PageRank calculation
- Graph metrics and analytics
- Health monitoring

#### Usage

```typescript
import { postgresGraphAdapter } from './lib/citationIntelligence';

// Connect
await postgresGraphAdapter.connect();

// Create entity
await postgresGraphAdapter.createEntity({
  id: 'entity-1',
  name: 'John Doe',
  type: 'Person',
  properties: { expertise: 'AI' },
});

// Create relationship
await postgresGraphAdapter.createRelationship({
  sourceId: 'entity-1',
  targetId: 'entity-2',
  type: 'WORKS_WITH',
  properties: { since: 2020 },
});

// Query entities
const people = await postgresGraphAdapter.queryEntitiesByType('Person');

// Calculate PageRank
const pageRank = await postgresGraphAdapter.calculatePageRank();

// Find shortest path
const path = await postgresGraphAdapter.findShortestPath('entity-1', 'entity-2');

// Detect communities
const communities = await postgresGraphAdapter.detectCommunities();

// Get metrics
const metrics = await postgresGraphAdapter.getMetrics();
```

## Database Setup

### Prerequisites

- PostgreSQL 15+ (provided by Supabase)
- TimescaleDB extension (enable in Supabase)

### Migration

Apply the migration to set up the schema:

```bash
# Using Supabase CLI
supabase db push

# Or apply directly
psql -h your-db-host -U postgres -d postgres -f supabase/migrations/029_citation_intelligence_schema.sql
```

### Enable TimescaleDB

If not already enabled in your Supabase project:

```sql
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
```

## Initialization

Initialize the Citation Intelligence Engine:

```typescript
import { initializeCitationIntelligence } from './lib/citationIntelligence';

const result = await initializeCitationIntelligence();

if (result.success) {
  console.log('Citation Intelligence Engine ready!');
} else {
  console.error('Initialization failed:', result.message);
  console.log('Component status:', result.components);
}
```

## Health Monitoring

Check system health:

```typescript
import { getCitationIntelligenceStatus } from './lib/citationIntelligence';

const status = await getCitationIntelligenceStatus();

console.log('System healthy:', status.healthy);
console.log('Database:', status.components.database);
console.log('Graph adapter:', status.components.graphAdapter);
console.log('Model registry:', status.components.modelRegistry);
```

## Configuration

The system can be configured via environment variables:

```bash
# Database
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Graph Database (optional)
GRAPH_DB_TYPE=postgresql  # or neo4j, arangodb

# Model Storage
MODEL_STORAGE_PATH=./models

# Performance
MAX_PREDICTION_TIME=500
MAX_CONTENT_GENERATION_TIME=5000
```

## Performance Optimization

### Caching

The system implements multi-level caching:

- **Citation Probability**: 1 hour TTL
- **Knowledge Graphs**: 24 hours TTL
- **Forecasts**: 6 hours TTL

### Database Optimization

- **Indexes**: Optimized for common query patterns
- **Partitioning**: Time series data partitioned by month
- **Continuous Aggregates**: Pre-computed daily statistics
- **Connection Pooling**: 10-50 connections

### Query Optimization

- Use indexes on (url, timestamp) for temporal queries
- Use materialized views for aggregate statistics
- Batch operations when possible
- Use EXPLAIN ANALYZE to optimize slow queries

## Security

### Row Level Security (RLS)

All tables have RLS policies ensuring users can only access their own data:

```sql
-- Example policy
CREATE POLICY citation_predictions_select 
ON citation_predictions 
FOR SELECT 
USING (auth.uid() = user_id);
```

### Data Privacy

- PII is scrubbed from content analysis
- URLs and domains are anonymized in analytics
- Sensitive data is encrypted at rest and in transit

## Testing

Test the infrastructure:

```typescript
import { postgresGraphAdapter, modelRegistry } from './lib/citationIntelligence';

// Test graph adapter
const health = await postgresGraphAdapter.healthCheck();
console.log('Graph adapter healthy:', health.connected);

// Test model registry
const models = await modelRegistry.listModels();
console.log('Available models:', models.length);
```

### 6. Content Optimizer (`lib/citationIntelligence/contentOptimizer.ts`)

AI-powered content variation generator that creates citation-optimized content:

#### Features

- **Variation Generation**: Creates exactly 3 distinct optimized variations per request
- **LLM Integration**: Uses OpenRouter with Claude Sonnet 4.5 for content generation
- **Score Prediction**: Calculates predicted citation probability for each variation
- **Improvement Tracking**: Measures semantic density, entity count, and claim strength improvements
- **Implementation Guidance**: Provides HTML markup, JSON-LD schema, and structural recommendations

#### Usage

```typescript
import { contentOptimizer } from './lib/citationIntelligence';

// Initialize
await contentOptimizer.initialize();

// Generate variations
const variations = await contentOptimizer.generateVariations(
  originalContent,
  knowledgeGraph,
  80, // target score (optional)
  {
    preserveFactualAccuracy: true,
    maintainEEAT: true,
    maxLengthIncrease: 30,
    targetAudience: 'technical',
  }
);

// Each variation includes:
console.log(variations[0].id);              // 'variation-1'
console.log(variations[0].content);         // Optimized content
console.log(variations[0].predictedScore);  // 85.5
console.log(variations[0].improvements);    // { semanticDensity: 25%, entityCount: 40%, ... }
console.log(variations[0].changes);         // Array of changes made
console.log(variations[0].implementation);  // { html, schema, structural }
```

#### Individual Enhancement Methods

```typescript
// Enhance semantic density
const enhanced = await contentOptimizer.enhanceSemanticDensity(content);

// Add entity relationships
const withEntities = await contentOptimizer.addEntityRelationships(
  content,
  knowledgeGraph
);

// Strengthen claims
const withStrongerClaims = await contentOptimizer.strengthenClaims(content);
```

#### Optimization Principles

The content optimizer follows these key principles:

1. **Semantic Density**: Increases information richness with technical terms and precise definitions
2. **Entity Presence**: Adds relevant entities (people, organizations, products) with context
3. **Claim Strength**: Makes factual claims backed by evidence and data
4. **Citation-Worthy Statements**: Creates quotable, authoritative statements
5. **E-E-A-T Signals**: Maintains Experience, Expertise, Authoritativeness, and Trustworthiness

#### Example

See `lib/citationIntelligence/examples/contentOptimization.example.ts` for a complete example:

```bash
npx tsx lib/citationIntelligence/examples/contentOptimization.example.ts
```

## Next Steps

After setting up the core infrastructure:

1. ✅ **Task 1**: Set up core infrastructure and data models
2. ✅ **Task 2**: Implement Citation Predictor core functionality
3. ✅ **Task 3.1**: Set up LLM integration via OpenRouter
4. ✅ **Task 3.2**: Build content variation generator
5. **Task 3.3**: Write property test for content variation count
6. **Task 3.4**: Implement factual accuracy validation
7. **Task 4**: Enhance Knowledge Graph Engine
8. **Task 5**: Implement Temporal Analyzer

## Troubleshooting

### TimescaleDB Extension Not Available

If TimescaleDB is not available in your Supabase project:

1. Contact Supabase support to enable it
2. Or use standard PostgreSQL tables (remove hypertable conversion)

### Connection Issues

Check environment variables:

```bash
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY
```

### Migration Errors

If migration fails:

1. Check PostgreSQL version (requires 15+)
2. Verify TimescaleDB extension is enabled
3. Check for conflicting table names
4. Review error logs for specific issues

## References

- [TimescaleDB Documentation](https://docs.timescale.com/)
- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Graph Queries](https://www.postgresql.org/docs/current/queries-with.html)
- [Design Document](.kiro/specs/predictive-citation-intelligence/design.md)
- [Requirements Document](.kiro/specs/predictive-citation-intelligence/requirements.md)
