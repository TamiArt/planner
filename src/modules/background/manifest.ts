import type { PlannerModuleManifest } from '../../core/registry/plannerModule';

export const backgroundManifest: PlannerModuleManifest = {
  id: 'background',
  title: 'Фон и оформление',
  description: 'Служебный модуль темы и фона, синхронизирует визуальную конфигурацию планера.',
  version: '1.0.0',
  kind: 'tool',
  enabledByDefault: true,
  locked: true,
  canDisable: false,
};
