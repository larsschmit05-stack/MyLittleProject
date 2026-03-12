import { Connection, Edge, Node } from 'reactflow';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

type NodeType = 'source' | 'process' | 'sink';

const VALID_CONNECTIONS: Record<NodeType, NodeType[]> = {
  source: ['process', 'sink'],
  process: ['process', 'sink'],
  sink: [],
};

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

function hasSingleLinearPath(nodes: Node[], edges: Edge[]): boolean {
  const source = nodes.find((node) => node.type === 'source');
  const sink = nodes.find((node) => node.type === 'sink');

  if (!source || !sink) {
    return false;
  }

  const visited = new Set<string>();
  let currentId: string | undefined = source.id;

  while (currentId) {
    if (visited.has(currentId)) {
      return false;
    }

    visited.add(currentId);

    const outgoingEdges = edges.filter((edge) => edge.source === currentId);
    if (outgoingEdges.length === 0) {
      return currentId === sink.id && visited.size === nodes.length;
    }

    if (outgoingEdges.length > 1) {
      return false;
    }

    currentId = outgoingEdges[0].target;
  }

  return false;
}

export function isValidConnection(
  connection: Connection,
  nodes: Node[],
  edges: Edge[]
): boolean {
  const { source, target } = connection;

  // Self-connection
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

  // No branching: source node already has an outgoing edge
  if (edges.some((e) => e.source === source)) return false;

  // No merging: target node already has an incoming edge
  if (edges.some((e) => e.target === target)) return false;

  // No cycles: check if target can already reach source
  if (canReach(target, source, edges)) return false;

  // No duplicate edges between the same nodes
  if (edges.some((e) => e.source === source && e.target === target)) return false;

  return true;
}

export function validateGraph(nodes: Node[], edges: Edge[]): ValidationResult {
  const errors: string[] = [];

  if (nodes.length === 0) {
    return { isValid: false, errors: ['Drag nodes onto the canvas to begin'] };
  }

  const sources = nodes.filter((n) => n.type === 'source');
  const sinks = nodes.filter((n) => n.type === 'sink');
  const processes = nodes.filter((n) => n.type === 'process');

  if (sources.length !== 1) {
    errors.push('Model must contain exactly one Source');
  }
  if (sinks.length !== 1) {
    errors.push('Model must contain exactly one Sink');
  }

  if (sources.length === 1) {
    const src = sources[0];
    const incoming = edges.filter((e) => e.target === src.id).length;
    const outgoing = edges.filter((e) => e.source === src.id).length;
    if (incoming > 0 || outgoing !== 1) {
      errors.push('Source must have exactly one outgoing connection');
    }
  }

  if (sinks.length === 1) {
    const snk = sinks[0];
    const incoming = edges.filter((e) => e.target === snk.id).length;
    const outgoing = edges.filter((e) => e.source === snk.id).length;
    if (incoming !== 1 || outgoing > 0) {
      errors.push('Sink must have exactly one incoming connection');
    }
  }

  const processesInvalid = processes.some((p) => {
    const incoming = edges.filter((e) => e.target === p.id).length;
    const outgoing = edges.filter((e) => e.source === p.id).length;
    return incoming !== 1 || outgoing !== 1;
  });
  if (processesInvalid) {
    errors.push('All Process nodes must have one input and one output');
  }

  if (errors.length === 0 && edges.length !== nodes.length - 1) {
    errors.push('Graph must form one continuous linear path');
  }

  if (errors.length === 0 && !hasSingleLinearPath(nodes, edges)) {
    errors.push('Graph must form one continuous linear path');
  }

  return { isValid: errors.length === 0, errors };
}
