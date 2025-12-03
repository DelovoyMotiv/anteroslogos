/**
 * 1-Step Handshake Unit Tests
 * Test pre-signed challenge in AID generation response
 */

import { ed25519 } from '@noble/ed25519';
import type { TestResult, ComparableValue, AssertEquals, AssertExists } from '../types/test.types';

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

function assertTrue(value: boolean, message?: string) {
  if (value !== true) {
    throw new Error(message || `Expected true, got ${value}`);
  }
}

function assertFalse(value: boolean, message?: string) {
  if (value !== false) {
    throw new Error(message || `Expected false, got ${value}`);
  }
}

// Test 1: AID response includes challenge fields
const testAIDIncludesChallengeFields = test('POST /api/public-aid - Response includes challenge fields', async () => {
  const response = await fetch(`${BASE_URL}/api/public-aid`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'HandshakeTestAgent',
      capabilities: ['geo.audit']
    })
  });

  assertEquals(response.status, 200, 'Status should be 200');
  
  const data = await response.json();
  
  // Check all challenge fields exist
  assertExists(data.challenge, 'challenge should exist');
  assertExists(data.challengeSignature, 'challengeSignature should exist');
  assertExists(data.challengeExpiresAt, 'challengeExpiresAt should exist');
  
  // Validate format
  assertEquals(data.challenge.length, 64, 'challenge should be 64 hex chars (32 bytes)');
  assertEquals(data.challengeSignature.length, 128, 'challengeSignature should be 128 hex chars (64 bytes)');
  assertTrue(typeof data.challengeExpiresAt === 'number', 'challengeExpiresAt should be a number');
  
  // Validate expiry (should be ~5 minutes from now)
  const now = Date.now();
  const expiryDiff = data.challengeExpiresAt - now;
  assertTrue(expiryDiff > 4.5 * 60 * 1000 && expiryDiff < 5.5 * 60 * 1000, 
    'challengeExpiresAt should be ~5 minutes from now');
});

// Test 2: Pre-signed challenge is valid
const testPreSignedChallengeValid = test('Pre-signed challenge signature is valid', async () => {
  const response = await fetch(`${BASE_URL}/api/public-aid`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'ValidSignatureTest' })
  });

  const data = await response.json();

  // Verify signature locally (1-step handshake)
  const challengeBytes = Buffer.from(data.challenge, 'hex');
  const signatureBytes = Buffer.from(data.challengeSignature, 'hex');
  const publicKeyBytes = Buffer.from(data.publicKey, 'hex');

  const isValid = ed25519.verify(signatureBytes, challengeBytes, publicKeyBytes);

  assertTrue(isValid, 'Pre-signed challenge signature should be valid');
});

// Test 3: Invalid challenge produces invalid signature
const testInvalidChallengeInvalidSignature = test('Modified challenge fails signature verification', async () => {
  const response = await fetch(`${BASE_URL}/api/public-aid`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'InvalidChallengeTest' })
  });

  const data = await response.json();

  // Modify challenge (simulate tampering)
  const modifiedChallenge = 'a'.repeat(64); // Different challenge
  const modifiedChallengeBytes = Buffer.from(modifiedChallenge, 'hex');
  const signatureBytes = Buffer.from(data.challengeSignature, 'hex');
  const publicKeyBytes = Buffer.from(data.publicKey, 'hex');

  const isValid = ed25519.verify(signatureBytes, modifiedChallengeBytes, publicKeyBytes);

  assertFalse(isValid, 'Modified challenge should fail signature verification');
});

// Test 4: Wrong public key fails verification
const testWrongPublicKeyFails = test('Wrong public key fails signature verification', async () => {
  const response = await fetch(`${BASE_URL}/api/public-aid`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'WrongKeyTest' })
  });

  const data = await response.json();

  // Use wrong public key
  const wrongPrivateKey = ed25519.utils.randomPrivateKey();
  const wrongPublicKey = ed25519.getPublicKey(wrongPrivateKey);

  const challengeBytes = Buffer.from(data.challenge, 'hex');
  const signatureBytes = Buffer.from(data.challengeSignature, 'hex');

  const isValid = ed25519.verify(signatureBytes, challengeBytes, wrongPublicKey);

  assertFalse(isValid, 'Wrong public key should fail signature verification');
});

