import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ScenarioTabs from '../ScenarioTabs';
import type { Scenario } from '../../../types/flow';

const mockScenarios: Scenario[] = [
  { id: 's1', name: 'Baseline', model: { nodes: [], edges: [], globalDemand: 0 } },
  { id: 's2', name: 'High Demand', model: { nodes: [], edges: [], globalDemand: 100 } },
];

const defaultProps = {
  scenarios: mockScenarios,
  activeScenarioId: 's1',
  onSelectScenario: vi.fn(),
  onNewScenario: vi.fn(),
  onContextMenu: vi.fn(),
  onCompare: vi.fn(),
  canCompare: true,
  onExport: vi.fn(),
  isExporting: false,
  isMobile: false,
};

describe('ScenarioTabs', () => {
  it('renders all scenario names as tabs', () => {
    render(<ScenarioTabs {...defaultProps} />);
    expect(screen.getByText('Baseline')).toBeDefined();
    expect(screen.getByText('High Demand')).toBeDefined();
  });

  it('marks active tab with aria-selected true', () => {
    render(<ScenarioTabs {...defaultProps} />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs[1].getAttribute('aria-selected')).toBe('false');
  });

  it('calls onSelectScenario when clicking inactive tab', async () => {
    const onSelect = vi.fn();
    render(<ScenarioTabs {...defaultProps} onSelectScenario={onSelect} />);
    await userEvent.click(screen.getByText('High Demand'));
    expect(onSelect).toHaveBeenCalledWith('s2');
  });

  it('does NOT call onSelectScenario when clicking active tab', async () => {
    const onSelect = vi.fn();
    render(<ScenarioTabs {...defaultProps} onSelectScenario={onSelect} />);
    await userEvent.click(screen.getByText('Baseline'));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('calls onNewScenario when clicking new button', async () => {
    const onNew = vi.fn();
    render(<ScenarioTabs {...defaultProps} onNewScenario={onNew} />);
    await userEvent.click(screen.getByLabelText('Create new scenario'));
    expect(onNew).toHaveBeenCalled();
  });

  it('has tablist role on container', () => {
    render(<ScenarioTabs {...defaultProps} />);
    expect(screen.getByRole('tablist')).toBeDefined();
  });

  it('shows shortened text on mobile', () => {
    render(<ScenarioTabs {...defaultProps} isMobile={true} />);
    expect(screen.getByText('+ New')).toBeDefined();
  });

  it('shows full text on desktop', () => {
    render(<ScenarioTabs {...defaultProps} isMobile={false} />);
    expect(screen.getByText('+ New Scenario')).toBeDefined();
  });

  it('calls onContextMenu with id and position on right-click', () => {
    const onCtx = vi.fn();
    render(<ScenarioTabs {...defaultProps} onContextMenu={onCtx} />);
    const tab = screen.getByText('Baseline');
    fireEvent.contextMenu(tab, { clientX: 50, clientY: 60 });
    expect(onCtx).toHaveBeenCalledWith('s1', { x: 50, y: 60 });
  });

  it('prevents default context menu on right-click', () => {
    render(<ScenarioTabs {...defaultProps} />);
    const tab = screen.getByText('High Demand');
    const event = new MouseEvent('contextmenu', { bubbles: true, clientX: 10, clientY: 20 });
    const spy = vi.spyOn(event, 'preventDefault');
    tab.dispatchEvent(event);
    expect(spy).toHaveBeenCalled();
  });

  it('renders Compare button when canCompare is true', () => {
    render(<ScenarioTabs {...defaultProps} canCompare={true} />);
    const btn = screen.getByLabelText('Compare scenarios');
    expect(btn).toBeDefined();
    expect(btn).toHaveProperty('disabled', false);
  });

  it('disables Compare button when canCompare is false', () => {
    render(<ScenarioTabs {...defaultProps} canCompare={false} />);
    const btn = screen.getByLabelText('Compare scenarios');
    expect(btn).toHaveProperty('disabled', true);
  });

  it('calls onCompare when Compare button is clicked', async () => {
    const onCompare = vi.fn();
    render(<ScenarioTabs {...defaultProps} onCompare={onCompare} canCompare={true} />);
    await userEvent.click(screen.getByLabelText('Compare scenarios'));
    expect(onCompare).toHaveBeenCalled();
  });

  it('renders Export PDF button', () => {
    render(<ScenarioTabs {...defaultProps} />);
    expect(screen.getByLabelText('Export scenario as PDF')).toBeDefined();
    expect(screen.getByText('Export PDF')).toBeDefined();
  });

  it('calls onExport when Export PDF button is clicked', async () => {
    const onExport = vi.fn();
    render(<ScenarioTabs {...defaultProps} onExport={onExport} />);
    await userEvent.click(screen.getByLabelText('Export scenario as PDF'));
    expect(onExport).toHaveBeenCalled();
  });

  it('shows Exporting... and is disabled when isExporting is true', () => {
    render(<ScenarioTabs {...defaultProps} isExporting={true} />);
    const btn = screen.getByLabelText('Export scenario as PDF');
    expect(btn.textContent).toBe('Exporting...');
    expect(btn).toHaveProperty('disabled', true);
  });

  it('shows PDF text on mobile', () => {
    render(<ScenarioTabs {...defaultProps} isMobile={true} isExporting={false} />);
    expect(screen.getByLabelText('Export scenario as PDF').textContent).toBe('PDF');
  });
});
