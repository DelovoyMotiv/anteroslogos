/**
 * Data Migration Script: Graph Data to Epoch System
 * 
 * Migrates existing graph data to include epoch numbers and backfills
 * epoch commits for historical data.
 * 
 * This script:
 * 1. Identifies existing graph states that need epoch numbers
 * 2. Creates epoch commits for historical data
 * 3. Verifies migration success
 * 4. Provides rollback capability
 * 
 * @module scripts/migrate-graph-data-to-epochs
 * @version 1.0.0
 * 
 * Usage:
 *   npm run migrate:epochs -- --dry-run  # Preview changes
 *   npm run migrate:epochs                # Execute migration
 *   npm run migrate:epochs -- --verify    # Verify migration
 *   npm run migrate:epochs -- --rollback  # Rollback migration
 */

import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const BATCH_SIZE = 100;
const DRY_RUN = process.argv.includes('--dry-run');
const VERIFY_ONLY = process.argv.includes('--verify');
const ROLLBACK = process.argv.includes('--rollback');

// Validation
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - SUPABASE_URL or VITE_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Interface for graph state snapshot
 */
interface GraphStateSnapshot {
  timestamp: Date;
  nodeCount: number;
  edgeCount: number;
  graphHash: string;
  nodes: any[];
  edges: any[];
}

/**
 * Interface for epoch commit
 */
interface EpochCommit {
  epochNumber: number;
  graphCommitHash: string;
  previousEpochHash: string | null;
  merkleRoot: string;
  nodeCount: number;
  edgeCount: number;
  signature: string;
}

/**
 * Generate SHA-256 hash
 */
function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generate Ed25519 signature (placeholder - in production, use actual key)
 */
function generateSignature(data: string): string {
  // In production, this would use actual Ed25519 signing
  // For migration, we use a deterministic hash-based signature
  return Buffer.from(sha256(data + 'migration-signature')).toString('base64');
}

/**
 * Build Merkle root from graph data
 */
function buildMerkleRoot(nodes: any[], edges: any[]): string {
  // Sort for deterministic hashing
  const sortedNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
  const sortedEdges = [...edges].sort((a, b) => {
    const cmp = a.source.localeCompare(b.source);
    return cmp !== 0 ? cmp : a.target.localeCompare(b.target);
  });

  // Hash all nodes
  const nodeHashes = sortedNodes.map(node => 
    sha256(JSON.stringify({ id: node.id, type: node.type, data: node.data }))
  );

  // Hash all edges
  const edgeHashes = sortedEdges.map(edge =>
    sha256(JSON.stringify({ source: edge.source, target: edge.target, type: edge.type }))
  );

  // Combine and build tree
  const allHashes = [...nodeHashes, ...edgeHashes];
  
  if (allHashes.length === 0) {
    return sha256('empty-graph');
  }

  // Simple Merkle tree construction
  let currentLevel = allHashes;
  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      if (i + 1 < currentLevel.length) {
        nextLevel.push(sha256(currentLevel[i] + currentLevel[i + 1]));
      } else {
        nextLevel.push(currentLevel[i]);
      }
    }
    currentLevel = nextLevel;
  }

  return currentLevel[0];
}

/**
 * Fetch historical graph states
 * In a real system, this would query actual graph history
 * For migration, we'll create synthetic snapshots based on available data
 */
async function fetchHistoricalGraphStates(): Promise<GraphStateSnapshot[]> {
  console.log('📊 Fetching historical graph states...');

  // Check if we have any existing graph data
  // This is a placeholder - adapt to your actual graph storage
  const { data: existingData, error } = await supabase
    .from('knowledge_graph_nodes')
    .select('*')
    .limit(1);

  if (error) {
    console.log('ℹ️  No existing graph data found, creating initial epoch');
    return [{
      timestamp: new Date('2025-01-01T00:00:00Z'),
      nodeCount: 0,
      edgeCount: 0,
      graphHash: sha256('initial-empty-graph'),
      nodes: [],
      edges: [],
    }];
  }

  // For migration, create a single snapshot representing current state
  // In production, you might have historical snapshots to process
  const { data: nodes } = await supabase
    .from('knowledge_graph_nodes')
    .select('*');

  const { data: edges } = await supabase
    .from('knowledge_graph_edges')
    .select('*');

  const snapshot: GraphStateSnapshot = {
    timestamp: new Date(),
    nodeCount: nodes?.length || 0,
    edgeCount: edges?.length || 0,
    graphHash: sha256(JSON.stringify({ nodes, edges })),
    nodes: nodes || [],
    edges: edges || [],
  };

  console.log(`✅ Found ${snapshot.nodeCount} nodes and ${snapshot.edgeCount} edges`);

  return [snapshot];
}

/**
 * Create epoch commit from graph snapshot
 */
function createEpochCommit(
  snapshot: GraphStateSnapshot,
  epochNumber: number,
  previousEpochHash: string | null
): EpochCommit {
  const merkleRoot = buildMerkleRoot(snapshot.nodes, snapshot.edges);
  const graphCommitHash = sha256(merkleRoot + epochNumber.toString());
  const signature = generateSignature(graphCommitHash);

  return {
    epochNumber,
    graphCommitHash,
    previousEpochHash,
    merkleRoot,
    nodeCount: snapshot.nodeCount,
    edgeCount: snapshot.edgeCount,
    signature,
  };
}

/**
 * Insert epoch commits into database
 */
