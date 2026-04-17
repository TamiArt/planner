import {
  AnnotateMoonPhasesPdfEngine,
  annotateMoonPhasesInPdfBytes,
  type AnnotateMoonPhasesPdfResult,
} from '../../core/export/AnnotateMoonPhasesPdfEngine';
import type { PlannerConfig } from '../../types/planner';
import { preparePdfFileTarget, type PdfExportTarget } from './exportPlannerPdf';

function stripPdfExtension(filename: string) {
  return filename.toLowerCase().endsWith('.pdf')
    ? filename.slice(0, -4)
    : filename;
}

export function buildMoonPhasePdfFilename(sourceFilename: string) {
  const baseName = stripPdfExtension(sourceFilename.trim() || 'document');
  return `${baseName}-with-moon-phases.pdf`;
}

export async function prepareMoonPhasePdfExportTarget(sourceFilename: string) {
  return preparePdfFileTarget(buildMoonPhasePdfFilename(sourceFilename));
}

export async function buildMoonPhasePdfPreview(
  config: PlannerConfig,
  sourcePdfBytes: ArrayBuffer | Uint8Array,
) {
  return annotateMoonPhasesInPdfBytes(config, sourcePdfBytes);
}

export async function annotateMoonPhasesPdf(
  config: PlannerConfig,
  sourcePdfBytes: ArrayBuffer | Uint8Array,
  target: PdfExportTarget,
): Promise<AnnotateMoonPhasesPdfResult> {
  return AnnotateMoonPhasesPdfEngine(config, sourcePdfBytes, target);
}
