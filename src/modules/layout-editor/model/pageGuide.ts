export type LayoutPaperOrientation = 'portrait' | 'landscape';

export interface PaperGuideRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const A4_PAPER_MM = {
  portrait: { width: 210, height: 297 },
  landscape: { width: 297, height: 210 },
} as const;

export function getA4PaperLabel(orientation: LayoutPaperOrientation) {
  const size = A4_PAPER_MM[orientation];
  return `A4 · ${size.width} × ${size.height} мм`;
}

export function getA4GuideRect(
  canvasWidth: number,
  canvasHeight: number,
  orientation: LayoutPaperOrientation,
): PaperGuideRect {
  const paper = A4_PAPER_MM[orientation];
  const paperRatio = paper.width / paper.height;
  const canvasRatio = canvasWidth / canvasHeight;

  if (canvasRatio > paperRatio) {
    const height = canvasHeight;
    const width = height * paperRatio;
    return {
      x: (canvasWidth - width) / 2,
      y: 0,
      width,
      height,
    };
  }

  const width = canvasWidth;
  const height = width / paperRatio;
  return {
    x: 0,
    y: (canvasHeight - height) / 2,
    width,
    height,
  };
}
