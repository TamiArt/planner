import type { PlannerModuleManifest } from '../../core/registry/plannerModule';

export const monthlyManifest: PlannerModuleManifest = {
  id: 'monthly',
  title: 'Месяцы',
  description: '12 месячных разделов с местом под цели, фокус и обзор.',
  version: '1.0.0',
  sectionType: 'monthly',
  enabledByDefault: true,
  locked: true,
};
