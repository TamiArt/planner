import type { PlannerModule } from '../../core/registry/plannerModule';
import { NEXT_RECT, PREVIOUS_RECT } from '../../lib/templates/layout';
import { checklistManifest } from './manifest';

const CHECKLIST_TEMPLATES = ['Универсальный список', 'Покупки', 'Фокус / приоритеты'];

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

export const checklistModule: PlannerModule = {
  manifest: checklistManifest,
  createSection: (config) => ({
    type: 'checklist',
    enabled: config.modules.checklist.enabled,
    count: Number(config.modules.checklist.count ?? config.modules.checklist.options?.count ?? 9),
    variant: 'checklist-mixed',
    options: config.modules.checklist.options,
  }),
  isEnabled: (config) => config.modules.checklist.enabled,
  getPages: (config) => {
    const count = Number(config.modules.checklist.count ?? config.modules.checklist.options?.count ?? 0);
    return Array.from({ length: count }, (_, index) => ({
      id: `page-checklist-${index + 1}`,
      kind: 'checklist' as const,
      title: `Чек-лист ${String(index + 1).padStart(2, '0')}`,
      label: CHECKLIST_TEMPLATES[index % CHECKLIST_TEMPLATES.length],
      sectionType: 'checklist' as const,
      checklistVariant: CHECKLIST_TEMPLATES[index % CHECKLIST_TEMPLATES.length],
    }));
  },
  getTabs: ({ pages }) => {
    const firstPage = pages.find((page) => page.sectionType === 'checklist');
    return firstPage
      ? [{ id: 'tab-checklist', label: 'Списки', kind: 'section' as const, targetPageId: firstPage.id }]
      : [];
  },
  getLinks: ({ pages }) => buildLinearLinks(pages.filter((page) => page.kind === 'checklist').map((page) => page.id)),
  validate: ({ config }) => {
    const count = Number(config.modules.checklist.count ?? config.modules.checklist.options?.count ?? 0);
    return config.modules.checklist.enabled && count < 1
      ? ['Раздел чек-листов должен содержать хотя бы одну страницу.']
      : [];
  },
};
