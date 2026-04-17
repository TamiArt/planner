import { PDFArray, PDFDocument, PDFName, rgb, type PDFImage, type PDFPage } from 'pdf-lib';
import { getStickerAssetBlob } from '../../lib/stickers/stickerAssetStorage';
import { buildPlannerRenderModel } from '../render-model';
import type { PlannerRenderModel, PlannerRenderNode } from '../render-model';
import type { PlannerConfig } from '../types/planner';
import type { PlannerLinkDefinition } from '../types/pdf';
import { loadPdfFonts, type PdfFontSet } from './pdfFonts';

export interface SaveFilePickerHandle {
  createWritable: () => Promise<{
    write: (data: unknown) => Promise<void>;
    truncate?: (size: number) => Promise<void>;
    close: () => Promise<void>;
  }>;
  getFile?: () => Promise<Blob>;
}

export interface PdfExportTarget {
  filename: string;
  fileHandle?: SaveFilePickerHandle;
}

const DOWNLOAD_OBJECT_URL_TTL_MS = 5 * 60 * 1000;
const activeDownloadPayloads = new Map<string, Blob>();
let downloadCleanupRegistered = false;

type EmbeddedImageFormat = 'png' | 'jpg';

interface EmbeddedImagePayload {
  bytes: ArrayBuffer;
  format: EmbeddedImageFormat;
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

function topToPdfY(y: number, height = 0) {
  return 1536 - y - height;
}

function getImageMimeTypeFromDataUri(src: string) {
  const match = src.match(/^data:([^;,]+)[;,]/i);
  return match?.[1]?.toLowerCase();
}

function getEmbeddedFormatFromMimeType(mimeType: string | undefined): EmbeddedImageFormat | undefined {
  if (!mimeType) {
    return undefined;
  }

  if (mimeType.includes('png')) {
    return 'png';
  }

  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
    return 'jpg';
  }

  return undefined;
}

function getEmbeddedFormatFromUrl(src: string): EmbeddedImageFormat | undefined {
  const normalized = src.toLowerCase().split('?')[0];

  if (normalized.endsWith('.png')) {
    return 'png';
  }

  if (normalized.endsWith('.jpg') || normalized.endsWith('.jpeg')) {
    return 'jpg';
  }

  return undefined;
}

function cleanupDownloadUrl(url: string) {
  activeDownloadPayloads.delete(url);
  URL.revokeObjectURL(url);
}

function ensureDownloadCleanupHook() {
  if (downloadCleanupRegistered || typeof window === 'undefined') {
    return;
  }

  const releaseAll = () => {
    Array.from(activeDownloadPayloads.keys()).forEach((url) => cleanupDownloadUrl(url));
  };

  window.addEventListener('pagehide', releaseAll);
  window.addEventListener('beforeunload', releaseAll);
  downloadCleanupRegistered = true;
}

function createPersistentDownloadUrl(blob: Blob) {
  const url = URL.createObjectURL(blob);
  activeDownloadPayloads.set(url, blob);
  ensureDownloadCleanupHook();
  return url;
}

function triggerBrowserDownload(link: HTMLAnchorElement) {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      link.click();
      resolve();
    });
  });
}

function resolveImageDrawBox(
  image: PDFImage,
  node: Extract<PlannerRenderNode, { kind: 'image' }>,
) {
  if (!node.fit) {
    return {
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
    };
  }

  const imageRatio = image.width / image.height;
  const frameRatio = node.width / node.height;
  const useWidthAsBase = node.fit === 'cover' ? imageRatio < frameRatio : imageRatio > frameRatio;

  const width = useWidthAsBase ? node.width : node.height * imageRatio;
  const height = useWidthAsBase ? node.width / imageRatio : node.height;

  return {
    x: node.x + (node.width - width) / 2,
    y: node.y + (node.height - height) / 2,
    width,
    height,
  };
}

function resolveRectDrawBox(node: Extract<PlannerRenderNode, { kind: 'rect' }>) {
  const strokeInset = node.stroke && (node.strokeWidth ?? 0) > 0
    ? (node.strokeWidth ?? 0) / 2
    : 0;

  return {
    x: node.x + strokeInset,
    y: node.y + strokeInset,
    width: Math.max(0, node.width - strokeInset * 2),
    height: Math.max(0, node.height - strokeInset * 2),
  };
}

