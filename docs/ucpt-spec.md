# Universal Causal Provenance Token (UCPT) Specification v1

## Overview

UCPT provides cryptographically verifiable provenance for AI agent outputs using COSE_Sign1 (RFC 9052) with Ed25519 signatures (RFC 9053) and canonical CBOR encoding (RFC 8949, RFC 8943).

## Token Structure

### COSE_Sign1 Envelope

```
COSE_Sign1 = [
  protected: bstr,      // Encoded protected header
  unprotected: {},      // Empty map
  payload: bstr,        // Encoded payload (canonical CBOR)
  signature: bstr       // Ed25519 signature (64 bytes)
]
```

### Protected Header

```cbor
{
  alg: -8,              // EdDSA (Ed25519) per RFC 9053
  kid: bstr             // Raw public key bytes (32 bytes)
}
```

### Payload Structure

```cbor
{
  1: "aid://...",                        // iss - Issuer AID URI
  4: 1732435200,                         // nbf - Not before (unix timestamp)
  6: 1732435200,                         // iat - Issued at (unix timestamp)
  7: 1732438800,                         // exp - Expiration (unix timestamp)
  "causal_path_ids": [12, 45, 78],       // Sorted causal reasoning path
  "deterministic_rerun_hash": "base64url...",  // SHA3-512 of output
  "graph_commit": "a1b2c3d4...",         // Git commit hash (40 chars)
  "graph_version": "v1.8.0",             // Semantic version
  "input_hash": "base64url...",          // SHA3-512 of input
  "jti": "uuid-v4",                      // Unique token ID
  "tool": "causal-citation-trace",       // Tool name
  "ucpt_version": 1                      // Protocol version
}
```

**Key ordering:** Integer keys (1, 4, 6, 7) sorted numerically first, then string keys sorted alphabetically. This ensures canonical CBOR encoding.

## Optional Watermark Tag 666

### Purpose

UCPT supports an optional authorship watermark embedded using CBOR tag 666 (unregistered, RFC 8949 compliant). The watermark is cryptographically bound to the signature but transparent to standard COSE parsers.

### Implementation

The watermark is added as a field `_w` in the payload before signing:

```cbor
{
  1: "aid://...",
  4: 1732435200,
  6: 1732435200,
  7: 1732438800,
  "_w": 666("AnóterosLógos:author:DelovoyMotiv:origin:2025-11"),  // Tag 666
  "causal_path_ids": [12, 45, 78],
  "deterministic_rerun_hash": "base64url...",
  "graph_commit": "a1b2c3d4...",
  "graph_version": "v1.8.0",
  "input_hash": "base64url...",
  "jti": "uuid-v4",
  "tool": "causal-citation-trace",
  "ucpt_version": 1
}
```

### CBOR Encoding

Tag 666 structure in CBOR:
- Major type 6 (tag)
- Tag number: 666 (0x029A, encoded as 0xD9 0x02 0x9A)
- Tagged value: UTF-8 string (major type 3)

**Hex example:**
```
D9 029A  // Tag 666
78 32    // UTF-8 string, 50 bytes
41 6E C3 B3 74 65 72 6F 73 4C C3 B3 67 6F 73 3A ...
```

### Properties

1. **Transparent:** Standard COSE/CBOR parsers ignore unknown tags and extract the tagged value transparently
2. **Verifiable:** Watermark is included in signed payload, preventing removal or modification
3. **Compact:** Adds 5-10 bytes to token size
4. **Standards-compliant:** Uses RFC 8949 tag mechanism, no custom extensions

### Detection

Watermark can be extracted using:

```bash
tsx scripts/detect-watermark.ts <UCPT_TOKEN>
```

Output:
```
✓ Watermark found
Content: AnóterosLógos:author:DelovoyMotiv:origin:2025-11
```

### Backward Compatibility

- Tokens without watermark remain valid (verification unchanged)
- Tokens with watermark are valid for all standard COSE_Sign1 verifiers
- Watermark field `_w` is alphabetically last, preserving canonical order

## Signature Algorithm

### Ed25519 (EdDSA)

