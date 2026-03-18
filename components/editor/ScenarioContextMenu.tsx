'use client';

import { useEffect, useRef, useLayoutEffect } from 'react';
import type { CSSProperties } from 'react';

interface ScenarioContextMenuProps {
  scenarioId: string;
  scenarioName: string;
  position: { x: number; y: number };
  canDelete: boolean;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const backdropStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 39,
};

const menuStyle: CSSProperties = {
  position: 'fixed',
  zIndex: 40,
  background: 'var(--color-bg-secondary)',
  border: '1px solid var(--color-border)',
  borderRadius: '8px',
  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
  minWidth: '180px',
  padding: '4px 0',
};

const menuItemBase: CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '8px 12px',
  fontSize: '13px',
  textAlign: 'left',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  color: 'var(--color-text-primary)',
};

const menuItemDestructive: CSSProperties = {
  ...menuItemBase,
  color: 'var(--color-bottleneck)',
};

const menuItemDisabled: CSSProperties = {
  ...menuItemDestructive,
  opacity: 0.4,
  cursor: 'not-allowed',
};

export default function ScenarioContextMenu({
  scenarioId,
  scenarioName,
  position,
  canDelete,
  onRename,
  onDelete,
  onClose,
}: ScenarioContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Viewport clamping
  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (rect.right > vw) {
      el.style.left = `${Math.max(0, vw - rect.width)}px`;
    }
    if (rect.bottom > vh) {
      el.style.top = `${Math.max(0, vh - rect.height)}px`;
    }
  }, [position]);

  return (
    <>
      <div style={backdropStyle} onClick={onClose} />
      <div
        ref={menuRef}
        role="menu"
        style={{ ...menuStyle, top: position.y, left: position.x }}
      >
        <button
          role="menuitem"
          style={menuItemBase}
          onClick={() => onRename(scenarioId)}
        >
          Rename
        </button>
        <button
          role="menuitem"
          aria-disabled={!canDelete}
          style={canDelete ? menuItemDestructive : menuItemDisabled}
          onClick={() => {
            if (canDelete) onDelete(scenarioId);
          }}
        >
          Delete
        </button>
      </div>
    </>
  );
}
