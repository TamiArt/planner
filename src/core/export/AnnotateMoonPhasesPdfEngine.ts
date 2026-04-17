import { PDFDocument, rgb, type PDFPage } from 'pdf-lib';
import { buildPlannerRenderModel } from '../render-model';
import type { PlannerRenderModel, PlannerRenderNode } from '../render-model';
import type { PlannerConfig } from '../types/planner';
import { loadPdfFonts, type PdfFontSet } from './pdfFonts';
import { savePdfBytes, type PdfExportTarget } from './PdfExportEngine';

export interface AnnotateMoonPhasesPdfResult {
  byteLength: number;
  annotatedPageCount: number;
  markerCount: number;
  totalPageCount: number;
}

interface ParsedColor {
  color: ReturnType<typeof rgb>;
  alpha: number;
}

function parseCssColor(input: string | undefined, fallback = '#000000'): ParsedColor {
  const value = (input ?? fallback).trim();

  if (/^rgba?\(/i.test(value)) {
    const parts = value.replace(/rgba?\(|\)/gi, '').split(',').map((part) => part.trim());
    const [red, green, blue, alpha] = parts.map(Number);
    return {
      color: rgb((red || 0) / 255, (green || 0) / 255, (blue || 0) / 255),
      alpha: Number.isFinite(alpha) ? alpha : 1,
    };
  }

  const normalized = value.startsWith('#') ? value.slice(1) : fallback.replace('#', '');
  const full = normalized.length === 3
    ? normalized.split('').map((char) => `${char}${char}`).join('')
    : normalized.padEnd(6, '0');

  return {
    color: rgb(
      Number.parseInt(full.slice(0, 2), 16) / 255,
      Number.parseInt(full.slice(2, 4), 16) / 255,
      Number.parseInt(full.slice(4, 6), 16) / 255,
    ),
    alpha: 1,
  };
}

function normalizeSourcePdfError(error: unknown) {
  if (error instanceof Error && /encrypted/i.test(error.message)) {
    return new Error('Исходный PDF защищен паролем или шифрованием. Такой файл пока нельзя редактировать.');
  }

  if (error instanceof Error) {
    return new Error(`Не удалось открыть исходный PDF: ${error.message}`);
  }

  return new Error('Не удалось открыть исходный PDF.');
}

function isMoonPhaseTextNode(node: PlannerRenderNode): node is Extract<PlannerRenderNode, { kind: 'text' }> {
  return node.kind === 'text' && node.id.toLowerCase().includes('moon');
}

function inferMoonPhaseFallbackLabel(text: string, short = false) {
  if (text.includes('🌑')) {
    return short ? 'Новол.' : 'Новолуние';
  }

  if (text.includes('🌕') || text.includes('⚡')) {
    return short ? 'Полн.' : 'Полнолуние';
  }

  if (text.includes('↓')) {
    return short ? 'Убыв.' : 'Убывающая луна';
  }

  if (text.includes('↑')) {
    return short ? 'Раст.' : 'Растущая луна';
  }

  return short ? 'Луна' : 'Фаза Луны';
}

function sanitizeMoonPhaseText(line: string, nodeId: string) {
  const cleaned = line
    .replace(/[\p{Extended_Pictographic}]/gu, ' ')
    .replace(/[↑↓⚡]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (nodeId.includes('moon-phase')) {
    const prefix = 'Фаза Луны:';
    const suffix = cleaned.startsWith(prefix)
      ? cleaned.slice(prefix.length).trim()
      : cleaned;

    return suffix
      ? `${prefix} ${suffix}`
      : `${prefix} ${inferMoonPhaseFallbackLabel(line)}`;
  }

  return cleaned || inferMoonPhaseFallbackLabel(line, true);
}

function drawScaledTextNode(
  pdfPage: PDFPage,
  node: Extract<PlannerRenderNode, { kind: 'text' }>,
  renderModel: PlannerRenderModel,
  fonts: PdfFontSet,
) {
  const pageSize = pdfPage.getSize();
  const scaleX = pageSize.width / renderModel.width;
  const scaleY = pageSize.height / renderModel.height;
  const fontScale = Math.min(scaleX, scaleY);
  const font = fonts[node.font];
  const color = parseCssColor(node.color, '#000000');
  const size = node.fontSize * fontScale;
  const maxWidth = (node.maxWidth ?? 0) * scaleX;
  const lineHeight = node.lineHeight * scaleY;

  node.lines.forEach((line, index) => {
    const safeLine = sanitizeMoonPhaseText(line, node.id.toLowerCase());
    const textWidth = font.widthOfTextAtSize(safeLine, size);
    const top = node.y * scaleY + index * lineHeight;
    const x = node.align === 'center'
      ? node.x * scaleX - textWidth / 2
      : node.align === 'right'
        ? node.x * scaleX + maxWidth - textWidth
        : node.x * scaleX;

    pdfPage.drawText(safeLine, {
      x,
      y: pageSize.height - top - size,
      size,
      font,
      color: color.color,
      opacity: (node.opacity ?? 1) * color.alpha,
    });
  });
}

function assertMoonPhaseAnnotationReady(config: PlannerConfig) {
  if (config.mode !== 'dated' || !config.year) {
    throw new Error('Для добавления фаз Луны нужен датированный режим и выбранный год.');
  }

  if (!config.moonPhases.enabled || config.moonPhases.events.length === 0) {
    throw new Error('Сначала загрузите данные фаз Луны из USNO.');
  }
}

export async function annotateMoonPhasesInPdfBytes(
  config: PlannerConfig,
  sourcePdfBytes: ArrayBuffer | Uint8Array,
) {
  assertMoonPhaseAnnotationReady(config);

  let sourcePdfDoc: PDFDocument;

  try {
    sourcePdfDoc = await PDFDocument.load(sourcePdfBytes);
  } catch (error) {
    throw normalizeSourcePdfError(error);
  }

  const renderModel = buildPlannerRenderModel(config);
  const fonts = await loadPdfFonts(sourcePdfDoc);
  const sourcePages = sourcePdfDoc.getPages();
  let markerCount = 0;
  const annotatedPageIndexes = new Set<number>();

  renderModel.pages.forEach((renderPage) => {
    const sourcePage = sourcePages[renderPage.page.pageNumber - 1];
    if (!sourcePage) {
      return;
    }

    const moonNodes = renderPage.nodes.filter(isMoonPhaseTextNode);
    if (moonNodes.length === 0) {
      return;
    }

    moonNodes.forEach((node) => {
      drawScaledTextNode(sourcePage, node, renderModel, fonts);
      markerCount += node.lines.length;
    });
    annotatedPageIndexes.add(renderPage.page.pageNumber - 1);
  });

  if (markerCount === 0) {
    throw new Error('Не найдено ни одной лунной метки для наложения. Проверьте год, данные USNO и структуру текущего планера.');
  }

  const bytes = await sourcePdfDoc.save({ useObjectStreams: false });

  return {
    bytes,
    annotatedPageCount: annotatedPageIndexes.size,
    markerCount,
    totalPageCount: sourcePages.length,
  };
}

export async function AnnotateMoonPhasesPdfEngine(
  config: PlannerConfig,
  sourcePdfBytes: ArrayBuffer | Uint8Array,
  target: PdfExportTarget,
): Promise<AnnotateMoonPhasesPdfResult> {
  const result = await annotateMoonPhasesInPdfBytes(config, sourcePdfBytes);
  await savePdfBytes(target, result.bytes);

  return {
    byteLength: result.bytes.byteLength,
    annotatedPageCount: result.annotatedPageCount,
    markerCount: result.markerCount,
    totalPageCount: result.totalPageCount,
  };
}
