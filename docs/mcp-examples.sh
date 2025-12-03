#!/bin/bash
# MCP API Quick Start Examples

# =====================================================
# SETUP
# =====================================================

# Replace with your API key
API_KEY="sk_free_your_api_key_here"
BASE_URL="http://localhost:5173/api/mcp"  # or https://anoteroslogos.com/api/mcp

# =====================================================
# 1. Get OpenAPI Specification
# =====================================================

echo "=== 1. Get OpenAPI Spec ==="
curl -s "$BASE_URL?format=openapi" | jq '.info'

# =====================================================
# 2. Get OpenAI Tool Schemas
# =====================================================

echo -e "\n=== 2. Get OpenAI Tool Schemas ==="
curl -s "$BASE_URL?format=openai" | jq '.tools[0]'

# =====================================================
# 3. Get Claude Tool Schemas
# =====================================================

echo -e "\n=== 3. Get Claude Tool Schemas ==="
curl -s "$BASE_URL?format=claude" | jq '.tools[0]'

# =====================================================
# 4. Execute auditSite Tool
# =====================================================

echo -e "\n=== 4. Execute auditSite ==="
curl -s -X POST "$BASE_URL" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "auditSite",
    "parameters": {
      "url": "https://example.com",
      "useAI": false
    }
  }' | jq '.result.overallScore'

# =====================================================
# 5. Execute predictCitation Tool
# =====================================================

echo -e "\n=== 5. Execute predictCitation ==="
curl -s -X POST "$BASE_URL" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "predictCitation",
    "parameters": {
      "url": "https://example.com",
      "platform": "all"
    }
  }' | jq '.result'

# =====================================================
# 6. 🆕 Execute causal_citation_trace (UNIQUE)
# =====================================================

echo -e "\n=== 6. Execute causal_citation_trace (UNIQUE) ==="
curl -s -X POST "$BASE_URL" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "causal_citation_trace",
    "parameters": {
      "url": "https://example.com/ai-guide",
      "query": "best practices for AI optimization"
    }
  }' | jq '.result | {citationProbability, reasoningChain}'

# =====================================================
# 7. 🆕 Execute predictive_synthesis (UNIQUE)
# =====================================================

echo -e "\n=== 7. Execute predictive_synthesis (UNIQUE) ==="
curl -s -X POST "$BASE_URL" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "predictive_synthesis",
    "parameters": {
      "url": "https://example.com",
      "targetIncrease": 30
    }
  }' | jq '.result | {currentScore, targetScore, confidence}'

# =====================================================
# 8. 🆕 Execute federated_authority_boost (UNIQUE ZKP)
# =====================================================

echo -e "\n=== 8. Execute federated_authority_boost (UNIQUE ZKP) ==="
curl -s -X POST "$BASE_URL" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "federated_authority_boost",
    "parameters": {
      "url": "https://example.com",
      "includePrivateData": true
    }
  }' | jq '.result | {proof, participatesInNetwork, verifiable}'

# =====================================================
# 9. Check Rate Limits
# =====================================================

echo -e "\n=== 9. Check Rate Limits (in headers) ==="
curl -s -I -X POST "$BASE_URL" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tool":"auditSite","parameters":{"url":"https://example.com"}}' \
  | grep -i "x-ratelimit"

echo -e "\n✅ All examples completed!"
echo "Next: Test with OpenAI/Claude/Grok - See docs/mcp.md"
