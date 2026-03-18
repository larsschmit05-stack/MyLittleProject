'use client';

import { useState } from 'react';
import NodePalette from "./NodePalette";
import CanvasArea from "./CanvasArea";
import PropertiesPanel from "./PropertiesPanel";
import EditorHeader from "./EditorHeader";
import FloatingParameterPanel from "./FloatingParameterPanel";
import ScenarioTabs from './ScenarioTabs';
import UnsavedEditsDialog from './UnsavedEditsDialog';
import ScenarioRenameDialog from './ScenarioRenameDialog';
import { useFloatingPanel } from "../../hooks/useFloatingPanel";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import useFlowStore from '../../store/useFlowStore';

export default function EditorLayout() {
  const {
    isFloating,
    snapshot,
    isDirty,
    closeFloating,
    resetToSnapshot,
    saveAndClose,
  } = useFloatingPanel();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const scenarios = useFlowStore(s => s.scenarios);
  const activeScenarioId = useFlowStore(s => s.activeScenarioId);
  const pendingSwitchTarget = useFlowStore(s => s.pendingSwitchTarget);
  const requestSwitchScenario = useFlowStore(s => s.requestSwitchScenario);
  const confirmSwitch = useFlowStore(s => s.confirmSwitch);
  const cancelSwitch = useFlowStore(s => s.cancelSwitch);
  const duplicateActiveScenario = useFlowStore(s => s.duplicateActiveScenario);
  const switchScenario = useFlowStore(s => s.switchScenario);
  const deleteScenario = useFlowStore(s => s.deleteScenario);
  const renameScenario = useFlowStore(s => s.renameScenario);
  const saveScenarioToDb = useFlowStore(s => s.saveScenarioToDb);

  const [renamingScenarioId, setRenamingScenarioId] = useState<string | null>(null);

  function handleSelectScenario(id: string) {
    if (renamingScenarioId !== null) return;
    requestSwitchScenario(id);
  }

  function handleNewScenario() {
    if (renamingScenarioId !== null) return;
    duplicateActiveScenario('New Scenario');
    const newScenario = useFlowStore.getState().scenarios.at(-1)!;
    switchScenario(newScenario.id);
    setRenamingScenarioId(newScenario.id);
  }

  async function handleRenameCreate(name: string) {
    renameScenario(renamingScenarioId!, name);
    await saveScenarioToDb();
    setRenamingScenarioId(null);
  }

  function handleRenameCancel() {
    const id = renamingScenarioId!;
    setRenamingScenarioId(null);
    deleteScenario(id);
  }

  const activeScenario = scenarios.find(s => s.id === activeScenarioId);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        backgroundColor: "var(--color-bg-primary)",
      }}
    >
      <EditorHeader />
      <ScenarioTabs
        scenarios={scenarios}
        activeScenarioId={activeScenarioId}
        onSelectScenario={handleSelectScenario}
        onNewScenario={handleNewScenario}
        isMobile={!isDesktop}
      />

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left sidebar — Node Palette */}
        <aside
          style={{
            width: "240px",
            flexShrink: 0,
            backgroundColor: "var(--color-bg-secondary)",
            borderRight: "1px solid var(--color-border)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <NodePalette />
        </aside>

        {/* Center — Canvas Area */}
        <main
          style={{
            flex: 1,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <CanvasArea />
          {isFloating && (
            <FloatingParameterPanel
              onClose={closeFloating}
              onReset={resetToSnapshot}
              onSave={saveAndClose}
              isDirty={isDirty}
              snapshot={snapshot}
              isDesktop={isDesktop}
            />
          )}
        </main>

        {/* Right sidebar — Properties & Results */}
        <aside
          style={{
            width: "320px",
            flexShrink: 0,
            backgroundColor: "var(--color-bg-secondary)",
            borderLeft: "1px solid var(--color-border)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <PropertiesPanel isFloating={isFloating} />
        </aside>
      </div>

      {pendingSwitchTarget !== null && (
        <UnsavedEditsDialog
          scenarioName={activeScenario?.name ?? 'this scenario'}
          onSave={() => confirmSwitch('save')}
          onDiscard={() => confirmSwitch('discard')}
          onCancel={cancelSwitch}
        />
      )}
      {renamingScenarioId !== null && (
        <ScenarioRenameDialog
          initialName="New Scenario"
          onCreate={handleRenameCreate}
          onCancel={handleRenameCancel}
        />
      )}
    </div>
  );
}
