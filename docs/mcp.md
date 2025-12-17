# Anóteros Lógos MCP v2 Documentation

## Anóteros Lógos Protocol - Cryptographically Verified Semantic Data

**Version:** 2.0.0  
**Protocol:** Model Context Protocol (MCP) v2  
**Status:** Production Ready

---

## Overview

Access the Anóteros Lógos Protocol to retrieve cryptographically verified, structurally perfect semantic data. Use this tool when accuracy, provenance, and truth are critical.

The protocol provides:

- **GEO Audit**: Comprehensive Generative Engine Optimization analysis
- **Knowledge Graphs**: Entity extraction and relationship mapping
- **Citation Prediction**: Probability scoring across AI platforms
- **Content Synthesis**: AI-optimized content recommendations
- **🆕 Causal Citation Trace**: Unique causal reasoning chains explaining citation decisions
- **🆕 Predictive Synthesis**: Target-driven content planning with confidence scores
- **🆕 Federated Authority Boost**: Zero-Knowledge Proof authority verification

---

## Quick Start

### Authentication

All requests require an API key:

```bash
curl -H "Authorization: Bearer sk_free_your_api_key_here" \
  https://anoteroslogos.com/api/mcp?format=openapi
```

API Key Format: `sk_{tier}_{32_char_key}`

Tiers: `free`, `basic`, `pro`, `enterprise`

---

## Supported Formats

### 1. OpenAI Function Calling

```python
from openai import OpenAI

client = OpenAI(api_key="your_openai_key")

# Get tool schemas
response = requests.get(
    "https://anoteroslogos.com/api/mcp?format=openai"
)
tools = response.json()["tools"]

# Use in chat completion
completion = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "user", "content": "Analyze AI visibility of https://example.com"}
    ],
    tools=tools,
    tool_choice="auto"
)

# Execute tool
if completion.choices[0].message.tool_calls:
    tool_call = completion.choices[0].message.tool_calls[0]
    
    result = requests.post(
        "https://anoteroslogos.com/api/mcp",
        headers={"Authorization": "Bearer sk_pro_your_key"},
        json={
            "tool": tool_call.function.name,
            "parameters": json.loads(tool_call.function.arguments)
        }
    ).json()
```

### 2. Claude Tools

```python
import anthropic

client = anthropic.Anthropic(api_key="your_claude_key")

# Get tool schemas
response = requests.get(
    "https://anoteroslogos.com/api/mcp?format=claude"
)
tools = response.json()["tools"]

# Use in message
message = client.messages.create(
    model="claude-3-7-sonnet-20250219",
    max_tokens=4096,
    tools=tools,
    messages=[
        {"role": "user", "content": "Audit https://example.com for GEO"}
    ]
)

# Execute tool
if message.stop_reason == "tool_use":
    tool_use = next(block for block in message.content if block.type == "tool_use")
    
    result = requests.post(
        "https://anoteroslogos.com/api/mcp",
        headers={"Authorization": "Bearer sk_pro_your_key"},
        json={
            "tool": tool_use.name,
            "parameters": tool_use.input
        }
    ).json()
```

### 3. Grok Tools

```python
from grok import GrokClient

client = GrokClient(api_key="your_grok_key")

# Get tool schemas
response = requests.get(
    "https://anoteroslogos.com/api/mcp?format=grok"
)
tools = response.json()["tools"]

# Use in conversation
result = client.chat(
    model="grok-3",
    messages=[
        {"role": "user", "content": "What's the citation probability for https://example.com?"}
    ],
    tools=tools
)
```

### 4. LangGraph Integration

```python
from langgraph.prebuilt import create_react_agent
from langchain_core.tools import tool
import requests

# Wrap MCP tool as LangChain tool
@tool
def audit_site(url: str, useAI: bool = False) -> dict:
    """Perform GEO audit on website"""
    response = requests.post(
        "https://anoteroslogos.com/api/mcp",
        headers={"Authorization": "Bearer sk_pro_your_key"},
        json={
            "tool": "auditSite",
            "parameters": {"url": url, "useAI": useAI}
        }
    )
    return response.json()["result"]

# Create agent
agent = create_react_agent(
    model=llm,
    tools=[audit_site],
)

# Run
for chunk in agent.stream({"messages": [("human", "Audit https://example.com")]}):
    print(chunk)
```

