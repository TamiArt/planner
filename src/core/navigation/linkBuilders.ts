import type { PlannerDocumentPlan, PlannerLinkDefinition, PlannerTabTarget } from '../types/pdf';
import { HOME_BUTTON_RECT, PAGE_HEIGHT, TAB_GAP, TAB_HEIGHT, TAB_TOP, TAB_WIDTH, TAB_X } from '../../lib/templates/layout';

export function buildHomeLinks(pages: PlannerDocumentPlan['pages']) {
  const indexPageId = pages.find((page) => page.sectionType === 'index')?.id;

  if (!indexPageId) {
    return [];
  }

  return pages
    .filter((page) => page.id !== indexPageId && page.sectionType !== 'cover')
    .map((page) => ({
      sourcePageId: page.id,
      targetPageId: indexPageId,
      rect: HOME_BUTTON_RECT,
    } satisfies PlannerLinkDefinition));
}

export function buildTabLinks(pages: PlannerDocumentPlan['pages'], tabs: PlannerTabTarget[]) {
  return pages
    .filter((page) => page.sectionType !== 'cover')
    .flatMap((page) =>
    tabs.map((tab, index) => ({
      sourcePageId: page.id,
      targetPageId: tab.targetPageId,
      rect: {
        x: TAB_X,
        y: PAGE_HEIGHT - TAB_TOP - TAB_HEIGHT - index * (TAB_HEIGHT + TAB_GAP),
        width: TAB_WIDTH,
        height: TAB_HEIGHT,
      },
    } satisfies PlannerLinkDefinition)),
    );
}
