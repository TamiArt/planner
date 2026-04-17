import type { BuiltPlannerPage, PlannerDocumentPlan, PlannerLinkRect } from '../../types/pdf';
import type { PlannerSectionType } from '../../types/planner';

function isSameRect(left: PlannerLinkRect, right: PlannerLinkRect) {
  return left.x === right.x && left.y === right.y && left.width === right.width && left.height === right.height;
}

export function getPageById(plan: PlannerDocumentPlan, pageId?: string) {
  if (!pageId) {
    return undefined;
  }

  return plan.pages.find((page) => page.id === pageId);
}

export function getFirstPageIdBySection(plan: PlannerDocumentPlan, sectionType: PlannerSectionType) {
  return plan.pages.find((page) => page.sectionType === sectionType)?.id;
}

export function getLinkedPageByRect(plan: PlannerDocumentPlan, sourcePageId: string, rect: PlannerLinkRect) {
  const link = plan.links.find((item) => item.sourcePageId === sourcePageId && isSameRect(item.rect, rect));
  return getPageById(plan, link?.targetPageId);
}

export function getSidebarSelectionId(previewPages: BuiltPlannerPage[], selectedPage: BuiltPlannerPage) {
  return (
    previewPages.find((page) => page.sectionType === selectedPage.sectionType)?.id
    ?? (selectedPage.kind === 'week-right' ? previewPages.find((page) => page.kind === 'week-left')?.id : undefined)
    ?? selectedPage.id
  );
}
