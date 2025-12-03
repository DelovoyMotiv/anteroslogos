#!/usr/bin/env node
/**
 * Ed25519 Key Manager CLI
 * Command-line tool for managing Ed25519 keys for A2A Protocol
 * 
 * Usage:
 *   npm run keys:generate -- --domain example.com --expires 365
 *   npm run keys:rotate -- --domain example.com
 *   npm run keys:revoke -- --key-id example.com-2025-01-11 --reason "Compromised"
 *   npm run keys:list -- --domain example.com
 *   npm run keys:audit -- --key-id example.com-2025-01-11
 */

import { generateEd25519KeyPair } from '../lib/a2a/ed25519Signatures';
import { SupabaseEd25519KeyStorage, rotateKey } from '../lib/a2a/ed25519KeyStorage';
import type { StoredKey } from '../lib/a2a/ed25519Signatures';

// =====================================================
// CLI COMMANDS
// =====================================================

/**
 * Generate new key pair
 */
async function generateKey(domain: string, expiresInDays?: number, agentId?: string): Promise<void> {
  console.log(`\n🔑 Generating Ed25519 key pair for domain: ${domain}\n`);
  
  try {
    // Generate key pair
    const keyPair = await generateEd25519KeyPair(domain, expiresInDays);
    
    // Store in database
    const storage = new SupabaseEd25519KeyStorage();
    const storedKey: StoredKey = {
      keyId: keyPair.keyId,
      publicKey: keyPair.publicKey,
      algorithm: 'ed25519',
      domain,
      created: keyPair.created,
      expires: keyPair.expires,
      revoked: false,
    };
    
    await storage.storeKey(storedKey, agentId);
    
    console.log('✅ Key pair generated and stored successfully!\n');
    console.log('Key Details:');
    console.log(`  Key ID: ${keyPair.keyId}`);
    console.log(`  Domain: ${domain}`);
    console.log(`  Algorithm: ed25519`);
    console.log(`  Created: ${keyPair.created}`);
    if (keyPair.expires) {
      console.log(`  Expires: ${keyPair.expires}`);
    }
    console.log('');
    
    console.log('Public Key (base64):');
    console.log(`  ${keyPair.publicKey}`);
    console.log('');
    
    console.log('⚠️  IMPORTANT: Private Key (store securely!):');
    console.log(`  ${keyPair.privateKey}`);
    console.log('');
    
    console.log('💡 Add this to your environment variables:');
    console.log(`  ED25519_PRIVATE_KEY_${domain.toUpperCase().replace(/[.-]/g, '_')}="${keyPair.privateKey}"`);
    console.log('');
    
    console.log('📋 Update .well-known/agent.json with:');
    console.log('  {');
    console.log(`    "keyId": "${keyPair.keyId}",`);
    console.log('    "algorithm": "ed25519",');
    console.log(`    "publicKey": "${keyPair.publicKey}"`);
    console.log('  }');
    console.log('');
  } catch (error) {
    console.error('❌ Failed to generate key:', error);
    process.exit(1);
  }
}

/**
 * Rotate key
 */
async function rotateKeyCommand(domain: string, agentId?: string, expiresInDays?: number): Promise<void> {
  console.log(`\n🔄 Rotating Ed25519 key for domain: ${domain}\n`);
  
  try {
    const result = await rotateKey(domain, agentId, expiresInDays);
    
    console.log('✅ Key rotation completed!\n');
    
    if (result.oldKeyId) {
      console.log(`Old Key ID (revoked): ${result.oldKeyId}`);
    } else {
      console.log('No previous key found (first key for domain)');
    }
    
    console.log(`New Key ID: ${result.newKey.keyId}`);
    console.log('');
    
    console.log('⚠️  NOTE: Retrieve the new private key from secure storage.');
    console.log('The previous private key has been revoked and should be removed from your environment.');
    console.log('');
  } catch (error) {
    console.error('❌ Failed to rotate key:', error);
    process.exit(1);
  }
}

/**
 * Revoke key
 */
