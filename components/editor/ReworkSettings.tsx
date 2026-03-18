'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Edge, Node } from 'reactflow';
import type { ProcessNodeData, ReworkLoop, EdgeData } from '../../types/flow';
import { isUpstreamAncestor } from '../../lib/flow/validation';
import useFlowStore from '../../store/useFlowStore';
import {
  panelLabelStyle,
  panelInputStyle,
  panelInvalidInputStyle,
  panelFieldGroupStyle,
} from './styles';

interface ReworkSettingsProps {
  nodeId: string;
  data: ProcessNodeData;
}

export default function ReworkSettings({ nodeId, data }: ReworkSettingsProps) {
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const updateNodeData = useFlowStore((s) => s.updateNodeData);

  const loops: ReworkLoop[] = data.reworkLoops ?? [];
  const [expanded, setExpanded] = useState(loops.length > 0);
  const [rawPcts, setRawPcts] = useState<Record<number, string>>(() =>
    Object.fromEntries(loops.map((l, i) => [i, String(l.percentage)]))
  );

  // Sync raw values when data changes externally
  useEffect(() => {
    const newLoops = data.reworkLoops ?? [];
    setRawPcts(Object.fromEntries(newLoops.map((l, i) => [i, String(l.percentage)])));
  }, [data.reworkLoops]);

  const realEdges = useMemo(
    () => edges.filter((e) => !e.data?.isScrap) as Edge<EdgeData>[],
    [edges]
  );

  // Compute valid upstream ancestors for this node
  const validTargets = useMemo(() => {
    const targets: Array<{ id: string; name: string }> = [];
    for (const n of nodes) {
      if (n.id === nodeId) continue;
      if (n.type === 'sink') continue;
      if (isUpstreamAncestor(n.id, nodeId, realEdges as Edge[])) {
        const name =
          n.type === 'process'
            ? (n.data as ProcessNodeData).name
            : (n.data as { label?: string }).label ?? n.id;
        targets.push({ id: n.id, name });
      }
    }
    return targets;
  }, [nodes, edges, nodeId, realEdges]);

  const reworkPctSum = loops.reduce((sum, l) => sum + l.percentage, 0);
  const totalPct = data.yield + reworkPctSum;
  const scrapPct = Math.max(0, 100 - totalPct);
  const isOverLimit = totalPct > 100;

  function updateLoops(newLoops: ReworkLoop[]) {
    updateNodeData(nodeId, {
      reworkLoops: newLoops.length > 0 ? newLoops : undefined,
    });
  }

  function handleTargetChange(index: number, targetNodeId: string) {
    const next = [...loops];
    next[index] = { ...next[index], targetNodeId };
    updateLoops(next);
  }

  function handlePctChange(index: number, str: string) {
    setRawPcts((prev) => ({ ...prev, [index]: str }));
    const n = parseFloat(str);
    if (isFinite(n) && n > 0 && n <= 100) {
      const next = [...loops];
      next[index] = { ...next[index], percentage: n };
      updateLoops(next);
    }
  }

  function handlePctBlur(index: number) {
    const n = parseFloat(rawPcts[index] ?? '');
    if (!isFinite(n) || n <= 0 || n > 100) {
      setRawPcts((prev) => ({ ...prev, [index]: String(loops[index]?.percentage ?? 5) }));
    }
  }

  function addLoop() {
    const firstTarget = validTargets[0];
    if (!firstTarget) return;
    const next = [...loops, { targetNodeId: firstTarget.id, percentage: 5 }];
    updateLoops(next);
    setRawPcts((prev) => ({ ...prev, [next.length - 1]: '5' }));
  }

  function removeLoop(index: number) {
    const next = loops.filter((_, i) => i !== index);
    updateLoops(next);
  }

  if (validTargets.length === 0 && loops.length === 0) {
    return null; // No valid upstream ancestors, no existing loops
  }

  return (
    <div>
      <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '16px 0' }} />
      <h3
        style={{
          fontSize: '12px',
          fontWeight: 500,
          color: 'var(--color-text-label)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          margin: '0 0 4px 0',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpanded(!expanded); }}
      >
        <span style={{ fontSize: '10px' }}>{expanded ? '▼' : '▶'}</span>
        Rework Settings
        {loops.length > 0 && (
          <span style={{ fontSize: '10px', color: '#F97316', fontWeight: 600 }}>
            ({loops.length})
          </span>
        )}
      </h3>

      {expanded && (
        <div style={{ marginTop: '12px' }}>
          {loops.map((loop, index) => (
            <div
              key={index}
              style={{
                ...panelFieldGroupStyle,
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
              }}
            >
              <div style={{ flex: 1 }}>
                <label style={{ ...panelLabelStyle, fontSize: '11px', marginBottom: '4px' }}>
                  Loop {index + 1}: Target
                </label>
                <select
                  value={loop.targetNodeId}
                  onChange={(e) => handleTargetChange(index, e.target.value)}
                  style={{
                    ...panelInputStyle,
                    fontSize: '13px',
                    padding: '6px 8px',
                    appearance: 'auto',
                  }}
                >
                  {validTargets.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                  {/* Keep current target in dropdown even if no longer valid (for display) */}
                  {!validTargets.some((t) => t.id === loop.targetNodeId) && (
                    <option value={loop.targetNodeId} style={{ color: 'red' }}>
                      {loop.targetNodeId} (invalid)
                    </option>
                  )}
                </select>
              </div>

              <div style={{ width: '72px', flexShrink: 0 }}>
                <label style={{ ...panelLabelStyle, fontSize: '11px', marginBottom: '4px' }}>%</label>
                <input
                  type="number"
                  value={rawPcts[index] ?? String(loop.percentage)}
                  min={0.1}
                  max={100}
                  step={0.5}
                  onChange={(e) => handlePctChange(index, e.target.value)}
                  onBlur={() => handlePctBlur(index)}
                  style={{
                    ...(isOverLimit ? panelInvalidInputStyle : panelInputStyle),
                    fontSize: '13px',
                    padding: '6px 8px',
                  }}
                  onFocus={(e) => (e.target.style.outline = '2px solid var(--color-action)')}
                  onBlurCapture={(e) => (e.target.style.outline = 'none')}
                />
              </div>

              <button
                onClick={() => removeLoop(index)}
                aria-label={`Remove rework loop ${index + 1}`}
                style={{
                  marginTop: '20px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                  color: 'var(--color-text-label)',
                  padding: '4px',
                  lineHeight: 1,
                }}
                title="Remove loop"
              >
                ×
              </button>
            </div>
          ))}

          {/* Summary */}
          <div
            style={{
              fontSize: '12px',
              color: isOverLimit ? 'var(--color-bottleneck)' : 'var(--color-text-secondary)',
              marginBottom: '12px',
              lineHeight: 1.5,
            }}
          >
            <div>
              {data.yield}% good + {reworkPctSum.toFixed(1)}% rework = {totalPct.toFixed(1)}%
              {!isOverLimit && ` (${scrapPct.toFixed(1)}% scrap)`}
            </div>
            {isOverLimit && (
              <div style={{ fontWeight: 600, marginTop: '2px' }}>
                yield + rework exceeds 100%
              </div>
            )}
          </div>

          {validTargets.length > 0 && (
            <button
              onClick={addLoop}
              style={{
                background: 'none',
                border: '1px dashed var(--color-border)',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              + Add rework loop
            </button>
          )}
        </div>
      )}
    </div>
  );
}
