import type { Connection, Edge, Node } from 'reactflow';
import type { EdgeData, ProcessNodeData } from '../../types/flow';

function getNodeDisplayName(node: Node): string {
  return (node.data as ProcessNodeData)?.name
    || (node.data as Record<string, unknown>)?.label as string
    || node.id;
}

export type ValidationErrorCategory =
  | 'cycle'
  | 'missing_bom'
  | 'invalid_ratio_sum'
  | 'invalid_sink_count'
  | 'orphaned_node'
  | 'invalid_scrap_target'
  | 'missing_output_material'
  | 'mixed_sink_inputs'
  | 'invalid_route_split'
;

export interface ValidationError {
  message: string;
  category: ValidationErrorCategory;
  nodeIds: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  categories: ValidationErrorCategory[];
  errorDetails: ValidationError[];
}

type NodeType = 'source' | 'process' | 'sink';
type ProcessField =
  | 'throughputRate'
  | 'availableTime'
  | 'yield'
  | 'availabilityRate'
  | 'performanceEfficiency'
  | 'qualityRate'
  | 'numberOfResources'
  | 'conversionRatio'
  | 'capacityLimit';

const VALID_CONNECTIONS: Record<NodeType, NodeType[]> = {
  source: ['process', 'sink'],
  process: ['process', 'sink'],
  sink: [],
};

export function isProcessValueValid(field: ProcessField, value: number): boolean {
  switch (field) {
    case 'throughputRate':
      return value > 0;
    case 'availableTime':
      return value >= 0;
    case 'yield':
    case 'availabilityRate':
    case 'performanceEfficiency':
    case 'qualityRate':
      return value > 0 && value <= 100;
    case 'capacityLimit':
      return value > 0;
    case 'numberOfResources':
      return value >= 1;
    case 'conversionRatio':
      return value > 0;
    default:
      return false;
  }
}

function canReach(from: string, target: string, edges: Edge[]): boolean {
  const visited = new Set<string>();
  const queue = [from];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === target) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const edge of edges) {
      if (edge.source === current) queue.push(edge.target);
    }
  }
  return false;
}

/** Returns IDs of nodes participating in cycles, or empty array if acyclic. */
function findCycleNodeIds(nodes: Node[], realEdges: Edge[]): string[] {
  const adj = new Map<string, string[]>();
  for (const n of nodes) adj.set(n.id, []);
  for (const e of realEdges) adj.get(e.source)?.push(e.target);

  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>(nodes.map(n => [n.id, WHITE]));
  const cycleNodes = new Set<string>();

  function dfs(u: string): boolean {
    color.set(u, GRAY);
    for (const v of (adj.get(u) ?? [])) {
      if (color.get(v) === GRAY) {
        cycleNodes.add(u);
        cycleNodes.add(v);
        return true;
      }
      if (color.get(v) === WHITE && dfs(v)) {
        if (color.get(u) === GRAY) cycleNodes.add(u);
        return true;
      }
    }
    color.set(u, BLACK);
    return false;
  }

  nodes.forEach(n => {
    if (color.get(n.id) === WHITE) dfs(n.id);
  });
  return [...cycleNodes];
}

export function isValidConnection(
  connection: Connection,
  nodes: Node[],
  edges: Edge<EdgeData>[]
): boolean {
  const { source, target } = connection;

  if (source === target) return false;
  if (!source || !target) return false;

  const sourceNode = nodes.find((n) => n.id === source);
  const targetNode = nodes.find((n) => n.id === target);
  if (!sourceNode || !targetNode) return false;

  const sourceType = sourceNode.type as NodeType;
  const targetType = targetNode.type as NodeType;

  // Block connections into Source
  if (targetType === 'source') return false;

  // Block connections out of Sink
  if (sourceType === 'sink') return false;

  // Valid type pair check
  if (!VALID_CONNECTIONS[sourceType]?.includes(targetType)) return false;

  // No duplicate edges between the same nodes
  if (edges.some((e) => e.source === source && e.target === target)) return false;

  // No cycles: check if target can already reach source (via real edges only)
  const realEdges = edges.filter(e => !e.data?.isScrap);
  if (canReach(target, source, realEdges)) return false;

  return true;
}

