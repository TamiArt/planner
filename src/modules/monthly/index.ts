import type { PlannerModule } from '../../core/registry/plannerModule';
import { buildYearCalendar, RU_MONTHS_SHORT } from '../../lib/navigation/dateHelpers';
import { MONTH_DAILY_RECT, MONTH_WEEK_RECTS, MONTH_YEAR_RECT } from '../../lib/templates/layout';
import { monthlyManifest } from './manifest';

export const monthlyModule: PlannerModule = {
  manifest: monthlyManifest,
  createSection: (config) => ({
    type: 'monthly',
    enabled: true,
    count: 12,
    variant: 'monthly-standard',
    options: {
      months: 12,
      ...config.modules.monthly.options,
    },
  }),
  isEnabled: (config) => config.modules.monthly.enabled,
  getPages: (config) => [
    ...buildYearCalendar(config.year ?? new Date().getFullYear()).months.map((month) => ({
      id: `page-month-${month.monthIndex + 1}`,
      kind: 'month' as const,
      title: month.title,
      label: config.mode === 'dated' ? `${month.year}` : 'Недатированный месяц',
      sectionType: 'monthly' as const,
      monthIndex: month.monthIndex,
    })),
    ...((config.astrology.includeLegend && Boolean(config.astrology.data))
      ? [{
          id: 'page-astro-legend',
          kind: 'astro-legend' as const,
          title: 'Астро-легенда',
          label: 'Расшифровка символов',
          sectionType: 'index' as const,
        }]
      : []),
  ],
  getTabs: ({ config }) => [
    ...RU_MONTHS_SHORT.map((label, index) => ({
      id: `tab-month-${index + 1}`,
      label,
      kind: 'month' as const,
      targetPageId: `page-month-${index + 1}`,
    })),
    ...((config.astrology.includeLegend && Boolean(config.astrology.data))
      ? [{
          id: 'tab-astro-legend',
          label: 'Астро',
          kind: 'section' as const,
          targetPageId: 'page-astro-legend',
        }]
      : []),
  ],
  getLinks: ({ pages }) =>
    pages
      .filter((page) => page.kind === 'month')
      .flatMap((monthPage) => {
        const links = [];
        const monthWeekPages = pages.filter(
          (page) => page.kind === 'week-left' && page.monthIndex === monthPage.monthIndex,
        );
        const monthDailyPage = pages.find(
          (page) => page.kind === 'day' && page.monthIndex === monthPage.monthIndex,
        );
        const yearPageId = pages.find((page) => page.sectionType === 'year')?.id;

        monthWeekPages.slice(0, MONTH_WEEK_RECTS.length).forEach((page, index) => {
          links.push({
            sourcePageId: monthPage.id,
            targetPageId: page.id,
            rect: MONTH_WEEK_RECTS[index],
          });
        });

        if (monthDailyPage) {
          links.push({
            sourcePageId: monthPage.id,
            targetPageId: monthDailyPage.id,
            rect: MONTH_DAILY_RECT,
          });
        }

        if (yearPageId) {
          links.push({
            sourcePageId: monthPage.id,
            targetPageId: yearPageId,
            rect: MONTH_YEAR_RECT,
          });
        }

        return links;
      }),
};
