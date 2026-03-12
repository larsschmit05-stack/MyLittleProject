export default function DashboardPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--color-bg-secondary)",
        padding: "32px",
      }}
    >
      <h1
        style={{
          fontSize: "24px",
          fontWeight: 600,
          color: "var(--color-text-primary)",
          marginBottom: "8px",
        }}
      >
        Your Models
      </h1>
      <p
        style={{
          fontSize: "14px",
          color: "var(--color-text-secondary)",
        }}
      >
        Saved models will appear here.
      </p>
    </main>
  );
}