async function imageBytesFromNode(node: Extract<PlannerRenderNode, { kind: 'image' }>): Promise<EmbeddedImagePayload | undefined> {
  const rasterWidth = Math.ceil(node.width * 2);
  const rasterHeight = Math.ceil(node.height * 2);

  if (node.storageId) {
    const blob = await getStickerAssetBlob(node.storageId);
    if (blob) {
      const blobFormat = getEmbeddedFormatFromMimeType(blob.type.toLowerCase());
      if (blobFormat) {
        return {
          bytes: await blob.arrayBuffer(),
          format: blobFormat,
        };
      }

      const blobUrl = URL.createObjectURL(blob);
      try {
        return {
          bytes: await rasterizeImageToPng(blobUrl, rasterWidth, rasterHeight, 'изображение'),
          format: 'png',
        };
      } finally {
        URL.revokeObjectURL(blobUrl);
      }
    }
  }

  const dataUriMimeType = node.src.startsWith('data:image/')
    ? getImageMimeTypeFromDataUri(node.src)
    : undefined;
  const dataUriFormat = getEmbeddedFormatFromMimeType(dataUriMimeType);

  if (dataUriFormat) {
    const response = await fetch(node.src);
    return {
      bytes: await response.arrayBuffer(),
      format: dataUriFormat,
    };
  }

  if (dataUriMimeType?.includes('svg') || dataUriMimeType?.includes('webp')) {
    return {
      bytes: await rasterizeImageToPng(node.src, rasterWidth, rasterHeight, 'изображение'),
      format: 'png',
    };
  }

  if (/^https?:\/\//i.test(node.src)) {
    const response = await fetch(node.src);
    if (!response.ok) {
      throw new Error(`Не удалось загрузить изображение для PDF: ${response.status} ${response.statusText}.`);
    }

    const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
    const responseFormat = getEmbeddedFormatFromMimeType(contentType) ?? getEmbeddedFormatFromUrl(node.src);

    if (responseFormat) {
      return {
        bytes: await response.arrayBuffer(),
        format: responseFormat,
      };
    }

    if (contentType.includes('image/svg+xml')) {
      const svg = await response.text();
      const dataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      return {
        bytes: await rasterizeImageToPng(dataUri, rasterWidth, rasterHeight, 'изображение'),
        format: 'png',
      };
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    try {
      return {
        bytes: await rasterizeImageToPng(blobUrl, rasterWidth, rasterHeight, 'изображение'),
        format: 'png',
      };
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  }

  if (!node.src.startsWith('data:image/')) {
    return undefined;
  }

  return {
    bytes: await rasterizeImageToPng(node.src, rasterWidth, rasterHeight, 'изображение'),
    format: 'png',
  };
}

function rasterizeImageToPng(src: string, width: number, height: number, errorLabel: string) {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);
      const context = canvas.getContext('2d');

      if (!context) {
        reject(new Error(`Не удалось подготовить ${errorLabel} для PDF.`));
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error(`Не удалось преобразовать ${errorLabel} в PNG.`));
          return;
        }

        blob.arrayBuffer().then(resolve).catch(reject);
      }, 'image/png');
    };

    image.onerror = () => reject(new Error(`Не удалось загрузить ${errorLabel} для PDF.`));
    image.src = src;
  });
}

async function embedImage(pdfDoc: PDFDocument, cache: Map<string, PDFImage>, node: Extract<PlannerRenderNode, { kind: 'image' }>) {
  const cacheKey = node.storageId ?? node.src;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const imagePayload = await imageBytesFromNode(node);
  if (!imagePayload) {
    return undefined;
  }

  const image = imagePayload.format === 'png'
    ? await pdfDoc.embedPng(imagePayload.bytes)
    : await pdfDoc.embedJpg(imagePayload.bytes);

  cache.set(cacheKey, image);
  return image;
}

