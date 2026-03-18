import type { SerializedModel, FlowResult, ProcessNodeData, ReworkSummary } from '../types/flow';
import { calculateFlowDAG } from './calculations';

const MAX_ITERATIONS = 20;
const CONVERGENCE_THRESHOLD = 0.001;

/**
 * Wrapper around calculateFlowDAG that handles rework loops via iterative convergence.
 * If no rework loops exist, delegates directly to calculateFlowDAG (zero overhead).
 *
 * Rework semantics (per V1.9 PRD):
 *   reworkAmount = nodeOutput × (reworkPct / 100)
 * The rework amount is fed back to the target node as additional input demand.
 * Since calculateFlowDAG's injectedDemand adds to a node's output demand (rt),
 * we must convert input demand to output demand: injectedOutput = reworkAmount × (targetYield / 100).
 */
export function simulateWithRework(model: SerializedModel): FlowResult {
  // Collect all rework loops from process nodes
  const reworkNodes = model.nodes.filter(
    (n) => n.type === 'process' && (n.data as ProcessNodeData).reworkLoops?.length
  );

  // Fast path: no rework loops
  if (reworkNodes.length === 0) {
    return calculateFlowDAG(model);
  }

  const nodeMap = new Map(model.nodes.map((n) => [n.id, n]));

  let injectedDemand: Record<string, number> = {};
  let previousRT: Record<string, number> = {};
  let result: FlowResult = calculateFlowDAG(model);
  let converged = false;
  let iterations = 0;

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    result = calculateFlowDAG(model, Object.keys(injectedDemand).length > 0 ? injectedDemand : undefined);
    iterations = iter + 1;

    // Compute rework amounts from this iteration's results
    // PRD: reworkAmount = output × rework%
    // "output" = requiredThroughput (the node's output demand, which is what it must produce)
    const newInjectedDemand: Record<string, number> = {};

    for (const rNode of reworkNodes) {
      const data = rNode.data as ProcessNodeData;
      const loops = data.reworkLoops!;
      const nodeOutput = result.nodeResults[rNode.id]?.requiredThroughput ?? 0;

      for (const loop of loops) {
        const reworkAmount = nodeOutput * (loop.percentage / 100);
        const targetNode = nodeMap.get(loop.targetNodeId);

        // Defensive check: target must exist and be a process node
        // (validation should have caught this, but we add defense here)
        if (!targetNode) {
          console.warn(`Rework loop targets non-existent node: ${loop.targetNodeId}`);
          continue;
        }

        if (targetNode.type !== 'process') {
          console.warn(`Rework loop on "${rNode.id}" targets non-process node "${loop.targetNodeId}" (type: ${targetNode.type}). Skipping.`);
          continue;
        }

        // Rework feeds back as additional input at the target node.
        // injectedDemand adds to the target's output demand (rt), so convert:
        // additionalInput = reworkAmount, additionalOutput = reworkAmount × targetYield
        const targetYield = (targetNode.data as ProcessNodeData).yield;
        const injectedOutput = reworkAmount * (targetYield / 100);
        newInjectedDemand[loop.targetNodeId] = (newInjectedDemand[loop.targetNodeId] ?? 0) + injectedOutput;
      }
    }

    // Check convergence
    if (iter > 0 && hasConverged(previousRT, result.nodeResults, CONVERGENCE_THRESHOLD)) {
      converged = true;
      break;
    }

    // Save current RTs for next convergence check
    previousRT = {};
    for (const [id, nr] of Object.entries(result.nodeResults)) {
      previousRT[id] = nr.requiredThroughput;
    }

    injectedDemand = newInjectedDemand;
  }

  // Enrich result with rework summary
  return enrichResult(result, model, reworkNodes, converged, iterations);
}

function hasConverged(
  previousRT: Record<string, number>,
  nodeResults: Record<string, { requiredThroughput: number }>,
  threshold: number
): boolean {
  for (const [id, nr] of Object.entries(nodeResults)) {
    const prev = previousRT[id];
    if (prev === undefined) return false;
    const current = nr.requiredThroughput;
    const denom = Math.max(Math.abs(prev), Math.abs(current), 1);
    if (Math.abs(current - prev) / denom > threshold) return false;
  }
  return true;
}

function enrichResult(
  result: FlowResult,
  model: SerializedModel,
  reworkNodes: typeof model.nodes,
  converged: boolean,
  iterations: number
): FlowResult {
  const nodeMap = new Map(model.nodes.map((n) => [n.id, n]));
  const reworkSources: ReworkSummary['reworkSources'] = [];
  let totalReworkCycles = 0;
  const reworkDemandPerNode: Record<string, number> = {};

  for (const rNode of reworkNodes) {
    const data = rNode.data as ProcessNodeData;
    const loops = data.reworkLoops!;
    // Use output-based rework: reworkAmount = output × rework%
    const nodeOutput = result.nodeResults[rNode.id]?.requiredThroughput ?? 0;

    for (const loop of loops) {
      const reworkAmount = nodeOutput * (loop.percentage / 100);
      totalReworkCycles += reworkAmount;
      reworkDemandPerNode[loop.targetNodeId] = (reworkDemandPerNode[loop.targetNodeId] ?? 0) + reworkAmount;

      const targetNode = nodeMap.get(loop.targetNodeId);
      const nodeName = data.name;
      const targetName = targetNode?.type === 'process'
        ? (targetNode.data as ProcessNodeData).name
        : loop.targetNodeId;

      reworkSources.push({
        nodeId: rNode.id,
        nodeName,
        targetNodeId: loop.targetNodeId,
        targetNodeName: targetName,
        percentage: loop.percentage,
        reworkAmount,
      });
    }
  }

  // Attach reworkDemand to each node result
  const enrichedNodeResults = { ...result.nodeResults };
  for (const [id, demand] of Object.entries(reworkDemandPerNode)) {
    if (enrichedNodeResults[id]) {
      enrichedNodeResults[id] = { ...enrichedNodeResults[id], reworkDemand: demand };
    }
  }

  const rework: ReworkSummary = {
    totalReworkCycles,
    reworkRate: result.systemThroughput > 0 ? totalReworkCycles / result.systemThroughput : 0,
    convergenceIterations: iterations,
    converged,
    reworkSources,
  };

  return {
    ...result,
    nodeResults: enrichedNodeResults,
    rework,
  };
}
