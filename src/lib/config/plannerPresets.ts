import { getBackgroundsForTheme } from '../assets/assetRegistry';
import { isCustomBackground } from '../assets/uploadBackground';
import type { PlannerConfig, PlannerModuleId, PlannerModulesConfig } from '../../types/planner';
import { syncPlannerConfig } from './defaultPlannerConfig';

export type PlannerPresetId = 'minimal-dated' | 'soft-undated' | 'dark-premium';

export interface PlannerPresetDefinition {
  id: PlannerPresetId;
  name: string;
  description: string;
  themeId: PlannerConfig['themeId'];
  mode: PlannerConfig['mode'];
  title: (year: number) => string;
  modulePatches: Partial<Record<PlannerModuleId, {
    enabled?: boolean;
    count?: number;
    variant?: string;
    options?: Record<string, unknown>;
  }>>;
}

export const plannerPresets: PlannerPresetDefinition[] = [
  {
    id: 'minimal-dated',
    name: 'Минимал · датированный',
    description: 'Базовая датированная версия: чистый стиль и сбалансированная структура без перегруза дневными страницами.',
    themeId: 'minimal',
    mode: 'dated',
    title: (year) => `Планер «Минимал» ${year}`,
    modulePatches: {
      daily: { enabled: false, count: 30 },
      notes: { enabled: true, count: 30 },
      checklist: { enabled: true, count: 9 },
      stickers: { enabled: true, count: 3 },
    },
  },
  {
    id: 'soft-undated',
    name: 'Софт · недатированный',
    description: 'Недатированная универсальная версия с мягкой темой и расширенными блоками для заметок.',
    themeId: 'soft',
    mode: 'undated',
    title: () => 'Планер «Софт» без дат',
    modulePatches: {
      daily: { enabled: true, count: 30 },
      notes: { enabled: true, count: 40 },
      checklist: { enabled: true, count: 6 },
      stickers: { enabled: true, count: 3 },
    },
  },
  {
    id: 'dark-premium',
    name: 'Тёмный · премиум',
    description: 'Тёмная премиальная датированная сборка с акцентом на недельный ритм и раздел чек-листов.',
    themeId: 'dark',
    mode: 'dated',
    title: (year) => `Планер «Тёмный премиум» ${year}`,
    modulePatches: {
      daily: { enabled: false, count: 30 },
      notes: { enabled: true, count: 24 },
      checklist: { enabled: true, count: 12 },
      stickers: { enabled: true, count: 3 },
    },
  },
];

function patchModules(
  modules: PlannerModulesConfig,
  modulePatches: PlannerPresetDefinition['modulePatches'],
) {
  return Object.entries(modules).reduce((accumulator, [moduleId, moduleState]) => {
    const patch = modulePatches[moduleId as PlannerModuleId];

    accumulator[moduleId as PlannerModuleId] = patch
      ? {
          ...moduleState,
          enabled: patch.enabled ?? moduleState.enabled,
          count: typeof patch.count === 'number' ? patch.count : moduleState.count,
          options: {
            ...moduleState.options,
            ...(typeof patch.count === 'number' ? { count: patch.count } : {}),
            ...(patch.variant ? { variant: patch.variant } : {}),
            ...patch.options,
          },
        }
      : moduleState;

    return accumulator;
  }, {} as PlannerModulesConfig);
}

export function applyPlannerPreset(baseConfig: PlannerConfig, presetId: PlannerPresetId) {
  const preset = plannerPresets.find((item) => item.id === presetId) ?? plannerPresets[0];
  const referenceYear = baseConfig.year ?? new Date().getFullYear();
  const backgrounds = getBackgroundsForTheme(preset.themeId);
  const keepCustomBackground = isCustomBackground(baseConfig.customBackground) && baseConfig.backgroundId === baseConfig.customBackground?.id;
  const backgroundId = keepCustomBackground ? baseConfig.backgroundId : backgrounds[0]?.id ?? baseConfig.backgroundId;
  const modules = patchModules(baseConfig.modules, preset.modulePatches);

  return syncPlannerConfig({
    ...baseConfig,
    title: preset.title(referenceYear),
    mode: preset.mode,
    year: preset.mode === 'dated' ? referenceYear : undefined,
    themeId: preset.themeId,
    backgroundId,
    modules,
    sections: [],
  });
}
