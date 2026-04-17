import type { PlannerModule } from '../../core/registry/plannerModule';
import type { PlannerConfig } from '../../types/planner';
import { buildYearCalendar } from '../../lib/navigation/dateHelpers';
import { NEXT_RECT, PREVIOUS_RECT, rectFromTop } from '../../lib/templates/layout';
import { weeklyManifest } from './manifest';

function buildWeeks(config: PlannerConfig) {
  const weeks = buildYearCalendar(config.year ?? new Date().getFullYear()).weeks;

  if (config.mode === 'undated') {
    return weeks.map((week, index) => ({
      ...week,
      title: `Неделя ${String(index + 1).padStart(2, '0')}`,
      label: 'Гибкий недельный разворот',
    }));
  }

  return weeks;
}

const WEEK_MONTH_RECT = rectFromTop(382, 680, 150, 34);
const WEEK_PAIR_RECT = rectFromTop(724, 680, 150, 34);

export const weeklyModule: PlannerModule = {
  manifest: weeklyManifest,
  createSection: (config) => ({
    type: 'weekly',
    enabled: true,
    variant: 'weekly-template-1',
    options: {
      spreadPages: 2,
      startOfWeek: 'monday',
      ...config.modules.weekly.options,
    },
  }),
  isEnabled: (config) => config.modules.weekly.enabled,
  getPages: (config) =>
    buildWeeks(config).flatMap((week) => ([
      {
        id: `page-week-${week.index + 1}-left`,
        kind: 'week-left' as const,
        title: week.title,
        label: week.label,
        sectionType: 'weekly' as const,
        monthIndex: week.monthIndex,
        weekIndex: week.index,
      },
      {
        id: `page-week-${week.index + 1}-right`,
        kind: 'week-right' as const,
        title: `${week.title} · правая`,
        label: week.label,
        sectionType: 'weekly' as const,
        monthIndex: week.monthIndex,
        weekIndex: week.index,
      },
    ])),
  getLinks: ({ pages }) => {
    const weeklyPages = pages.filter((page) => page.kind === 'week-left' || page.kind === 'week-right');

    return weeklyPages.flatMap((page) => {
      const links = [];
      const weekNumber = page.weekIndex ?? 0;
      const pairTarget =
        page.kind === 'week-left'
          ? pages.find((item) => item.id === `page-week-${weekNumber + 1}-right`)
          : pages.find((item) => item.id === `page-week-${weekNumber + 1}-left`);
      const previousPair =
        page.kind === 'week-left'
          ? pages.find((item) => item.id === `page-week-${weekNumber}-left`)
          : pages.find((item) => item.id === `page-week-${weekNumber}-right`);
      const nextPair =
        page.kind === 'week-left'
          ? pages.find((item) => item.id === `page-week-${weekNumber + 2}-left`)
          : pages.find((item) => item.id === `page-week-${weekNumber + 2}-right`);
      const monthPage = pages.find((item) => item.kind === 'month' && item.monthIndex === page.monthIndex);

      if (pairTarget) {
        links.push({ sourcePageId: page.id, targetPageId: pairTarget.id, rect: WEEK_PAIR_RECT });
      }
      if (previousPair) {
        links.push({ sourcePageId: page.id, targetPageId: previousPair.id, rect: PREVIOUS_RECT });
      }
      if (nextPair) {
        links.push({ sourcePageId: page.id, targetPageId: nextPair.id, rect: NEXT_RECT });
      }
      if (monthPage) {
        links.push({ sourcePageId: page.id, targetPageId: monthPage.id, rect: WEEK_MONTH_RECT });
      }

      return links;
    });
  },
};
