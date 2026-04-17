import type { PlannerConfig } from '../types/planner';

interface RectLike {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface MonthCellPlacementParams {
  rect: RectLike;
}

interface WeekColumnPlacementParams {
  area: RectLike;
}

interface DayPagePlacementParams {
  area: RectLike;
  firstBlockY: number;
  inlineWidth: number;
  moonLabelWidth: number;
}

export type AstrologyRenderMode = 'builder' | 'overlay';

export const MONTH_CELL_BOTTOM_STRATEGY = {
  id: 'month-cell-bottom',
  description: 'Compact astrology icons stay at the bottom of a month-grid cell.',
  place({ rect }: MonthCellPlacementParams) {
    return {
      x: rect.x + 14,
      y: rect.y + rect.height - 31,
    };
  },
} as const;

export const WEEK_COLUMN_BELOW_DATE_STRATEGY = {
  id: 'week-column-below-date',
  description: 'The full weekly astro line is rendered as a separate line below the date label.',
  place({ area }: WeekColumnPlacementParams) {
    return {
      x: area.x,
      y: area.y + 58,
    };
  },
} as const;

export const DAY_PAGE_INLINE_STRATEGY = {
  id: 'day-page-inline',
  description: 'The full daily astro line starts at the left edge of the first content block.',
  place({ area, firstBlockY }: DayPagePlacementParams) {
    return {
      x: area.x,
      y: Math.max(286, firstBlockY - 48),
    };
  },
} as const;

export const DAY_PAGE_OVERLAY_AFTER_MOON_LABEL_STRATEGY = {
  id: 'day-page-overlay-after-moon-label',
  description: 'On PDF overlay, the astro line shifts right to continue after the existing moon-phase label.',
  place({ area, firstBlockY, inlineWidth, moonLabelWidth }: DayPagePlacementParams) {
    return {
      x: Math.min(area.x + area.width - inlineWidth, area.x + moonLabelWidth + 28),
      y: Math.max(286, firstBlockY - 48),
    };
  },
} as const;

export const ASTROLOGY_ALIGNMENT_STRATEGIES = {
  monthCellBottom: MONTH_CELL_BOTTOM_STRATEGY,
  weekColumnBelowDate: WEEK_COLUMN_BELOW_DATE_STRATEGY,
  dayPageInline: DAY_PAGE_INLINE_STRATEGY,
  dayPageOverlayAfterMoonLabel: DAY_PAGE_OVERLAY_AFTER_MOON_LABEL_STRATEGY,
} as const;

export function getAstrologyRenderMode(config: Pick<PlannerConfig, 'astrology'> & { __astrologyPdfAnnotation?: boolean }): AstrologyRenderMode {
  return config.__astrologyPdfAnnotation ? 'overlay' : 'builder';
}
