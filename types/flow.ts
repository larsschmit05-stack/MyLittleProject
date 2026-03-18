import type { Node } from 'reactflow';

export interface EdgeData {
  isScrap?: boolean;
  splitRatio?: number;
}

export interface SourceNodeData {
  label: string;
  outputMaterial?: string;
}

export interface SinkNodeData {
  label: string;
}

export interface ReworkLoop {
  targetNodeId: string;  // must be an upstream ancestor in real-edge graph
  percentage: number;    // 0-100, fraction of node output sent back as rework
}

export interface ProcessNodeData {
  name: string;
  throughputRate: number;
  availableTime: number;
  yield: number;
  numberOfResources: number;
  conversionRatio: number;
  bomRatios?: Record<string, number>;
  outputMaterial?: string;
  reworkLoops?: ReworkLoop[];
}

export type FlowSourceNode = Node<SourceNodeData, 'source'>;
export type FlowProcessNode = Node<ProcessNodeData, 'process'>;
export type FlowSinkNode = Node<SinkNodeData, 'sink'>;
export type FlowNode = FlowSourceNode | FlowProcessNode | FlowSinkNode;
export type FlowNodeType = 'source' | 'process' | 'sink';

export type SelectedElement =
  | { kind: 'node'; id: string; nodeType: 'source' | 'process' | 'sink' }
  | { kind: 'edge'; id: string }
  | null;

export interface NodeResult {
  requiredThroughput: number;
  effectiveCapacity: number;
  utilization: number;
  reworkDemand?: number;  // extra demand from rework targeting this node (units/hr)
}

export interface ReworkSummary {
  totalReworkCycles: number;       // total units/hr flowing through all rework loops
  reworkRate: number;              // totalReworkCycles / systemThroughput
  convergenceIterations: number;
  converged: boolean;
  reworkSources: Array<{
    nodeId: string;
    nodeName: string;
    targetNodeId: string;
    targetNodeName: string;
    percentage: number;
    reworkAmount: number;          // steady-state units/hr in this loop
  }>;
}

export interface FlowResult {
  systemThroughput: number;
  bottleneckNodeId: string | null;
  nodeResults: Record<string, NodeResult>;
  rework?: ReworkSummary;
}

export type DerivedResults = FlowResult | null;

export type SerializedNode =
  | {
      id: string;
      type: 'source';
      position: { x: number; y: number };
      data: SourceNodeData;
    }
  | {
      id: string;
      type: 'process';
      position: { x: number; y: number };
      data: ProcessNodeData;
    }
  | {
      id: string;
      type: 'sink';
      position: { x: number; y: number };
      data: SinkNodeData;
    };

export interface SerializedModel {
  nodes: SerializedNode[];
  edges: Array<{
    id: string;
    source: string;
    target: string;
    data?: EdgeData;
  }>;
  globalDemand: number;
}

export interface Scenario {
  id: string;
  name: string;
  model: SerializedModel;
}
