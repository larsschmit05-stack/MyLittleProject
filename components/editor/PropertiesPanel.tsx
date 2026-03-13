'use client';

import { useEffect, useState } from 'react';
import useFlowStore from '../../store/useFlowStore';
import type { ProcessNodeData } from '../../types/flow';
import { isProcessValueValid } from '../../lib/flow/validation';
import {
  panelLabelStyle,
  panelInputStyle,
  panelInvalidInputStyle,
  panelSectionHeadingStyle,
  panelFieldGroupStyle,
  panelDividerStyle,
} from './styles';
import ScenarioManager from './ScenarioManager';

// ─── Global Demand ────────────────────────────────────────────────────────────

function GlobalDemandSection() {
  const globalDemand = useFlowStore((s) => s.globalDemand);
  const setGlobalDemand = useFlowStore((s) => s.setGlobalDemand);
  const [raw, setRaw] = useState(String(globalDemand));

  // Keep local string in sync if store value changes externally
  useEffect(() => {
    setRaw(String(globalDemand));
  }, [globalDemand]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const str = e.target.value;
    setRaw(str);
    const n = parseFloat(str);
    if (isFinite(n)) setGlobalDemand(n);
  }

  function handleBlur() {
    const n = parseFloat(raw);
    if (!isFinite(n)) setRaw(String(globalDemand));
  }

  return (
    <section>
      <h2 style={panelSectionHeadingStyle}>Global Demand</h2>
      <div style={panelFieldGroupStyle}>
        <label style={panelLabelStyle} htmlFor="global-demand">
          Units for the same period as Available Time
        </label>
        <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
          Example: if Available Time is weekly hours, demand is units per week.
        </p>
        <input
          id="global-demand"
          type="number"
          value={raw}
          onChange={handleChange}
          onBlur={handleBlur}
          style={panelInputStyle}
          onFocus={(e) => (e.target.style.outline = '2px solid var(--color-action)')}
          onBlurCapture={(e) => (e.target.style.outline = 'none')}
        />
      </div>
    </section>
  );
}

// ─── Process Form ─────────────────────────────────────────────────────────────

interface ProcessFormProps {
  nodeId: string;
  data: ProcessNodeData;
}

type NumericField = keyof Omit<ProcessNodeData, 'name'>;

const FIELD_HELP_TEXT: Record<NumericField, string> = {
  throughputRate: 'Throughput Rate must be greater than 0.',
  availableTime: 'Available Time must be 0 or greater.',
  yield: 'Yield must be greater than 0 and at most 100.',
  numberOfResources: 'Number of Resources must be at least 1.',
  conversionRatio: 'Conversion Ratio must be greater than 0.',
};

const NUMERIC_FIELDS: { key: NumericField; label: string }[] = [
  { key: 'throughputRate', label: 'Throughput Rate (units/hr)' },
  { key: 'availableTime', label: 'Available Time (hours in the demand period)' },
  { key: 'yield', label: 'Yield (%)' },
  { key: 'numberOfResources', label: 'Number of Resources' },
  { key: 'conversionRatio', label: 'Conversion Ratio' },
];

