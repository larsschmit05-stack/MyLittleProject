import type { SerializedModel, SerializedNode, ProcessNodeData, FlowResult, NodeResult } from '../types/flow';

export function toHours(minutes: number): number {
  return minutes / 60;
}

export function yieldToFraction(yieldPercent: number): number {
  return yieldPercent / 100;
}

const EMPTY_RESULT: FlowResult = {
  systemThroughput: 0,
  bottleneckNodeId: null,
  nodeResults: {},
};

// Returns process nodes in topological order: P0 closest to Source, Pn closest to Sink.
// Returns null if the graph cannot be traversed as a complete linear chain.
function getOrderedProcessChain(model: SerializedModel): SerializedNode[] | null {
  const sourceNodes = model.nodes.filter((n) => n.type === 'source');
  const sinkNodes = model.nodes.filter((n) => n.type === 'sink');
  if (sourceNodes.length !== 1 || sinkNodes.length !== 1) return null;

  const nodeMap = new Map(model.nodes.map((n) => [n.id, n]));
  const outgoingCounts = new Map<string, number>();
  const incomingCounts = new Map<string, number>();
  const edgeMap = new Map<string, string>();

  for (const node of model.nodes) {
    outgoingCounts.set(node.id, 0);
    incomingCounts.set(node.id, 0);
  }

  for (const edge of model.edges) {
    if (!nodeMap.has(edge.source) || !nodeMap.has(edge.target)) return null;
    if (edgeMap.has(edge.source)) return null;

    outgoingCounts.set(edge.source, (outgoingCounts.get(edge.source) ?? 0) + 1);
    incomingCounts.set(edge.target, (incomingCounts.get(edge.target) ?? 0) + 1);
    edgeMap.set(edge.source, edge.target);
  }

  const sourceNode = sourceNodes[0];
  const sinkNode = sinkNodes[0];

  if (model.edges.length !== model.nodes.length - 1) return null;

  for (const node of model.nodes) {
    const incoming = incomingCounts.get(node.id) ?? 0;
    const outgoing = outgoingCounts.get(node.id) ?? 0;

    if (node.type === 'source' && (incoming !== 0 || outgoing !== 1)) return null;
    if (node.type === 'sink' && (incoming !== 1 || outgoing !== 0)) return null;
    if (node.type === 'process' && (incoming !== 1 || outgoing !== 1)) return null;
  }

  const chain: SerializedNode[] = [];
  const visited = new Set<string>();
  let currentId: string | undefined = sourceNode.id;

  while (currentId) {
    if (visited.has(currentId)) return null; // cycle detected
    visited.add(currentId);

    if (currentId === sinkNode.id) break;

    const nextId = edgeMap.get(currentId);
    if (!nextId) return null; // disconnected

    const nextNode = nodeMap.get(nextId);
    if (!nextNode) return null;

    if (nextNode.type === 'process') {
      chain.push(nextNode);
    }

    currentId = nextId;
  }

  if (currentId !== sinkNode.id) return null;
  if (visited.size !== model.nodes.length) return null;

  return chain;
}

function computeEffectiveCapacity(data: ProcessNodeData): number {
  const cycleHours = toHours(data.cycleTime);
  const availHours = toHours(data.availableTime);
  const yieldFrac = yieldToFraction(data.yield);

  if (
    cycleHours <= 0 ||
    availHours <= 0 ||
    yieldFrac <= 0 ||
    data.numberOfResources <= 0
  ) {
    return 0;
  }

  return (availHours / cycleHours) * data.numberOfResources * yieldFrac;
}

export function calculateFlow(model: SerializedModel): FlowResult {
  if (model.nodes.length === 0) return EMPTY_RESULT;

  const chain = getOrderedProcessChain(model);
  if (chain === null) return EMPTY_RESULT;

  if (chain.length === 0) {
    // Source connects directly to Sink — no process nodes
    return { systemThroughput: model.globalDemand, bottleneckNodeId: null, nodeResults: {} };
  }

  const n = chain.length;

  // 1. Effective capacity per process node
  const effectiveCapacities: number[] = chain.map((node) => {
    if (node.type !== 'process') return 0;
    return computeEffectiveCapacity(node.data as ProcessNodeData);
  });

  // 2. Demand propagation — traverse from Sink side (index n-1) to Source side (index 0)
  const requiredThroughputs: number[] = new Array(n);
  let currentRequired = model.globalDemand;

  for (let i = n - 1; i >= 0; i--) {
    requiredThroughputs[i] = currentRequired;

    if (i > 0) {
      const data = chain[i].data as ProcessNodeData;
      const yieldFrac = yieldToFraction(data.yield);
      // requiredInput = requiredOutput / yieldFrac × conversionRatio
      currentRequired =
        yieldFrac > 0 ? (currentRequired / yieldFrac) * data.conversionRatio : Infinity;
    }
  }

  // 3. Normalize capacities to Sink output units
  // normalizedEC[i] = EC[i] × ∏(yieldFrac[j] / conversionRatio[j]) for j from i+1 to n-1
  const normalizedCapacities: number[] = new Array(n);
  let downstreamFactor = 1.0;

  for (let i = n - 1; i >= 0; i--) {
    normalizedCapacities[i] = effectiveCapacities[i] * downstreamFactor;

    const data = chain[i].data as ProcessNodeData;
    const yieldFrac = yieldToFraction(data.yield);
    const convRatio = data.conversionRatio;
    downstreamFactor = convRatio > 0 ? downstreamFactor * (yieldFrac / convRatio) : 0;
  }

  const systemThroughput = Math.min(...normalizedCapacities);

  // 4. Utilization, bottleneck, and node results
  const nodeResults: Record<string, NodeResult> = {};
  let maxUtilization = -Infinity;
  let bottleneckNodeId: string | null = null;

  for (let i = 0; i < n; i++) {
    const node = chain[i];
    const ec = effectiveCapacities[i];
    const rt = requiredThroughputs[i];

    let utilization: number;
    if (ec === 0) {
      utilization = rt === 0 ? 0 : Infinity;
    } else {
      utilization = rt / ec;
    }

    nodeResults[node.id] = { requiredThroughput: rt, effectiveCapacity: ec, utilization };

    if (utilization > maxUtilization) {
      maxUtilization = utilization;
      bottleneckNodeId = node.id;
    }
  }

  return { systemThroughput, bottleneckNodeId, nodeResults };
}
