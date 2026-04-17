import type {
  PlannerConfig,
  PlannerModuleId,
  PlannerModulesConfig,
  PlannerSectionConfig,
  PlannerSectionType,
} from '../types/planner';
import { moduleRegistry } from '../registry/moduleRegistry';
import { DEFAULT_STICKER_AUTO_LAYOUT } from '../../lib/stickers/stickerModuleConfig';

type SectionModuleId = Exclude<PlannerModuleId, 'layout-editor'>;

const CONTENT_MODULES = moduleRegistry.filter(
  (module): module is typeof moduleRegistry[number] & {
    manifest: typeof moduleRegistry[number]['manifest'] & { id: SectionModuleId; sectionType: Exclude<PlannerSectionType, 'cover'> };
  } => Boolean(module.manifest.sectionType),
);

export const MODULE_SECTION_MAP = Object.fromEntries(
  CONTENT_MODULES.map((module) => [module.manifest.id, module.manifest.sectionType]),
) as Record<SectionModuleId, Exclude<PlannerSectionType, 'cover'>>;

export const SECTION_MODULE_MAP = Object.fromEntries(
  CONTENT_MODULES.map((module) => [module.manifest.sectionType, module.manifest.id]),
) as Record<Exclude<PlannerSectionType, 'cover'>, PlannerModuleId>;

export const MODULE_ORDER: PlannerModuleId[] = moduleRegistry.map((module) => module.manifest.id);

export const LOCKED_MODULES = new Set<PlannerModuleId>(
  moduleRegistry
    .filter((module) => module.manifest.locked)
    .map((module) => module.manifest.id),
);

const LEGACY_MODULE_ID_MAP: Record<string, PlannerModuleId> = {
  year: 'year-overview',
};

const DEFAULT_MODULE_OPTIONS: Record<PlannerModuleId, Record<string, unknown> | undefined> = {
  background: {
    managed: true,
  },
  index: { count: 1, variant: 'mvp-index' },
  'year-overview': { count: 1, variant: 'year-overview' },
  monthly: { count: 12, months: 12, variant: 'monthly-standard' },
  weekly: { variant: 'weekly-template-1', spreadPages: 2, startOfWeek: 'monday' },
  daily: { count: 30, variant: 'daily-template-1' },
  notes: { count: 30, variant: 'notes-template' },
  checklist: { count: 9, variant: 'checklist-mixed' },
  stickers: {
    count: 3,
    variant: 'sticker-sheet-template',
    sourceMode: 'auto-png-pack',
    categories: ['functional', 'decorative', 'emoji'],
    autoLayout: DEFAULT_STICKER_AUTO_LAYOUT,
    autoPngs: [],
    readySheets: [],
    backgroundMode: 'transparent',
  },
  'layout-editor': {
    selectedLayout: 'month',
    selectedBlockId: '',
  },
};

const DEFAULT_MODULE_ENABLED = Object.fromEntries(
  moduleRegistry.map((module) => [module.manifest.id, module.manifest.enabledByDefault]),
) as Record<PlannerModuleId, boolean>;

const SECTION_MODULE_IDS: SectionModuleId[] = CONTENT_MODULES.map((module) => module.manifest.id);

export function createDefaultModulesConfig(): PlannerModulesConfig {
  return MODULE_ORDER.reduce((accumulator, moduleId, index) => {
    const count = typeof DEFAULT_MODULE_OPTIONS[moduleId]?.count === 'number'
      ? Number(DEFAULT_MODULE_OPTIONS[moduleId]?.count)
      : undefined;

    accumulator[moduleId] = {
      enabled: LOCKED_MODULES.has(moduleId) ? true : DEFAULT_MODULE_ENABLED[moduleId],
      order: index,
      count,
      options: DEFAULT_MODULE_OPTIONS[moduleId],
    };

    return accumulator;
  }, {} as PlannerModulesConfig);
}

function isModuleId(value: string): value is PlannerModuleId {
  return MODULE_ORDER.includes(value as PlannerModuleId);
}

function isSectionModuleId(moduleId: PlannerModuleId): moduleId is SectionModuleId {
  return SECTION_MODULE_IDS.includes(moduleId as SectionModuleId);
}

function normalizeModuleId(moduleId: string) {
  if (isModuleId(moduleId)) {
    return moduleId;
  }

  return LEGACY_MODULE_ID_MAP[moduleId];
}

