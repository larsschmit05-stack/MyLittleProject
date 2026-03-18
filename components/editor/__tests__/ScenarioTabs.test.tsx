import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ScenarioTabs from '../ScenarioTabs';
import type { Scenario } from '../../../types/flow';

const mockScenarios: Scenario[] = [
  { id: 's1', name: 'Baseline', model: { nodes: [], edges: [], globalDemand: 0 } },
  { id: 's2', name: 'High Demand', model: { nodes: [], edges: [], globalDemand: 100 } },
];

describe('ScenarioTabs', () => {
  it('renders all scenario names as tabs', () => {
    render(
      <ScenarioTabs
        scenarios={mockScenarios}
        activeScenarioId="s1"
        onSelectScenario={vi.fn()}
        onNewScenario={vi.fn()}
        isMobile={false}
      />
    );
    expect(screen.getByText('Baseline')).toBeDefined();
    expect(screen.getByText('High Demand')).toBeDefined();
  });

  it('marks active tab with aria-selected true', () => {
    render(
      <ScenarioTabs
        scenarios={mockScenarios}
        activeScenarioId="s1"
        onSelectScenario={vi.fn()}
        onNewScenario={vi.fn()}
        isMobile={false}
      />
    );
    const tabs = screen.getAllByRole('tab');
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs[1].getAttribute('aria-selected')).toBe('false');
  });

  it('calls onSelectScenario when clicking inactive tab', async () => {
    const onSelect = vi.fn();
    render(
      <ScenarioTabs
        scenarios={mockScenarios}
        activeScenarioId="s1"
        onSelectScenario={onSelect}
        onNewScenario={vi.fn()}
        isMobile={false}
      />
    );
    await userEvent.click(screen.getByText('High Demand'));
    expect(onSelect).toHaveBeenCalledWith('s2');
  });

  it('does NOT call onSelectScenario when clicking active tab', async () => {
    const onSelect = vi.fn();
    render(
      <ScenarioTabs
        scenarios={mockScenarios}
        activeScenarioId="s1"
        onSelectScenario={onSelect}
        onNewScenario={vi.fn()}
        isMobile={false}
      />
    );
    await userEvent.click(screen.getByText('Baseline'));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('calls onNewScenario when clicking new button', async () => {
    const onNew = vi.fn();
    render(
      <ScenarioTabs
        scenarios={mockScenarios}
        activeScenarioId="s1"
        onSelectScenario={vi.fn()}
        onNewScenario={onNew}
        isMobile={false}
      />
    );
    await userEvent.click(screen.getByLabelText('Create new scenario'));
    expect(onNew).toHaveBeenCalled();
  });

  it('has tablist role on container', () => {
    render(
      <ScenarioTabs
        scenarios={mockScenarios}
        activeScenarioId="s1"
        onSelectScenario={vi.fn()}
        onNewScenario={vi.fn()}
        isMobile={false}
      />
    );
    expect(screen.getByRole('tablist')).toBeDefined();
  });

  it('shows shortened text on mobile', () => {
    render(
      <ScenarioTabs
        scenarios={mockScenarios}
        activeScenarioId="s1"
        onSelectScenario={vi.fn()}
        onNewScenario={vi.fn()}
        isMobile={true}
      />
    );
    expect(screen.getByText('+ New')).toBeDefined();
  });

  it('shows full text on desktop', () => {
    render(
      <ScenarioTabs
        scenarios={mockScenarios}
        activeScenarioId="s1"
        onSelectScenario={vi.fn()}
        onNewScenario={vi.fn()}
        isMobile={false}
      />
    );
    expect(screen.getByText('+ New Scenario')).toBeDefined();
  });
});