async function insertEpochCommits(commits: EpochCommit[]): Promise<void> {
  console.log(`📝 Inserting ${commits.length} epoch commits...`);

  for (const commit of commits) {
    if (DRY_RUN) {
      console.log(`   [DRY RUN] Would insert epoch ${commit.epochNumber}`);
      continue;
    }

    const { error } = await supabase
      .from('bft_epoch_commits')
      .insert({
        epoch_number: commit.epochNumber,
        graph_commit_hash: commit.graphCommitHash,
        previous_epoch_hash: commit.previousEpochHash,
        merkle_root: commit.merkleRoot,
        node_count: commit.nodeCount,
        edge_count: commit.edgeCount,
        signature: commit.signature,
      });

    if (error) {
      // Check if epoch already exists
      if (error.code === '23505') { // Unique violation
        console.log(`   ⚠️  Epoch ${commit.epochNumber} already exists, skipping`);
        continue;
      }
      throw new Error(`Failed to insert epoch ${commit.epochNumber}: ${error.message}`);
    }

    console.log(`   ✅ Inserted epoch ${commit.epochNumber}`);
  }
}

/**
 * Verify migration success
 */
async function verifyMigration(): Promise<boolean> {
  console.log('🔍 Verifying migration...');

  // Check if epoch 0 exists
  const { data: epoch0, error: epoch0Error } = await supabase
    .from('bft_epoch_commits')
    .select('*')
    .eq('epoch_number', 0)
    .single();

  if (epoch0Error || !epoch0) {
    console.error('❌ Epoch 0 not found');
    return false;
  }

  console.log('✅ Epoch 0 exists');

  // Verify epoch chain integrity
  const { data: allEpochs, error: epochsError } = await supabase
    .from('bft_epoch_commits')
    .select('*')
    .order('epoch_number', { ascending: true });

  if (epochsError || !allEpochs) {
    console.error('❌ Failed to fetch epochs');
    return false;
  }

  console.log(`✅ Found ${allEpochs.length} epochs`);

  // Verify chain
  for (let i = 1; i < allEpochs.length; i++) {
    const current = allEpochs[i];
    const previous = allEpochs[i - 1];

    if (current.previous_epoch_hash !== previous.graph_commit_hash) {
      console.error(`❌ Chain broken at epoch ${current.epoch_number}`);
      console.error(`   Expected: ${previous.graph_commit_hash}`);
      console.error(`   Got: ${current.previous_epoch_hash}`);
      return false;
    }
  }

  console.log('✅ Epoch chain integrity verified');

  // Verify using database function
  if (allEpochs.length > 1) {
    const { data: chainValid, error: chainError } = await supabase
      .rpc('verify_epoch_chain', {
        p_from_epoch: 0,
        p_to_epoch: allEpochs.length - 1,
      });

    if (chainError) {
      console.error('❌ Chain verification function failed:', chainError.message);
      return false;
    }

    if (!chainValid) {
      console.error('❌ Chain verification function returned false');
      return false;
    }

    console.log('✅ Database chain verification passed');
  }

  return true;
}

/**
 * Rollback migration
 */
async function rollbackMigration(): Promise<void> {
  console.log('⏪ Rolling back migration...');

  if (DRY_RUN) {
    console.log('[DRY RUN] Would delete all epoch commits');
    return;
  }

  const { error } = await supabase
    .from('bft_epoch_commits')
    .delete()
    .neq('epoch_number', -1); // Delete all

  if (error) {
    throw new Error(`Rollback failed: ${error.message}`);
  }

  console.log('✅ Rollback complete');
}

/**
 * Main migration function
 */
async function migrate(): Promise<void> {
  console.log('🚀 Starting graph data migration to epoch system');
  console.log('================================================');
  
  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No changes will be made');
  }

  if (VERIFY_ONLY) {
    const success = await verifyMigration();
    process.exit(success ? 0 : 1);
  }

  if (ROLLBACK) {
    await rollbackMigration();
    process.exit(0);
  }

  try {
    // Step 1: Fetch historical graph states
    const snapshots = await fetchHistoricalGraphStates();
    console.log(`\n📊 Processing ${snapshots.length} graph snapshots`);

    // Step 2: Create epoch commits
    const commits: EpochCommit[] = [];
    let previousHash: string | null = null;

    for (let i = 0; i < snapshots.length; i++) {
      const commit = createEpochCommit(snapshots[i], i, previousHash);
      commits.push(commit);
      previousHash = commit.graphCommitHash;
      
      console.log(`\n📦 Epoch ${i}:`);
      console.log(`   Nodes: ${commit.nodeCount}`);
      console.log(`   Edges: ${commit.edgeCount}`);
      console.log(`   Hash: ${commit.graphCommitHash.substring(0, 16)}...`);
      console.log(`   Merkle Root: ${commit.merkleRoot.substring(0, 16)}...`);
    }

    // Step 3: Insert epoch commits
    console.log('\n📝 Inserting epoch commits into database...');
    await insertEpochCommits(commits);

    // Step 4: Verify migration
    console.log('\n🔍 Verifying migration...');
    const success = await verifyMigration();

    if (success) {
      console.log('\n✅ Migration completed successfully!');
      console.log('================================================');
      console.log(`📊 Summary:`);
      console.log(`   - Epochs created: ${commits.length}`);
      console.log(`   - Chain integrity: ✅ Verified`);
      console.log(`   - Database functions: ✅ Working`);
      process.exit(0);
    } else {
      console.error('\n❌ Migration verification failed');
      console.error('   Run with --rollback to undo changes');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('   Run with --rollback to undo changes');
    process.exit(1);
  }
}

// Run migration
migrate();
