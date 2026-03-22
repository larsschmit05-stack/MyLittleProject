import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ScenarioContextMenu from '../ScenarioContextMenu';

describe('ScenarioContextMenu', () => {
  const defaultProps = {
    scenarioId: 's1',
    scenarioName: 'Baseline',
    position: { x: 100, y: 200 },
    canDelete: true,
    onRename: vi.fn(),
    onDelete: vi.fn(),
    onClose: vi.fn(),
  };

  it('renders Rename and Delete menu items', () => {
    render(<ScenarioContextMenu {...defaultProps} />);
    expect(screen.getByText('Rename')).toBeDefined();
    expect(screen.getByText('Delete')).toBeDefined();
  });

  it('calls onRename(id) on Rename click', async () => {
    const onRename = vi.fn();
    render(<ScenarioContextMenu {...defaultProps} onRename={onRename} />);
    await userEvent.click(screen.getByText('Rename'));
    expect(onRename).toHaveBeenCalledWith('s1');
  });

  it('calls onDelete(id) on Delete click', async () => {
    const onDelete = vi.fn();
    render(<ScenarioContextMenu {...defaultProps} onDelete={onDelete} />);
    await userEvent.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalledWith('s1');
  });

  it('calls onClose on backdrop click', async () => {
    const onClose = vi.fn();
    const { container } = render(<ScenarioContextMenu {...defaultProps} onClose={onClose} />);
    await userEvent.click(container.firstElementChild!);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose on Escape', async () => {
    const onClose = vi.fn();
    render(<ScenarioContextMenu {...defaultProps} onClose={onClose} />);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not fire onDelete when canDelete is false', async () => {
    const onDelete = vi.fn();
    render(<ScenarioContextMenu {...defaultProps} canDelete={false} onDelete={onDelete} />);
    await userEvent.click(screen.getByText('Delete'));
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('has disabled styling on Delete when canDelete is false', () => {
    render(<ScenarioContextMenu {...defaultProps} canDelete={false} />);
    const deleteItem = screen.getByText('Delete');
    expect(deleteItem.getAttribute('aria-disabled')).toBe('true');
    expect(deleteItem.style.opacity).toBe('0.4');
  });

  it('has role="menu" on container', () => {
    render(<ScenarioContextMenu {...defaultProps} />);
    expect(screen.getByRole('menu')).toBeDefined();
  });

  it('has role="menuitem" on both items', () => {
    render(<ScenarioContextMenu {...defaultProps} />);
    expect(screen.getAllByRole('menuitem')).toHaveLength(2);
  });
});
