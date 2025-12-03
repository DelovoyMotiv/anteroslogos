/**
 * Generate Agent Card according to Linux Foundation A2A Protocol v1.0
 * Output: public/.well-known/agent-card.json
 */

import * as fs from 'fs';
import * as path from 'path';
import { agentCardManager } from '../lib/a2a/agentCard';

async function generateAgentCard() {
  console.log('Generating Agent Card according to Linux Foundation A2A Protocol v1.0...\n');
  
  // Generate card
  const card = agentCardManager.generateCard();
  
  // Validate
  const validation = agentCardManager.validateCard(card);
  
  if (!validation.valid) {
    console.error('❌ Agent Card validation failed:');
    validation.errors?.forEach(err => console.error(`  - ${err}`));
    process.exit(1);
  }
  
  console.log('✅ Agent Card validation passed\n');
  
  // Output path
  const outputPath = path.join(process.cwd(), 'public', '.well-known', 'agent-card.json');
  
  // Write to file
  fs.writeFileSync(outputPath, JSON.stringify(card, null, 2), 'utf-8');
  
  console.log(`✅ Agent Card generated: ${outputPath}\n`);
  
  // Print summary
  console.log('Agent Card Summary:');
  console.log(`  ID: ${card.id}`);
  console.log(`  Name: ${card.name}`);
  console.log(`  Version: ${card.version}`);
  console.log(`  Capabilities: ${card.capabilities.length}`);
  console.log(`  Protocols: ${card.protocols.join(', ')}`);
  console.log(`  Authentication: ${card.authentication.join(', ')}`);
  console.log(`  HTTP Endpoint: ${card.endpoints.http}`);
  console.log(`  WebSocket Endpoint: ${card.endpoints.websocket}`);
  console.log(`  Stream Endpoint: ${card.endpoints.stream}`);
  
  if (card.extensions?.payment?.supported) {
    console.log(`  Payment: ${card.extensions.payment.token} on ${card.extensions.payment.network}`);
  }
  
  if (card.extensions?.verification?.supported) {
    console.log(`  Verification: ${card.extensions.verification.method}`);
  }
  
  console.log('\n✅ Agent Card ready for discovery\n');
}

// Run
generateAgentCard().catch(err => {
  console.error('❌ Error generating agent card:', err);
  process.exit(1);
});
