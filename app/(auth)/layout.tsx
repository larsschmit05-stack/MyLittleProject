export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-bg-secondary)',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          background: 'var(--color-bg-primary)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '32px',
        }}
      >
        <h1
          style={{
            fontSize: '20px',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            textAlign: 'center',
            margin: '0 0 24px 0',
          }}
        >
          Operational Process Modeler
        </h1>
        {children}
      </div>
    </main>
  );
}
