import { nanoid } from 'nanoid';
import { PAGE_HEIGHT, PAGE_WIDTH, PAPER_HEIGHT, PAPER_WIDTH } from '../templates/layout';
import type { PlannerUploadedPngAsset } from '../../types/planner';

type PlannerArtworkKind = 'cover' | 'page-background';

export const COVER_UPLOAD_SIZE = {
  width: PAGE_WIDTH,
  height: PAGE_HEIGHT,
} as const;

export const PAGE_BACKGROUND_UPLOAD_SIZE = {
  width: PAPER_WIDTH,
  height: PAPER_HEIGHT,
} as const;

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
      reject(new Error('Не удалось прочитать PNG-файл.'));
    };

    image.src = objectUrl;
  });
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('Не удалось подготовить PNG-файл для предпросмотра.'));
    };

    reader.onerror = () => {
      reject(new Error('Не удалось прочитать PNG-файл.'));
    };

    reader.readAsDataURL(file);
  });
}

function sanitizeFileName(fileName: string) {
  return fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .slice(0, 48);
}

function isPngFile(file: File) {
  return file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
}

export function formatPlannerArtworkSize(size: { width: number; height: number }) {
  return `${size.width}×${size.height} px`;
}

function getArtworkMeta(kind: PlannerArtworkKind) {
  if (kind === 'cover') {
    return {
      label: 'обложки',
      fallbackName: 'Обложка',
      size: COVER_UPLOAD_SIZE,
    };
  }

  return {
    label: 'фона листов',
    fallbackName: 'Фон листов',
    size: PAGE_BACKGROUND_UPLOAD_SIZE,
  };
}

export async function createPlannerArtwork(file: File, kind: PlannerArtworkKind): Promise<PlannerUploadedPngAsset> {
  if (!isPngFile(file)) {
    throw new Error('Можно загружать только PNG-файлы.');
  }

  const meta = getArtworkMeta(kind);
  const image = await loadImage(file);

  if (image.width !== meta.size.width || image.height !== meta.size.height) {
    throw new Error(`PNG для ${meta.label} должен быть размером ${formatPlannerArtworkSize(meta.size)}.`);
  }

  const source = await readFileAsDataUrl(file);
  const normalizedName = sanitizeFileName(file.name);

  return {
    id: `${kind}-${nanoid(10)}`,
    name: normalizedName || meta.fallbackName,
    source,
    width: image.width,
    height: image.height,
    sizeBytes: file.size,
  };
}
