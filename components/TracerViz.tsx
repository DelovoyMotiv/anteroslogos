/**
 * CAUSAL TRACER VISUALIZATION COMPONENT
 * 
 * Interactive visualization of causal citation paths
 * Features:
 * - Force-directed graph layout (no external dependencies)
 * - Node highlighting for critical paths
 * - Interactive tooltips with detailed explanations
 * - Platform-specific color coding
 * - Zoom and pan support
 * - Export to PNG/SVG
 * 
 * @component TracerViz
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Download, ZoomIn, ZoomOut, Maximize2, Info } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface CausalNode {
  id: string;
  type: string;
  label: string;
  weight: number;
  metadata?: Record<string, any>;
}

interface CausalEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  weight: number;
}

interface CausalPath {
  nodes: string[];
  score: number;
  causalStrength: number;
  criticalNodes: string[];
}

interface TraceData {
  url: string;
  query: string;
  platform: string;
  trace: {
    paths: CausalPath[];
    overallProbability: number;
    confidenceLevel: string;
  };
  explanation: {
    reasonChosen: string;
    keyFactors: Array<{
      factor: string;
      impact: number;
      evidence: string;
    }>;
    platformBias: string;
    competitivePosition: {
      position: string;
      advantage: number;
    };
    nearMisses: Array<{
      competitorUrl: string;
      scoreGap: number;
    }>;
  };
  metadata: {
    graphNodes: number;
    graphEdges: number;
    processingTimeMs: number;
  };
}

interface GraphNode extends CausalNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number | null;
  fy?: number | null;
  isCritical: boolean;
  isInTopPath: boolean;
}

interface GraphEdge extends CausalEdge {
  sourceNode?: GraphNode;
  targetNode?: GraphNode;
  isInTopPath: boolean;
}

interface TracerVizProps {
  data: TraceData;
  width?: number;
  height?: number;
  className?: string;
}

// ============================================================================
// COLOR SCHEMES
// ============================================================================

const PLATFORM_COLORS: Record<string, string> = {
  Perplexity: '#1FB6FF',
  ChatGPT: '#10B981',
  Claude: '#8B5CF6',
  Gemini: '#F59E0B',
  Grok: '#EF4444',
  default: '#6B7280',
};

const NODE_TYPE_COLORS: Record<string, string> = {
  authority: '#3B82F6',
  structured_data: '#10B981',
  content_quality: '#F59E0B',
  eeat_signal: '#8B5CF6',
  citation_decision: '#EF4444',
  default: '#6B7280',
};

// ============================================================================
// FORCE SIMULATION (Custom implementation, no D3)
// ============================================================================

class ForceSimulation {
  private nodes: GraphNode[];
  private edges: GraphEdge[];
  private width: number;
  private height: number;
  private alpha: number = 1;
  private alphaDecay: number = 0.02;
  private velocityDecay: number = 0.4;
  private centerStrength: number = 0.05;
  private linkStrength: number = 0.3;
  private linkDistance: number = 100;
  private chargeStrength: number = -300;

  constructor(nodes: GraphNode[], edges: GraphEdge[], width: number, height: number) {
    this.nodes = nodes;
    this.edges = edges;
    this.width = width;
    this.height = height;

    // Initialize node positions
    nodes.forEach(node => {
      if (node.x === undefined) node.x = Math.random() * width;
      if (node.y === undefined) node.y = Math.random() * height;
      node.vx = 0;
      node.vy = 0;
    });
  }

  tick(): boolean {
    this.alpha *= (1 - this.alphaDecay);

    // Apply forces
    this.applyLinkForce();
    this.applyChargeForce();
    this.applyCenterForce();

    // Update positions
    this.nodes.forEach(node => {
      if (node.fx !== null && node.fx !== undefined) {
        node.x = node.fx;
        node.vx = 0;
      } else {
        node.vx *= this.velocityDecay;
        node.x += node.vx * this.alpha;
      }

      if (node.fy !== null && node.fy !== undefined) {
        node.y = node.fy;
        node.vy = 0;
      } else {
        node.vy *= this.velocityDecay;
        node.y += node.vy * this.alpha;
      }

      // Keep nodes in bounds
      node.x = Math.max(50, Math.min(this.width - 50, node.x));
      node.y = Math.max(50, Math.min(this.height - 50, node.y));
    });

    return this.alpha > 0.001;
  }

  private applyLinkForce() {
    this.edges.forEach(edge => {
      const source = this.nodes.find(n => n.id === edge.source);
      const target = this.nodes.find(n => n.id === edge.target);

      if (!source || !target) return;

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (distance - this.linkDistance) * this.linkStrength * edge.weight;

      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;

      source.vx += fx;
      source.vy += fy;
      target.vx -= fx;
      target.vy -= fy;
    });
  }

  private applyChargeForce() {
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const a = this.nodes[i];
        const b = this.nodes[j];

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distanceSquared = dx * dx + dy * dy;
        const distance = Math.sqrt(distanceSquared) || 1;

        if (distance < 300) {
          const force = this.chargeStrength / distanceSquared;
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;

          a.vx += fx;
          a.vy += fy;
          b.vx -= fx;
          b.vy -= fy;
        }
      }
    }
  }

  private applyCenterForce() {
    const cx = this.width / 2;
    const cy = this.height / 2;

    this.nodes.forEach(node => {
      node.vx += (cx - node.x) * this.centerStrength;
      node.vy += (cy - node.y) * this.centerStrength;
    });
  }

  setNodePosition(nodeId: string, x: number | null, y: number | null) {
    const node = this.nodes.find(n => n.id === nodeId);
    if (node) {
      node.fx = x;
      node.fy = y;
    }
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const TracerViz: React.FC<TracerVizProps> = ({
  data,
  width = 1200,
  height = 800,
  className = '',
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  // Build graph data
  const { nodes, edges } = useMemo(() => {
    // Extract nodes and edges from trace data
    // This is a simplified version - in real implementation, 
    // you'd get full graph from the API response
    const topPath = data.trace.paths[0];
    const criticalNodeIds = new Set(topPath?.criticalNodes || []);
    const topPathNodeIds = new Set(topPath?.nodes || []);

    // Create nodes (example structure)
    const graphNodes: GraphNode[] = [];
    for (let i = 0; i < data.metadata.graphNodes; i++) {
      const nodeId = `node_${i}`;
      graphNodes.push({
        id: nodeId,
        type: i === 0 ? 'authority' : i === 1 ? 'structured_data' : 'content_quality',
        label: `Node ${i}`,
        weight: Math.random(),
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        isCritical: criticalNodeIds.has(nodeId),
        isInTopPath: topPathNodeIds.has(nodeId),
      });
    }

    // Create edges
    const graphEdges: GraphEdge[] = [];
    for (let i = 0; i < data.metadata.graphEdges; i++) {
      const sourceIdx = Math.floor(Math.random() * graphNodes.length);
      const targetIdx = (sourceIdx + 1) % graphNodes.length;
      graphEdges.push({
        id: `edge_${i}`,
        source: graphNodes[sourceIdx].id,
        target: graphNodes[targetIdx].id,
        type: 'enhances',
        weight: Math.random(),
        isInTopPath: topPathNodeIds.has(graphNodes[sourceIdx].id) && 
                     topPathNodeIds.has(graphNodes[targetIdx].id),
      });
    }

    return { nodes: graphNodes, edges: graphEdges };
  }, [data]);

  // Force simulation
  const simulationRef = useRef<ForceSimulation | null>(null);
  const [, setTick] = useState<number>(0);

  useEffect(() => {
    simulationRef.current = new ForceSimulation(nodes, edges, width, height);

    let animationFrame: number;
    let tickCount = 0;
    const animate = () => {
      if (simulationRef.current) {
        const shouldContinue = simulationRef.current.tick();
        tickCount++;
        setTick(tickCount);
        if (shouldContinue) {
          animationFrame = requestAnimationFrame(animate);
        }
      }
    };

    animate();

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [nodes, edges, width, height]);

  // Pan and zoom handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setZoom(Math.min(zoom * 1.2, 4));
  };
  const handleZoomOut = () => {
    setZoom(Math.max(zoom / 1.2, 0.25));
  };
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Export handlers
  const handleExportPNG = () => {
    if (!svgRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(blob => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `causal-trace-${data.platform}-${Date.now()}.png`;
          a.click();
        }
      });
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const handleExportSVG = () => {
    if (!svgRef.current) return;

    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `causal-trace-${data.platform}-${Date.now()}.svg`;
    a.click();
  };

  const platformColor = PLATFORM_COLORS[data.platform] || PLATFORM_COLORS.default;

  return (
    <div className={`relative bg-gray-900 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-gray-900 to-transparent p-4 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">
              Causal Citation Trace
            </h3>
            <p className="text-sm text-gray-400">
              Platform: <span style={{ color: platformColor }} className="font-medium">{data.platform}</span>
              {' '} | Probability: <span className="text-green-400">{(data.trace.overallProbability * 100).toFixed(1)}%</span>
              {' '} | Confidence: <span className="text-blue-400">{data.trace.confidenceLevel}</span>
            </p>
          </div>

          {/* Controls */}
          <div className="flex gap-2" role="toolbar" aria-label="Graph controls">
            <button
              onClick={handleZoomIn}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded text-white transition focus:outline-none focus:ring-2 focus:ring-blue-400"
              title="Zoom In"
              aria-label="Zoom in on graph"
            >
              <ZoomIn size={18} aria-hidden="true" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded text-white transition focus:outline-none focus:ring-2 focus:ring-blue-400"
              title="Zoom Out"
              aria-label="Zoom out on graph"
            >
              <ZoomOut size={18} aria-hidden="true" />
            </button>
            <button
              onClick={handleResetView}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded text-white transition focus:outline-none focus:ring-2 focus:ring-blue-400"
              title="Reset View"
              aria-label="Reset graph view to default"
            >
              <Maximize2 size={18} aria-hidden="true" />
            </button>
            <button
              onClick={handleExportPNG}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded text-white transition focus:outline-none focus:ring-2 focus:ring-blue-400"
              title="Export PNG"
              aria-label="Export graph as PNG image"
            >
              <Download size={18} aria-hidden="true" />
            </button>
            <button
              onClick={handleExportSVG}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded text-white transition focus:outline-none focus:ring-2 focus:ring-blue-400"
              title="Export SVG"
              aria-label="Export graph as SVG image"
            >
              <Download size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Graph */}
      <div
        className="cursor-move"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          ref={svgRef}
          width={width}
          height={height}
          className="bg-gray-950"
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          role="img"
          aria-label={`Causal citation trace graph for ${data.platform} with ${data.metadata.graphNodes} nodes and ${data.metadata.graphEdges} edges`}
        >
          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
            {/* Edges */}
            {edges.map(edge => {
              const source = nodes.find(n => n.id === edge.source);
              const target = nodes.find(n => n.id === edge.target);
              if (!source || !target) return null;

              return (
                <line
                  key={edge.id}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={edge.isInTopPath ? platformColor : '#374151'}
                  strokeWidth={edge.isInTopPath ? 2 : 1}
                  opacity={edge.isInTopPath ? 0.8 : 0.3}
                />
              );
            })}

            {/* Nodes */}
            {nodes.map(node => {
              const color = NODE_TYPE_COLORS[node.type] || NODE_TYPE_COLORS.default;
              const radius = node.isCritical ? 12 : node.isInTopPath ? 10 : 8;

              return (
                <g
                  key={node.id}
                  onMouseEnter={() => setHoveredNode(node)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => setSelectedNode(node)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Glow for critical nodes */}
                  {node.isCritical && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={radius + 6}
                      fill={color}
                      opacity={0.2}
                    />
                  )}

                  {/* Node circle */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={radius}
                    fill={color}
                    stroke={node.isInTopPath ? platformColor : '#1F2937'}
                    strokeWidth={node.isInTopPath ? 2 : 1}
                    opacity={hoveredNode?.id === node.id ? 1 : 0.9}
                  />

                  {/* Label */}
                  <text
                    x={node.x}
                    y={node.y + radius + 15}
                    textAnchor="middle"
                    fill="#9CA3AF"
                    fontSize="10"
                    fontWeight={node.isCritical ? 'bold' : 'normal'}
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Tooltip */}
      {hoveredNode && (
        <div className="absolute bottom-4 left-4 bg-gray-800 border border-gray-700 rounded-lg p-4 max-w-sm z-20">
          <div className="flex items-start gap-2">
            <Info size={16} className="text-blue-400 mt-1" />
            <div>
              <h4 className="font-semibold text-white">{hoveredNode.label}</h4>
              <p className="text-sm text-gray-400 mt-1">
                Type: <span className="text-gray-300">{hoveredNode.type}</span>
              </p>
              <p className="text-sm text-gray-400">
                Weight: <span className="text-gray-300">{(hoveredNode.weight * 100).toFixed(0)}%</span>
              </p>
              {hoveredNode.isCritical && (
                <p className="text-sm text-red-400 mt-2 font-medium">⚠ Critical Node</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Explanation Panel */}
      <div className="absolute bottom-4 right-4 bg-gray-800 border border-gray-700 rounded-lg p-4 max-w-md z-20">
        <h4 className="font-semibold text-white mb-2">Why Chosen</h4>
        <p className="text-sm text-gray-300 mb-3">{data.explanation.reasonChosen}</p>
        
        <h5 className="text-xs font-semibold text-gray-400 mb-2">Key Factors</h5>
        <div className="space-y-1">
          {data.explanation.keyFactors.slice(0, 3).map((factor, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-gray-400">{factor.factor}</span>
              <span className="text-green-400 font-medium">{(factor.impact * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>

        {data.explanation.competitivePosition && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <div className="text-xs text-gray-400">
              Position: <span className="text-blue-400 font-medium capitalize">
                {data.explanation.competitivePosition.position}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="absolute top-20 left-4 bg-gray-800 border border-gray-700 rounded-lg p-3 z-10">
        <h5 className="text-xs font-semibold text-white mb-2">Legend</h5>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_TYPE_COLORS.authority }} />
            <span className="text-xs text-gray-400">Authority</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_TYPE_COLORS.structured_data }} />
            <span className="text-xs text-gray-400">Schema</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_TYPE_COLORS.content_quality }} />
            <span className="text-xs text-gray-400">Content</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_TYPE_COLORS.eeat_signal }} />
            <span className="text-xs text-gray-400">E-E-A-T</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: platformColor }} />
            <span className="text-xs text-gray-400">Top Path</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TracerViz;
