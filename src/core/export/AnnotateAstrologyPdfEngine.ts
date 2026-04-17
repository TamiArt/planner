import { PDFDocument, rgb, type PDFImage, type PDFPage } from 'pdf-lib';
import { buildPlannerRenderModel } from '../render-model';
import type { PlannerRenderModel, PlannerRenderNode } from '../render-model';
import type { PlannerConfig } from '../types/planner';
import { hasAstrologyDataForConfig } from '../../lib/astrology/jyotishDaily';
import { loadPdfFonts, type PdfFontSet } from './pdfFonts';
import { savePdfBytes, type PdfExportTarget } from './PdfExportEngine';

export interface AnnotateAstrologyPdfResult {
  byteLength: number;
  annotatedPageCount: number;
  markerCount: number;
  iconCount: number;
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

function isAstrologyOverlayNode(renderPage: PlannerRenderModel['pages'][number], node: PlannerRenderNode) {
  const id = node.id.toLowerCase();
  return id.includes('-astro-') || id.includes('astro-line') || (renderPage.page.kind === 'astro-legend' && id.includes('legend'));
}

function resolveScaledImageDrawBox(
  image: PDFImage,
  node: Extract<PlannerRenderNode, { kind: 'image' }>,
  scaleX: number,
  scaleY: number,
) {
  const frame = {
    x: node.x * scaleX,
    y: node.y * scaleY,
    width: node.width * scaleX,
    height: node.height * scaleY,
  };

  if (!node.fit) {
    return frame;
  }

  const imageRatio = image.width / image.height;
  const frameRatio = frame.width / frame.height;
  const useWidthAsBase = node.fit === 'cover' ? imageRatio < frameRatio : imageRatio > frameRatio;
  const width = useWidthAsBase ? frame.width : frame.height * imageRatio;
  const height = useWidthAsBase ? frame.width / imageRatio : frame.height;

  return {
    x: frame.x + (frame.width - width) / 2,
    y: frame.y + (frame.height - height) / 2,
    width,
    height,
  };
}

function rasterizeSvgImage(src: string, width: number, height: number) {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);
      const context = canvas.getContext('2d');

      if (!context) {
        reject(new Error('Не удалось подготовить астрологическую иконку для PDF.'));
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Не удалось преобразовать SVG-иконку астрологии в PNG.'));
          return;
        }

        blob.arrayBuffer().then(resolve).catch(reject);
      }, 'image/png');
    };

    image.onerror = () => reject(new Error('Не удалось загрузить астрологическую SVG-иконку для PDF.'));
    image.src = src;
  });
}

async function imageBytesFromNode(
  node: Extract<PlannerRenderNode, { kind: 'image' }>,
  scaleX: number,
  scaleY: number,
) {
  const rasterWidth = Math.ceil(node.width * scaleX * 2);
  const rasterHeight = Math.ceil(node.height * scaleY * 2);

  if (node.src.startsWith('data:image/svg+xml')) {
    return rasterizeSvgImage(node.src, rasterWidth, rasterHeight);
  }

  if (/^https?:\/\//i.test(node.src)) {
    const response = await fetch(node.src);
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('image/svg+xml') || node.src.endsWith('.svg')) {
      const svg = await response.text();
      const dataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      return rasterizeSvgImage(dataUri, rasterWidth, rasterHeight);
    }

    return await response.arrayBuffer();
  }

  if (!node.src.startsWith('data:image/')) {
    return undefined;
  }

  const response = await fetch(node.src);
  return await response.arrayBuffer();
}

