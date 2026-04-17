import { nanoid } from 'nanoid';
import type {
  ReadyStickerSheetMeta,
  StickerBackgroundMode,
  StickerCategory,
  StickerUploadAssetMeta,
} from '../../types/planner';
import {
  isReadyStickerSheetSizeSupported,
  READY_SHEET_ALLOWED_DIMENSIONS_LABEL,
  READY_SHEET_MAX_SIZE_BYTES,
} from './readySheetDimensions';
import { saveStickerAssetBlob } from './stickerAssetStorage';

const AUTO_MAX_SIZE_BYTES = 1_000_000;

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Не удалось прочитать изображение "${file.name}".`));
    };

    image.src = objectUrl;
  });
}

function sanitizeFileName(fileName: string) {
  return fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .slice(0, 40);
}

function fileToBlob(file: File) {
  return file.slice(0, file.size, file.type || 'image/png');
}

function createPreviewSource(image: HTMLImageElement, width: number, height: number) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Не удалось создать предпросмотр для стикера.');
  }

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL('image/png');
}

function getPreviewSize(width: number, height: number, maxLongEdge: number) {
  const longEdge = Math.max(width, height);

  if (longEdge <= maxLongEdge) {
    return { width, height };
  }

  const scale = maxLongEdge / longEdge;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

function validatePng(file: File) {
  if (file.type !== 'image/png') {
    throw new Error(`Файл "${file.name}" должен быть PNG.`);
  }
}

function validateAutoPng(file: File, image: HTMLImageElement) {
  validatePng(file);

  if (file.size > AUTO_MAX_SIZE_BYTES) {
    throw new Error(`Файл "${file.name}" превышает 1 MB. Для авто-режима используйте более лёгкий PNG.`);
  }

  if (image.width < 300 || image.height < 300) {
    throw new Error(`Файл "${file.name}" слишком маленький. Минимальный размер для авто-режима — 300×300 px.`);
  }

  if (image.width > 1000 || image.height > 1000) {
    throw new Error(`Файл "${file.name}" слишком большой. Для авто-режима допустимо до 1000×1000 px.`);
  }
}

function validateReadySheet(file: File, image: HTMLImageElement) {
  validatePng(file);

  if (file.size > READY_SHEET_MAX_SIZE_BYTES) {
    throw new Error(`Файл "${file.name}" превышает 5 MB. Для режима готовых листов используйте более лёгкий лист.`);
  }

  if (!isReadyStickerSheetSizeSupported(image.width, image.height)) {
    throw new Error(`Файл "${file.name}" должен быть готовым листом ${READY_SHEET_ALLOWED_DIMENSIONS_LABEL}.`);
  }
}

export async function createAutoStickerAsset(
  file: File,
  category: StickerCategory,
  _backgroundMode: StickerBackgroundMode,
): Promise<StickerUploadAssetMeta> {
  const image = await loadImage(file);
  validateAutoPng(file, image);

  const storageId = `sticker-auto-${nanoid(12)}`;
  await saveStickerAssetBlob(storageId, fileToBlob(file));
  const previewSize = getPreviewSize(image.width, image.height, 240);

  return {
    id: `sticker-item-${nanoid(10)}`,
    storageId,
    name: sanitizeFileName(file.name) || 'Стикер',
    previewSource: createPreviewSource(image, previewSize.width, previewSize.height),
    width: image.width,
    height: image.height,
    sizeBytes: file.size,
    category,
  };
}

export async function createReadyStickerSheet(file: File): Promise<ReadyStickerSheetMeta> {
  const image = await loadImage(file);
  validateReadySheet(file, image);

  const storageId = `sticker-sheet-${nanoid(12)}`;
  await saveStickerAssetBlob(storageId, fileToBlob(file));
  const previewSize = getPreviewSize(image.width, image.height, 420);

  return {
    id: `sticker-sheet-meta-${nanoid(10)}`,
    storageId,
    name: sanitizeFileName(file.name) || 'Готовый лист',
    previewSource: createPreviewSource(image, previewSize.width, previewSize.height),
    width: image.width,
    height: image.height,
    sizeBytes: file.size,
  };
}
