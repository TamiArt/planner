import type { PlannerModuleManifest } from '../../core/registry/plannerModule';

export const layoutEditorManifest: PlannerModuleManifest = {
  id: 'layout-editor',
  title: 'Редактор макета',
  description: 'Редактор геометрии страницы: блоки, размеры, сетка и базовые стили.',
  version: '1.0.0',
  kind: 'tool',
  enabledByDefault: true,
  canDisable: true,
};
