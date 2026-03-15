import type { SerializedModel, SerializedNode, ProcessNodeData, FlowResult, NodeResult } from '../types/flow';

type SerializedEdge = SerializedModel['edges'][number];

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
  const throughputRate = data.throughputRate;
  const availHours = data.availableTime;
  const yieldFrac = yieldToFraction(data.yield);

  if (
    throughputRate <= 0 ||
    availHours <= 0 ||
    yieldFrac <= 0 ||
    data.numberOfResources <= 0
  ) {
    return 0;
  }

  return throughputRate * availHours * data.numberOfResources * yieldFrac;
}

export function calculateFlow(model: SerializedModel): FlowResult {
  if (model.nodes.length === 0) return EMPTY_RESULT;

  const chain = getOrderedProcessChain(model);
  if (chain === null) return EMPTY_RESULT;

  if (chain.length === 0) {
    // Source connects directly to Sink with no constraining process capacity.
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

// ─── DAG engine (Step 3) ──────────────────────────────────────────────────────

/**
 * Kahn's algorithm on real edges only (scrap edges excluded).
 * Returns node IDs in topological order (sources first, sink last),
 * or null if a cycle is detected.
 * Nodes referenced only by scrap edges are excluded from the output.
 */
export function topologicalSort(
  _nodes: SerializedNode[],
  edges: SerializedEdge[]
): string[] | null {
  const realEdges = edges.filter((e) => e.data?.isScrap !== true);
  const realNodeIds = new Set(realEdges.flatMap((e) => [e.source, e.target]));

  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const id of realNodeIds) {
    inDegree.set(id, 0);
    adjacency.set(id, []);
  }

  for (const e of realEdges) {
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
    adjacency.get(e.source)!.push(e.target);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);
    for (const neighbor of adjacency.get(current) ?? []) {
      const deg = (inDegree.get(neighbor) ?? 0) - 1;
      inDegree.set(neighbor, deg);
      if (deg === 0) queue.push(neighbor);
    }
  }

  if (sorted.length !== realNodeIds.size) return null; // cycle detected
  return sorted;
}

/**
 * Full DAG calculation engine supporting merges, splits, fork-joins and V1 linear chains.
 * Replaces calculateFlow() as the primary engine; signatures are identical.
 */
export function calculateFlowDAG(model: SerializedModel): FlowResult {
  if (model.nodes.length === 0) return EMPTY_RESULT;

  const order = topologicalSort(model.nodes, model.edges);
  if (order === null) return EMPTY_RESULT;

  const sinkNodes = model.nodes.filter((n) => n.type === 'sink');
  if (sinkNodes.length !== 1) return EMPTY_RESULT;
  const sinkNode = sinkNodes[0];

  const nodeMap = new Map(model.nodes.map((n) => [n.id, n]));

  const realEdges = model.edges.filter((e) => e.data?.isScrap !== true);
  const realEdgesBySource = new Map<string, SerializedEdge[]>();
  const realEdgesByTarget = new Map<string, SerializedEdge[]>();

  for (const e of realEdges) {
    if (!realEdgesBySource.has(e.source)) realEdgesBySource.set(e.source, []);
    realEdgesBySource.get(e.source)!.push(e);
    if (!realEdgesByTarget.has(e.target)) realEdgesByTarget.set(e.target, []);
    realEdgesByTarget.get(e.target)!.push(e);
  }

  // Demand tracking
  const requiredThroughput = new Map<string, number>();
  const splitCandidates = new Map<string, number[]>();
  for (const id of order) {
    requiredThroughput.set(id, 0);
    splitCandidates.set(id, []);
  }
  requiredThroughput.set(sinkNode.id, model.globalDemand);

  function pushDemand(upstreamId: string, edgeFromUpstream: SerializedEdge, demand: number) {
    const upstreamOutgoing = realEdgesBySource.get(upstreamId) ?? [];
    if (upstreamOutgoing.length <= 1) {
      // Single-output upstream: accumulate directly
      requiredThroughput.set(upstreamId, (requiredThroughput.get(upstreamId) ?? 0) + demand);
    } else {
      // Split node upstream: scale by split ratio to get the candidate rt for that node
      const splitRatioFrac = (edgeFromUpstream.data?.splitRatio ?? 100) / 100;
      const candidate = splitRatioFrac > 0 ? demand / splitRatioFrac : Infinity;
      splitCandidates.get(upstreamId)!.push(candidate);
    }
  }

  // Reverse traversal: Sink → Sources
  for (const nodeId of [...order].reverse()) {
    const node = nodeMap.get(nodeId);
    if (!node) continue;

    const outgoing = realEdgesBySource.get(nodeId) ?? [];
    const incoming = realEdgesByTarget.get(nodeId) ?? [];

    // ── Step A: Resolve this node's required throughput ──
    let rt: number;
    if (node.type === 'sink') {
      rt = model.globalDemand;
    } else if (outgoing.length === 0) {
      rt = 0; // dead-end guard
    } else if (outgoing.length === 1) {
      rt = requiredThroughput.get(nodeId) ?? 0;
    } else {
      // Split node: take the most-constrained downstream path
      const candidates = splitCandidates.get(nodeId) ?? [];
      rt = candidates.length > 0 ? Math.max(...candidates) : 0;
      requiredThroughput.set(nodeId, rt);
    }

    // ── Step B: Propagate demand upstream ──
    if (node.type === 'source') continue;

    if (node.type === 'sink') {
      for (const inEdge of incoming) {
        pushDemand(inEdge.source, inEdge, rt);
      }
    } else if (node.type === 'process') {
      const data = node.data as ProcessNodeData;
      const yieldFrac = data.yield / 100;
      const grossInputDemand = yieldFrac > 0 ? rt / yieldFrac : rt > 0 ? Infinity : 0;

      if (incoming.length === 0) {
        // No real upstream — nothing to propagate
      } else if (incoming.length === 1) {
        // Single-input: V1 behavior
        const demandToUpstream = grossInputDemand * data.conversionRatio;
        pushDemand(incoming[0].source, incoming[0], demandToUpstream);
      } else {
        // Merge node: apply BOM ratios; conversionRatio is ignored
        const bomRatios = data.bomRatios ?? {};
        for (const inEdge of incoming) {
          const ratio = bomRatios[inEdge.id] ?? 1;
          pushDemand(inEdge.source, inEdge, grossInputDemand * ratio);
        }
      }
    }
  }

  // ── Capacity, utilization, and bottleneck ──
  const nodeResults: Record<string, NodeResult> = {};
  let maxUtilization = -Infinity;
  let bottleneckNodeId: string | null = null;

  for (const node of model.nodes) {
    if (node.type !== 'process') continue;
    const ec = computeEffectiveCapacity(node.data as ProcessNodeData);
    const rt = requiredThroughput.get(node.id) ?? 0;
    const utilization = ec > 0 ? rt / ec : rt > 0 ? Infinity : 0;
    nodeResults[node.id] = { requiredThroughput: rt, effectiveCapacity: ec, utilization };
    if (utilization > maxUtilization) {
      maxUtilization = utilization;
      bottleneckNodeId = node.id;
    }
  }

  if (Object.keys(nodeResults).length === 0) {
    return { systemThroughput: model.globalDemand, bottleneckNodeId: null, nodeResults: {} };
  }

  const systemThroughput = maxUtilization > 1 ? model.globalDemand / maxUtilization : model.globalDemand;
  return { systemThroughput, bottleneckNodeId, nodeResults };
}
