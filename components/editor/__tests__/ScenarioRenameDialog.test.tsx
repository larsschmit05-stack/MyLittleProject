import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ScenarioRenameDialog from '../ScenarioRenameDialog';

describe('ScenarioRenameDialog', () => {
  it('input is pre-filled with initialName', () => {
    render(
      <ScenarioRenameDialog
        initialName="New Scenario"
        onCreate={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    const input = screen.getByDisplayValue('New Scenario');
    expect(input).toBeDefined();
  });

  it('Create calls onCreate with typed value', async () => {
    const onCreate = vi.fn();
    render(
      <ScenarioRenameDialog
        initialName="New Scenario"
        onCreate={onCreate}
        onCancel={vi.fn()}
      />
    );
    const input = screen.getByDisplayValue('New Scenario');
    await userEvent.clear(input);
    await userEvent.type(input, 'My Test');
    await userEvent.click(screen.getByText('Create'));
    expect(onCreate).toHaveBeenCalledWith('My Test');
  });

  it('Create is disabled when input is empty', async () => {
    render(
      <ScenarioRenameDialog
        initialName=""
        onCreate={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    const btn = screen.getByText('Create');
    expect(btn).toHaveProperty('disabled', true);
  });

  it('Enter key in input triggers onCreate', async () => {
    const onCreate = vi.fn();
    render(
      <ScenarioRenameDialog
        initialName="New Scenario"
        onCreate={onCreate}
        onCancel={vi.fn()}
      />
    );
    const input = screen.getByDisplayValue('New Scenario');
    await userEvent.clear(input);
    await userEvent.type(input, 'Quick Name{enter}');
    expect(onCreate).toHaveBeenCalledWith('Quick Name');
  });

  it('Escape key calls onCancel', () => {
    const onCancel = vi.fn();
    render(
      <ScenarioRenameDialog
        initialName="New Scenario"
        onCreate={vi.fn()}
        onCancel={onCancel}
      />
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });

  it('Cancel button calls onCancel', async () => {
    const onCancel = vi.fn();
    render(
      <ScenarioRenameDialog
        initialName="New Scenario"
        onCreate={vi.fn()}
        onCancel={onCancel}
      />
    );
    await userEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('uses custom title and submitLabel when provided', () => {
    render(
      <ScenarioRenameDialog
        initialName="Baseline"
        title="Rename Scenario"
        submitLabel="Rename"
        onCreate={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText('Rename Scenario')).toBeDefined();
    expect(screen.getByText('Rename')).toBeDefined();
  });
});
