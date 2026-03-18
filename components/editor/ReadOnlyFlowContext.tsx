'use client';

import { createContext, useContext } from 'react';
import type { FlowNode, FlowResult } from '../../types/flow';
import type { ValidationResult } from '../../lib/flow/validation';

/**
 * When rendering nodes inside ReadOnlyCanvas (comparison view),
 * this context provides scenario-scoped data so node components
 * don't fall back to the global Zustand store.
 */
export interface ReadOnlyFlowData {
  nodes: FlowNode[];
  derivedResults: FlowResult | null;
  validationResult: ValidationResult | null;
}

export const ReadOnlyFlowContext = createContext<ReadOnlyFlowData | null>(null);

export function useReadOnlyFlow(): ReadOnlyFlowData | null {
  return useContext(ReadOnlyFlowContext);
}
