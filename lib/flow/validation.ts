import type { Connection, Edge, Node } from 'reactflow';
import type { EdgeData, ProcessNodeData } from '../../types/flow';

export type ValidationErrorCategory =
  | 'cycle'
  | 'missing_bom'
  | 'invalid_ratio_sum'
  | 'invalid_sink_count'
  | 'orphaned_node'
  | 'invalid_scrap_target';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  categories: ValidationErrorCategory[];
}

type NodeType = 'source' | 'process' | 'sink';
type ProcessField =
  | 'throughputRate'
  | 'availableTime'
  | 'yield'
  | 'numberOfResources'
  | 'conversionRatio';

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
      return value > 0 && value <= 100;
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

function hasCycle(nodes: Node[], realEdges: Edge[]): boolean {
  const adj = new Map<string, string[]>();
  for (const n of nodes) adj.set(n.id, []);
  for (const e of realEdges) adj.get(e.source)?.push(e.target);

  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>(nodes.map(n => [n.id, WHITE]));

  function dfs(u: string): boolean {
    color.set(u, GRAY);
    for (const v of (adj.get(u) ?? [])) {
      if (color.get(v) === GRAY) return true;
      if (color.get(v) === WHITE && dfs(v)) return true;
    }
    color.set(u, BLACK);
    return false;
  }

  return nodes.some(n => color.get(n.id) === WHITE && dfs(n.id));
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

  if (nodes.length === 0) {
    return { isValid: false, errors: ['Drag nodes onto the canvas to begin'], categories: [] };
  }

  const sources = nodes.filter((n) => n.type === 'source');
  const sinks = nodes.filter((n) => n.type === 'sink');

  if (sources.length === 0) {
    errors.push('Model must contain at least one Source');
  }

  if (sinks.length !== 1) {
    errors.push('Model must have exactly one Sink');
    categories.push('invalid_sink_count');
  }

  if (errors.length > 0) {
    return { isValid: false, errors, categories };
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
  if (hasCycle(nodes, realEdges)) {
    errors.push('A cycle was detected in the graph');
    categories.push('cycle');
    return { isValid: false, errors, categories };
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
    errors.push('One or more nodes are not reachable from any Source');
    categories.push('orphaned_node');
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
    errors.push('One or more nodes have no path to the Sink');
    categories.push('orphaned_node');
  }

  // Scrap edge targeting the Sink
  if (scrapEdges.some(e => e.target === sinkId)) {
    errors.push('A scrap edge cannot target the Sink');
    categories.push('invalid_scrap_target');
  }

  // Scrap edge target has outgoing real edges
  for (const scrapEdge of scrapEdges) {
    const targetId = scrapEdge.target;
    if (realEdges.some(e => e.source === targetId)) {
      const targetNode = nodes.find(n => n.id === targetId);
      const name = (targetNode?.data as ProcessNodeData)?.name ?? targetId;
      errors.push(`A scrap path from "${name}" connects to a node with further outputs`);
      categories.push('invalid_scrap_target');
    }
  }

  // Merge nodes: process nodes with ≥2 incoming real edges must have valid bomRatios
  const processNodes = nodes.filter(n => n.type === 'process');
  for (const pNode of processNodes) {
    const incomingReal = realEdges.filter(e => e.target === pNode.id);
    if (incomingReal.length >= 2) {
      const data = pNode.data as ProcessNodeData;
      const bomRatios = data?.bomRatios;
      const hasMissing = incomingReal.some(e => {
        const ratio = bomRatios?.[e.id];
        return ratio === undefined || ratio === null || ratio <= 0;
      });
      if (hasMissing) {
        const name = data?.name ?? pNode.id;
        errors.push(`Merge node "${name}" has missing or invalid BOM ratios`);
        categories.push('missing_bom');
      }
    }
  }

  // Split nodes: process nodes with ≥2 outgoing real edges must have valid splitRatios summing to 100% ± 1%
  for (const pNode of processNodes) {
    const outgoingReal = realEdges.filter(e => e.source === pNode.id);
    if (outgoingReal.length >= 2) {
      const ratios = outgoingReal.map(e => e.data?.splitRatio ?? 0);
      const sum = ratios.reduce((a, b) => a + b, 0);
      const hasMissing = ratios.some(r => r === 0);
      const isOutOfRange = sum < 99 || sum > 101;

      if (hasMissing) {
        const data = pNode.data as ProcessNodeData;
        const name = data?.name ?? pNode.id;
        errors.push(`Split node "${name}" has missing split ratios`);
        categories.push('invalid_ratio_sum');
      } else if (isOutOfRange) {
        const data = pNode.data as ProcessNodeData;
        const name = data?.name ?? pNode.id;
        errors.push(`Split node "${name}" has ratios summing to ${sum.toFixed(1)}%, expected 100% ± 1%`);
        categories.push('invalid_ratio_sum');
      }
    }
  }

  return { isValid: errors.length === 0, errors, categories };
}