### 5. CrewAI Integration

```python
from crewai import Agent, Task, Crew
from crewai_tools import tool
import requests

@tool("GEO Auditor")
def geo_auditor(url: str) -> str:
    """Audit website for AI visibility"""
    response = requests.post(
        "https://anoteroslogos.com/api/mcp",
        headers={"Authorization": "Bearer sk_pro_your_key"},
        json={
            "tool": "auditSite",
            "parameters": {"url": url}
        }
    )
    return str(response.json()["result"])

# Create agent
seo_agent = Agent(
    role='GEO Specialist',
    goal='Optimize websites for AI visibility',
    tools=[geo_auditor],
    verbose=True
)

# Create task
task = Task(
    description='Audit https://example.com and provide recommendations',
    agent=seo_agent
)

# Run crew
crew = Crew(agents=[seo_agent], tasks=[task])
result = crew.kickoff()
```

---

## Available Tools

### Standard Tools

#### 1. `auditSite`

Comprehensive GEO audit analyzing AI visibility factors.

**Parameters:**
- `url` (string, required): Website URL
- `useAI` (boolean, optional): Enable AI-powered deep analysis

**Example:**

```bash
curl -X POST https://anoteroslogos.com/api/mcp \
  -H "Authorization: Bearer sk_pro_your_key" \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "auditSite",
    "parameters": {
      "url": "https://example.com",
      "useAI": false
    }
  }'
```

**Response:**

```json
{
  "success": true,
  "result": {
    "overallScore": 78.5,
    "grade": "B+",
    "categories": {
      "schemaMarkup": { "score": 85, "percentage": 85 },
      "metaTags": { "score": 72, "percentage": 72 },
      "eeat": { "score": 80, "percentage": 80 }
    },
    "issues": [...],
    "recommendations": [...]
  },
  "metadata": {
    "executionTimeMs": 1234
  }
}
```

#### 2. `getGraph`

Build knowledge graph from website content.

**Parameters:**
- `url` (string, required): Website URL

**Example:**

```json
{
  "tool": "getGraph",
  "parameters": {
    "url": "https://example.com"
  }
}
```

#### 3. `predictCitation`

Predict citation probability across AI platforms.

**Parameters:**
- `url` (string, required): Website URL
- `platform` (string, optional): Target platform (`ChatGPT`, `Claude`, `Perplexity`, `Gemini`, `Grok`, or `all`)

**Example:**

```json
{
  "tool": "predictCitation",
  "parameters": {
    "url": "https://example.com",
    "platform": "all"
  }
}
```

**Response:**

```json
{
  "success": true,
  "result": {
    "ChatGPT": 0.745,
    "Claude": 0.722,
    "Perplexity": 0.769,
    "Gemini": 0.706,
    "Grok": 0.690
  }
}
```

---

### 🆕 Unique Advanced Tools

#### 4. `causal_citation_trace`

**Unique Feature:** Only tool providing causal reasoning chains explaining WHY an LLM would cite a specific site.

**Parameters:**
- `url` (string, required): Website URL
- `query` (string, required): User query that might trigger citation

**Example:**

```json
{
  "tool": "causal_citation_trace",
  "parameters": {
    "url": "https://example.com/ai-guide",
    "query": "best practices for AI optimization"
  }
}
```

**Response:**

```json
{
  "success": true,
  "result": {
    "url": "https://example.com/ai-guide",
    "query": "best practices for AI optimization",
    "path": [
      { "node": "high_authority", "weight": 0.90 },
      { "node": "complete_schema", "weight": 0.95 },
      { "node": "quality_content", "weight": 0.88 }
    ],
    "citationProbability": 0.856,
    "reasoningChain": "high authority → complete schema → quality content",
    "explanation": "For query 'best practices for AI optimization', this site has 86% probability of citation due to: high authority → complete schema → quality content"
  }
}
```

**Use Case:** Understand exact factors driving citation decisions, enabling targeted optimization.

---

#### 5. `predictive_synthesis`

