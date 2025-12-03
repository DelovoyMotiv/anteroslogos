/**
 * Agent Gateway v1.0 Unit Tests
 * Test coverage for public-aid, capabilities, and challenge endpoints
 */

import { ed25519 } from '@noble/ed25519';
import { randomBytes } from 'crypto';
import type { TestResult, ComparableValue, AssertEquals, AssertExists, AssertMatch } from '../types/test.types';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

const results: TestResult[] = [];

function test(name: string, fn: () => Promise<void>) {
  return async () => {
    try {
      await fn();
      results.push({ name, passed: true });
      console.log(`✓ ${name}`);
    } catch (error) {
      results.push({ name, passed: false, error: error instanceof Error ? error.message : String(error) });
      console.error(`✗ ${name}`);
      console.error(`  Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
}

const assertEquals: AssertEquals = <T extends ComparableValue>(actual: T, expected: T, message?: string) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
};

const assertExists: AssertExists = <T>(value: T | null | undefined, message?: string): asserts value is T => {
  if (value === undefined || value === null) {
    throw new Error(message || `Expected value to exist`);
  }
};

const assertMatch: AssertMatch = (value: string, pattern: RegExp, message?: string) => {
  if (!pattern.test(value)) {
    throw new Error(message || `Expected ${value} to match ${pattern}`);
  }
};

// Test 1: POST /api/public-aid - Generate AID successfully
const testPublicAIDGeneration = test('POST /api/public-aid - Generate AID successfully', async () => {
  const response = await fetch(`${BASE_URL}/api/public-aid`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'TestAgent',
      description: 'Test agent for unit tests',
      capabilities: ['geo.audit']
    })
  });

  assertEquals(response.status, 200, 'Status should be 200');
  
  const data = await response.json();
  assertExists(data.aid, 'AID should exist');
  assertExists(data.publicKey, 'Public key should exist');
  assertExists(data.privateKey, 'Private key should exist');
  assertExists(data.manifest, 'Manifest should exist');
  assertEquals(data.expiresIn, 3600, 'Expires in should be 3600 seconds');
  
  assertMatch(data.aid, /^aid:\/\/testagent\/[a-f0-9]+$/, 'AID should match pattern');
  assertEquals(data.publicKey.length, 64, 'Public key should be 64 hex chars');
  assertEquals(data.privateKey.length, 64, 'Private key should be 64 hex chars');
});

// Test 2: POST /api/public-aid - Missing name
const testPublicAIDMissingName = test('POST /api/public-aid - Missing name', async () => {
  const response = await fetch(`${BASE_URL}/api/public-aid`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });

  assertEquals(response.status, 400, 'Status should be 400');
  
  const data = await response.json();
  assertExists(data.error, 'Error message should exist');
});

// Test 3: GET /api/capabilities - Load capabilities successfully
const testCapabilitiesLoad = test('GET /api/capabilities - Load capabilities successfully', async () => {
  const response = await fetch(`${BASE_URL}/api/capabilities`);

  assertEquals(response.status, 200, 'Status should be 200');
  assertEquals(response.headers.get('cache-control'), 'public, max-age=3600', 'Cache headers should be set');
  
  const data = await response.json();
  assertEquals(data.openapi, '3.1.0', 'OpenAPI version should be 3.1.0');
  assertExists(data.paths, 'Paths should exist');
  assertExists(data.components, 'Components should exist');
  assertExists(data['x-formats'], 'x-formats should exist');
});

// Test 4: GET /api/challenge - Generate challenge successfully
const testChallengeGeneration = test('GET /api/challenge - Generate challenge successfully', async () => {
  const aid = 'aid://testagent/abc123';
  const response = await fetch(`${BASE_URL}/api/challenge?aid=${encodeURIComponent(aid)}`);

  assertEquals(response.status, 200, 'Status should be 200');
  
  const data = await response.json();
  assertExists(data.challenge, 'Challenge should exist');
  assertExists(data.nonce, 'Nonce should exist');
  assertEquals(data.expiresIn, 300, 'Expires in should be 300 seconds');
  assertEquals(data.challenge.length, 64, 'Challenge should be 64 hex chars');
});

// Test 5: GET /api/challenge - Missing AID parameter
const testChallengeMissingAID = test('GET /api/challenge - Missing AID parameter', async () => {
  const response = await fetch(`${BASE_URL}/api/challenge`);

  assertEquals(response.status, 400, 'Status should be 400');
  
  const data = await response.json();
  assertExists(data.error, 'Error message should exist');
});

// Test 6: POST /api/challenge - Verify valid signature
const testChallengeVerifyValid = test('POST /api/challenge - Verify valid signature', async () => {
  // First, generate an AID
  const aidRes = await fetch(`${BASE_URL}/api/public-aid`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'SignatureTest' })
  });
  const aidData = await aidRes.json();

  // Get challenge
  const challengeRes = await fetch(`${BASE_URL}/api/challenge?aid=${encodeURIComponent(aidData.aid)}`);
  const challengeData = await challengeRes.json();

  // Sign challenge
  const privateKeyBytes = Buffer.from(aidData.privateKey, 'hex');
  const messageBytes = Buffer.from(challengeData.challenge, 'hex');
  const signature = ed25519.sign(messageBytes, privateKeyBytes);
  const signatureHex = Buffer.from(signature).toString('hex');

  // Verify signature
  const verifyRes = await fetch(`${BASE_URL}/api/challenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      aid: aidData.aid,
      challenge: challengeData.challenge,
      publicKey: aidData.publicKey,
      signature: signatureHex
    })
  });

  assertEquals(verifyRes.status, 200, 'Status should be 200');
  
  const verifyData = await verifyRes.json();
  assertEquals(verifyData.valid, true, 'Signature should be valid');
  assertEquals(verifyData.aid, aidData.aid, 'AID should match');
});

