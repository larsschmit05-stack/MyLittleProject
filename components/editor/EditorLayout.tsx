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
import ScenarioContextMenu from './ScenarioContextMenu';
import ConfirmDialog from './ConfirmDialog';
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
  const deleteScenarioFromDb = useFlowStore(s => s.deleteScenarioFromDb);
  const renameScenario = useFlowStore(s => s.renameScenario);
  const saveScenarioToDb = useFlowStore(s => s.saveScenarioToDb);
  const isSavingScenario = useFlowStore(s => s.isSavingScenario);
  const scenarioSaveError = useFlowStore(s => s.scenarioSaveError);
  const scenarioDeleteError = useFlowStore(s => s.scenarioDeleteError);

  const renameScenarioInDb = useFlowStore(s => s.renameScenarioInDb);

  const [renamingScenarioId, setRenamingScenarioId] = useState<string | null>(null);
  const [renameMode, setRenameMode] = useState<'new' | 'existing'>('new');
  const [contextMenu, setContextMenu] = useState<{
    scenarioId: string;
    position: { x: number; y: number };
  } | null>(null);
  const [deletingScenarioId, setDeletingScenarioId] = useState<string | null>(null);

  function handleSelectScenario(id: string) {
    if (renamingScenarioId !== null) return;
    requestSwitchScenario(id);
  }

  function handleNewScenario() {
    if (renamingScenarioId !== null) return;
    duplicateActiveScenario('New Scenario');
    const newScenario = useFlowStore.getState().scenarios.at(-1)!;
    switchScenario(newScenario.id);
    setRenameMode('new');
    setRenamingScenarioId(newScenario.id);
  }

  async function handleRenameSubmit(name: string) {
    const id = renamingScenarioId!;
    if (renameMode === 'new') {
      renameScenario(id, name);
      await saveScenarioToDb();
    } else {
      await renameScenarioInDb(id, name);
    }
    setRenamingScenarioId(null);
  }

  function handleRenameCancel() {
    const id = renamingScenarioId!;
    setRenamingScenarioId(null);
    if (renameMode === 'new') {
      deleteScenario(id);
    }
  }

  function handleRenameRequest(id: string) {
    setContextMenu(null);
    setRenameMode('existing');
    setRenamingScenarioId(id);
  }

  function handleContextMenu(id: string, position: { x: number; y: number }) {
    if (renamingScenarioId !== null) return;
    setContextMenu({ scenarioId: id, position });
  }

  function handleDeleteRequest(id: string) {
    setContextMenu(null);
    setDeletingScenarioId(id);
  }

  async function handleDeleteConfirm() {
    const id = deletingScenarioId!;
    setDeletingScenarioId(null);
    await deleteScenarioFromDb(id);
  }

  function handleDeleteCancel() {
    setDeletingScenarioId(null);
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
        onContextMenu={handleContextMenu}
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
          isSaving={isSavingScenario}
          error={scenarioSaveError}
        />
      )}
      {renamingScenarioId !== null && (
        <ScenarioRenameDialog
          initialName={renameMode === 'new' ? 'New Scenario' : (scenarios.find(s => s.id === renamingScenarioId)?.name ?? '')}
          title={renameMode === 'new' ? 'New Scenario' : 'Rename Scenario'}
          submitLabel={renameMode === 'new' ? 'Create' : 'Rename'}
          onCreate={handleRenameSubmit}
          onCancel={handleRenameCancel}
        />
      )}
      {contextMenu !== null && (
        <ScenarioContextMenu
          scenarioId={contextMenu.scenarioId}
          scenarioName={scenarios.find(s => s.id === contextMenu.scenarioId)?.name ?? ''}
          position={contextMenu.position}
          canDelete={scenarios.length > 1}
          onRename={handleRenameRequest}
          onDelete={handleDeleteRequest}
          onClose={() => setContextMenu(null)}
        />
      )}
      {deletingScenarioId !== null && (
        <ConfirmDialog
          title="Delete Scenario"
          message={`Delete \u201c${scenarios.find(s => s.id === deletingScenarioId)?.name ?? ''}\u201d? This cannot be undone.`}
          confirmLabel="Delete"
          confirmDestructive
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}
      {scenarioDeleteError !== null && (
        <ConfirmDialog
          title="Delete Failed"
          message={`Could not delete the scenario: ${scenarioDeleteError}`}
          confirmLabel="OK"
          onConfirm={() => useFlowStore.setState({ scenarioDeleteError: null })}
          onCancel={() => useFlowStore.setState({ scenarioDeleteError: null })}
        />
      )}
    </div>
  );
}
