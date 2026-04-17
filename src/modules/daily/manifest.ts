import type { PlannerModuleManifest } from '../../core/registry/plannerModule';

export const dailyManifest: PlannerModuleManifest = {
  id: 'daily',
  title: 'Дневные страницы',
  description: 'Опциональный блок из 30 дневных страниц для расширенной версии.',
  version: '1.0.0',
  sectionType: 'daily',
  enabledByDefault: false,
};
