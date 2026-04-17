import type { PlannerModule } from '../../core/registry/plannerModule';
import { YEAR_MONTH_RECTS } from '../../lib/templates/layout';
import { yearOverviewManifest } from './manifest';

export const yearOverviewModule: PlannerModule = {
  manifest: yearOverviewManifest,
  createSection: (config) => ({
    type: 'year',
    enabled: config.modules['year-overview'].enabled,
    count: 1,
    variant: 'year-overview',
    options: config.modules['year-overview'].options,
  }),
  isEnabled: (config) => config.modules['year-overview'].enabled,
  getPages: (config) => [
    {
      id: 'page-year',
      kind: 'year',
      title: `${config.mode === 'dated' ? config.year : 'Гибкий'} обзор`,
      label: 'Обзор года',
      sectionType: 'year',
    },
  ],
  getLinks: ({ pages }) => {
    const yearPage = pages.find((page) => page.kind === 'year');
    if (!yearPage) {
      return [];
    }

    return YEAR_MONTH_RECTS.flatMap((rect, monthIndex) => {
      const target = pages.find((page) => page.id === `page-month-${monthIndex + 1}`);
      return target
        ? [{ sourcePageId: yearPage.id, targetPageId: target.id, rect }]
        : [];
    });
  },
};
