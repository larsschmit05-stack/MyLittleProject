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

export interface ProcessNodeData {
  name: string;
  throughputRate: number;
  availableTime: number;
  yield: number;
  numberOfResources: number;
  conversionRatio: number;
  bomRatios?: Record<string, number>;
  outputMaterial?: string;
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
}

export interface FlowResult {
  systemThroughput: number;
  bottleneckNodeId: string | null;
  nodeResults: Record<string, NodeResult>;
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
