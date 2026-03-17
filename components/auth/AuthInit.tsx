'use client';
import { useEffect } from 'react';
import useAuthStore from '@/store/useAuthStore';

export default function AuthInit({ children }: { children: React.ReactNode }) {
  const loading = useAuthStore((s) => s.loading);

  useEffect(() => {
    useAuthStore.getState().initAuth();
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontSize: '14px',
        color: 'var(--color-text-secondary)',
      }}>
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
