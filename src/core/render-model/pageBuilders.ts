import type { PlannerLinkDefinition } from '../types/pdf';
import type { PlannerRenderModel, PlannerRenderPage } from './types';
import { drawAstroLegendPage } from './astrologyPageBuilders';
import { buildDayPage, buildChecklistPage, buildNotesPage } from './linearPageBuilders';
import { buildIndexPage, buildMonthPage, buildYearPage } from './overviewPageBuilders';
import { buildStickerPage } from './stickerPageBuilder';
import { buildWeekPage } from './weekPageBuilder';

export function buildPageContent(model: PlannerRenderModel, renderPage: PlannerRenderPage, links: PlannerLinkDefinition[]) {
  switch (renderPage.page.kind) {
    case 'index':
      buildIndexPage(model, renderPage, links);
      break;
    case 'astro-legend':
      drawAstroLegendPage(model, renderPage);
      break;
    case 'year':
      buildYearPage(model, renderPage, links);
      break;
    case 'month':
      buildMonthPage(model, renderPage, links);
      break;
    case 'week-left':
    case 'week-right':
      buildWeekPage(model, renderPage, links);
      break;
    case 'day':
      buildDayPage(model, renderPage, links);
      break;
    case 'notes':
      buildNotesPage(model, renderPage, links);
      break;
    case 'checklist':
      buildChecklistPage(model, renderPage, links);
      break;
    case 'sticker':
      buildStickerPage(model, renderPage, links);
      break;
  }
}
