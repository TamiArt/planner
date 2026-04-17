import type { BackgroundAsset } from '../../types/planner';

export const CUSTOM_BACKGROUND_ID = 'custom-photo-background';
export const CUSTOM_COLOR_BACKGROUND_ID = 'custom-color-background';
export const CUSTOM_GRADIENT_BACKGROUND_ID = 'custom-gradient-background';
const MAX_LONG_EDGE = 1600;
const OUTPUT_QUALITY = 0.82;
const HEX_COLOR_PATTERN = /^#(?:[0-9a-f]{6})$/i;
const GRADIENT_WIDTH = 768;
const GRADIENT_HEIGHT = 576;
const OPACITY_PRECISION = 100;

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
      reject(new Error('Не удалось прочитать изображение.'));
    };

    image.src = objectUrl;
  });
}

function getTargetSize(width: number, height: number) {
  const longEdge = Math.max(width, height);

  if (longEdge <= MAX_LONG_EDGE) {
    return { width, height };
  }

  const scale = MAX_LONG_EDGE / longEdge;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

function sanitizeFileName(fileName: string) {
  return fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .slice(0, 36);
}

export async function createUploadedBackground(file: File): Promise<BackgroundAsset> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Можно загружать только изображения.');
  }

  const image = await loadImage(file);
  const { width, height } = getTargetSize(image.width, image.height);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Не удалось подготовить фон для оптимизации.');
  }

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);

  const optimizedDataUrl = canvas.toDataURL('image/jpeg', OUTPUT_QUALITY);
  const normalizedName = sanitizeFileName(file.name);

  return {
    id: CUSTOM_BACKGROUND_ID,
    name: normalizedName ? `Фото: ${normalizedName}` : 'Загруженное фото',
    type: 'image',
    source: optimizedDataUrl,
    preview: `center / cover no-repeat url("${optimizedDataUrl}")`,
    themeId: 'custom',
    isCustom: true,
    variant: 'uploaded-photo',
  };
}

export function normalizeHexColor(value: string) {
  const normalized = value.trim();

  if (/^#(?:[0-9a-f]{3})$/i.test(normalized)) {
    return `#${normalized.slice(1).split('').map((char) => `${char}${char}`).join('')}`.toUpperCase();
  }

  if (HEX_COLOR_PATTERN.test(normalized)) {
    return normalized.toUpperCase();
  }

  throw new Error('Цвет фона должен быть в HEX-формате, например #F4E7D3.');
}

export function normalizeBackgroundOpacity(value: number | undefined) {
  if (!Number.isFinite(value)) {
    return 1;
  }

  const numericValue = Number(value);
  return Math.min(1, Math.max(0, Math.round(numericValue * OPACITY_PRECISION) / OPACITY_PRECISION));
}

export function createSolidColorBackground(color: string): BackgroundAsset {
  const normalizedColor = normalizeHexColor(color);

  return {
    id: CUSTOM_COLOR_BACKGROUND_ID,
    name: `Цвет: ${normalizedColor}`,
    type: 'color',
    source: normalizedColor,
    preview: `linear-gradient(180deg, ${normalizedColor} 0%, ${normalizedColor} 100%)`,
    themeId: 'custom',
    isCustom: true,
    variant: 'custom-color',
    color: normalizedColor,
  };
}

function normalizeGradientAngle(value: number) {
  if (!Number.isFinite(value)) {
    return 135;
  }

  const normalized = Math.round(value) % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function createGradientPreview(startColor: string, endColor: string, angle: number) {
  return `linear-gradient(${angle}deg, ${startColor} 0%, ${endColor} 100%)`;
}

function createGradientImageSource(startColor: string, endColor: string, angle: number) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Не удалось подготовить градиентный фон.');
  }

  canvas.width = GRADIENT_WIDTH;
  canvas.height = GRADIENT_HEIGHT;

  const radians = ((angle - 90) * Math.PI) / 180;
  const halfWidth = canvas.width / 2;
  const halfHeight = canvas.height / 2;
  const radius = Math.sqrt(halfWidth ** 2 + halfHeight ** 2);
  const x = Math.cos(radians) * radius;
  const y = Math.sin(radians) * radius;
  const gradient = context.createLinearGradient(
    halfWidth - x,
    halfHeight - y,
    halfWidth + x,
    halfHeight + y,
  );

  gradient.addColorStop(0, startColor);
  gradient.addColorStop(1, endColor);
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  return canvas.toDataURL('image/png');
}

export function createGradientBackground(startColor: string, endColor: string, angle: number): BackgroundAsset {
  const normalizedStartColor = normalizeHexColor(startColor);
  const normalizedEndColor = normalizeHexColor(endColor);
  const normalizedAngle = normalizeGradientAngle(angle);

  return {
    id: CUSTOM_GRADIENT_BACKGROUND_ID,
    name: `Градиент: ${normalizedStartColor} -> ${normalizedEndColor}`,
    type: 'image',
    source: createGradientImageSource(normalizedStartColor, normalizedEndColor, normalizedAngle),
    preview: createGradientPreview(normalizedStartColor, normalizedEndColor, normalizedAngle),
    themeId: 'custom',
    isCustom: true,
    variant: 'generated-gradient',
    gradient: {
      startColor: normalizedStartColor,
      endColor: normalizedEndColor,
      angle: normalizedAngle,
    },
  };
}

export function isCustomBackground(background?: BackgroundAsset) {
  return Boolean(background?.isCustom);
}

export function isCustomColorBackground(background?: BackgroundAsset) {
  return Boolean(background?.isCustom && background.type === 'color' && HEX_COLOR_PATTERN.test(background.source));
}

export function isCustomPhotoBackground(background?: BackgroundAsset) {
  return Boolean(background?.isCustom && background.type === 'image' && background.source.startsWith('data:image/'));
}

export function isCustomGradientBackground(background?: BackgroundAsset) {
  return Boolean(
    background?.isCustom
    && background.type === 'image'
    && background.variant === 'generated-gradient'
    && background.source.startsWith('data:image/')
  );
}
