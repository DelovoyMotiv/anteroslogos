# Agent Gateway v1.0

## Overview

The Agent Gateway provides machine-first infrastructure for AI agent discovery, authentication, and integration. Any autonomous agent can discover capabilities, generate credentials, and begin interacting with the platform in under 60 seconds.

## Discovery Flow

### Step 1: DNS TXT Record Discovery

Query DNS TXT record at `_agent.anoteroslogos.com`:

```
v=1.1;p=a2a,http;u=https://anoteroslogos.com/api/a2a;s=geoaudit;d=anoteroslogos.com
```

### Step 2: HTTPS Well-Known Endpoint

```bash
curl https://anoteroslogos.com/.well-known/agent.json
```

Response includes `capabilitiesUrl` pointing to OpenAPI 3.1 spec.

### Step 3: Fetch Capabilities

```bash
curl https://anoteroslogos.com/api/capabilities
```

Returns merged OpenAPI spec with all available tools in OpenAI, Claude, and Grok formats.

## Public AID Generation

Stateless Ed25519 keypair generation without authentication.

### Endpoint

`POST /api/public-aid`

### Request

```json
{
  "name": "MyAgent",
  "description": "Optional description",
  "capabilities": ["geo.audit", "citation.predict"]
}
```

### Response

```json
{
  "aid": "aid://myagent/a3f7c8d1e4b2f6a9",
  "publicKey": "64-char hex Ed25519 public key",
  "privateKey": "64-char hex Ed25519 private key",
  "manifest": {
    "v": "1.1",
    "name": "MyAgent",
    "capabilities": ["geo.audit", "citation.predict"],
    "publicKey": "...",
    "aid": "aid://myagent/a3f7c8d1e4b2f6a9",
    "createdAt": "2025-11-24T12:00:00Z"
  },
  "expiresIn": 3600,
  "challenge": "64-char hex random challenge",
  "challengeSignature": "128-char hex Ed25519 signature",
  "challengeExpiresAt": 1732459500000
}
```

**Security**: Private key expires in 1 hour and is cached in-memory only.

**1-Step Trust Establishment**: The response includes a pre-signed `challenge` that agents can immediately verify using `challengeSignature` and `publicKey`. This reduces handshake from 3 requests (generate → challenge → verify) to 1 request with instant local verification.

## 1-Step Trust Establishment via Pre-Signed Challenge

### Overview

The platform implements a zero-roundtrip trust establishment mechanism. Upon AID generation, the server returns a pre-signed challenge that the agent can immediately verify offline without additional network requests.

**Benefits**:
- **Zero Latency**: No additional HTTP requests needed
- **Offline Verification**: Agent can verify trust without internet access
- **Fallback Support**: Standard challenge-response flow remains available
- **Cryptographic Proof**: Ed25519 signature provides non-repudiation

### Verification Flow

1. Agent receives AID generation response with `challenge`, `challengeSignature`, `publicKey`
2. Agent verifies: `ed25519.verify(challengeSignature, challenge, publicKey) === true`
3. If valid: Trust established, agent can proceed immediately
4. If invalid or expired: Fallback to `/api/challenge` endpoint

### Implementation Examples

#### Node.js / TypeScript

```typescript
import { ed25519 } from '@noble/curves/ed25519';

// 1. Generate AID
const aidResponse = await fetch('https://anoteroslogos.com/api/public-aid', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'MyAgent',
    capabilities: ['geo.audit', 'citation.predict']
  })
}).then(r => r.json());

// 2. Immediate trust verification (offline)
const { challenge, challengeSignature, publicKey, challengeExpiresAt } = aidResponse;

// Check expiry
if (Date.now() > challengeExpiresAt) {
  console.error('Challenge expired, falling back to /api/challenge');
  // Fallback to standard flow
} else {
  // Verify signature
  const challengeBytes = Buffer.from(challenge, 'hex');
  const signatureBytes = Buffer.from(challengeSignature, 'hex');
  const publicKeyBytes = Buffer.from(publicKey, 'hex');
  
  const isValid = ed25519.verify(signatureBytes, challengeBytes, publicKeyBytes);
  
  if (isValid) {
    console.log('✓ Trust established via 1-step handshake');
    console.log('Agent can proceed without additional verification');
  } else {
    console.error('✗ Signature verification failed');
    // Fallback to standard flow
  }
}
```

#### Python

```python
import requests
from nacl.signing import VerifyKey
from nacl.exceptions import BadSignatureError
import time

# 1. Generate AID
response = requests.post(
    'https://anoteroslogos.com/api/public-aid',
    json={
        'name': 'MyAgent',
        'capabilities': ['geo.audit', 'citation.predict']
    }
)
aid_data = response.json()

# 2. Immediate trust verification (offline)
challenge = bytes.fromhex(aid_data['challenge'])
challenge_signature = bytes.fromhex(aid_data['challengeSignature'])
public_key = bytes.fromhex(aid_data['publicKey'])
challenge_expires_at = aid_data['challengeExpiresAt']

# Check expiry
if int(time.time() * 1000) > challenge_expires_at:
    print('Challenge expired, falling back to /api/challenge')
    # Fallback to standard flow
else:
    # Verify signature using Ed25519
    try:
        verify_key = VerifyKey(public_key)
        verify_key.verify(challenge, challenge_signature)
        print('✓ Trust established via 1-step handshake')
        print('Agent can proceed without additional verification')
    except BadSignatureError:
        print('✗ Signature verification failed')
        # Fallback to standard flow
```

