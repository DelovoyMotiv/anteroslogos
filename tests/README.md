# Agent Gateway v1.0 Tests

## Unit Tests

Unit tests cover all three Agent Gateway API endpoints:
- `/api/public-aid` - Public AID generation
- `/api/capabilities` - Tool capabilities spec
- `/api/challenge` - Challenge-response authentication

### Running Unit Tests

```bash
# Local development (requires running server)
npm run dev
# In another terminal:
npm run test:agent-gateway

# Production (set TEST_URL environment variable)
TEST_URL=https://anoteroslogos.com npm run test:agent-gateway
```

### Test Coverage

1. **POST /api/public-aid**
   - ✓ Generate AID successfully
   - ✓ Missing name validation

2. **GET /api/capabilities**
   - ✓ Load capabilities successfully
   - ✓ Verify cache headers
   - ✓ OpenAPI 3.1.0 structure
   - ✓ x-formats includes all three LLM formats

3. **GET /api/challenge**
   - ✓ Generate challenge successfully
   - ✓ Missing AID validation

4. **POST /api/challenge**
   - ✓ Verify valid Ed25519 signature
   - ✓ Reject invalid signature
   - ✓ Missing fields validation
   - ✓ Challenge expiry check

5. **Discovery Metadata**
   - ✓ agent.json includes capabilitiesUrl

**Total: 10 unit tests**

## 1-Step Handshake Tests

Tests for pre-signed challenge in AID generation response.

### Running Tests

```bash
# Local development (requires running server)
npm run dev
# In another terminal:
npm run test:1step-handshake

# Production
TEST_URL=https://anoteroslogos.com npm run test:1step-handshake
```

### Test Coverage

1. **POST /api/public-aid**
   - ✓ Response includes challenge, challengeSignature, challengeExpiresAt
   - ✓ Field formats are correct (64-char hex, 128-char hex, timestamp)
   - ✓ challengeExpiresAt is ~5 minutes from now

2. **Pre-Signed Challenge Verification**
   - ✓ Signature is valid for challenge and publicKey
   - ✓ Modified challenge fails verification
   - ✓ Wrong public key fails verification
   - ✓ Multiple AIDs produce unique challenges

3. **Agent Self-Verification**
   - ✓ Agent can sign/verify its own challenge
   - ✓ Server pre-signed challenge is valid

4. **Backward Compatibility**
   - ✓ All existing fields present (aid, publicKey, privateKey, manifest, expiresIn)
   - ✓ New fields added without breaking changes

**Total: 8 unit tests**

## E2E Tests (Manual)

Since there is no Playwright setup, E2E tests should be run manually:

### E2E Test 1: Full Agent Registration Flow

1. Open `https://anoteroslogos.com/agent-identity`
2. Verify metadata in `<head>`:
   - `<link rel="agent-manifest" href="/.well-known/agent.json" />`
   - `<meta name="agent-capabilities" content="/api/capabilities" />`
   - JSON-LD script with SoftwareApplication schema
3. Click QR Code button → QR code displays
4. Test Challenge Simulator:
   - Enter AID: `aid://test/123`
   - Click "Generate Challenge" → Challenge appears
   - Enter public key and signature
   - Click "Verify Signature" → Result shown

### E2E Test 2: Agent Discovery Flow

1. Fetch `https://anoteroslogos.com/.well-known/agent.json`
2. Extract `capabilitiesUrl` from response
3. Fetch `https://anoteroslogos.com/api/capabilities`
4. Generate AID via POST `/api/public-aid`
5. Get challenge via GET `/api/challenge?aid=...`
6. Sign challenge with private key
7. Verify signature via POST `/api/challenge`

### E2E Test 3: Rate Limiting

1. Make 11 requests to `/api/public-aid` within 1 minute
2. 11th request should return 429 Too Many Requests
3. Make 21 requests to `/api/challenge` within 1 minute
4. 21st request should return 429 Too Many Requests

## CI/CD Integration

Add to GitHub Actions workflow:

```yaml
- name: Run Agent Gateway Tests
  run: |
    npm run dev &
    sleep 5
    npm run test:agent-gateway
```

## Manual Testing Checklist

- [ ] All unit tests pass
- [ ] QR code displays correctly
- [ ] Challenge simulator works end-to-end
- [ ] Copy buttons function
- [ ] Rate limiting enforced
- [ ] CORS headers present
- [ ] Metadata visible in page source
- [ ] Documentation link works
