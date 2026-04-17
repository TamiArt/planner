import type { PlannerModule } from '../../core/registry/plannerModule';
import { normalizePlannerLayouts } from './model/normalizeLayouts';
import { LayoutEditorPanel } from './ui/LayoutEditorPanel';
import { layoutEditorManifest } from './manifest';

export const layoutEditorModule: PlannerModule = {
  manifest: layoutEditorManifest,
  isEnabled: (config) => config.modules['layout-editor'].enabled,
  lifecycle: {
    normalizeConfig: (config) => ({
      layouts: normalizePlannerLayouts(config.layouts),
    }),
  },
  validate: ({ config }) => (
    Object.keys(config.layouts ?? {}).length === 0
      ? ['Редактор макета включен, но в конфиге не найдено ни одного макета страницы. Будут использованы значения по умолчанию.']
      : []
  ),
  ui: {
    panel: LayoutEditorPanel,
  },
};
