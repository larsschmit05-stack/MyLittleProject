import NodePalette from "./NodePalette";
import CanvasArea from "./CanvasArea";
import PropertiesPanel from "./PropertiesPanel";
import EditorHeader from "./EditorHeader";

export default function EditorLayout() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        backgroundColor: "var(--color-bg-primary)",
      }}
    >
      <EditorHeader />

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left sidebar — Node Palette */}
        <aside
          style={{
            width: "240px",
            flexShrink: 0,
            backgroundColor: "var(--color-bg-secondary)",
            borderRight: "1px solid var(--color-border)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <NodePalette />
        </aside>

        {/* Center — Canvas Area */}
        <main
          style={{
            flex: 1,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <CanvasArea />
        </main>

        {/* Right sidebar — Properties & Results */}
        <aside
          style={{
            width: "320px",
            flexShrink: 0,
            backgroundColor: "var(--color-bg-secondary)",
            borderLeft: "1px solid var(--color-border)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <PropertiesPanel />
        </aside>
      </div>
    </div>
  );
}
