import type { PlannerModuleManifest } from '../../core/registry/plannerModule';

export const checklistManifest: PlannerModuleManifest = {
  id: 'checklist',
  title: 'Чек-листы',
  description: 'Отдельный раздел со смешанными шаблонами списков: todo, shopping, priorities.',
  version: '1.0.0',
  sectionType: 'checklist',
  enabledByDefault: true,
};