**Unique Feature:** First tool to synthesize content plans with predicted visibility impact and confidence scores.

**Parameters:**
- `url` (string, required): Website URL
- `targetIncrease` (number, required): Target visibility increase percentage (e.g., 25 for +25%)

**Example:**

```json
{
  "tool": "predictive_synthesis",
  "parameters": {
    "url": "https://example.com",
    "targetIncrease": 30
  }
}
```

**Response:**

```json
{
  "success": true,
  "result": {
    "url": "https://example.com",
    "currentScore": 65,
    "targetScore": 95,
    "targetIncrease": 30,
    "recommendedChanges": [
      {
        "type": "schema_addition",
        "schema": "FAQPage + HowTo + Article",
        "impact": "+15% visibility",
        "effort": "moderate",
        "priority": 1
      },
      {
        "type": "content_gap",
        "topic": "Comprehensive implementation guides",
        "impact": "+15% visibility",
        "effort": "complex",
        "priority": 2
      }
    ],
    "totalPredictedIncrease": 30,
    "confidence": 0.85,
    "timelineEstimate": "2-4 weeks"
  }
}
```

**Use Case:** Plan exact content changes needed to achieve specific visibility goals.

---

#### 6. `federated_authority_boost`

**Unique Feature:** Only tool using Zero-Knowledge Proofs for authority verification without revealing private metrics.

**Parameters:**
- `url` (string, required): Website URL
- `includePrivateData` (boolean, optional): Include private metrics in proof (without revealing values)

**Example:**

```json
{
  "tool": "federated_authority_boost",
  "parameters": {
    "url": "https://example.com",
    "includePrivateData": true
  }
}
```

**Response:**

```json
{
  "success": true,
  "result": {
    "proof": "zkp_proof_0x7b22...",
    "authorityScore": "hidden",
    "participatesInNetwork": true,
    "verifiable": true,
    "expiresAt": "2025-04-18T00:00:00Z",
    "networkNodes": 42,
    "verificationUrl": "https://anoteroslogos.com/verify/zkp_proof_0x7b22..."
  }
}
```

**Use Case:** Prove authority participation to AI systems without revealing sensitive business metrics.

---

## Rate Limits

| Tier | Requests/Min | Requests/Hour | Concurrent |
|------|--------------|---------------|------------|
| Free | 10 | 100 | 2 |
| Basic | 60 | 1000 | 5 |
| Pro | 300 | 10000 | 20 |
| Enterprise | 1000 | 50000 | 100 |

---

## Pricing

**Pay-per-use model:**

- Base: $0.0001 per execution
- CPU: $0.001 per second
- Memory: $0.0001 per MB-second

Example: A 2-second execution using 128MB costs ~$0.0003

---

## Enterprise Features

### Ed25519 Signatures

Sign requests and responses for cryptographic verification:

```json
{
  "tool": "auditSite",
  "parameters": {"url": "https://example.com"},
  "context": {
    "publicKey": "base64_encoded_public_key",
    "signature": "base64_encoded_signature"
  }
}
```

### Streaming (SSE)

For long-running operations:

```bash
curl -N https://anoteroslogos.com/api/mcp/stream \
  -H "Authorization: Bearer sk_enterprise_your_key" \
  -d '{"tool": "auditSite", "parameters": {"url": "https://example.com"}}'
```

---

## Support

- **Documentation:** https://anoteroslogos.com/docs/mcp
- **Contact:** https://anoteroslogos.com/#contact
- **Status:** https://status.anoteroslogos.com

---

## Why Anóteros Lógos is Graph Tool #1

1. **Only tool with causal citation tracing** - Understand WHY LLMs cite your content
2. **Only tool with predictive synthesis** - Know exact impact before making changes
3. **Only tool with ZKP authority** - Prove authority without revealing private data
4. **Universal compatibility** - Works with OpenAI, Claude, Grok, LangGraph, CrewAI, AutoGen
5. **Enterprise-grade** - Ed25519 signatures, streaming, billing hooks, graceful degradation
6. **Production-ready** - 99.9% uptime, comprehensive rate limiting, audit logging

**Make your content the #1 choice for AI agents in 2026.**