async function embedScaledImage(
  pdfDoc: PDFDocument,
  cache: Map<string, PDFImage>,
  node: Extract<PlannerRenderNode, { kind: 'image' }>,
  scaleX: number,
  scaleY: number,
) {
  const cacheKey = `${node.storageId ?? node.src}:${scaleX.toFixed(4)}:${scaleY.toFixed(4)}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const bytes = await imageBytesFromNode(node, scaleX, scaleY);
  if (!bytes) {
    return undefined;
  }

  const image = node.src.startsWith('data:image/png') || node.src.startsWith('data:image/svg+xml') || node.src.endsWith('.svg')
    ? await pdfDoc.embedPng(bytes)
    : await pdfDoc.embedJpg(bytes);

  cache.set(cacheKey, image);
  return image;
}

async function drawScaledOverlayNode(
  pdfDoc: PDFDocument,
  pdfPage: PDFPage,
  node: PlannerRenderNode,
  renderModel: PlannerRenderModel,
  imageCache: Map<string, PDFImage>,
  fonts: PdfFontSet,
) {
  const pageSize = pdfPage.getSize();
  const scaleX = pageSize.width / renderModel.width;
  const scaleY = pageSize.height / renderModel.height;

  if (node.kind === 'image') {
    const image = await embedScaledImage(pdfDoc, imageCache, node, scaleX, scaleY);
    if (!image) {
      return;
    }

    const drawBox = resolveScaledImageDrawBox(image, node, scaleX, scaleY);
    pdfPage.drawImage(image, {
      x: drawBox.x,
      y: pageSize.height - drawBox.y - drawBox.height,
      width: drawBox.width,
      height: drawBox.height,
      opacity: node.opacity ?? 1,
    });
    return;
  }

  if (node.kind === 'rect') {
    const fill = parseCssColor(node.fill, '#000000');
    const stroke = parseCssColor(node.stroke, '#000000');
    const strokeInset = node.stroke && (node.strokeWidth ?? 0) > 0 ? (node.strokeWidth ?? 0) / 2 : 0;
    const x = (node.x + strokeInset) * scaleX;
    const y = (node.y + strokeInset) * scaleY;
    const width = Math.max(0, (node.width - strokeInset * 2) * scaleX);
    const height = Math.max(0, (node.height - strokeInset * 2) * scaleY);

    pdfPage.drawRectangle({
      x,
      y: pageSize.height - y - height,
      width,
      height,
      color: node.fill ? fill.color : undefined,
      opacity: (node.opacity ?? 1) * fill.alpha,
      borderColor: node.stroke ? stroke.color : undefined,
      borderWidth: node.strokeWidth ? node.strokeWidth * Math.min(scaleX, scaleY) : undefined,
      borderDashArray: node.dashArray?.map((value) => value * Math.min(scaleX, scaleY)),
    });
    return;
  }

  if (node.kind === 'text') {
    const fontScale = Math.min(scaleX, scaleY);
    const font = fonts[node.font];
    const color = parseCssColor(node.color, '#000000');
    const size = node.fontSize * fontScale;
    const maxWidth = (node.maxWidth ?? 0) * scaleX;
    const lineHeight = node.lineHeight * scaleY;

    node.lines.forEach((line, index) => {
      const textWidth = font.widthOfTextAtSize(line, size);
      const top = node.y * scaleY + index * lineHeight;
      const x = node.align === 'center'
        ? node.x * scaleX - textWidth / 2
        : node.align === 'right'
          ? node.x * scaleX + maxWidth - textWidth
          : node.x * scaleX;

      pdfPage.drawText(line, {
        x,
        y: pageSize.height - top - size,
        size,
        font,
        color: color.color,
        opacity: (node.opacity ?? 1) * color.alpha,
      });
    });
  }
}

function assertAstrologyAnnotationReady(config: PlannerConfig) {
  if (config.mode !== 'dated' || !config.year) {
    throw new Error('Для добавления астрологии нужен датированный режим и выбранный год.');
  }

  if (!hasAstrologyDataForConfig(config)) {
    throw new Error('Сначала рассчитайте астрологические данные для выбранного года и города.');
  }
}

export async function annotateAstrologyInPdfBytes(
  config: PlannerConfig,
  sourcePdfBytes: ArrayBuffer | Uint8Array,
) {
  assertAstrologyAnnotationReady(config);

  let sourcePdfDoc: PDFDocument;

  try {
    sourcePdfDoc = await PDFDocument.load(sourcePdfBytes);
  } catch (error) {
    throw normalizeSourcePdfError(error);
  }

  const renderModel = buildPlannerRenderModel({
    ...config,
    __astrologyPdfAnnotation: true,
  } as PlannerConfig);
  const fonts = await loadPdfFonts(sourcePdfDoc);
  const imageCache = new Map<string, PDFImage>();
  const sourcePages = sourcePdfDoc.getPages();
  let markerCount = 0;
  let iconCount = 0;
  const annotatedPageIndexes = new Set<number>();

  for (const renderPage of renderModel.pages) {
    const sourcePage = sourcePages[renderPage.page.pageNumber - 1];
    if (!sourcePage) {
      continue;
    }

    const overlayNodes = renderPage.nodes.filter((node) => isAstrologyOverlayNode(renderPage, node));
    if (overlayNodes.length === 0) {
      continue;
    }

    for (const node of overlayNodes) {
      await drawScaledOverlayNode(sourcePdfDoc, sourcePage, node, renderModel, imageCache, fonts);
      if (node.kind === 'text') {
        markerCount += node.lines.length;
      } else if (node.kind === 'image') {
        iconCount += 1;
      } else {
        markerCount += 1;
      }
    }

    annotatedPageIndexes.add(renderPage.page.pageNumber - 1);
  }

  if (markerCount + iconCount === 0) {
    throw new Error('Не найдено ни одной астрологической метки для наложения. Проверьте год, расчёт астрологии и структуру текущего планера.');
  }

  const bytes = await sourcePdfDoc.save({ useObjectStreams: false });

  return {
    bytes,
    annotatedPageCount: annotatedPageIndexes.size,
    markerCount,
    iconCount,
    totalPageCount: sourcePages.length,
  };
}

export async function AnnotateAstrologyPdfEngine(
  config: PlannerConfig,
  sourcePdfBytes: ArrayBuffer | Uint8Array,
  target: PdfExportTarget,
): Promise<AnnotateAstrologyPdfResult> {
  const result = await annotateAstrologyInPdfBytes(config, sourcePdfBytes);
  await savePdfBytes(target, result.bytes);

  return {
    byteLength: result.bytes.byteLength,
    annotatedPageCount: result.annotatedPageCount,
    markerCount: result.markerCount,
    iconCount: result.iconCount,
    totalPageCount: result.totalPageCount,
  };
}