export function validateGraph(nodes: Node[], edges: Edge<EdgeData>[]): ValidationResult {
  const errors: string[] = [];
  const categories: ValidationErrorCategory[] = [];
  const errorDetails: ValidationError[] = [];

  function addError(message: string, category: ValidationErrorCategory, nodeIds: string[]) {
    errors.push(message);
    categories.push(category);
    errorDetails.push({ message, category, nodeIds });
  }

  if (nodes.length === 0) {
    return { isValid: false, errors: ['Drag nodes onto the canvas to begin'], categories: [], errorDetails: [] };
  }

  const sources = nodes.filter((n) => n.type === 'source');
  const sinks = nodes.filter((n) => n.type === 'sink');

  if (sources.length === 0) {
    addError('Model must contain at least one Source', 'orphaned_node', []);
  }

  if (sinks.length !== 1) {
    addError('Model must have exactly one Sink', 'invalid_sink_count', sinks.map(s => s.id));
  }

  if (errors.length > 0) {
    return { isValid: false, errors, categories, errorDetails };
  }

  const realEdges = edges.filter(e => !e.data?.isScrap);
  const scrapEdges = edges.filter(e => e.data?.isScrap === true);

  // Scrap dead-end nodes: targeted only by scrap edges, no real incoming/outgoing
  const scrapTargetIds = new Set(scrapEdges.map(e => e.target));
  const scrapDeadEndIds = new Set(
    [...scrapTargetIds].filter(id =>
      !realEdges.some(e => e.target === id) &&
      !realEdges.some(e => e.source === id)
    )
  );

  // Cycle detection
  const cycleNodeIds = findCycleNodeIds(nodes, realEdges);
  if (cycleNodeIds.length > 0) {
    addError('A cycle was detected in the graph', 'cycle', cycleNodeIds);
    return { isValid: false, errors, categories, errorDetails };
  }

  const sinkId = sinks[0].id;

  // Forward reachability: all non-source, non-scrap-dead-end nodes must be reachable from some source
  const forwardReachable = new Set<string>();
  const fwQueue = sources.map(s => s.id);
  for (const id of fwQueue) forwardReachable.add(id);
  while (fwQueue.length > 0) {
    const cur = fwQueue.shift()!;
    for (const e of realEdges) {
      if (e.source === cur && !forwardReachable.has(e.target)) {
        forwardReachable.add(e.target);
        fwQueue.push(e.target);
      }
    }
  }

  const notForwardReachable = nodes.filter(n =>
    !forwardReachable.has(n.id) &&
    n.type !== 'source' &&
    !scrapDeadEndIds.has(n.id)
  );
  if (notForwardReachable.length > 0) {
    const names = notForwardReachable.map(getNodeDisplayName).join(', ');
    addError(`Not reachable from any Source: ${names}`, 'orphaned_node', notForwardReachable.map(n => n.id));
  }

  // Backward reachability: all non-sink, non-scrap-dead-end nodes must have a path to sink
  const backwardReachable = new Set<string>();
  const bwQueue = [sinkId];
  for (const id of bwQueue) backwardReachable.add(id);
  while (bwQueue.length > 0) {
    const cur = bwQueue.shift()!;
    for (const e of realEdges) {
      if (e.target === cur && !backwardReachable.has(e.source)) {
        backwardReachable.add(e.source);
        bwQueue.push(e.source);
      }
    }
  }

  const notBackwardReachable = nodes.filter(n =>
    !backwardReachable.has(n.id) &&
    n.type !== 'sink' &&
    !scrapDeadEndIds.has(n.id)
  );
  if (notBackwardReachable.length > 0) {
    const names = notBackwardReachable.map(getNodeDisplayName).join(', ');
    addError(`No path to Sink: ${names}`, 'orphaned_node', notBackwardReachable.map(n => n.id));
  }

  // Scrap edge targeting the Sink
  if (scrapEdges.some(e => e.target === sinkId)) {
    addError('A scrap edge cannot target the Sink', 'invalid_scrap_target', [sinkId]);
  }

  // Scrap edge target has outgoing real edges
  for (const scrapEdge of scrapEdges) {
    const targetId = scrapEdge.target;
    if (realEdges.some(e => e.source === targetId)) {
      const targetNode = nodes.find(n => n.id === targetId);
      const name = targetNode ? getNodeDisplayName(targetNode) : targetId;
      addError(`A scrap path from "${name}" connects to a node with further outputs`, 'invalid_scrap_target', [targetId]);
    }
  }

  // Merge nodes: process nodes with ≥2 incoming real edges must have valid bomRatios
  // on non-route-split edges
  const processNodes = nodes.filter(n => n.type === 'process');
  for (const pNode of processNodes) {
    const incomingReal = realEdges.filter(e => e.target === pNode.id);
    if (incomingReal.length >= 2) {
      const data = pNode.data as ProcessNodeData;
      const bomRatios = data?.bomRatios;
      // Only check BOM ratios on edges that don't use route split
      const bomEdges = incomingReal.filter(e => e.data?.routeSplitPercent == null);
      if (bomEdges.length > 0) {
        const hasMissing = bomEdges.some(e => {
          const ratio = bomRatios?.[e.id];
          return ratio === undefined || ratio === null || ratio <= 0;
        });
        if (hasMissing) {
          const name = data?.name ?? pNode.id;
          addError(`Merge node "${name}" has missing or invalid BOM ratios`, 'missing_bom', [pNode.id]);
        }
      }
    }
  }

  // Route split groups: validate route-split sub-groups per target node.
  // A route-split group is the set of edges with routeSplitPercent into the same target.
  // There must be ≥2 edges in the group, values must be >0, and they must sum to 100% ±1%.
  // Edges without routeSplitPercent on the same target are fine (they use BOM ratios).
  const allTargetIds = new Set(realEdges.map(e => e.target));
  for (const targetId of allTargetIds) {
    const incomingReal = realEdges.filter(e => e.target === targetId);
    const edgesWithRouteSplit = incomingReal.filter(e => e.data?.routeSplitPercent != null);
    if (edgesWithRouteSplit.length === 0) continue;

    const targetNode = nodes.find(n => n.id === targetId);
    const name = targetNode ? getNodeDisplayName(targetNode) : targetId;

    // A single route-split edge is incomplete — need at least 2 to form a valid group
    if (edgesWithRouteSplit.length === 1) {
      addError(`Route group at "${name}" needs at least 2 route split edges`, 'invalid_route_split', [targetId]);
      continue;
    }

    // Individual values must be > 0
    const hasZeroOrNeg = edgesWithRouteSplit.some(e => (e.data?.routeSplitPercent ?? 0) <= 0);
    if (hasZeroOrNeg) {
      addError(`Route group at "${name}" has route split values that are zero or negative`, 'invalid_route_split', [targetId]);
    }

    // Sum must be 100% ± 1%
    const sum = edgesWithRouteSplit.reduce((s, e) => s + (e.data?.routeSplitPercent ?? 0), 0);
    if (sum < 99 || sum > 101) {
      addError(`Route group at "${name}" has route splits summing to ${sum.toFixed(1)}%, expected 100% ± 1%`, 'invalid_route_split', [targetId]);
    }
  }

  // Split nodes: any source/process node with ≥2 total outgoing edges (real + scrap) must have
  // splitRatios on ALL outgoing edges summing to 100% ± 1%
  const outputNodes = nodes.filter(n => n.type === 'source' || n.type === 'process');
  for (const node of outputNodes) {
    const allOutgoing = edges.filter(e => e.source === node.id);
    if (allOutgoing.length >= 2) {
      const ratios = allOutgoing.map(e => e.data?.splitRatio ?? 0);
      const sum = ratios.reduce((a, b) => a + b, 0);
      const hasMissing = ratios.some(r => r === 0);
      const isOutOfRange = sum < 99 || sum > 101;
      const name = getNodeDisplayName(node);

      if (hasMissing) {
        addError(`Split node "${name}" has missing split ratios`, 'invalid_ratio_sum', [node.id]);
      } else if (isOutOfRange) {
        addError(`Split node "${name}" has ratios summing to ${sum.toFixed(1)}%, expected 100% ± 1%`, 'invalid_ratio_sum', [node.id]);
      }
    }
  }

  // Output Material required on all process nodes
  for (const pNode of processNodes) {
    const data = pNode.data as ProcessNodeData;
    if (!data?.outputMaterial?.trim()) {
      const name = data?.name ?? pNode.id;
      addError(`Process node "${name}" is missing an Output Material`, 'missing_output_material', [pNode.id]);
    }
  }

  // Sink must receive only one distinct product type
  const sinkIncoming = realEdges.filter(e => e.target === sinkId);
  const sinkMaterials = sinkIncoming
    .map(e => {
      const srcNode = nodes.find(n => n.id === e.source);
      return (srcNode?.data as ProcessNodeData)?.outputMaterial?.trim() ?? '';
    })
    .filter(m => m !== '');
  if (new Set(sinkMaterials).size >= 2) {
    addError('Sink accepts only one product. Mark unwanted inputs as scrap or remove them.', 'mixed_sink_inputs', [sinkId]);
  }

  return { isValid: errors.length === 0, errors, categories, errorDetails };
}