function normalizeModuleState(
  moduleId: PlannerModuleId,
  moduleState: Partial<PlannerModulesConfig[PlannerModuleId]> | undefined,
  fallback: PlannerModulesConfig,
) {
  const baseState = fallback[moduleId];
  const nextCount = typeof moduleState?.count === 'number'
    ? Math.max(0, Math.floor(moduleState.count))
    : baseState.count;

  return {
    enabled:
      typeof moduleState?.enabled === 'boolean'
        ? (LOCKED_MODULES.has(moduleId) ? true : moduleState.enabled)
        : baseState.enabled,
    order:
      typeof moduleState?.order === 'number' && Number.isFinite(moduleState.order)
        ? moduleState.order
        : baseState.order,
    count: nextCount,
    options: {
      ...baseState.options,
      ...(typeof nextCount === 'number' ? { count: nextCount } : {}),
      ...(moduleState?.options ?? {}),
    },
  };
}

export function normalizeModulesConfig(modules?: Partial<Record<string, Partial<PlannerModulesConfig[PlannerModuleId]>>> | PlannerModulesConfig) {
  const defaults = createDefaultModulesConfig();

  if (!modules || typeof modules !== 'object') {
    return defaults;
  }

  Object.entries(modules).forEach(([rawModuleId, moduleState]) => {
    const moduleId = normalizeModuleId(rawModuleId);

    if (!moduleId || !moduleState || typeof moduleState !== 'object') {
      return;
    }

    defaults[moduleId] = normalizeModuleState(
      moduleId,
      moduleState as Partial<PlannerModulesConfig[PlannerModuleId]>,
      defaults,
    );
  });

  return defaults;
}

export function getModuleState(config: PlannerConfig, moduleId: PlannerModuleId) {
  return normalizeModulesConfig(config.modules)[moduleId];
}

export function getModuleIdsInOrder(modules?: Partial<Record<string, Partial<PlannerModulesConfig[PlannerModuleId]>>> | PlannerModulesConfig) {
  const normalizedModules = normalizeModulesConfig(modules);

  return [...MODULE_ORDER].sort((left, right) => {
    const leftOrder = normalizedModules[left]?.order ?? MODULE_ORDER.indexOf(left);
    const rightOrder = normalizedModules[right]?.order ?? MODULE_ORDER.indexOf(right);
    return leftOrder - rightOrder;
  });
}

function getDefaultSectionCount(moduleId: SectionModuleId) {
  const count = DEFAULT_MODULE_OPTIONS[moduleId]?.count;
  return typeof count === 'number' ? count : undefined;
}

function getDefaultSectionVariant(moduleId: SectionModuleId) {
  const variant = DEFAULT_MODULE_OPTIONS[moduleId]?.variant;
  return typeof variant === 'string' ? variant : undefined;
}

function createSectionFromModule(moduleId: SectionModuleId, moduleState: PlannerModulesConfig[PlannerModuleId]): PlannerSectionConfig {
  const sectionType = MODULE_SECTION_MAP[moduleId];
  return {
    type: sectionType,
    enabled: LOCKED_MODULES.has(moduleId) ? true : moduleState.enabled,
    count:
      typeof moduleState.count === 'number'
        ? Number(moduleState.count)
        : typeof moduleState.options?.count === 'number'
          ? Number(moduleState.options.count)
        : getDefaultSectionCount(moduleId),
    variant:
      typeof moduleState.options?.variant === 'string'
        ? String(moduleState.options.variant)
        : getDefaultSectionVariant(moduleId),
    options: {
      ...moduleState.options,
    },
  };
}

export function createSectionsFromModules(modules: PlannerModulesConfig | Partial<Record<string, Partial<PlannerModulesConfig[PlannerModuleId]>>>) {
  const normalizedModules = normalizeModulesConfig(modules);
  return getModuleIdsInOrder(normalizedModules)
    .filter(isSectionModuleId)
    .map((moduleId) => createSectionFromModule(moduleId, normalizedModules[moduleId]));
}

export function createModulesFromSections(sections: PlannerSectionConfig[], currentModules?: Partial<PlannerModulesConfig>) {
  const defaults = normalizeModulesConfig(currentModules);

  sections.forEach((section, index) => {
    if (section.type === 'cover') {
      return;
    }

    const moduleId = SECTION_MODULE_MAP[section.type];
    const currentState = currentModules?.[moduleId] ?? defaults[moduleId];

    defaults[moduleId] = {
      enabled: LOCKED_MODULES.has(moduleId) ? true : section.enabled,
      order: index,
      count: typeof section.count === 'number' ? section.count : currentState?.count,
      options: {
        ...currentState?.options,
        ...(typeof section.count === 'number' ? { count: section.count } : {}),
        ...(section.variant ? { variant: section.variant } : {}),
        ...section.options,
      },
    };
  });

  return defaults;
}

export function syncSectionsAndModules(config: PlannerConfig) {
  const normalizedModules = normalizeModulesConfig(config.modules);
  const modules = config.sections.length > 0
    ? createModulesFromSections(config.sections, normalizedModules)
    : normalizedModules;
  const sections = createSectionsFromModules(modules);

  return {
    modules,
    sections,
  };
}
