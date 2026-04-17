import { PDFDocument } from 'pdf-lib';
import { buildPlannerRenderModel, type PlannerRenderModel } from '../render-model';
import type { PlannerConfig } from '../types/planner';
import { buildPdfBytesFromRenderModel } from './PdfExportEngine';

export interface AppendAstroLegendPdfResult {
  bytes: Uint8Array;
  appendedPageCount: number;
  totalPageCount: number;
}

function normalizeSourcePdfError(error: unknown) {
  if (error instanceof Error && /encrypted/i.test(error.message)) {
    return new Error('Исходный PDF защищен паролем или шифрованием. Такой файл пока нельзя дополнить астро-легендой.');
  }

  if (error instanceof Error) {
    return new Error(`Не удалось открыть исходный PDF: ${error.message}`);
  }

  return new Error('Не удалось открыть исходный PDF.');
}

function buildAstroLegendRenderModel(config: PlannerConfig): PlannerRenderModel {
  const renderModel = buildPlannerRenderModel(config);
  const legendPage = renderModel.pages.find((page) => page.page.kind === 'astro-legend');

  if (!legendPage) {
    throw new Error('Страница астро-легенды не найдена в текущей конфигурации.');
  }

  return {
    ...renderModel,
    plan: {
      ...renderModel.plan,
      pages: [legendPage.page],
    },
    pages: [legendPage],
    links: [],
  };
}

export async function appendAstroLegendToPdfBytes(
  config: PlannerConfig,
  sourcePdfBytes: ArrayBuffer | Uint8Array,
): Promise<AppendAstroLegendPdfResult> {
  if (!config.astrology.includeLegend) {
    const sourceBytes = sourcePdfBytes instanceof Uint8Array ? sourcePdfBytes : new Uint8Array(sourcePdfBytes);
    let sourcePdfDoc: PDFDocument;

    try {
      sourcePdfDoc = await PDFDocument.load(sourceBytes);
    } catch (error) {
      throw normalizeSourcePdfError(error);
    }

    return {
      bytes: sourceBytes,
      appendedPageCount: 0,
      totalPageCount: sourcePdfDoc.getPageCount(),
    };
  }

  let sourcePdfDoc: PDFDocument;

  try {
    sourcePdfDoc = await PDFDocument.load(sourcePdfBytes);
  } catch (error) {
    throw normalizeSourcePdfError(error);
  }

  const legendRenderModel = buildAstroLegendRenderModel(config);
  const legendPdfBytes = await buildPdfBytesFromRenderModel(legendRenderModel);
  const legendPdfDoc = await PDFDocument.load(legendPdfBytes);
  const sourcePageCount = sourcePdfDoc.getPageCount();
  const copiedLegendPages = await sourcePdfDoc.copyPages(legendPdfDoc, legendPdfDoc.getPageIndices());

  copiedLegendPages.forEach((page) => {
    sourcePdfDoc.addPage(page);
  });

  const mergedBytes = await sourcePdfDoc.save({ useObjectStreams: false });

  return {
    bytes: mergedBytes,
    appendedPageCount: copiedLegendPages.length,
    totalPageCount: sourcePageCount + copiedLegendPages.length,
  };
}
