'use client';
import { useState, type FormEvent, type CSSProperties } from 'react';
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

function validatePassword(pw: string): string | null {
  if (pw.length < 8) return 'Password must be at least 8 characters';
  if (pw === pw.toLowerCase() || pw === pw.toUpperCase()) return 'Password must contain mixed case';
  return null;
}

export default function SignupForm() {
  const signup = useAuthStore((s) => s.signup);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [clientError, setClientError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    setClientError(null);

    const pwError = validatePassword(password);
    if (pwError) {
      setClientError(pwError);
      return;
    }

    if (password !== confirmPassword) {
      setClientError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    const result = await signup(email, password);
    setSubmitting(false);

    if (!result.error) {
      setSuccess(true);
    }
  }

  if (success) {
    return (
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '14px', color: 'var(--color-healthy)', fontWeight: 500, marginBottom: '16px' }}>
          Check your email to confirm your account.
        </p>
        <a href="/login" style={{ fontSize: '13px', color: 'var(--color-action)', textDecoration: 'none', fontWeight: 500 }}>
          Back to Sign In
        </a>
      </div>
    );
  }

  const displayError = clientError || error;

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

      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={labelStyle}>Confirm Password</label>
        <input
          type="password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          style={inputStyle}
        />
      </div>

      {displayError && (
        <p style={{ fontSize: '13px', color: 'var(--color-bottleneck)', margin: '0 0 16px 0' }}>
          {displayError}
        </p>
      )}

      <button type="submit" disabled={submitting} style={{ ...btnStyle, opacity: submitting ? 0.6 : 1 }}>
        {submitting ? 'Creating account…' : 'Create Account'}
      </button>

      <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', textAlign: 'center', marginTop: '16px' }}>
        Already have an account?{' '}
        <a href="/login" style={{ color: 'var(--color-action)', textDecoration: 'none', fontWeight: 500 }}>
          Sign in
        </a>
      </p>
    </form>
  );
}
