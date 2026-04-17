import type { PlannerLinkRect } from '../../types/pdf';

const SCALE = 2;

export const PAGE_WIDTH = 2048;
export const PAGE_HEIGHT = 1536;
export const PAPER_X = 48;
export const PAPER_Y = 40;
export const PAPER_WIDTH = PAGE_WIDTH - 292;
export const PAPER_HEIGHT = PAGE_HEIGHT - 80;
export const CONTENT_LEFT = 52 * SCALE;
export const CONTENT_TOP = 48 * SCALE;
export const CONTENT_WIDTH = 844 * SCALE;
export const CONTENT_HEIGHT = 672 * SCALE;
export const TAB_WIDTH = 92 * SCALE;
export const TAB_HEIGHT = 34 * SCALE;
export const TAB_GAP = 8 * SCALE;
export const TAB_X = PAGE_WIDTH - TAB_WIDTH - 18 * SCALE;
export const TAB_TOP = 86 * SCALE;

export function getPaperRect() {
  return {
    x: PAPER_X,
    y: PAPER_Y,
    width: PAPER_WIDTH,
    height: PAPER_HEIGHT,
  };
}

export function rectFromTop(x: number, top: number, width: number, height: number): PlannerLinkRect {
  return {
    x,
    y: PAGE_HEIGHT - top - height,
    width,
    height,
  };
}

export const HOME_BUTTON_RECT = rectFromTop(52 * SCALE, 26 * SCALE, 116 * SCALE, 34 * SCALE);

export const INDEX_MONTH_RECTS = Array.from({ length: 12 }, (_, index) => {
  const column = index % 4;
  const row = Math.floor(index / 4);
  return rectFromTop((72 + column * 156) * SCALE, (286 + row * 76) * SCALE, 132 * SCALE, 52 * SCALE);
});

export const INDEX_SECTION_RECTS = {
  year: rectFromTop(72 * SCALE, 548 * SCALE, 178 * SCALE, 70 * SCALE),
  weekly: rectFromTop(268 * SCALE, 548 * SCALE, 178 * SCALE, 70 * SCALE),
  daily: rectFromTop(464 * SCALE, 548 * SCALE, 178 * SCALE, 70 * SCALE),
  notes: rectFromTop(72 * SCALE, 634 * SCALE, 178 * SCALE, 70 * SCALE),
  checklist: rectFromTop(268 * SCALE, 634 * SCALE, 178 * SCALE, 70 * SCALE),
  stickers: rectFromTop(464 * SCALE, 634 * SCALE, 178 * SCALE, 70 * SCALE),
};

export const YEAR_MONTH_RECTS = Array.from({ length: 12 }, (_, index) => {
  const column = index % 4;
  const row = Math.floor(index / 4);
  return rectFromTop((74 + column * 186) * SCALE, (186 + row * 150) * SCALE, 166 * SCALE, 126 * SCALE);
});

export const MONTH_WEEK_RECTS = Array.from({ length: 6 }, (_, index) => rectFromTop(76 * SCALE, (252 + index * 58) * SCALE, 342 * SCALE, 44 * SCALE));
export const MONTH_DAILY_RECT = rectFromTop(462 * SCALE, 252 * SCALE, 258 * SCALE, 52 * SCALE);
export const MONTH_YEAR_RECT = rectFromTop(462 * SCALE, 318 * SCALE, 258 * SCALE, 52 * SCALE);

export const PREVIOUS_RECT = rectFromTop(72 * SCALE, 680 * SCALE, 130 * SCALE, 34 * SCALE);
export const NEXT_RECT = rectFromTop(214 * SCALE, 680 * SCALE, 130 * SCALE, 34 * SCALE);
