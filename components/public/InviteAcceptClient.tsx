'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { CSSProperties } from 'react';
import useAuthStore from '../../store/useAuthStore';
import type { InviteDetails } from '../../types/modelAccess';

interface InviteAcceptClientProps {
  token: string;
}

const REDIRECT_KEY = 'redirectAfterLogin';

const containerStyle: CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'var(--color-bg-secondary)',
  padding: '24px',
};

const cardStyle: CSSProperties = {
  width: '100%',
  maxWidth: '480px',
  background: 'var(--color-bg-primary)',
  border: '1px solid var(--color-border)',
  borderRadius: '12px',
  padding: '32px',
};

const btnStyle: CSSProperties = {
  padding: '10px 20px',
  fontSize: '14px',
  fontWeight: 600,
  borderRadius: '8px',
  border: 'none',
  cursor: 'pointer',
};

const primaryBtn: CSSProperties = {
  ...btnStyle,
  background: 'var(--color-action)',
  color: '#fff',
};

const secondaryBtn: CSSProperties = {
  ...btnStyle,
  background: 'transparent',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text-primary)',
};

const dangerBtn: CSSProperties = {
  ...btnStyle,
  background: 'transparent',
  border: '1px solid var(--color-bottleneck)',
  color: 'var(--color-bottleneck)',
};

const badgeStyle: CSSProperties = {
  display: 'inline-block',
  fontSize: '12px',
  fontWeight: 600,
  padding: '4px 12px',
  borderRadius: '12px',
  textTransform: 'capitalize',
};

export default function InviteAcceptClient({ token }: InviteAcceptClientProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [details, setDetails] = useState<InviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    async function fetchDetails() {
      try {
        const res = await fetch(`/api/invites/${token}/details`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? 'Invite not found');
        }
        const data: InviteDetails = await res.json();
        setDetails(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    fetchDetails();
  }, [token]);

  async function handleAccept() {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/invites/${token}/accept`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to accept invite');
      router.push(`/editor?id=${data.modelId}`);
    } catch (err) {
      setError((err as Error).message);
      setActionLoading(false);
    }
  }

  async function handleDecline() {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/invites/${token}/decline`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to decline invite');
      router.push('/dashboard');
    } catch (err) {
      setError((err as Error).message);
      setActionLoading(false);
    }
  }

  function handleLoginRedirect() {
    sessionStorage.setItem(REDIRECT_KEY, `/invites/${token}`);
    router.push('/login');
  }

  function handleSignupRedirect() {
    sessionStorage.setItem(REDIRECT_KEY, `/invites/${token}`);
    router.push('/signup');
  }

  async function handleLogout() {
    await logout();
    sessionStorage.setItem(REDIRECT_KEY, `/invites/${token}`);
    router.push('/login');
  }

  // Loading
  if (loading) {
    return (
      <main style={containerStyle}>
        <div style={cardStyle}>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
            Loading invite details...
          </p>
        </div>
      </main>
    );
  }

  // Error / Not found
  if (error && !details) {
    return (
      <main style={containerStyle}>
        <div style={cardStyle}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 16px 0', textAlign: 'center' }}>
            Invalid Invite
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', textAlign: 'center', margin: '0 0 24px 0' }}>
            {error}
          </p>
          <div style={{ textAlign: 'center' }}>
            <button onClick={() => router.push('/dashboard')} style={secondaryBtn}>
              Go to Dashboard
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!details) return null;

  const roleBadge = (
    <span style={{
      ...badgeStyle,
      background: details.role === 'edit' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(128, 128, 128, 0.1)',
      color: details.role === 'edit' ? '#16a34a' : 'var(--color-text-secondary)',
    }}>
      {details.role === 'edit' ? 'Edit Access' : 'View Access'}
    </span>
  );

  // Expired
  if (details.status === 'expired') {
    return (
      <main style={containerStyle}>
        <div style={cardStyle}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 16px 0', textAlign: 'center' }}>
            Invite Expired
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', textAlign: 'center', margin: '0 0 24px 0' }}>
            This invite to &ldquo;{details.modelName}&rdquo; has expired. Contact the model owner to request a new invite.
          </p>
          <div style={{ textAlign: 'center' }}>
            <button onClick={() => router.push('/dashboard')} style={secondaryBtn}>
              Go to Dashboard
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Already accepted
  if (details.status === 'accepted') {
    return (
      <main style={containerStyle}>
        <div style={cardStyle}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 16px 0', textAlign: 'center' }}>
            Already Accepted
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', textAlign: 'center', margin: '0 0 24px 0' }}>
            You have already accepted this invite to &ldquo;{details.modelName}&rdquo;.
          </p>
          <div style={{ textAlign: 'center' }}>
            <button onClick={() => router.push(`/editor?id=${details.modelId}`)} style={primaryBtn}>
              Open Model
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Already declined
  if (details.status === 'declined') {
    return (
      <main style={containerStyle}>
        <div style={cardStyle}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 16px 0', textAlign: 'center' }}>
            Invite Declined
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
            This invite has been declined.
          </p>
        </div>
      </main>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <main style={containerStyle}>
        <div style={cardStyle}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 8px 0', textAlign: 'center' }}>
            Model Invitation
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', textAlign: 'center', margin: '0 0 20px 0' }}>
            {details.inviterEmail} has invited you to &ldquo;{details.modelName}&rdquo;
          </p>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>{roleBadge}</div>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', textAlign: 'center', margin: '0 0 24px 0' }}>
            Log in or create an account to accept this invite.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button onClick={handleLoginRedirect} style={primaryBtn}>Log In</button>
            <button onClick={handleSignupRedirect} style={secondaryBtn}>Sign Up</button>
          </div>
        </div>
      </main>
    );
  }

  // Logged in but email mismatch
  const userEmail = user.email?.toLowerCase();
  const invitedEmail = details.invitedEmail?.toLowerCase();
  if (userEmail && invitedEmail && userEmail !== invitedEmail) {
    return (
      <main style={containerStyle}>
        <div style={cardStyle}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 16px 0', textAlign: 'center' }}>
            Email Mismatch
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', textAlign: 'center', margin: '0 0 8px 0' }}>
            This invite was sent to <strong>{details.invitedEmail}</strong>.
          </p>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', textAlign: 'center', margin: '0 0 24px 0' }}>
            You are currently logged in as <strong>{user.email}</strong>.
          </p>
          <div style={{ textAlign: 'center' }}>
            <button onClick={handleLogout} style={secondaryBtn}>
              Log Out &amp; Switch Account
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Logged in, email matches, pending invite
  return (
    <main style={containerStyle}>
      <div style={cardStyle}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 8px 0', textAlign: 'center' }}>
          Model Invitation
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', textAlign: 'center', margin: '0 0 20px 0' }}>
          {details.inviterEmail} has invited you to collaborate on &ldquo;{details.modelName}&rdquo;
        </p>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>{roleBadge}</div>

        {error && (
          <p style={{ fontSize: '13px', color: 'var(--color-bottleneck)', textAlign: 'center', margin: '0 0 16px 0' }}>
            {error}
          </p>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={handleAccept}
            disabled={actionLoading}
            style={{ ...primaryBtn, opacity: actionLoading ? 0.6 : 1 }}
          >
            {actionLoading ? 'Accepting...' : 'Accept'}
          </button>
          <button
            onClick={handleDecline}
            disabled={actionLoading}
            style={{ ...dangerBtn, opacity: actionLoading ? 0.6 : 1 }}
          >
            Decline
          </button>
        </div>
      </div>
    </main>
  );
}
