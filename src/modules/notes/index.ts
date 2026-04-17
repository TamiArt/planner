import type { PlannerModule } from '../../core/registry/plannerModule';
import { NEXT_RECT, PREVIOUS_RECT } from '../../lib/templates/layout';
import { notesManifest } from './manifest';

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

export const notesModule: PlannerModule = {
  manifest: notesManifest,
  createSection: (config) => ({
    type: 'notes',
    enabled: config.modules.notes.enabled,
    count: Number(config.modules.notes.count ?? config.modules.notes.options?.count ?? 30),
    variant: 'notes-template',
    options: config.modules.notes.options,
  }),
  isEnabled: (config) => config.modules.notes.enabled,
  getPages: (config) => {
    const count = Number(config.modules.notes.count ?? config.modules.notes.options?.count ?? 0);
    return Array.from({ length: count }, (_, index) => ({
      id: `page-notes-${index + 1}`,
      kind: 'notes' as const,
      title: `Заметки ${String(index + 1).padStart(2, '0')}`,
      label: 'Свободные заметки',
      sectionType: 'notes' as const,
    }));
  },
  getTabs: ({ pages }) => {
    const firstPage = pages.find((page) => page.sectionType === 'notes');
    return firstPage
      ? [{ id: 'tab-notes', label: 'Заметки', kind: 'section' as const, targetPageId: firstPage.id }]
      : [];
  },
  getLinks: ({ pages }) => buildLinearLinks(pages.filter((page) => page.kind === 'notes').map((page) => page.id)),
  validate: ({ config }) => {
    const count = Number(config.modules.notes.count ?? config.modules.notes.options?.count ?? 0);
    return config.modules.notes.enabled && count < 1
      ? ['Раздел заметок должен содержать хотя бы одну страницу.']
      : [];
  },
};
