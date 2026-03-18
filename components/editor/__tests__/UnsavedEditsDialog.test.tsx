import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UnsavedEditsDialog from '../UnsavedEditsDialog';

describe('UnsavedEditsDialog', () => {
  it('renders scenario name in message', () => {
    render(
      <UnsavedEditsDialog
        scenarioName="High Demand"
        onSave={vi.fn()}
        onDiscard={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText(/High Demand/)).toBeDefined();
  });

  it('Save button calls onSave', async () => {
    const onSave = vi.fn();
    render(
      <UnsavedEditsDialog
        scenarioName="Test"
        onSave={onSave}
        onDiscard={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    await userEvent.click(screen.getByText('Save'));
    expect(onSave).toHaveBeenCalled();
  });

  it('Discard button calls onDiscard', async () => {
    const onDiscard = vi.fn();
    render(
      <UnsavedEditsDialog
        scenarioName="Test"
        onSave={vi.fn()}
        onDiscard={onDiscard}
        onCancel={vi.fn()}
      />
    );
    await userEvent.click(screen.getByText('Discard'));
    expect(onDiscard).toHaveBeenCalled();
  });

  it('Cancel button calls onCancel', async () => {
    const onCancel = vi.fn();
    render(
      <UnsavedEditsDialog
        scenarioName="Test"
        onSave={vi.fn()}
        onDiscard={vi.fn()}
        onCancel={onCancel}
      />
    );
    await userEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('Escape key calls onCancel', () => {
    const onCancel = vi.fn();
    render(
      <UnsavedEditsDialog
        scenarioName="Test"
        onSave={vi.fn()}
        onDiscard={vi.fn()}
        onCancel={onCancel}
      />
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });

  it('clicking overlay calls onCancel', async () => {
    const onCancel = vi.fn();
    const { container } = render(
      <UnsavedEditsDialog
        scenarioName="Test"
        onSave={vi.fn()}
        onDiscard={vi.fn()}
        onCancel={onCancel}
      />
    );
    // The overlay is the outermost div
    await userEvent.click(container.firstElementChild!);
    expect(onCancel).toHaveBeenCalled();
  });
});
