import type { PlannerSectionType, PlannerTabKind, StickerCategory, StickerSourceMode } from './planner';

export type PlannerPageKind =
  | 'cover'
  | 'index'
  | 'astro-legend'
  | 'year'
  | 'month'
  | 'week-left'
  | 'week-right'
  | 'day'
  | 'notes'
  | 'checklist'
  | 'sticker';

export interface PlannerTabTarget {
  id: string;
  label: string;
  kind: PlannerTabKind;
  targetPageId: string;
}

export interface PlannerLinkRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlannerLinkDefinition {
  sourcePageId: string;
  targetPageId: string;
  rect: PlannerLinkRect;
}

export interface BuiltPlannerPage {
  id: string;
  kind: PlannerPageKind;
  title: string;
  sectionType: PlannerSectionType;
  label: string;
  pageNumber: number;
  monthIndex?: number;
  weekIndex?: number;
  dayIndex?: number;
  dateIso?: string;
  checklistVariant?: string;
  stickerCategory?: StickerCategory;
  stickerSourceMode?: StickerSourceMode;
  stickerAssetIds?: string[];
  stickerReadySheetId?: string;
  stickerReadySheetName?: string;
}

export interface PlannerPageDefinition extends Omit<BuiltPlannerPage, 'pageNumber'> {}

export interface PlannerDocumentPlan {
  pages: BuiltPlannerPage[];
  tabs: PlannerTabTarget[];
  links: PlannerLinkDefinition[];
}
