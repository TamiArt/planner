import type { PlannerModule } from '../../core/registry/plannerModule';
import { buildPlannerCalendar } from '../../lib/navigation/dateHelpers';
import { NEXT_RECT, PREVIOUS_RECT } from '../../lib/templates/layout';
import { dailyManifest } from './manifest';

function buildLinearLinks(pageIds: string[]) {
  return pageIds.flatMap((pageId, index) => {
    const links = [];
    const previous = pageIds[index - 1];
    const next = pageIds[index + 1];

    if (previous) {
      links.push({ sourcePageId: pageId, targetPageId: previous, rect: PREVIOUS_RECT });
    }

    if (next) {
      links.push({ sourcePageId: pageId, targetPageId: next, rect: NEXT_RECT });
    }

    return links;
  });
}

export const dailyModule: PlannerModule = {
  manifest: dailyManifest,
  createSection: (config) => ({
    type: 'daily',
    enabled: config.modules.daily.enabled,
    count: Number(config.modules.daily.count ?? config.modules.daily.options?.count ?? 30),
    variant: 'daily-template-1',
    options: config.modules.daily.options,
  }),
  isEnabled: (config) => config.modules.daily.enabled,
  getPages: (config) => {
    const count = Number(config.modules.daily.count ?? config.modules.daily.options?.count ?? 0);
    return buildPlannerCalendar(config.mode, config.year ?? new Date().getFullYear(), count).dailyPages.map((daily) => ({
      id: `page-day-${daily.index + 1}`,
      kind: 'day' as const,
      title: daily.title,
      label: daily.label,
      sectionType: 'daily' as const,
      monthIndex: daily.monthIndex,
      dayIndex: daily.index,
      dateIso: daily.iso,
    }));
  },
  getLinks: ({ pages }) => buildLinearLinks(pages.filter((page) => page.kind === 'day').map((page) => page.id)),
  validate: ({ config }) => {
    const count = Number(config.modules.daily.count ?? config.modules.daily.options?.count ?? 0);
    return config.modules.daily.enabled && count < 1
      ? ['Если модуль daily включен, количество страниц должно быть больше нуля.']
      : [];
  },
};