function ProcessForm({ nodeId, data }: ProcessFormProps) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);

  const [name, setName] = useState(data.name);
  const [rawValues, setRawValues] = useState<Record<NumericField, string>>({
    throughputRate: String(data.throughputRate),
    availableTime: String(data.availableTime),
    yield: String(data.yield),
    numberOfResources: String(data.numberOfResources),
    conversionRatio: String(data.conversionRatio),
  });
  const [invalidFields, setInvalidFields] = useState<Partial<Record<NumericField, string>>>({});

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setName(value);
    updateNodeData(nodeId, { name: value });
  }

  function handleNumericChange(field: NumericField, str: string) {
    setRawValues((prev) => ({ ...prev, [field]: str }));
    const n = parseFloat(str);

    if (!isFinite(n)) {
      setInvalidFields((prev) => ({ ...prev, [field]: FIELD_HELP_TEXT[field] }));
      return;
    }

    if (!isProcessValueValid(field, n)) {
      setInvalidFields((prev) => ({ ...prev, [field]: FIELD_HELP_TEXT[field] }));
      return;
    }

    setInvalidFields((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
    updateNodeData(nodeId, { [field]: n });
  }

  function handleNumericBlur(field: NumericField) {
    const n = parseFloat(rawValues[field]);
    if (!isFinite(n) || !isProcessValueValid(field, n)) {
      setRawValues((prev) => ({ ...prev, [field]: String(data[field]) }));
      setInvalidFields((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  return (
    <section>
      <h2 style={panelSectionHeadingStyle}>Process Node</h2>

      <div style={panelFieldGroupStyle}>
        <label style={panelLabelStyle} htmlFor={`${nodeId}-name`}>
          Name
        </label>
        <input
          id={`${nodeId}-name`}
          type="text"
          value={name}
          onChange={handleNameChange}
          style={panelInputStyle}
          onFocus={(e) => (e.target.style.outline = '2px solid var(--color-action)')}
          onBlur={(e) => (e.target.style.outline = 'none')}
        />
      </div>

      {NUMERIC_FIELDS.map(({ key, label }) => (
        <div key={key} style={panelFieldGroupStyle}>
          <label style={panelLabelStyle} htmlFor={`${nodeId}-${key}`}>
            {label}
          </label>
          <input
            id={`${nodeId}-${key}`}
            type="number"
            value={rawValues[key]}
            onChange={(e) => handleNumericChange(key, e.target.value)}
            onBlur={() => handleNumericBlur(key)}
            style={invalidFields[key] ? panelInvalidInputStyle : panelInputStyle}
            onFocus={(e) => (e.target.style.outline = '2px solid var(--color-action)')}
            onBlurCapture={(e) => (e.target.style.outline = 'none')}
          />
          {invalidFields[key] ? (
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--color-bottleneck)' }}>
              {invalidFields[key]}
            </p>
          ) : null}
        </div>
      ))}
    </section>
  );
}

// ─── Results Summary ──────────────────────────────────────────────────────────

function fmt(n: number): string {
  return isFinite(n) ? n.toFixed(2) : 'N/A';
}

function fmtPct(n: number): string {
  return isFinite(n) ? (n * 100).toFixed(1) + '%' : 'N/A';
}

const resultRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '13px',
  marginBottom: '6px',
} as const;

const resultLabelStyle = {
  color: 'var(--color-text-secondary)',
} as const;

const resultValueStyle = {
  fontWeight: 500,
  color: 'var(--color-text-primary)',
} as const;

function ResultsSummary() {
  const derivedResults = useFlowStore((s) => s.derivedResults);
  const selectedElement = useFlowStore((s) => s.selectedElement);
  const nodes = useFlowStore((s) => s.nodes);

  const isEmpty =
    !derivedResults ||
    (derivedResults.systemThroughput === 0 &&
      derivedResults.bottleneckNodeId === null &&
      Object.keys(derivedResults.nodeResults).length === 0);

  const bottleneckName = derivedResults?.bottleneckNodeId
    ? (nodes.find((n) => n.id === derivedResults.bottleneckNodeId)?.data as ProcessNodeData)?.name ??
      '—'
    : '—';

  const selectedNodeResult =
    selectedElement?.kind === 'node' && selectedElement.nodeType === 'process' && derivedResults
      ? derivedResults.nodeResults[selectedElement.id] ?? null
      : null;

  return (
    <section>
      <h2 style={panelSectionHeadingStyle}>Results</h2>
      {isEmpty ? (
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          Build a complete model to see results.
        </p>
      ) : (
        <>
          <div style={resultRowStyle}>
            <span style={resultLabelStyle}>System Throughput</span>
            <span style={resultValueStyle}>{fmt(derivedResults!.systemThroughput)}</span>
          </div>
          <div style={resultRowStyle}>
            <span style={resultLabelStyle}>Bottleneck</span>
            <span style={resultValueStyle}>{bottleneckName}</span>
          </div>
          {selectedNodeResult && (
            <>
              <p
                style={{
                  fontSize: '11px',
                  color: 'var(--color-text-label)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  margin: '10px 0 6px 0',
                }}
              >
                Selected Node
              </p>
              <div style={resultRowStyle}>
                <span style={resultLabelStyle}>Required Throughput</span>
                <span style={resultValueStyle}>{fmt(selectedNodeResult.requiredThroughput)}</span>
              </div>
              <div style={resultRowStyle}>
                <span style={resultLabelStyle}>Effective Capacity</span>
                <span style={resultValueStyle}>{fmt(selectedNodeResult.effectiveCapacity)}</span>
              </div>
              <div style={resultRowStyle}>
                <span style={resultLabelStyle}>Utilization</span>
                <span style={resultValueStyle}>{fmtPct(selectedNodeResult.utilization)}</span>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}

// ─── Selection Content ────────────────────────────────────────────────────────

function SelectionContent() {
  const selectedElement = useFlowStore((s) => s.selectedElement);
  const nodes = useFlowStore((s) => s.nodes);

  if (!selectedElement) {
    return (
      <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
        Select a node to configure it.
      </p>
    );
  }

  if (selectedElement.kind === 'edge') {
    return (
      <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
        Edges have no configurable parameters in V1.
      </p>
    );
  }

  if (selectedElement.nodeType !== 'process') {
    return (
      <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
        Source and Sink nodes have no configurable parameters in V1.
      </p>
    );
  }

  const node = nodes.find((n) => n.id === selectedElement.id);
  if (!node || node.type !== 'process') return null;

  return <ProcessForm key={node.id} nodeId={node.id} data={node.data as ProcessNodeData} />;
}

// ─── Panel Root ───────────────────────────────────────────────────────────────

export default function PropertiesPanel() {
  return (
    <div style={{ padding: '16px' }}>
      <ScenarioManager />
      <hr style={panelDividerStyle} />
      <GlobalDemandSection />
      <hr style={panelDividerStyle} />
      <ResultsSummary />
      <hr style={panelDividerStyle} />
      <SelectionContent />
    </div>
  );
}