- Private key: 32 bytes (seed)
- Public key: 32 bytes (compressed point on Curve25519)
- Signature: 64 bytes (R || s)
- Security level: 128-bit (equivalent to 3072-bit RSA)

### Sig_structure (RFC 9052 Section 4.4)

```cbor
Sig_structure = [
  "Signature1",          // Context string
  protected_encoded,     // Serialized protected header
  empty_bstr,            // External AAD (empty)
  payload_encoded        // Serialized payload
]
```

The Ed25519 signature is computed over the canonical CBOR encoding of `Sig_structure`.

## Hash Algorithm

SHA3-512 (FIPS 202) for all content hashing:
- Input hash: `base64url(SHA3-512(canonical_cbor(input)))`
- Output hash: `base64url(SHA3-512(canonical_cbor(output)))`
- Token hash: `base64url(SHA3-512(token_bytes))`

## Serialization

### Wire Format

1. Encode payload to canonical CBOR
2. Sign with Ed25519
3. Build COSE_Sign1 structure
4. Encode to canonical CBOR
5. Encode to base64url (no padding)

### MIME Type

```
Content-Type: application/cose; cose-type="cose-sign1"
```

### Example Token

```
eyJhbGciOiJFZERTQSIsImtpZCI6IjEyMzQ1Njc4OTBhYmNkZWYifQ.eyJpc3MiOiJhaWQ6Ly9leGFtcGxlLmNvbS9hZ2VudC8xMjMiLCJpYXQiOjE3MzI0MzUyMDAsImV4cCI6MTczMjQzODgwMCwidG9vbCI6ImNhdXNhbC1jaXRhdGlvbi10cmFjZSJ9.signature_bytes_base64url
```

## Security Considerations

1. **Key Management:** Private keys must be stored securely (HSM, Vercel KV with encryption)
2. **Replay Protection:** Implement nonce tracking with Redis (TTL = token expiration)
3. **Rate Limiting:** Limit signature verifications to 100/minute/issuer
4. **Clock Skew:** Accept tokens with `iat` within ±60 seconds of current time
5. **TTL Bounds:** Enforce `60 ≤ ttl_seconds ≤ 86400` (1 minute to 24 hours)
6. **Payload Size:** Limit to 64KB (65,536 bytes) to prevent DoS

## Verification Algorithm

```typescript
1. Decode base64url to CBOR bytes
2. Decode COSE_Sign1 structure
3. Extract protected header, payload, signature
4. Decode protected header → verify alg = -8
5. Extract public key (kid)
6. Reconstruct Sig_structure
7. Verify Ed25519 signature
8. Decode payload → verify exp > now()
9. Verify iat ≤ nbf ≤ now() ≤ exp
10. Verify required fields present
11. Return payload if valid
```

## Test Vectors

### Valid Token (without watermark)

```
Protected Header (hex):
a2 01 38 1f 04 58 20 ...

Payload (hex):
a8 01 78 1f 61 69 64 3a 2f 2f ...

Signature (hex):
3d 4c 8b 2f 7a 9e ...
```

### Valid Token (with watermark)

```
Protected Header (hex):
a2 01 38 1f 04 58 20 ...

Payload (hex):
a9 01 78 1f 61 69 64 3a 2f 2f 5f 77 d9 02 9a 78 32 ...
    ^^                                ^^^^^^^^^^^
    |                                 |
    9 fields (was 8)                  Tag 666 + UTF-8 string

Signature (hex):
8f 3e 1c 5d 9b 4a ...
```

## References

- RFC 9052: COSE Structure and Processing
- RFC 9053: COSE Algorithm Specifications (EdDSA)
- RFC 8949: Concise Binary Object Representation (CBOR)
- RFC 8943: CBOR Deterministic Encoding
- FIPS 202: SHA-3 Standard
- RFC 8032: Edwards-Curve Digital Signature Algorithm (EdDSA)

## Version History

- **v1.0.0** (2025-11): Initial specification with Ed25519 + SHA3-512
- **v1.1.0** (2025-11): Added optional watermark tag 666