function addLinkAnnotation(pdfDoc: PDFDocument, sourcePage: PDFPage, targetPage: PDFPage, link: PlannerLinkDefinition) {
  const rect = pdfDoc.context.obj([
    link.rect.x,
    link.rect.y,
    link.rect.x + link.rect.width,
    link.rect.y + link.rect.height,
  ]);
  const action = pdfDoc.context.obj({
    S: PDFName.of('GoTo'),
    D: pdfDoc.context.obj([targetPage.ref, PDFName.of('Fit')]),
  });
  const actionRef = pdfDoc.context.register(action);
  const annotation = pdfDoc.context.obj({
    Type: PDFName.of('Annot'),
    Subtype: PDFName.of('Link'),
    Rect: rect,
    Border: pdfDoc.context.obj([0, 0, 0]),
    H: PDFName.of('N'),
    A: actionRef,
  });

  const annotationRef = pdfDoc.context.register(annotation);
  const existing = sourcePage.node.get(PDFName.of('Annots'));

  if (existing instanceof PDFArray) {
    existing.push(annotationRef);
    return;
  }

  sourcePage.node.set(PDFName.of('Annots'), pdfDoc.context.obj([annotationRef]));
}

async function drawNode(
  pdfDoc: PDFDocument,
  pdfPage: PDFPage,
  node: PlannerRenderNode,
  imageCache: Map<string, PDFImage>,
  fonts: PdfFontSet,
) {
  if (node.kind === 'rect') {
    const fill = parseCssColor(node.fill, '#000000');
    const stroke = parseCssColor(node.stroke, '#000000');
    const drawBox = resolveRectDrawBox(node);

    pdfPage.drawRectangle({
      x: drawBox.x,
      y: topToPdfY(drawBox.y, drawBox.height),
      width: drawBox.width,
      height: drawBox.height,
      color: node.fill ? fill.color : undefined,
      opacity: (node.opacity ?? 1) * fill.alpha,
      borderColor: node.stroke ? stroke.color : undefined,
      borderWidth: node.strokeWidth,
      borderDashArray: node.dashArray,
    });
    return;
  }

  if (node.kind === 'line') {
    const stroke = parseCssColor(node.stroke, '#000000');
    pdfPage.drawLine({
      start: { x: node.x1, y: topToPdfY(node.y1) },
      end: { x: node.x2, y: topToPdfY(node.y2) },
      color: stroke.color,
      thickness: node.strokeWidth ?? 1,
      opacity: (node.opacity ?? 1) * stroke.alpha,
      dashArray: node.dashArray,
    });
    return;
  }

  if (node.kind === 'circle') {
    const fill = parseCssColor(node.fill, '#000000');
    const stroke = parseCssColor(node.stroke, '#000000');
    pdfPage.drawCircle({
      x: node.cx,
      y: topToPdfY(node.cy),
      size: node.r,
      color: node.fill ? fill.color : undefined,
      opacity: (node.opacity ?? 1) * fill.alpha,
      borderColor: node.stroke ? stroke.color : undefined,
      borderWidth: node.strokeWidth,
    });
    return;
  }

  if (node.kind === 'image') {
    const image = await embedImage(pdfDoc, imageCache, node);
    if (!image) {
      return;
    }

    const drawBox = resolveImageDrawBox(image, node);

    pdfPage.drawImage(image, {
      x: drawBox.x,
      y: topToPdfY(drawBox.y, drawBox.height),
      width: drawBox.width,
      height: drawBox.height,
      opacity: node.opacity ?? 1,
    });
    return;
  }

  const color = parseCssColor(node.color, '#000000');
  const font = fonts[node.font];
  node.lines.forEach((line, index) => {
    const textWidth = font.widthOfTextAtSize(line, node.fontSize);
    const x = node.align === 'center'
      ? node.x - textWidth / 2
      : node.align === 'right'
        ? node.x + (node.maxWidth ?? 0) - textWidth
        : node.x;

    pdfPage.drawText(line, {
      x,
      y: topToPdfY(node.y + index * node.lineHeight, node.fontSize),
      size: node.fontSize,
      font,
      color: color.color,
      opacity: (node.opacity ?? 1) * color.alpha,
    });
  });
}

