import { appendAstroLegendToPdfBytes } from '../../core/export/AppendAstroLegendPdfEngine';
import { savePdfBytes } from '../../core/export/PdfExportEngine';
import { annotateAstrologyInPdfBytes, type AnnotateAstrologyPdfResult } from '../../core/export/AnnotateAstrologyPdfEngine';
import type { PlannerConfig } from '../../types/planner';
import {
  buildStickerAppendPreviewPdf,
} from './appendStickerPagesPdf';
import { preparePdfFileTarget, type PdfExportTarget } from './exportPlannerPdf';

export interface AnnotateAstrologyAndStickersPdfResult extends AnnotateAstrologyPdfResult {
  appendedPageCount: number;
}

function stripPdfExtension(filename: string) {
  return filename.toLowerCase().endsWith('.pdf')
    ? filename.slice(0, -4)
    : filename;
}

export function buildAstrologyAndStickersPdfFilename(sourceFilename: string) {
  const baseName = stripPdfExtension(sourceFilename.trim() || 'document');
  return `${baseName}-with-astrology-and-stickers.pdf`;
}

export async function prepareAstrologyAndStickersPdfExportTarget(sourceFilename: string) {
  return preparePdfFileTarget(buildAstrologyAndStickersPdfFilename(sourceFilename));
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

export async function buildAstrologyAndStickersPdfPreview(
  config: PlannerConfig,
  sourcePdfBytes: ArrayBuffer | Uint8Array,
) {
  const overlayConfig = createAstrologyOverlayConfig(config);
  const astrologyResult = await annotateAstrologyInPdfBytes(overlayConfig, sourcePdfBytes);
  const stickerResult = await buildStickerAppendPreviewPdf(config, astrologyResult.bytes);
  const legendResult = config.astrology.includeLegend
    ? await appendAstroLegendToPdfBytes(config, stickerResult.bytes)
    : null;

  return {
    bytes: legendResult?.bytes ?? stickerResult.bytes,
    annotatedPageCount: astrologyResult.annotatedPageCount,
    markerCount: astrologyResult.markerCount,
    iconCount: astrologyResult.iconCount,
    appendedPageCount: stickerResult.appendedPageCount,
    totalPageCount: legendResult?.totalPageCount ?? stickerResult.totalPageCount,
  };
}

export async function annotateAstrologyAndStickersPdf(
  config: PlannerConfig,
  sourcePdfBytes: ArrayBuffer | Uint8Array,
  target: PdfExportTarget,
): Promise<AnnotateAstrologyAndStickersPdfResult> {
  const result = await buildAstrologyAndStickersPdfPreview(config, sourcePdfBytes);
  await savePdfBytes(target, result.bytes);

  return {
    byteLength: result.bytes.byteLength,
    annotatedPageCount: result.annotatedPageCount,
    markerCount: result.markerCount,
    iconCount: result.iconCount,
    appendedPageCount: result.appendedPageCount,
    totalPageCount: result.totalPageCount,
  };
}
