'use client';

import { useEffect } from 'react';
import type { ValidationError } from '../../lib/flow/validation';

interface ValidationModalProps {
  errorDetails: ValidationError[];
  onClose: () => void;
  onGoToNode: (nodeId: string) => void;
}

export default function ValidationModal({ errorDetails, onClose, onGoToNode }: ValidationModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--color-bg-primary)',
          borderRadius: '12px',
          border: '1px solid var(--color-border)',
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          width: '480px',
          maxHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '1px solid var(--color-border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--color-text-primary)' }}>
              Validation
            </span>
            <span style={{
              background: 'var(--color-bottleneck)',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '10px',
            }}>
              {errorDetails.length} {errorDetails.length === 1 ? 'issue' : 'issues'}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '18px',
              color: 'var(--color-text-secondary)',
              padding: '4px',
              lineHeight: 1,
            }}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Error list */}
        <div style={{ overflowY: 'auto', padding: '8px 0' }}>
          {errorDetails.map((err, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '10px 20px',
                borderBottom: i < errorDetails.length - 1 ? '1px solid var(--color-border)' : undefined,
              }}
            >
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'var(--color-bottleneck)',
                flexShrink: 0,
                marginTop: '5px',
              }} />
              <span style={{
                flex: 1,
                fontSize: '13px',
                color: 'var(--color-text-primary)',
                lineHeight: '18px',
              }}>
                {err.message}
              </span>
              {err.nodeIds.length > 0 && (
                <button
                  onClick={() => onGoToNode(err.nodeIds[0])}
                  style={{
                    background: 'none',
                    border: '1px solid var(--color-border)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    color: 'var(--color-action)',
                    padding: '2px 8px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  Go to node
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