export async function buildPdfBytesFromRenderModel(renderModel: PlannerRenderModel) {
  const pdfDoc = await PDFDocument.create();
  const imageCache = new Map<string, PDFImage>();
  const fonts = await loadPdfFonts(pdfDoc);

  const pageMap = new Map<string, PDFPage>();

  for (const renderPage of renderModel.pages) {
    const pdfPage = pdfDoc.addPage([renderModel.width, renderModel.height]);
    pageMap.set(renderPage.page.id, pdfPage);

    for (const node of renderPage.nodes) {
      await drawNode(pdfDoc, pdfPage, node, imageCache, fonts);
    }
  }

  renderModel.links.forEach((link) => {
    const sourcePage = pageMap.get(link.sourcePageId);
    const targetPage = pageMap.get(link.targetPageId);

    if (!sourcePage || !targetPage) {
      return;
    }

    addLinkAnnotation(pdfDoc, sourcePage, targetPage, link);
  });

  const pdfBytes: Uint8Array = await pdfDoc.save({ useObjectStreams: false });

  if (pdfBytes.byteLength === 0) {
    throw new Error('PDF export engine вернул пустой буфер. Экспорт остановлен до записи файла.');
  }

  return pdfBytes;
}

export async function buildPlannerPdfBytes(config: PlannerConfig) {
  const renderModel = buildPlannerRenderModel(config);
  return buildPdfBytesFromRenderModel(renderModel);
}

async function normalizeAndValidatePdfBytes(bytes: Uint8Array) {
  const normalizedBytes = Uint8Array.from(bytes);
  const header = new TextDecoder('ascii').decode(normalizedBytes.slice(0, 5));

  if (header !== '%PDF-') {
    throw new Error('Собранный файл не похож на корректный PDF: отсутствует заголовок %PDF-.');
  }

  try {
    await PDFDocument.load(normalizedBytes);
  } catch (error) {
    throw new Error(error instanceof Error
      ? `Собранный PDF не прошёл внутреннюю проверку: ${error.message}`
      : 'Собранный PDF не прошёл внутреннюю проверку.');
  }

  return normalizedBytes;
}

async function validateSavedPdfBlob(blob: Blob, expectedBytes: Uint8Array) {
  const savedBytes = new Uint8Array(await blob.arrayBuffer());

  if (savedBytes.byteLength !== expectedBytes.byteLength) {
    throw new Error(`После записи PDF изменил размер: ожидалось ${expectedBytes.byteLength} байт, получено ${savedBytes.byteLength}.`);
  }

  const savedHeader = new TextDecoder('ascii').decode(savedBytes.slice(0, 5));
  if (savedHeader !== '%PDF-') {
    throw new Error('После записи файл перестал быть похож на PDF: отсутствует заголовок %PDF-.');
  }

  try {
    await PDFDocument.load(savedBytes);
  } catch (error) {
    throw new Error(error instanceof Error
      ? `Записанный на диск PDF не прошёл повторную проверку: ${error.message}`
      : 'Записанный на диск PDF не прошёл повторную проверку.');
  }
}

async function saveBytes(fileHandle: SaveFilePickerHandle | undefined, filename: string, bytes: Uint8Array) {
  const normalizedBytes = await normalizeAndValidatePdfBytes(bytes);

  if (fileHandle) {
    const writable = await fileHandle.createWritable();
    try {
      await writable.write(normalizedBytes);
      if (typeof writable.truncate === 'function') {
        await writable.truncate(normalizedBytes.byteLength);
      }
    } finally {
      await writable.close();
    }

    if (typeof fileHandle.getFile === 'function') {
      await validateSavedPdfBlob(await fileHandle.getFile(), normalizedBytes);
    }

    return;
  }

  const file = new File([normalizedBytes], filename, { type: 'application/pdf' });
  const url = createPersistentDownloadUrl(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.type = 'application/pdf';
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  await triggerBrowserDownload(link);

  window.setTimeout(() => {
    link.remove();
  }, 30 * 1000);

  // Keep the object URL alive well past the initial click.
  // Large PDFs may still be streaming into the browser download pipeline.
  window.setTimeout(() => {
    cleanupDownloadUrl(url);
  }, DOWNLOAD_OBJECT_URL_TTL_MS);
}

export async function savePdfBytes(target: PdfExportTarget, bytes: Uint8Array) {
  await saveBytes(target.fileHandle, target.filename, bytes);
  return {
    byteLength: bytes.byteLength,
  };
}

export async function PdfExportEngine(config: PlannerConfig, target: PdfExportTarget) {
  const bytes = await buildPlannerPdfBytes(config);
  return savePdfBytes(target, bytes);
}
