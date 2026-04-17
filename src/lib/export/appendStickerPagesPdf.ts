import {
  AppendStickerPdfEngine,
  appendStickerPagesToPdfBytes,
  type AppendStickerPdfResult,
} from '../../core/export/AppendStickerPdfEngine';
import { buildStickerRenderModel } from '../../core/render-model';
import type { PlannerConfig } from '../../types/planner';
import { preparePdfFileTarget, type PdfExportTarget } from './exportPlannerPdf';

function stripPdfExtension(filename: string) {
  return filename.toLowerCase().endsWith('.pdf')
    ? filename.slice(0, -4)
    : filename;
}

export function buildStickerAppendFilename(sourceFilename: string) {
  const baseName = stripPdfExtension(sourceFilename.trim() || 'document');
  return `${baseName}-with-stickers.pdf`;
}

function assertStickerAppendReady(config: PlannerConfig) {
  const stickerPageCount = buildStickerRenderModel(config).pages.length;

  if (!config.modules.stickers.enabled) {
    throw new Error('Модуль стикеров сейчас выключен. Сначала включите его в конструкторе.');
  }

  if (stickerPageCount === 0) {
    throw new Error('Текущая конфигурация не создает sticker pages. Добавьте PNG или готовые листы и повторите экспорт.');
  }
}

export async function prepareStickerAppendExportTarget(sourceFilename: string) {
  return preparePdfFileTarget(buildStickerAppendFilename(sourceFilename));
}

export async function buildStickerAppendPreviewPdf(
  config: PlannerConfig,
  sourcePdfBytes: ArrayBuffer | Uint8Array,
) {
  assertStickerAppendReady(config);
  return appendStickerPagesToPdfBytes(config, sourcePdfBytes);
}

export async function appendStickerPagesPdf(
  config: PlannerConfig,
  sourcePdfBytes: ArrayBuffer | Uint8Array,
  target: PdfExportTarget,
): Promise<AppendStickerPdfResult> {
  assertStickerAppendReady(config);
  return AppendStickerPdfEngine(config, sourcePdfBytes, target);
}
