import { nanoid } from 'nanoid';
import { backgroundAssets } from '../../data/backgrounds/backgrounds';
import type { PlannerConfig, PlannerSectionConfig, PlannerSectionType, TabConfig } from '../../types/planner';
import { composePlannerDocument } from '../../core/composer/composePlannerDocument';
import {
  createDefaultModulesConfig,
  createModulesFromSections,
  createSectionsFromModules,
  LOCKED_MODULES,
  MODULE_SECTION_MAP,
  syncSectionsAndModules,
} from '../../core/config/moduleState';
import { applyModuleLifecycle } from '../../core/lifecycle/applyModuleLifecycle';
import { getBackgroundsForTheme } from '../assets/assetRegistry';
import { normalizeBackgroundOpacity } from '../assets/uploadBackground';
import { createDefaultAstrologyConfig, normalizeAstrologyConfig } from '../astrology/astrologyConfig';
import { createDefaultMoonPhaseConfig, normalizeMoonPhaseConfig } from '../moon/moonPhases';

export const DEFAULT_SECTION_ORDER: PlannerSectionType[] = [
  'index',
  'year',
  'monthly',
  'weekly',
  'daily',
  'notes',
  'checklist',
  'stickers',
];

export const LOCKED_SECTIONS = new Set<PlannerSectionType>(
  [...LOCKED_MODULES]
    .map((moduleId) => MODULE_SECTION_MAP[moduleId as keyof typeof MODULE_SECTION_MAP])
    .filter((sectionType): sectionType is Exclude<PlannerSectionType, 'cover'> => Boolean(sectionType)),
);

export function createDefaultSections() {
  return createSectionsFromModules(createDefaultModulesConfig());
}

function createId() {
  return `planner-${nanoid(10)}`;
}

export function normalizeSections(sections: PlannerSectionConfig[]) {
  return createSectionsFromModules(createModulesFromSections(sections));
}

function deriveTabs(config: PlannerConfig): TabConfig[] {
  return composePlannerDocument({
    ...config,
    tabs: [],
  }).tabs.map((tab) => ({
    id: tab.id,
    label: tab.label,
    kind: tab.kind,
    target: tab.targetPageId,
  }));
}

function deriveBackgroundConfig(config: Pick<PlannerConfig, 'backgroundOpacity' | 'customBackground'>, background: typeof backgroundAssets[number]) {
  return {
    type: background.type,
    image: background.type === 'image'
      ? background.source
      : config.customBackground?.id === background.id && background.source.startsWith('data:image/')
        ? background.source
        : undefined,
    opacity: normalizeBackgroundOpacity(config.backgroundOpacity),
    color: background.type === 'color' ? (background.color ?? (background.source.startsWith('#') ? background.source : undefined)) : undefined,
  } satisfies PlannerConfig['background'];
}

export function createDefaultPlannerConfig(): PlannerConfig {
  const now = new Date();
  const defaultBackground = backgroundAssets.find((asset) => asset.themeId === 'minimal') ?? backgroundAssets[0];
  const modules = createDefaultModulesConfig();
  const sections = createSectionsFromModules(modules);

  const baseConfig: PlannerConfig = applyModuleLifecycle({
    id: createId(),
    title: `Цифровой планер ${now.getFullYear()}`,
    language: 'ru',
    mode: 'dated',
    year: now.getFullYear(),
    theme: 'minimal',
    background: deriveBackgroundConfig({ backgroundOpacity: 1, customBackground: undefined }, defaultBackground),
    themeId: 'minimal',
    backgroundId: defaultBackground.id,
    backgroundOpacity: 1,
    customBackground: undefined,
    coverId: undefined,
    coverImage: undefined,
    pageBackgroundImage: undefined,
    astrology: createDefaultAstrologyConfig(),
    moonPhases: createDefaultMoonPhaseConfig(),
    pageSize: 'iPadLandscape',
    orientation: 'landscape',
    modules,
    layouts: {},
    sections,
    includeIndex: true,
    includeStickerSheets: true,
    tabs: [],
    tabPosition: 'right',
    weekStartsOn: 'monday',
  });

  return {
    ...baseConfig,
    tabs: deriveTabs(baseConfig),
  };
}

export function getSection(config: PlannerConfig, type: PlannerSectionType) {
  return config.sections.find((section) => section.type === type);
}

export function syncPlannerConfig(config: PlannerConfig): PlannerConfig {
  const nextTheme = config.theme ?? config.themeId ?? 'minimal';
  const { modules, sections } = syncSectionsAndModules({
    ...config,
    modules: config.modules ?? createDefaultModulesConfig(),
  });
  const includeIndex = getSection({ ...config, sections }, 'index')?.enabled ?? true;
  const includeStickerSheets = getSection({ ...config, sections }, 'stickers')?.enabled ?? true;
  const themeBackgrounds = getBackgroundsForTheme(nextTheme, config.customBackground);
  const currentBackground =
    themeBackgrounds.find((item) => item.id === config.backgroundId) ?? themeBackgrounds[0] ?? backgroundAssets[0];

  const normalizedConfig = applyModuleLifecycle({
    ...config,
    language: 'ru',
    theme: nextTheme,
    pageSize: 'iPadLandscape',
    orientation: 'landscape',
    modules,
    layouts: config.layouts,
    sections,
    includeIndex,
    includeStickerSheets,
    themeId: nextTheme,
    background: deriveBackgroundConfig(config, currentBackground),
    backgroundOpacity: normalizeBackgroundOpacity(config.backgroundOpacity),
    customBackground: config.customBackground,
    backgroundId: currentBackground.id,
    coverImage: config.coverImage,
    pageBackgroundImage: config.pageBackgroundImage,
    astrology: normalizeAstrologyConfig(config.astrology),
    moonPhases: normalizeMoonPhaseConfig(config.moonPhases),
    tabs: [],
    tabPosition: config.tabPosition ?? 'right',
    weekStartsOn: 'monday',
  });

  return {
    ...normalizedConfig,
    tabs: deriveTabs(normalizedConfig),
  };
}
