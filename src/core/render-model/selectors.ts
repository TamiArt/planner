import type { LayoutBlock, LayoutPageTarget, PageLayout } from '../../shared/layout';
import type { BuiltPlannerPage, PlannerDocumentPlan } from '../types/pdf';
import type { PlannerSectionType } from '../types/planner';

export function getPageById(plan: PlannerDocumentPlan, pageId: string) {
  return plan.pages.find((page) => page.id === pageId);
}

export function getFirstPageBySection(plan: PlannerDocumentPlan, sectionType: PlannerSectionType) {
  return plan.pages.find((page) => page.sectionType === sectionType);
}

export function getLayoutTarget(page: BuiltPlannerPage): LayoutPageTarget {
  switch (page.kind) {
    case 'cover':
      throw new Error('Cover page does not use a layout target.');
    case 'index':
    case 'astro-legend':
      return 'index';
    case 'year':
      return 'year';
    case 'month':
      return 'month';
    case 'week-left':
      return 'week-left';
    case 'week-right':
      return 'week-right';
    case 'day':
      return 'day';
    case 'notes':
      return 'notes';
    case 'checklist':
      return 'checklist';
    case 'sticker':
      return 'sticker';
  }
}

export function getBlocks(layout: PageLayout, type: LayoutBlock['type']) {
  return layout.blocks.filter((block) => block.type === type);
}

export function getBlock(layout: PageLayout, type: LayoutBlock['type'], index = 0) {
  return getBlocks(layout, type)[index];
}

export function getSectionLabel(sectionType: PlannerSectionType) {
  if (sectionType === 'index') {
    return 'Index / home';
  }

  if (sectionType === 'year') {
    return 'Year overview';
  }

  if (sectionType === 'monthly') {
    return 'Monthly';
  }

  if (sectionType === 'weekly') {
    return 'Weekly';
  }

  if (sectionType === 'daily') {
    return 'Daily';
  }

  if (sectionType === 'notes') {
    return 'Notes';
  }

  if (sectionType === 'checklist') {
    return 'Checklist';
  }

  if (sectionType === 'stickers') {
    return 'Stickers';
  }

  return sectionType;
}
