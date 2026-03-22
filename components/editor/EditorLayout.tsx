'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
import ComparisonSelectDialog from './ComparisonSelectDialog';
import ComparisonView from './ComparisonView';
import { useFloatingPanel } from "../../hooks/useFloatingPanel";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import useFlowStore from '../../store/useFlowStore';
import { useModelAccess } from '../../hooks/useModelAccess';
import useModelAccessStore from '../../store/useModelAccessStore';

export default function EditorLayout() {
  const router = useRouter();
  const {
    isFloating,
    snapshot,
    isDirty,
    closeFloating,
    resetToSnapshot,
    saveAndClose,
  } = useFloatingPanel();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const savedModelId = useFlowStore(s => s.savedModelId);
  const { canEdit, role, isLoading } = useModelAccess(savedModelId);
  const readOnly = !canEdit;

  // Re-check access on tab focus to detect revocation
  const fetchUserAccess = useModelAccessStore(s => s.fetchUserAccess);
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'visible' && savedModelId) {
        fetchUserAccess(savedModelId);
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [savedModelId, fetchUserAccess]);

  // Redirect if access revoked
  useEffect(() => {
    if (savedModelId && !isLoading && role === null) {
      router.push('/dashboard');
    }
  }, [savedModelId, isLoading, role, router]);

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
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isCompareDialogOpen, setIsCompareDialogOpen] = useState(false);
  const [comparisonPair, setComparisonPair] = useState<{
    scenario1Id: string;
    scenario2Id: string;
  } | null>(null);

  function handleSelectScenario(id: string) {
    if (renamingScenarioId !== null) return;
    requestSwitchScenario(id);
  }

  function handleNewScenario() {
    if (renamingScenarioId !== null || readOnly) return;
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

  async function handleExport() {
    if (isExporting) return;
    setIsExporting(true);
    setExportError(null);
    try {
      const { generateScenarioPdf } = await import('../../lib/export/pdf');
      const state = useFlowStore.getState();
      await generateScenarioPdf({
        scenarioName: activeScenario?.name ?? 'Untitled',
        model: state.getSerializedModel(),
        derivedResults: state.derivedResults,
        validationResult: state.validationResult,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setExportError(message);
    } finally {
      setIsExporting(false);
    }
  }
  const comparisonScenario1 = comparisonPair ? scenarios.find(s => s.id === comparisonPair.scenario1Id) : undefined;
  const comparisonScenario2 = comparisonPair ? scenarios.find(s => s.id === comparisonPair.scenario2Id) : undefined;

  // Auto-close comparison if a scenario was deleted
  useEffect(() => {
    if (comparisonPair && (!comparisonScenario1 || !comparisonScenario2)) {
      setComparisonPair(null);
    }
  }, [comparisonPair, comparisonScenario1, comparisonScenario2]);

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
        onCompare={() => setIsCompareDialogOpen(true)}
        canCompare={scenarios.length >= 2}
        onExport={handleExport}
        isExporting={isExporting}
        isMobile={!isDesktop}
        readOnly={readOnly}
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
          <NodePalette disabled={readOnly} />
        </aside>

        {/* Center — Canvas Area */}
        <main
          style={{
            flex: 1,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <CanvasArea readOnly={readOnly} />
          {isFloating && (
            <FloatingParameterPanel
              onClose={closeFloating}
              onReset={resetToSnapshot}
              onSave={saveAndClose}
              isDirty={isDirty}
              snapshot={snapshot}
              isDesktop={isDesktop}
              readOnly={readOnly}
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
          <PropertiesPanel isFloating={isFloating} readOnly={readOnly} />
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
      {exportError !== null && (
        <ConfirmDialog
          title="Export Failed"
          message={`Could not generate PDF: ${exportError}`}
          confirmLabel="OK"
          onConfirm={() => setExportError(null)}
          onCancel={() => setExportError(null)}
        />
      )}
      {isCompareDialogOpen && (
        <ComparisonSelectDialog
          scenarios={scenarios}
          defaultScenario1Id={activeScenarioId}
          onCompare={(id1, id2) => {
            setComparisonPair({ scenario1Id: id1, scenario2Id: id2 });
            setIsCompareDialogOpen(false);
          }}
          onCancel={() => setIsCompareDialogOpen(false)}
        />
      )}
      {comparisonPair !== null && comparisonScenario1 && comparisonScenario2 && (
        <ComparisonView
          scenario1={comparisonScenario1}
          scenario2={comparisonScenario2}
          onClose={() => setComparisonPair(null)}
        />
      )}
    </div>
  );
}
