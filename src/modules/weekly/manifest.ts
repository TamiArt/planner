import type { PlannerModuleManifest } from '../../core/registry/plannerModule';

export const weeklyManifest: PlannerModuleManifest = {
  id: 'weekly',
  title: 'Недели',
  description: 'Недельный разворот на 2 страницы. Начало недели фиксировано с понедельника.',
  version: '1.0.0',
  sectionType: 'weekly',
  enabledByDefault: true,
  locked: true,
};