async function revokeKeyCommand(keyId: string, reason: string, performedBy?: string): Promise<void> {
  console.log(`\n🚫 Revoking Ed25519 key: ${keyId}\n`);
  
  try {
    const storage = new SupabaseEd25519KeyStorage();
    const success = await storage.revokeKey(keyId, reason, performedBy);
    
    if (success) {
      console.log('✅ Key revoked successfully!\n');
      console.log(`Key ID: ${keyId}`);
      console.log(`Reason: ${reason}`);
      if (performedBy) {
        console.log(`Performed by: ${performedBy}`);
      }
      console.log('');
      console.log('⚠️  This key can no longer be used for signing requests.');
      console.log('Remove the corresponding private key from your environment variables.');
      console.log('');
    } else {
      console.error('❌ Failed to revoke key. Key may not exist.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error revoking key:', error);
    process.exit(1);
  }
}

/**
 * List keys for domain
 */
async function listKeys(domain: string, includeRevoked: boolean = false): Promise<void> {
  console.log(`\n📋 Listing Ed25519 keys for domain: ${domain}\n`);
  
  try {
    const storage = new SupabaseEd25519KeyStorage();
    const keys = await storage.listKeysForDomain(domain, includeRevoked);
    
    if (keys.length === 0) {
      console.log('No keys found for this domain.');
      console.log('');
      console.log('💡 Generate a new key with:');
      console.log(`  npm run keys:generate -- --domain ${domain}`);
      console.log('');
      return;
    }
    
    console.log(`Found ${keys.length} key(s):\n`);
    
    for (const key of keys) {
      const status = key.revoked ? '🚫 REVOKED' : '✅ ACTIVE';
      const expired = key.expires && new Date(key.expires) < new Date() ? '⏰ EXPIRED' : '';
      
      console.log(`${status} ${expired}`);
      console.log(`  Key ID: ${key.keyId}`);
      console.log(`  Algorithm: ${key.algorithm}`);
      console.log(`  Created: ${key.created}`);
      if (key.expires) {
        console.log(`  Expires: ${key.expires}`);
      }
      console.log(`  Public Key: ${key.publicKey.substring(0, 32)}...`);
      console.log('');
    }
  } catch (error) {
    console.error('❌ Error listing keys:', error);
    process.exit(1);
  }
}

/**
 * Get key audit log
 */
async function showAuditLog(keyId: string, limit: number = 50): Promise<void> {
  console.log(`\n📜 Audit log for key: ${keyId}\n`);
  
  try {
    const storage = new SupabaseEd25519KeyStorage();
    const logs = await storage.getKeyAuditLog(keyId, limit);
    
    if (logs.length === 0) {
      console.log('No audit log entries found for this key.');
      console.log('');
      return;
    }
    
    console.log(`Found ${logs.length} log entries:\n`);
    
    for (const log of logs) {
      const timestamp = new Date(log.created_at).toLocaleString();
      console.log(`[${timestamp}] ${log.action.toUpperCase()}`);
      
      if (log.performed_by) {
        console.log(`  Performed by: ${log.performed_by}`);
      }
      
      if (log.ip_address) {
        console.log(`  IP Address: ${log.ip_address}`);
      }
      
      if (log.metadata && Object.keys(log.metadata).length > 0) {
        console.log(`  Metadata: ${JSON.stringify(log.metadata)}`);
      }
      
      console.log('');
    }
  } catch (error) {
    console.error('❌ Error fetching audit log:', error);
    process.exit(1);
  }
}

/**
 * Check keys expiring soon
 */
async function checkExpiring(daysThreshold: number = 30): Promise<void> {
  console.log(`\n⏰ Checking for keys expiring within ${daysThreshold} days\n`);
  
  try {
    const storage = new SupabaseEd25519KeyStorage();
    const keys = await storage.getKeysExpiringSoon(daysThreshold);
    
    if (keys.length === 0) {
      console.log('✅ No keys expiring soon.');
      console.log('');
      return;
    }
    
    console.log(`⚠️  Found ${keys.length} key(s) expiring soon:\n`);
    
    for (const key of keys) {
      const expiresDate = new Date(key.expires!);
      const daysUntilExpiry = Math.floor((expiresDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      console.log(`${daysUntilExpiry} days until expiry`);
      console.log(`  Key ID: ${key.keyId}`);
      console.log(`  Domain: ${key.domain}`);
      console.log(`  Expires: ${key.expires}`);
      console.log('');
      console.log(`  💡 Rotate this key with:`);
      console.log(`    npm run keys:rotate -- --domain ${key.domain}`);
      console.log('');
    }
  } catch (error) {
    console.error('❌ Error checking expiring keys:', error);
    process.exit(1);
  }
}

// =====================================================
// CLI ARGUMENT PARSING
// =====================================================

function parseArgs(): any {
  const args = process.argv.slice(2);
  const parsed: any = { command: args[0] || 'help' };
  
  for (let i = 1; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '');
    const value = args[i + 1];
    
    if (key === 'expires' || key === 'days') {
      parsed[key] = parseInt(value, 10);
    } else if (key === 'include-revoked') {
      parsed[key] = value === 'true';
    } else {
      parsed[key] = value;
    }
  }
  
  return parsed;
}

/**
 * Show help
 */
function showHelp(): void {
  console.log(`
📚 Ed25519 Key Manager CLI

Commands:

  generate    Generate new Ed25519 key pair
    --domain <domain>         Domain name (required)
    --expires <days>          Expiration in days (optional, default: never)
    --agent-id <id>           Associated agent ID (optional)

  rotate      Rotate key for domain (generates new, revokes old)
    --domain <domain>         Domain name (required)
    --expires <days>          Expiration in days (optional, default: 365)
    --agent-id <id>           Associated agent ID (optional)

  revoke      Revoke a key
    --key-id <key-id>         Key ID to revoke (required)
    --reason <reason>         Revocation reason (required)
    --performed-by <id>       Who performed the action (optional)

  list        List all keys for a domain
    --domain <domain>         Domain name (required)
    --include-revoked         Include revoked keys (optional)

  audit       Show audit log for a key
    --key-id <key-id>         Key ID (required)
    --limit <number>          Number of log entries (optional, default: 50)

  expiring    Check for keys expiring soon
    --days <number>           Days threshold (optional, default: 30)

  help        Show this help message

Examples:

  npm run keys:generate -- --domain example.com --expires 365
  npm run keys:rotate -- --domain example.com
  npm run keys:revoke -- --key-id example.com-2025-01-11 --reason "Compromised"
  npm run keys:list -- --domain example.com
  npm run keys:audit -- --key-id example.com-2025-01-11
  npm run keys:expiring -- --days 30

`);
}

// =====================================================
// MAIN
// =====================================================

async function main(): Promise<void> {
  const args = parseArgs();
  
  switch (args.command) {
    case 'generate':
      if (!args.domain) {
        console.error('❌ Error: --domain is required');
        process.exit(1);
      }
      await generateKey(args.domain, args.expires, args['agent-id']);
      break;
    
    case 'rotate':
      if (!args.domain) {
        console.error('❌ Error: --domain is required');
        process.exit(1);
      }
      await rotateKeyCommand(args.domain, args['agent-id'], args.expires || 365);
      break;
    
    case 'revoke':
      if (!args['key-id'] || !args.reason) {
        console.error('❌ Error: --key-id and --reason are required');
        process.exit(1);
      }
      await revokeKeyCommand(args['key-id'], args.reason, args['performed-by']);
      break;
    
    case 'list':
      if (!args.domain) {
        console.error('❌ Error: --domain is required');
        process.exit(1);
      }
      await listKeys(args.domain, args['include-revoked'] || false);
      break;
    
    case 'audit':
      if (!args['key-id']) {
        console.error('❌ Error: --key-id is required');
        process.exit(1);
      }
      await showAuditLog(args['key-id'], args.limit || 50);
      break;
    
    case 'expiring':
      await checkExpiring(args.days || 30);
      break;
    
    case 'help':
    default:
      showHelp();
      break;
  }
}

// Run CLI
main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
