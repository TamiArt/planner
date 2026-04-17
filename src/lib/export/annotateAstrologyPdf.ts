import { appendAstroLegendToPdfBytes } from '../../core/export/AppendAstroLegendPdfEngine';
import { annotateAstrologyInPdfBytes, type AnnotateAstrologyPdfResult } from '../../core/export/AnnotateAstrologyPdfEngine';
import { savePdfBytes } from '../../core/export/PdfExportEngine';
import type { PlannerConfig } from '../../types/planner';
import { preparePdfFileTarget, type PdfExportTarget } from './exportPlannerPdf';

function stripPdfExtension(filename: string) {
  return filename.toLowerCase().endsWith('.pdf')
    ? filename.slice(0, -4)
    : filename;
}

export function buildAstrologyPdfFilename(sourceFilename: string) {
  const baseName = stripPdfExtension(sourceFilename.trim() || 'document');
  return `${baseName}-with-astrology.pdf`;
}

export async function prepareAstrologyPdfExportTarget(sourceFilename: string) {
  return preparePdfFileTarget(buildAstrologyPdfFilename(sourceFilename));
}

function createAstrologyOverlayConfig(config: PlannerConfig): PlannerConfig {
  return {
    ...config,
    astrology: {
      ...config.astrology,
      includeLegend: false,
    },
  };
}

export async function buildAstrologyPdfPreview(
  config: PlannerConfig,
  sourcePdfBytes: ArrayBuffer | Uint8Array,
) {
  const overlayConfig = createAstrologyOverlayConfig(config);
  const astrologyResult = await annotateAstrologyInPdfBytes(overlayConfig, sourcePdfBytes);

  if (!config.astrology.includeLegend) {
    return astrologyResult;
  }

  const legendResult = await appendAstroLegendToPdfBytes(config, astrologyResult.bytes);

  return {
    ...astrologyResult,
    bytes: legendResult.bytes,
    totalPageCount: legendResult.totalPageCount,
  };
}

export async function annotateAstrologyPdf(
  config: PlannerConfig,
  sourcePdfBytes: ArrayBuffer | Uint8Array,
  target: PdfExportTarget,
): Promise<AnnotateAstrologyPdfResult> {
  const result = await buildAstrologyPdfPreview(config, sourcePdfBytes);
  await savePdfBytes(target, result.bytes);

  return {
    byteLength: result.bytes.byteLength,
    annotatedPageCount: result.annotatedPageCount,
    markerCount: result.markerCount,
    iconCount: result.iconCount,
    totalPageCount: result.totalPageCount,
  };
}
