import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmDialog from '../ConfirmDialog';

describe('ConfirmDialog', () => {
  const defaultProps = {
    title: 'Delete Scenario',
    message: 'Delete "Baseline"? This cannot be undone.',
    confirmLabel: 'Delete',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  it('renders title and message', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText('Delete Scenario')).toBeDefined();
    expect(screen.getByText('Delete "Baseline"? This cannot be undone.')).toBeDefined();
  });

  it('renders confirm button with label', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText('Delete')).toBeDefined();
  });

  it('calls onConfirm when confirm button clicked', async () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);
    await userEvent.click(screen.getByText('Delete'));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('calls onCancel when Cancel button clicked', async () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);
    await userEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('calls onCancel on Escape key', async () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);
    await userEvent.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('calls onCancel on overlay click', async () => {
    const onCancel = vi.fn();
    const { container } = render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);
    // Click the overlay (outermost div)
    await userEvent.click(container.firstElementChild!);
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('does not call onCancel when clicking card content', async () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);
    await userEvent.click(screen.getByText('Delete Scenario'));
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('renders red confirm button when confirmDestructive is true', () => {
    render(<ConfirmDialog {...defaultProps} confirmDestructive />);
    const btn = screen.getByText('Delete');
    expect(btn.style.background).toBe('var(--color-bottleneck)');
  });

  it('renders action-colored confirm button when confirmDestructive is false', () => {
    render(<ConfirmDialog {...defaultProps} confirmDestructive={false} />);
    const btn = screen.getByText('Delete');
    expect(btn.style.background).toBe('var(--color-action)');
  });
});
