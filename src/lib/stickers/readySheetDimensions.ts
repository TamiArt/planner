export const READY_SHEET_MAX_SIZE_BYTES = 5_000_000;
export const READY_SHEET_RATIO_TOLERANCE = 0.01;

export const READY_SHEET_ALLOWED_DIMENSIONS = [
  { width: 2048, height: 1536 },
  { width: 1536, height: 2048 },
  { width: 2048, height: 997 },
] as const;

export const READY_SHEET_ALLOWED_DIMENSIONS_LABEL = '2048×1536 px, 1536×2048 px или 2048×997 px';

export function isReadyStickerSheetSizeSupported(width: number, height: number) {
  return READY_SHEET_ALLOWED_DIMENSIONS.some((size) => {
    const ratio = width / height;
    const targetRatio = size.width / size.height;

    return width >= size.width
      && height >= size.height
      && Math.abs(ratio - targetRatio) <= READY_SHEET_RATIO_TOLERANCE;
  });
}
