'use client';

const NODE_TYPES = [
  { type: 'source', label: 'Source' },
  { type: 'process', label: 'Process' },
  { type: 'sink', label: 'Sink' },
] as const;

function onDragStart(event: React.DragEvent, nodeType: string) {
  event.dataTransfer.setData('application/reactflow', nodeType);
  event.dataTransfer.effectAllowed = 'move';
}

export default function NodePalette({ disabled = false }: { disabled?: boolean }) {
  return (
    <div style={{ padding: '16px', ...(disabled ? { opacity: 0.4 } : {}) }}>
      <h2
        style={{
          fontSize: '12px',
          fontWeight: 500,
          color: 'var(--color-text-label)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          margin: '0 0 16px 0',
        }}
      >
        Node Palette
      </h2>
      {disabled && (
        <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', margin: '0 0 12px 0' }}>
          View only
        </p>
      )}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {NODE_TYPES.map((item) => (
          <div
            key={item.type}
            draggable={!disabled}
            onDragStart={disabled ? undefined : (event) => onDragStart(event, item.type)}
            style={{
              padding: '8px 12px',
              backgroundColor: 'var(--color-bg-primary)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              fontSize: '14px',
              color: 'var(--color-text-primary)',
              cursor: disabled ? 'not-allowed' : 'grab',
              userSelect: 'none',
            }}
          >
            {item.label} Node
          </div>
        ))}
      </div>
    </div>
  );
}
