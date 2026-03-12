export default function CanvasArea() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "var(--color-bg-canvas)",
        backgroundImage: `radial-gradient(
          circle,
          var(--canvas-dot-color) var(--canvas-dot-size),
          transparent var(--canvas-dot-size)
        )`,
        backgroundSize: `var(--canvas-dot-spacing) var(--canvas-dot-spacing)`,
        backgroundPosition: "0 0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <p
        style={{
          fontSize: "14px",
          color: "var(--color-text-label)",
          userSelect: "none",
          pointerEvents: "none",
        }}
      >
        Canvas — drag nodes here
      </p>
    </div>
  );
}
