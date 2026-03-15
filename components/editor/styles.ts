import { CSSProperties } from 'react';

export const nodeBaseStyle: CSSProperties = {
  background: 'var(--color-bg-primary)',
  borderRadius: '8px',
  padding: '8px 12px',
  minWidth: '128px',
  fontSize: '13px',
  fontWeight: 500,
  color: 'var(--color-text-primary)',
  cursor: 'default',
};

export const getNodeStyle = (selected?: boolean): CSSProperties => ({
  ...nodeBaseStyle,
  border: selected
    ? '2px solid var(--color-action)'
    : '1px solid var(--color-border)',
});

export const nodeLabelStyle: CSSProperties = {
  marginBottom: '4px',
  fontSize: '10px',
  color: 'var(--color-text-label)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

export const nodeValueStyle: CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
};

export const panelLabelStyle: CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 500,
  color: 'var(--color-text-secondary)',
  marginBottom: '8px',
};

export const panelInputStyle: CSSProperties = {
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

export const panelInvalidInputStyle: CSSProperties = {
  ...panelInputStyle,
  border: '1px solid var(--color-bottleneck)',
};

export const panelSectionHeadingStyle: CSSProperties = {
  fontSize: '12px',
  fontWeight: 500,
  color: 'var(--color-text-label)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  margin: '0 0 16px 0',
};

export const panelFieldGroupStyle: CSSProperties = {
  marginBottom: '16px',
};

export const panelDividerStyle: CSSProperties = {
  border: 'none',
  borderTop: '1px solid var(--color-border)',
  margin: '24px 0',
};
