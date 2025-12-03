# Architecture Overview

## System Architecture

AI-powered SEO audit platform with multi-tenant support, blockchain integration, and advanced analytics.

## Core Components

### Frontend
- **Framework**: React + TypeScript + Vite
- **UI**: Tailwind CSS
- **State Management**: React Context + Hooks
- **Routing**: React Router

### Backend
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **API**: Serverless functions (Vercel)
- **Real-time**: Supabase Realtime

### Infrastructure
- **Hosting**: Vercel
- **Database**: Supabase
- **Monitoring**: Grafana + Prometheus
- **Error Tracking**: Sentry
- **Tracing**: OpenTelemetry

## Key Features

### 1. Multi-Tenancy
- Tenant isolation at database level
- Row-Level Security (RLS) policies
- Automatic tenant provisioning on signup

### 2. Subscription System
- Multiple tiers (Free, Starter, Pro, Enterprise)
- Usage tracking and quota management
- Automated billing cycles

### 3. Job Queue System
- Priority-based job processing
- Webhook callbacks
- Batch job support
- Automatic retry logic

### 4. Security
- IP-based rate limiting
- Device fingerprinting
- Audit cooldown for free tier
- CSRF protection
- JWT with refresh tokens

### 5. Agent-to-Agent (A2A) Protocol
- Ed25519 key management
- Payment intents
- Reputation system
- Byzantine fault tolerance

### 6. Knowledge Graph
- Citation prediction
- Self-improving learning
- Network effects tracking
- Global entity relationships

## Database Schema

See `supabase/migrations/` for complete schema.

Key tables:
- `profiles` - User profiles
- `tenants` - Multi-tenant workspaces
- `user_subscriptions` - Subscription management
- `audits` - SEO audit results
- `audit_jobs` - Job queue
- `a2a_*` - Agent-to-agent protocol tables

## API Structure

```
/api
  /auth          - Authentication endpoints
  /audits        - Audit operations
  /subscriptions - Subscription management
  /tenants       - Tenant operations
  /a2a           - Agent-to-agent protocol
  /webhooks      - Webhook receivers
```

## Security Architecture

### Authentication Flow
1. User signs up → Supabase Auth
2. Profile created → `profiles` table
3. Tenant provisioned → `tenants` table
4. Free plan activated → `user_subscriptions` table

### Authorization
- Row-Level Security (RLS) on all tables
- Tenant isolation via `tenant_id`
- Service role for administrative operations

### Abuse Prevention
- Signup rate limiting (3 per IP per month)
- Device fingerprinting (3 users per device)
- Audit cooldown (24h for free tier)

## Monitoring & Observability

### Metrics
- Request rates and latency
- Error rates
- Database query performance
- Job queue depth

### Logging
- Structured logging with Winston
- Log levels: debug, info, warn, error, critical
- Correlation IDs for request tracing

### Tracing
- OpenTelemetry integration
- Distributed tracing across services
- Performance profiling

## Scalability

### Database
- Connection pooling
- Read replicas (future)
- Materialized views for analytics
- Efficient indexes

### Caching
- Redis for session data
- Browser caching for static assets
- CDN for global distribution

### Job Processing
- Horizontal scaling of workers
- Priority queues
- Automatic retry with exponential backoff

## Development Workflow

1. Local development with Vite
2. Testing with Vitest
3. Type checking with TypeScript
4. Linting with ESLint
5. Git hooks for pre-commit checks
6. CI/CD with GitHub Actions (future)

## Technology Stack

**Frontend:**
- React 18
- TypeScript 5
- Vite 5
- Tailwind CSS 3
- React Router 6

**Backend:**
- Supabase (PostgreSQL 15)
- Node.js 18+
- Serverless Functions

**Infrastructure:**
- Vercel (hosting)
- Supabase (database)
- Grafana (monitoring)
- Sentry (error tracking)

**Blockchain:**
- Hardhat
- Ethers.js
- Base L2 (Optimism)

## Future Enhancements

- GraphQL API
- WebSocket support for real-time updates
- Advanced caching strategies
- Machine learning model integration
- Mobile app (React Native)
