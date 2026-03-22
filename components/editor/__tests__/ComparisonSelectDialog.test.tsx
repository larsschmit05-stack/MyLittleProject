import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ComparisonSelectDialog from '../ComparisonSelectDialog';
import type { Scenario } from '../../../types/flow';

const scenarios: Scenario[] = [
  { id: 's1', name: 'Baseline', model: { nodes: [], edges: [], globalDemand: 10 } },
  { id: 's2', name: 'High Demand', model: { nodes: [], edges: [], globalDemand: 100 } },
  { id: 's3', name: 'Low Yield', model: { nodes: [], edges: [], globalDemand: 50 } },
];

const defaultProps = {
  scenarios,
  defaultScenario1Id: 's1',
  onCompare: vi.fn(),
  onCancel: vi.fn(),
};

describe('ComparisonSelectDialog', () => {
  it('renders two dropdowns with all scenario names', () => {
    render(<ComparisonSelectDialog {...defaultProps} />);
    const selects = screen.getAllByRole('combobox');
    expect(selects).toHaveLength(2);
    // Each dropdown should have 3 options
    expect(selects[0].querySelectorAll('option')).toHaveLength(3);
    expect(selects[1].querySelectorAll('option')).toHaveLength(3);
  });

  it('defaults first dropdown to defaultScenario1Id and second to different scenario', () => {
    render(<ComparisonSelectDialog {...defaultProps} />);
    const select1 = screen.getByLabelText('Scenario 1') as HTMLSelectElement;
    const select2 = screen.getByLabelText('Scenario 2') as HTMLSelectElement;
    expect(select1.value).toBe('s1');
    expect(select2.value).toBe('s2');
  });

  it('disables Compare button when same scenario selected in both', async () => {
    render(<ComparisonSelectDialog {...defaultProps} />);
    const select2 = screen.getByLabelText('Scenario 2') as HTMLSelectElement;
    await userEvent.selectOptions(select2, 's1');
    const compareBtn = screen.getByText('Compare');
    expect(compareBtn).toHaveProperty('disabled', true);
  });

  it('enables Compare button when different scenarios selected', () => {
    render(<ComparisonSelectDialog {...defaultProps} />);
    const compareBtn = screen.getByText('Compare');
    expect(compareBtn).toHaveProperty('disabled', false);
  });

  it('calls onCompare with correct IDs on submit', async () => {
    const onCompare = vi.fn();
    render(<ComparisonSelectDialog {...defaultProps} onCompare={onCompare} />);
    const select2 = screen.getByLabelText('Scenario 2') as HTMLSelectElement;
    await userEvent.selectOptions(select2, 's3');
    await userEvent.click(screen.getByText('Compare'));
    expect(onCompare).toHaveBeenCalledWith('s1', 's3');
  });

  it('calls onCancel on Escape key', () => {
    const onCancel = vi.fn();
    render(<ComparisonSelectDialog {...defaultProps} onCancel={onCancel} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });

  it('calls onCancel on overlay click', async () => {
    const onCancel = vi.fn();
    const { container } = render(<ComparisonSelectDialog {...defaultProps} onCancel={onCancel} />);
    // Click the overlay (outermost div)
    await userEvent.click(container.firstElementChild!);
    expect(onCancel).toHaveBeenCalled();
  });

  it('has dialog role and aria-modal for accessibility', () => {
    render(<ComparisonSelectDialog {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeDefined();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
  });
});
