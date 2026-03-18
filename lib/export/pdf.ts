import type { SerializedModel, FlowResult, ProcessNodeData } from '../../types/flow';
import type { ValidationResult } from '../flow/validation';
import { classifyBottlenecks } from '../flow/bottleneck';
import { fmt, fmtPct } from '../formatting';

// PDF-safe equivalents of CSS variables (jsPDF cannot resolve CSS vars)
const COLOR_HEALTHY = [16, 185, 129] as const;    // #10B981
const COLOR_WARNING = [245, 158, 11] as const;     // #F59E0B
const COLOR_BOTTLENECK = [239, 68, 68] as const;   // #EF4444
const COLOR_TEXT = [17, 24, 39] as const;           // #111827
const COLOR_TEXT_SEC = [75, 85, 99] as const;       // #4B5563
const COLOR_ACTION = [99, 102, 241] as const;       // #6366F1

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\-_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function getUtilizationColor(utilization: number): readonly [number, number, number] {
  if (!isFinite(utilization) || utilization >= 0.95) return COLOR_BOTTLENECK;
  if (utilization >= 0.80) return COLOR_WARNING;
  return COLOR_HEALTHY;
}

function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '\u2026' : str;
}

export async function generateScenarioPdf(params: {
  scenarioName: string;
  model: SerializedModel;
  derivedResults: FlowResult | null;
  validationResult: ValidationResult | null;
}): Promise<void> {
  const { scenarioName, model, derivedResults, validationResult } = params;

  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const marginL = 40;
  const marginR = 40;
  const contentW = pageW - marginL - marginR;
  let y = 40;

  // ─── Header ────────────────────────────────────────────────────────────────
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  doc.setFontSize(10);
  doc.setTextColor(...COLOR_TEXT_SEC);
  doc.text(dateStr, pageW - marginR, y, { align: 'right' });

  // Separator line above title
  doc.setDrawColor(...COLOR_ACTION);
  doc.setLineWidth(2);
  doc.line(marginL, y + 10, pageW - marginR, y + 10);

  y += 30;
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_ACTION);
  doc.text(`SCENARIO REPORT: ${truncate(scenarioName, 50)}`, marginL, y);

  y += 12;
  doc.line(marginL, y, pageW - marginR, y);
  y += 24;

  // ─── Model Summary ─────────────────────────────────────────────────────────
  const sourceCount = model.nodes.filter(n => n.type === 'source').length;
  const processCount = model.nodes.filter(n => n.type === 'process').length;
  const sinkCount = model.nodes.filter(n => n.type === 'sink').length;
  const edgeCount = model.edges.length;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_TEXT);
  doc.text('MODEL SUMMARY', marginL, y);
  y += 18;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_TEXT_SEC);

  const summaryItems = [
    ['Source Nodes', String(sourceCount)],
    ['Process Nodes', String(processCount)],
    ['Sink Nodes', String(sinkCount)],
    ['Total Connections', String(edgeCount)],
    ['Global Demand', `${fmt(model.globalDemand)} units/hr`],
  ];

  for (const [label, value] of summaryItems) {
    const dotLeaderX = marginL + 130;
    doc.text(label, marginL, y);
    // Draw dot leader
    const dots = '.'.repeat(30);
    doc.text(dots, dotLeaderX, y);
    doc.text(value, marginL + 280, y);
    y += 14;
  }

  y += 10;

  // ─── Key Metrics ───────────────────────────────────────────────────────────
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_TEXT);
  doc.text('KEY METRICS', marginL, y);
  y += 18;

  if (derivedResults === null) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...COLOR_TEXT_SEC);
    doc.text('No simulation results \u2014 run a simulation to see metrics.', marginL, y);
    y += 14;
  } else {
    // Validation warning
    if (validationResult && !validationResult.isValid) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...COLOR_WARNING);
      doc.text('\u26A0 Model has validation errors \u2014 results may not be realistic.', marginL, y);
      y += 16;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLOR_TEXT);
    doc.text(`System Throughput: ${fmt(derivedResults.systemThroughput)} units/hr`, marginL, y);
    y += 16;

    // Bottleneck status
    const classification = classifyBottlenecks(model.nodes, derivedResults.nodeResults);
    doc.text('Bottleneck Status: ', marginL, y);
    const statusX = marginL + 100;

    let statusColor: readonly [number, number, number];
    let statusText: string;

    switch (classification.status) {
      case 'balanced':
        statusColor = COLOR_HEALTHY;
        statusText = 'All nodes operating efficiently';
        break;
      case 'elevated':
        statusColor = COLOR_WARNING;
        statusText = 'High utilization, no critical bottleneck';
        break;
      case 'single': {
        statusColor = COLOR_BOTTLENECK;
        const bnId = classification.bottleneckNodeIds[0];
        const bnNode = model.nodes.find(n => n.id === bnId);
        const bnName = bnNode?.type === 'process' ? (bnNode.data as ProcessNodeData).name : bnId;
        const bnUtil = derivedResults.nodeResults[bnId]?.utilization ?? 0;
        statusText = `${bnName} at ${fmtPct(bnUtil)} (CRITICAL)`;
        break;
      }
      case 'multiple': {
        statusColor = COLOR_BOTTLENECK;
        const names = classification.bottleneckNodeIds.map(id => {
          const node = model.nodes.find(n => n.id === id);
          return node?.type === 'process' ? (node.data as ProcessNodeData).name : id;
        });
        statusText = `Multiple: ${names.join(', ')} (CRITICAL)`;
        break;
      }
      case 'empty':
      default:
        statusColor = COLOR_TEXT_SEC;
        statusText = 'No process nodes';
        break;
    }

    // Draw colored indicator circle
    doc.setFillColor(...statusColor);
    doc.circle(statusX, y - 3, 4, 'F');
    doc.setTextColor(...statusColor);
    doc.text(statusText, statusX + 10, y);
    y += 14;
  }

  y += 14;

  // ─── Utilization Table ─────────────────────────────────────────────────────
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_TEXT);
  doc.text('UTILIZATION BY NODE', marginL, y);
  y += 14;

  const processNodes = model.nodes
    .filter(n => n.type === 'process')
    .sort((a, b) => {
      const nameA = (a.data as ProcessNodeData).name;
      const nameB = (b.data as ProcessNodeData).name;
      return nameA.localeCompare(nameB);
    });

  const tableBody = processNodes.map(node => {
    const data = node.data as ProcessNodeData;
    const result = derivedResults?.nodeResults[node.id];
    if (!result) {
      return [data.name, '\u2014', '\u2014', '\u2014'];
    }
    return [
      data.name,
      fmt(result.requiredThroughput),
      fmt(result.effectiveCapacity),
      fmtPct(result.utilization),
    ];
  });

  autoTable(doc, {
    startY: y,
    margin: { left: marginL, right: marginR },
    head: [['Node Name', 'Demand (units/hr)', 'Max Capacity', 'Utilization']],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [...COLOR_ACTION],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    styles: {
      fontSize: 9,
      textColor: [...COLOR_TEXT],
      cellPadding: 6,
    },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    didParseCell: (data: any) => {
      if (data.section === 'body' && data.column.index === 3) {
        const node = processNodes[data.row.index];
        if (node) {
          const result = derivedResults?.nodeResults[node.id];
          if (result) {
            const color = getUtilizationColor(result.utilization);
            data.cell.styles.fillColor = [...color];
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    },
  });

  // Get the final Y after the table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = ((doc as any).lastAutoTable?.finalY ?? y) + 20;

  // ─── Rework Analysis (conditional) ──────────────────────────────────────────
  if (derivedResults?.rework && derivedResults.rework.totalReworkCycles > 0) {
    const rework = derivedResults.rework;
    const reworkSpaceNeeded = 80 + rework.reworkSources.length * 14;
    const pageH2 = doc.internal.pageSize.getHeight();
    if (y + reworkSpaceNeeded > pageH2) {
      doc.addPage();
      y = 40;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLOR_TEXT);
    doc.text('REWORK ANALYSIS', marginL, y);
    y += 18;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLOR_TEXT_SEC);
    doc.text(`Rework Cycles: ${fmt(rework.totalReworkCycles)} units/hr (${fmtPct(rework.reworkRate)})`, marginL, y);
    y += 14;
    doc.text(`Convergence: ${rework.converged ? 'Yes' : 'No'} (${rework.convergenceIterations} iterations)`, marginL, y);
    y += 14;

    if (!rework.converged) {
      doc.setTextColor(...COLOR_WARNING);
      doc.text('\u26A0 Rework simulation did not converge \u2014 results are approximate.', marginL, y);
      doc.setTextColor(...COLOR_TEXT_SEC);
      y += 14;
    }

    if (rework.reworkSources.length > 0) {
      doc.text('Rework Sources:', marginL, y);
      y += 14;
      for (const rs of rework.reworkSources) {
        doc.text(`  \u2022 ${rs.nodeName}: ${rs.percentage}% \u2192 ${rs.targetNodeName} (${fmt(rs.reworkAmount)} units/hr)`, marginL, y);
        y += 14;
      }
    }

    y += 10;
  }

  // ─── Utilization Legend ─────────────────────────────────────────────────────
  // Space needed: title (14) + 3 legend rows (3*12=36) + gap (20) + footer (38) = ~108pt
  const pageH = doc.internal.pageSize.getHeight();
  const spaceNeeded = 108;
  if (y + spaceNeeded > pageH) {
    doc.addPage();
    y = 40;
  }

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_TEXT);
  doc.text('UTILIZATION GUIDE', marginL, y);
  y += 14;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  const legendItems: Array<{ color: readonly [number, number, number]; label: string; desc: string }> = [
    { color: COLOR_HEALTHY, label: '< 80%', desc: 'Normal, good headroom' },
    { color: COLOR_WARNING, label: '80\u201395%', desc: 'High usage, monitor closely' },
    { color: COLOR_BOTTLENECK, label: '\u2265 95%', desc: 'Bottleneck, consider improvements' },
  ];

  for (const item of legendItems) {
    doc.setFillColor(...item.color);
    doc.circle(marginL + 4, y - 3, 3, 'F');
    doc.setTextColor(...COLOR_TEXT_SEC);
    doc.text(`${item.label}    ${item.desc}`, marginL + 14, y);
    y += 12;
  }

  // ─── Footer ────────────────────────────────────────────────────────────────
  const footerY = pageH - 30;

  doc.setDrawColor(...COLOR_TEXT_SEC);
  doc.setLineWidth(0.5);
  doc.line(marginL, footerY - 8, pageW - marginR, footerY - 8);

  const now = new Date();
  const dateTimeStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')} at ${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')} UTC`;

  doc.setFontSize(8);
  doc.setTextColor(...COLOR_TEXT_SEC);
  doc.text(`Generated: ${dateTimeStr}  |  OPM Scenario Manager v1.9`, marginL, footerY);

  // ─── Save ──────────────────────────────────────────────────────────────────
  const safeName = sanitizeFilename(scenarioName) || 'Untitled';
  const dateSlug = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  doc.save(`Scenario_${safeName}_${dateSlug}.pdf`);
}