// Test 5: challengeExpiresAt is correctly calculated
const testChallengeExpiryCalculation = test('challengeExpiresAt is correctly calculated', async () => {
  const beforeRequest = Date.now();
  
  const response = await fetch(`${BASE_URL}/api/public-aid`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'ExpiryTest' })
  });

  const afterRequest = Date.now();
  const data = await response.json();

  // Challenge should expire 5 minutes after generation
  const expectedMinExpiry = beforeRequest + 5 * 60 * 1000;
  const expectedMaxExpiry = afterRequest + 5 * 60 * 1000;

  assertTrue(
    data.challengeExpiresAt >= expectedMinExpiry && data.challengeExpiresAt <= expectedMaxExpiry,
    `challengeExpiresAt should be ~5 minutes from now (got ${data.challengeExpiresAt}, expected between ${expectedMinExpiry} and ${expectedMaxExpiry})`
  );
});

// Test 6: Multiple AID generations produce different challenges
const testUniqueChallenges = test('Multiple AID generations produce unique challenges', async () => {
  const response1 = await fetch(`${BASE_URL}/api/public-aid`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'UniqueTest1' })
  });

  const response2 = await fetch(`${BASE_URL}/api/public-aid`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'UniqueTest2' })
  });

  const data1 = await response1.json();
  const data2 = await response2.json();

  // Challenges should be different
  assertTrue(data1.challenge !== data2.challenge, 'Each AID should have unique challenge');
  assertTrue(data1.challengeSignature !== data2.challengeSignature, 'Each AID should have unique signature');
});

// Test 7: Signature verification using agent's own private key
const testAgentCanVerifyOwnChallenge = test('Agent can sign and verify its own challenge', async () => {
  const response = await fetch(`${BASE_URL}/api/public-aid`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'SelfVerifyTest' })
  });

  const data = await response.json();

  // Agent signs the challenge with its own private key
  const privateKeyBytes = Buffer.from(data.privateKey, 'hex');
  const challengeBytes = Buffer.from(data.challenge, 'hex');
  const publicKeyBytes = Buffer.from(data.publicKey, 'hex');

  const agentSignature = ed25519.sign(challengeBytes, privateKeyBytes);

  // Verify agent's signature
  const isValidAgentSignature = ed25519.verify(agentSignature, challengeBytes, publicKeyBytes);
  assertTrue(isValidAgentSignature, 'Agent should be able to sign and verify its own challenge');

  // Verify pre-signed signature from server
  const serverSignatureBytes = Buffer.from(data.challengeSignature, 'hex');
  const isValidServerSignature = ed25519.verify(serverSignatureBytes, challengeBytes, publicKeyBytes);
  assertTrue(isValidServerSignature, 'Server pre-signed challenge should be valid');
});

// Test 8: Backward compatibility - existing fields still present
const testBackwardCompatibility = test('Response maintains backward compatibility', async () => {
  const response = await fetch(`${BASE_URL}/api/public-aid`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'BackwardCompatTest' })
  });

  const data = await response.json();

  // Check all existing fields still present
  assertExists(data.aid, 'aid should exist');
  assertExists(data.publicKey, 'publicKey should exist');
  assertExists(data.privateKey, 'privateKey should exist');
  assertExists(data.manifest, 'manifest should exist');
  assertExists(data.expiresIn, 'expiresIn should exist');

  // Check new fields added
  assertExists(data.challenge, 'challenge should exist (new field)');
  assertExists(data.challengeSignature, 'challengeSignature should exist (new field)');
  assertExists(data.challengeExpiresAt, 'challengeExpiresAt should exist (new field)');

  assertEquals(data.expiresIn, 3600, 'expiresIn should still be 3600 seconds');
});

// Run all tests
async function runTests() {
  console.log('\n=== 1-Step Handshake Unit Tests ===\n');

  await testAIDIncludesChallengeFields();
  await testPreSignedChallengeValid();
  await testInvalidChallengeInvalidSignature();
  await testWrongPublicKeyFails();
  await testChallengeExpiryCalculation();
  await testUniqueChallenges();
  await testAgentCanVerifyOwnChallenge();
  await testBackwardCompatibility();

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
