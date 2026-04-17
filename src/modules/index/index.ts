import type { PlannerModule } from '../../core/registry/plannerModule';
import { INDEX_MONTH_RECTS, INDEX_SECTION_RECTS } from '../../lib/templates/layout';
import { indexManifest } from './manifest';

export const indexModule: PlannerModule = {
  manifest: indexManifest,
  createSection: (config) => ({
    type: 'index',
    enabled: config.modules.index.enabled,
    count: 1,
    variant: 'mvp-index',
    options: config.modules.index.options,
  }),
  isEnabled: (config) => config.modules.index.enabled,
  getPages: (config) => [
    {
      id: 'page-index',
      kind: 'index',
      title: config.title,
      label: 'Индекс',
      sectionType: 'index',
    },
  ],
  getLinks: ({ pages }) => {
    const indexPage = pages.find((page) => page.kind === 'index');
    if (!indexPage) {
      return [];
    }

    const links = [];

    for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
      const target = pages.find((page) => page.id === `page-month-${monthIndex + 1}`);
      if (target) {
        links.push({
          sourcePageId: indexPage.id,
          targetPageId: target.id,
          rect: INDEX_MONTH_RECTS[monthIndex],
        });
      }
    }

    const sectionTargets = {
      year: pages.find((page) => page.sectionType === 'year')?.id,
      weekly: pages.find((page) => page.sectionType === 'weekly')?.id,
      daily: pages.find((page) => page.sectionType === 'daily')?.id,
      notes: pages.find((page) => page.sectionType === 'notes')?.id,
      checklist: pages.find((page) => page.sectionType === 'checklist')?.id,
      stickers: pages.find((page) => page.sectionType === 'stickers')?.id,
    } as const;

    (Object.keys(sectionTargets) as Array<keyof typeof sectionTargets>).forEach((key) => {
      const targetPageId = sectionTargets[key];
      if (targetPageId) {
        links.push({
          sourcePageId: indexPage.id,
          targetPageId,
          rect: INDEX_SECTION_RECTS[key],
        });
      }
    });

    return links;
  },
};
