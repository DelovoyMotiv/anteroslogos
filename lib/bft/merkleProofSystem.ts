/**
 * Merkle Proof System
 * 
 * Provides cryptographic integrity verification for graph provenance using Merkle trees.
 * Implements SHA-256 based Merkle tree construction, proof generation, and verification.
 * 
 * Key Features:
 * - O(log N) proof verification complexity
 * - Batch verification support
 * - Handles odd number of leaves
 * 
 * @module lib/bft/merkleProofSystem
 * @version 1.0.0
 */

import { createHash } from 'crypto';
import type {
  MerkleTree,
  MerkleNode,
  MerkleProof,
  CausalGraph,
} from '../../types/byzantine.types';

/**
 * Merkle Proof System for cryptographic graph integrity verification
 */
export class MerkleProofSystem {
  /**
   * Build Merkle tree from causal graph
   * 
   * Constructs a Merkle tree from all nodes and edges in the graph.
   * Uses SHA-256 for hashing. Handles odd number of leaves by duplicating
   * the last leaf.
   * 
   * @param graph - Causal graph to build tree from
   * @returns Merkle tree structure with root hash
   */
  buildMerkleTree(graph: CausalGraph): MerkleTree {
    // Collect all leaf data (nodes and edges)
    const leaves: Array<{ id: string; data: string }> = [];
    
    // Add nodes as leaves
    for (const [nodeId, node] of graph.nodes) {
      const nodeData = JSON.stringify({
        id: nodeId,
        type: node.type,
        data: node.data,
        authorityScore: node.authorityScore,
      });
      leaves.push({ id: `node:${nodeId}`, data: nodeData });
    }
    
    // Add edges as leaves
    for (const [source, edgeList] of graph.edges) {
      for (const edge of edgeList) {
        const edgeData = JSON.stringify({
          source: edge.source,
          target: edge.target,
          type: edge.type,
          weight: edge.weight,
        });
        leaves.push({ id: `edge:${source}->${edge.target}`, data: edgeData });
      }
    }
    
    // Handle empty graph
    if (leaves.length === 0) {
      const emptyHash = this.hash('');
      const emptyNode: MerkleNode = {
        hash: emptyHash,
        data: null,
      };
      return {
        root: emptyNode,
        rootHash: emptyHash,
        leafCount: 0,
        height: 0,
      };
    }
    
    // Create leaf nodes
    const leafNodes: MerkleNode[] = leaves.map(leaf => ({
      hash: this.hash(leaf.data),
      data: leaf,
    }));
    
    // Build tree bottom-up
    const root = this.buildTreeRecursive(leafNodes);
    const height = this.calculateHeight(leafNodes.length);
    
    return {
      root,
      rootHash: root.hash,
      leafCount: leaves.length,
      height,
    };
  }
  
  /**
   * Recursively build Merkle tree from leaf nodes
   * 
   * @param nodes - Current level of nodes
   * @returns Root node of the tree
   */
  private buildTreeRecursive(nodes: MerkleNode[]): MerkleNode {
    // Base case: single node is the root
    if (nodes.length === 1) {
      return nodes[0];
    }
    
    const parentNodes: MerkleNode[] = [];
    
    // Process pairs of nodes
    for (let i = 0; i < nodes.length; i += 2) {
      const left = nodes[i];
      const right = i + 1 < nodes.length ? nodes[i + 1] : nodes[i]; // Duplicate last node if odd
      
      const parentHash = this.hash(left.hash + right.hash);
      const parentNode: MerkleNode = {
        hash: parentHash,
        left,
        right: i + 1 < nodes.length ? right : undefined, // Don't store duplicate
      };
      
      parentNodes.push(parentNode);
    }
    
    // Recurse to next level
    return this.buildTreeRecursive(parentNodes);
  }
  
  /**
   * Calculate tree height from leaf count
   * 
   * @param leafCount - Number of leaves
   * @returns Height of the tree
   */
  private calculateHeight(leafCount: number): number {
    if (leafCount === 0) return 0;
    return Math.ceil(Math.log2(leafCount));
  }
  
