import { PDFDocument } from 'pdf-lib';
import { buildStickerRenderModel } from '../render-model';
import type { PlannerConfig } from '../types/planner';
import { buildPdfBytesFromRenderModel, savePdfBytes, type PdfExportTarget } from './PdfExportEngine';

export interface AppendStickerPdfResult {
  byteLength: number;
  appendedPageCount: number;
  totalPageCount: number;
}

function normalizeSourcePdfError(error: unknown) {
  if (error instanceof Error && /encrypted/i.test(error.message)) {
    return new Error('Исходный PDF защищен паролем или шифрованием. Такой файл пока нельзя дополнить sticker pages.');
  }

  if (error instanceof Error) {
    return new Error(`Не удалось открыть исходный PDF: ${error.message}`);
  }

  return new Error('Не удалось открыть исходный PDF.');
}

export async function appendStickerPagesToPdfBytes(
  config: PlannerConfig,
  sourcePdfBytes: ArrayBuffer | Uint8Array,
) {
  const stickerRenderModel = buildStickerRenderModel(config);

  if (stickerRenderModel.pages.length === 0) {
    throw new Error('Для добавления не найдено ни одной страницы со стикерами. Проверьте настройки sticker pages.');
  }

  let sourcePdfDoc: PDFDocument;

  try {
    sourcePdfDoc = await PDFDocument.load(sourcePdfBytes);
  } catch (error) {
    throw normalizeSourcePdfError(error);
  }

  const stickerPdfBytes = await buildPdfBytesFromRenderModel(stickerRenderModel);
  const stickerPdfDoc = await PDFDocument.load(stickerPdfBytes);
  const sourcePageCount = sourcePdfDoc.getPageCount();
  const copiedStickerPages = await sourcePdfDoc.copyPages(stickerPdfDoc, stickerPdfDoc.getPageIndices());

  copiedStickerPages.forEach((page) => {
    sourcePdfDoc.addPage(page);
  });

  const mergedBytes = await sourcePdfDoc.save({ useObjectStreams: false });

  return {
    bytes: mergedBytes,
    appendedPageCount: copiedStickerPages.length,
    totalPageCount: sourcePageCount + copiedStickerPages.length,
  };
}

export async function AppendStickerPdfEngine(
  config: PlannerConfig,
  sourcePdfBytes: ArrayBuffer | Uint8Array,
  target: PdfExportTarget,
): Promise<AppendStickerPdfResult> {
  const result = await appendStickerPagesToPdfBytes(config, sourcePdfBytes);
  await savePdfBytes(target, result.bytes);

  return {
    byteLength: result.bytes.byteLength,
    appendedPageCount: result.appendedPageCount,
    totalPageCount: result.totalPageCount,
  };
}
