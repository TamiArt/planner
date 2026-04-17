import type { PlannerModuleManifest } from '../../core/registry/plannerModule';

export const yearOverviewManifest: PlannerModuleManifest = {
  id: 'year-overview',
  title: 'Обзор года',
  description: 'Годовой обзор с сеткой месяцев и быстрыми переходами.',
  version: '1.0.0',
  sectionType: 'year',
  enabledByDefault: true,
};
