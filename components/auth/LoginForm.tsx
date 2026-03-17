'use client';
import { useState, type FormEvent, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useAuthStore from '@/store/useAuthStore';

const inputStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  fontSize: '14px',
  color: 'var(--color-text-primary)',
  background: 'var(--color-bg-primary)',
  border: '1px solid var(--color-border)',
  borderRadius: '8px',
  padding: '8px 12px',
  outline: 'none',
};

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 500,
  color: 'var(--color-text-secondary)',
  marginBottom: '6px',
};

const btnStyle: CSSProperties = {
  width: '100%',
  padding: '10px 16px',
  fontSize: '14px',
  fontWeight: 600,
  borderRadius: '8px',
  border: 'none',
  background: 'var(--color-action)',
  color: '#fff',
  cursor: 'pointer',
};

export default function LoginForm() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);
    if (!result.error) {
      router.push('/dashboard');
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>Email</label>
        <input
          type="email"
          autoFocus
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={labelStyle}>Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />
      </div>

      {error && (
        <p style={{ fontSize: '13px', color: 'var(--color-bottleneck)', margin: '0 0 16px 0' }}>
          {error}
        </p>
      )}

      <button type="submit" disabled={submitting} style={{ ...btnStyle, opacity: submitting ? 0.6 : 1 }}>
        {submitting ? 'Signing in…' : 'Sign In'}
      </button>

      <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', textAlign: 'center', marginTop: '16px' }}>
        Don&apos;t have an account?{' '}
        <Link href="/signup" style={{ color: 'var(--color-action)', textDecoration: 'none', fontWeight: 500 }}>
          Create account
        </Link>
      </p>
    </form>
  );
}
