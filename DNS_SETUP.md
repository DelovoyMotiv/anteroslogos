# DNS Configuration for AID (Agent Identity & Discovery)

## Overview

AID protocol requires a single TXT record at `_agent.anoteroslogos.com` for agent discovery. This follows the agentcommunity.org v1.1 specification.

## DNS TXT Record Configuration

### Record Details

**Record Type:** TXT  
**Host/Name:** `_agent.anoteroslogos.com` or `_agent` (depending on DNS provider)  
**TTL:** 3600 (1 hour)

### TXT Record Value (255-byte optimized)

```
v=1.1;p=a2a,http;u=https://anoteroslogos.com/api/a2a;s=geoaudit;d=anoteroslogos.com
```

### Field Breakdown

Single-letter aliases are used to fit within the 255-byte DNS TXT limit:

- `v=1.1` - AID protocol version 1.1
- `p=a2a,http` - Supported protocols: A2A (Agent-to-Agent), HTTP
- `u=https://anoteroslogos.com/api/a2a` - Primary endpoint URL
- `s=geoaudit` - Service identifier (short name)
- `d=anoteroslogos.com` - Domain ownership verification

### DNS Provider Instructions

#### Cloudflare

1. Log into Cloudflare dashboard
2. Select domain: `anoteroslogos.com`
3. Navigate to DNS → Records
4. Click "Add record"
5. Type: `TXT`
6. Name: `_agent`
7. Content: `v=1.1;p=a2a,http;u=https://anoteroslogos.com/api/a2a;s=geoaudit;d=anoteroslogos.com`
8. TTL: Auto (or 3600)
9. Proxy status: DNS only (grey cloud)
10. Click "Save"

#### Route 53 (AWS)

1. Open Route 53 console
2. Select hosted zone: `anoteroslogos.com`
3. Click "Create record"
4. Record name: `_agent.anoteroslogos.com`
5. Record type: `TXT`
6. Value: `"v=1.1;p=a2a,http;u=https://anoteroslogos.com/api/a2a;s=geoaudit;d=anoteroslogos.com"`
7. TTL: 3600
8. Routing policy: Simple routing
9. Click "Create records"

#### Google Cloud DNS

```bash
gcloud dns record-sets create _agent.anoteroslogos.com. \
  --zone="anoteroslogos-zone" \
  --type="TXT" \
  --ttl="3600" \
  --rrdatas="v=1.1;p=a2a,http;u=https://anoteroslogos.com/api/a2a;s=geoaudit;d=anoteroslogos.com"
```

#### Generic DNS Provider

Most DNS providers support TXT records via web interface:

1. Access DNS management panel
2. Add new TXT record
3. Hostname: `_agent` or `_agent.anoteroslogos.com`
4. Value: `v=1.1;p=a2a,http;u=https://anoteroslogos.com/api/a2a;s=geoaudit;d=anoteroslogos.com`
5. Save changes

## Verification

### Command-line verification

```bash
# Using dig
dig _agent.anoteroslogos.com TXT +short

# Using nslookup
nslookup -type=TXT _agent.anoteroslogos.com

# Using host
host -t TXT _agent.anoteroslogos.com
```

### Expected output

```
"v=1.1;p=a2a,http;u=https://anoteroslogos.com/api/a2a;s=geoaudit;d=anoteroslogos.com"
```

### Online verification tools

- https://mxtoolbox.com/TXTLookup.aspx
- https://dnschecker.org/
- https://www.whatsmydns.net/

## Fallback Discovery Mechanism

If DNS TXT lookup fails, AID clients automatically fall back to HTTPS well-known:

```
GET https://anoteroslogos.com/.well-known/agent.json
```

This file is automatically served by Vercel from `public/.well-known/agent.json`.

## Propagation Time

- DNS changes typically propagate within 5-60 minutes
- Full global propagation: up to 24-48 hours
- Use verification tools to check propagation status across different regions

## Security Considerations

### Ed25519 Cryptographic Signatures

The agent.json includes public key information for Ed25519 signatures (RFC 9421):

```json
{
  "k": {
    "alg": "Ed25519",
    "use": "sig",
    "kid": "anoteroslogos-2025-primary"
  }
}
```

**Note:** Full Ed25519 signature implementation requires backend cryptographic key management. Currently, the key ID is declared but signature verification is not yet implemented.

### Domain Ownership Proof

The `d=anoteroslogos.com` field in the TXT record proves domain ownership when combined with:

1. DNS hosting control (ability to set TXT records)
2. HTTPS certificate (SSL/TLS for anoteroslogos.com)
3. Well-known file hosting (served from same domain)

## AID Protocol Standards

- **Specification:** agentcommunity.org AID v1.1 (October 2025)
- **RFC Track:** IETF discussion ongoing (expected RFC 2026)
- **Adoption:** 5000+ domains (as of Q1 2025)
- **Compatibility:** MCP, A2A, ANP protocols
- **Marketplace Integration:** OpenAI Plugins, Anthropic Claude, Google Vertex AI

## Integration with Existing Infrastructure

The AID protocol integrates seamlessly with existing A2A API:

- **A2A Endpoint:** `https://anoteroslogos.com/api/a2a`
- **A2A Implementation:** `api/a2a/index.ts`
- **Discovery Methods:** DNS TXT (primary), HTTPS well-known (fallback)
- **Protocol Stack:** AID → A2A → GEO Audit Services

## Troubleshooting

### DNS record not found

- Wait 5-60 minutes for propagation
- Check DNS provider configuration
- Verify record name is exactly `_agent`
- Ensure no typos in TXT value

### TXT record value truncated

- Current value is 79 bytes (well within 255-byte limit)
- Single-letter aliases (v, p, u, s, d) ensure compact format
- No truncation expected

### Well-known file returns 404

- Verify `public/.well-known/agent.json` exists
- Rebuild and redeploy to Vercel
- Check Vercel deployment logs
- Test locally: `npm run dev` → `http://localhost:5173/.well-known/agent.json`

### CORS issues

Well-known endpoint should include CORS headers. Add to `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/.well-known/agent.json",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, OPTIONS"
        },
        {
          "key": "Content-Type",
          "value": "application/json"
        }
      ]
    }
  ]
}
```

## Maintenance

- Review AID specification updates quarterly
- Update version field when protocol changes
- Monitor DNS record integrity monthly
- Keep agent.json synchronized with A2A capabilities
- Update pricing and capabilities as services evolve

## References

- AID Specification: https://github.com/agentcommunity/aid-protocol
- RFC 9421 (HTTP Message Signatures): https://www.rfc-editor.org/rfc/rfc9421.html
- DNS TXT Record RFC 1464: https://www.rfc-editor.org/rfc/rfc1464.html
- Well-Known URIs RFC 8615: https://www.rfc-editor.org/rfc/rfc8615.html
