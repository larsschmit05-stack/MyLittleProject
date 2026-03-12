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

export default function NodePalette() {
  return (
    <div style={{ padding: '16px' }}>
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
            draggable
            onDragStart={(event) => onDragStart(event, item.type)}
            style={{
              padding: '8px 12px',
              backgroundColor: 'var(--color-bg-primary)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              fontSize: '14px',
              color: 'var(--color-text-primary)',
              cursor: 'grab',
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
