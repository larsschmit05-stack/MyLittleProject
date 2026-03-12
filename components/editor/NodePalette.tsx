const NODE_TYPES = ["Source", "Process", "Sink"] as const;

export default function NodePalette() {
  return (
    <div style={{ padding: "16px" }}>
      <h2
        style={{
          fontSize: "12px",
          fontWeight: 500,
          color: "var(--color-text-label)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          margin: "0 0 16px 0",
        }}
      >
        Node Palette
      </h2>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {NODE_TYPES.map((type) => (
          <div
            key={type}
            style={{
              padding: "8px 12px",
              backgroundColor: "var(--color-bg-primary)",
              border: "1px solid var(--color-border)",
              borderRadius: "8px",
              fontSize: "14px",
              color: "var(--color-text-primary)",
              cursor: "grab",
              userSelect: "none",
            }}
          >
            {type} Node
          </div>
        ))}
      </div>
    </div>
  );
}