// Test 7: POST /api/challenge - Invalid signature
const testChallengeVerifyInvalid = test('POST /api/challenge - Invalid signature', async () => {
  const aidRes = await fetch(`${BASE_URL}/api/public-aid`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'InvalidSigTest' })
  });
  const aidData = await aidRes.json();

  const challengeRes = await fetch(`${BASE_URL}/api/challenge?aid=${encodeURIComponent(aidData.aid)}`);
  const challengeData = await challengeRes.json();

  // Use invalid signature (random bytes)
  const invalidSignature = randomBytes(64).toString('hex');

  const verifyRes = await fetch(`${BASE_URL}/api/challenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      aid: aidData.aid,
      challenge: challengeData.challenge,
      publicKey: aidData.publicKey,
      signature: invalidSignature
    })
  });

  assertEquals(verifyRes.status, 400, 'Status should be 400');
  
  const verifyData = await verifyRes.json();
  assertEquals(verifyData.valid, false, 'Signature should be invalid');
});

// Test 8: POST /api/challenge - Missing required fields
const testChallengeVerifyMissingFields = test('POST /api/challenge - Missing required fields', async () => {
  const response = await fetch(`${BASE_URL}/api/challenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ aid: 'test' })
  });

  assertEquals(response.status, 400, 'Status should be 400');
  
  const data = await response.json();
  assertExists(data.error, 'Error message should exist');
});

// Test 9: Agent.json includes capabilitiesUrl
const testAgentJsonCapabilitiesUrl = test('agent.json includes capabilitiesUrl', async () => {
  const response = await fetch(`${BASE_URL}/.well-known/agent.json`);
  
  assertEquals(response.status, 200, 'Status should be 200');
  
  const data = await response.json();
  assertExists(data.a, 'Agent metadata should exist');
  assertExists(data.a.capabilitiesUrl, 'capabilitiesUrl should exist');
  assertEquals(data.a.capabilitiesUrl, '/api/capabilities', 'capabilitiesUrl should be /api/capabilities');
});

// Test 10: Capabilities spec contains all required sections
const testCapabilitiesStructure = test('Capabilities spec contains all required sections', async () => {
  const response = await fetch(`${BASE_URL}/api/capabilities`);
  const data = await response.json();

  assertExists(data.info, 'Info should exist');
  assertExists(data.info.title, 'Title should exist');
  assertExists(data.servers, 'Servers should exist');
  assertExists(data.components.securitySchemes, 'Security schemes should exist');
  assertExists(data['x-formats'].openai, 'OpenAI format should exist');
  assertExists(data['x-formats'].claude, 'Claude format should exist');
  assertExists(data['x-formats'].grok, 'Grok format should exist');
});

// Run all tests
async function runTests() {
  console.log('\n=== Agent Gateway v1.0 Unit Tests ===\n');

  await testPublicAIDGeneration();
  await testPublicAIDMissingName();
  await testCapabilitiesLoad();
  await testChallengeGeneration();
  await testChallengeMissingAID();
  await testChallengeVerifyValid();
  await testChallengeVerifyInvalid();
  await testChallengeVerifyMissingFields();
  await testAgentJsonCapabilitiesUrl();
  await testCapabilitiesStructure();

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`\n=== Test Results ===`);
  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
    process.exit(1);
  } else {
    console.log('\n✓ All tests passed!');
    process.exit(0);
  }
}

runTests();
