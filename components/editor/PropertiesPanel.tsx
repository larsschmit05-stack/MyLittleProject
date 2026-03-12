export default function PropertiesPanel() {
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
        Properties
      </h2>
      <p
        style={{
          fontSize: "14px",
          color: "var(--color-text-secondary)",
        }}
      >
        Select a node to configure it.
      </p>
    </div>
  );
}