### Security Properties

1. **Non-Repudiation**: Ed25519 signature cryptographically proves server generated the challenge
2. **Freshness**: Challenge expires in 5 minutes (`challengeExpiresAt`)
3. **Binding**: Signature is tied to specific `publicKey` and `challenge`
4. **Replay Protection**: Each AID generation produces unique challenge
5. **Zero-Trust**: Agent verifies signature locally, no need to trust server claims

### Fallback to Standard Flow

If 1-step verification fails or challenge expires, agents can use the standard challenge-response flow:

```typescript
// Fallback: Request new challenge
const challengeResponse = await fetch(`https://anoteroslogos.com/api/challenge?aid=${aidResponse.aid}`);
const { challenge: newChallenge } = await challengeResponse.json();

// Sign with private key
const signature = ed25519.sign(
  Buffer.from(newChallenge, 'hex'),
  Buffer.from(aidResponse.privateKey, 'hex')
);

// Verify
const verifyResponse = await fetch('https://anoteroslogos.com/api/challenge', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    aid: aidResponse.aid,
    challenge: newChallenge,
    signature: Buffer.from(signature).toString('hex'),
    publicKey: aidResponse.publicKey
  })
});
```

## Challenge-Response Authentication (Fallback)

Verify agent identity via Ed25519 signatures.

### Generate Challenge

`GET /api/challenge?aid=aid://myagent/a3f7c8d1e4b2f6a9`

Response:
```json
{
  "challenge": "64-char hex string",
  "nonce": 1732456789000,
  "expiresIn": 300
}
```

### Verify Signature

`POST /api/challenge`

Request:
```json
{
  "aid": "aid://myagent/a3f7c8d1e4b2f6a9",
  "signature": "hex-encoded Ed25519 signature",
  "challenge": "challenge from previous step",
  "publicKey": "hex-encoded public key"
}
```

Response:
```json
{
  "valid": true,
  "message": "Signature verified",
  "aid": "aid://myagent/a3f7c8d1e4b2f6a9"
}
```

## Integration Example (1-Step Handshake)

```typescript
import { ed25519 } from '@noble/curves/ed25519';

// 1. Discover capabilities
const agent = await fetch('https://anoteroslogos.com/.well-known/agent.json').then(r => r.json());
const capabilities = await fetch(agent.a.capabilitiesUrl).then(r => r.json());

// 2. Generate AID (includes pre-signed challenge)
const aid = await fetch('https://anoteroslogos.com/api/public-aid', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'MyAgent', capabilities: ['geo.audit'] })
}).then(r => r.json());

// 3. Immediate trust verification (offline, zero network latency)
const challengeBytes = Buffer.from(aid.challenge, 'hex');
const signatureBytes = Buffer.from(aid.challengeSignature, 'hex');
const publicKeyBytes = Buffer.from(aid.publicKey, 'hex');

const trustEstablished = ed25519.verify(signatureBytes, challengeBytes, publicKeyBytes);

if (trustEstablished && Date.now() < aid.challengeExpiresAt) {
  console.log('✓ Trust established via 1-step handshake');
  // Agent can immediately proceed to use API
} else {
  console.log('Fallback to standard challenge-response flow');
  // Use standard /api/challenge endpoint if needed
}
```

### Legacy 3-Step Flow (Still Supported)

```typescript
// For agents that prefer explicit challenge-response:

// 1. Generate AID
const aid = await fetch('https://anoteroslogos.com/api/public-aid', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'MyAgent' })
}).then(r => r.json());

// 2. Get challenge
const challenge = await fetch(`https://anoteroslogos.com/api/challenge?aid=${aid.aid}`)
  .then(r => r.json());

// 3. Sign challenge with private key
const signature = ed25519.sign(
  Buffer.from(challenge.challenge, 'hex'),
  Buffer.from(aid.privateKey, 'hex')
);

// 4. Verify signature
const verified = await fetch('https://anoteroslogos.com/api/challenge', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    aid: aid.aid,
    signature: Buffer.from(signature).toString('hex'),
    challenge: challenge.challenge,
    publicKey: aid.publicKey
  })
}).then(r => r.json());

console.log(verified.valid); // true
```

## Rate Limits

- `/api/public-aid`: 10 requests/min per IP
- `/api/challenge`: 20 requests/min per IP  
- `/api/capabilities`: Cached, no limit

## Security Considerations

1. **Private Key Expiry**: Keys expire in 1 hour, forcing rotation
2. **Challenge TTL**: 5 minutes, preventing replay attacks
3. **In-Memory Only**: No private keys stored in database
4. **Stateless**: No sessions, each request independently verified

## Metadata for Crawlers

Agent Identity page includes:

```html
<link rel="agent-manifest" href="/.well-known/agent.json" />
<meta name="agent-capabilities" content="/api/capabilities" />
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Anóteros Lógos Agent API",
  "applicationCategory": "DeveloperApplication",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  }
}
</script>
```

## Future Enhancements

- OAuth2 flow for long-lived credentials
- Webhook callbacks for async operations
- Multi-signature schemes for agent collectives
- Hardware security module (HSM) integration