  /**
   * Hash data using SHA-256
   * 
   * @param data - Data to hash
   * @returns Hex-encoded SHA-256 hash
   */
  private hash(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }
  
  /**
   * Generate Merkle proof for a specific node
   * 
   * Collects sibling hashes along the path from leaf to root.
   * Stores position information (left/right) for verification.
   * 
   * @param tree - Merkle tree
   * @param nodeId - ID of the node to generate proof for
   * @returns Merkle proof or null if node not found
   */
  generateProof(tree: MerkleTree, nodeId: string): MerkleProof | null {
    // Find the leaf node
    const leafPath = this.findLeafPath(tree.root, nodeId);
    
    if (!leafPath) {
      return null;
    }
    
    const { leaf, path } = leafPath;
    
    // Collect sibling hashes along the path
    const siblings: Array<{ hash: string; position: 'left' | 'right' }> = [];
    
    for (const { node, isLeft } of path) {
      if (node.left && node.right) {
        // Add sibling hash
        const sibling = isLeft ? node.right : node.left;
        siblings.push({
          hash: sibling.hash,
          position: isLeft ? 'right' : 'left',
        });
      }
    }
    
    return {
      nodeId,
      leafHash: leaf.hash,
      siblings,
      rootHash: tree.rootHash,
    };
  }
  
  /**
   * Find path from root to leaf node
   * 
   * @param node - Current node
   * @param nodeId - Target node ID
   * @param path - Accumulated path
   * @returns Leaf node and path or null if not found
   */
  private findLeafPath(
    node: MerkleNode,
    nodeId: string,
    path: Array<{ node: MerkleNode; isLeft: boolean }> = []
  ): { leaf: MerkleNode; path: Array<{ node: MerkleNode; isLeft: boolean }> } | null {
    // Check if this is the target leaf
    if (node.data && typeof node.data === 'object' && 'id' in node.data) {
      if (node.data.id === nodeId || node.data.id === `node:${nodeId}` || node.data.id === `edge:${nodeId}`) {
        return { leaf: node, path };
      }
    }
    
    // Search left subtree
    if (node.left) {
      const leftResult = this.findLeafPath(
        node.left,
        nodeId,
        [...path, { node, isLeft: true }]
      );
      if (leftResult) return leftResult;
    }
    
    // Search right subtree
    if (node.right) {
      const rightResult = this.findLeafPath(
        node.right,
        nodeId,
        [...path, { node, isLeft: false }]
      );
      if (rightResult) return rightResult;
    }
    
    return null;
  }
  
  /**
   * Verify Merkle proof against root hash
   * 
   * Reconstructs root hash from proof and compares with expected root.
   * Ensures O(log N) complexity.
   * 
   * @param proof - Merkle proof to verify
   * @param rootHash - Expected root hash
   * @returns True if proof is valid
   */
  verifyProof(proof: MerkleProof, rootHash: string): boolean {
    // Start with leaf hash
    let currentHash = proof.leafHash;
    
    // Reconstruct root hash by combining with siblings
    for (const sibling of proof.siblings) {
      if (sibling.position === 'left') {
        // Sibling is on the left, current is on the right
        currentHash = this.hash(sibling.hash + currentHash);
      } else {
        // Sibling is on the right, current is on the left
        currentHash = this.hash(currentHash + sibling.hash);
      }
    }
    
    // Compare reconstructed hash with expected root hash
    return currentHash === rootHash && currentHash === proof.rootHash;
  }
  
  /**
   * Batch verify multiple proofs against same root
   * 
   * Optimized for verifying multiple proofs against the same root hash.
   * 
   * @param proofs - Array of Merkle proofs
   * @param rootHash - Expected root hash
   * @returns Array of boolean results (true if valid)
   */
  batchVerifyProofs(proofs: MerkleProof[], rootHash: string): boolean[] {
    return proofs.map(proof => this.verifyProof(proof, rootHash));
  }
}
