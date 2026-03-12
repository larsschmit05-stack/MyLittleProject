import { Node } from 'reactflow';

export interface SourceNodeData {
  label: string;
}

export interface SinkNodeData {
  label: string;
}

export interface ProcessNodeData {
  name: string;
  cycleTime: number;
  availableTime: number;
  yield: number;
  numberOfResources: number;
  conversionRatio: number;
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

// Placeholder shape — populated in later steps
export type DerivedResults = Record<string, Record<string, never>>;

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
  }>;
  globalDemand: number;
}
