import type {
  PlannerConfig,
  ReadyStickerSheetMeta,
  StickerAsset,
  StickerAutoLayoutConfig,
  StickerCategory,
  StickerModuleConfig,
  StickerSourceMode,
  StickerUploadAssetMeta,
} from '../../types/planner';
import { stickerAssets } from '../../data/stickers/stickers';
import { STICKER_CATEGORY_ORDER } from './stickerCatalog';

export const DEFAULT_STICKER_AUTO_LAYOUT: StickerAutoLayoutConfig = {
  itemSpacing: 24,
  pagePadding: 72,
  maxItemsPerPage: 6,
};

export const STICKER_AUTO_LAYOUT_LIMITS = {
  itemSpacing: { min: 8, max: 80 },
  pagePadding: { min: 24, max: 160 },
  maxItemsPerPage: { min: 1, max: 12 },
} as const;

export const DEFAULT_STICKER_MODULE_CONFIG: StickerModuleConfig = {
  enabled: true,
  sourceMode: 'auto-png-pack',
  categories: [...STICKER_CATEGORY_ORDER],
  autoLayout: { ...DEFAULT_STICKER_AUTO_LAYOUT },
  autoPngs: [],
  readySheets: [],
  backgroundMode: 'transparent',
};

export type StickerModuleConfigPatch = Omit<Partial<StickerModuleConfig>, 'autoLayout'> & {
  autoLayout?: Partial<StickerAutoLayoutConfig>;
};

function isStickerCategory(value: unknown): value is StickerCategory {
  return value === 'functional' || value === 'decorative' || value === 'emoji' || value === 'icons';
}

function isSourceMode(value: unknown): value is StickerSourceMode {
  return value === 'auto-png-pack' || value === 'ready-sheet';
}

function isBackgroundMode(value: unknown): value is StickerModuleConfig['backgroundMode'] {
  return value === 'transparent' || value === 'white';
}

function normalizeCategory(value: StickerCategory | 'icons'): StickerCategory {
  return value === 'icons' ? 'emoji' : value;
}

function normalizeCategories(categories?: unknown[]) {
  const normalized = (categories ?? [])
    .filter(isStickerCategory)
    .map((category) => normalizeCategory(category));

  return normalized.length > 0 ? Array.from(new Set(normalized)) : [...STICKER_CATEGORY_ORDER];
}

function normalizeAutoPngs(autoPngs?: unknown[]) {
  return (autoPngs ?? [])
    .filter((item): item is StickerUploadAssetMeta & { category: StickerCategory | 'icons' } => (
      Boolean(item)
      && typeof item === 'object'
      && item !== null
      && 'id' in item
      && 'storageId' in item
      && 'previewSource' in item
      && 'category' in item
    ))
    .map((item) => ({
      ...item,
      category: normalizeCategory(item.category),
    }));
}

function normalizeReadySheets(readySheets?: unknown[]) {
  return (readySheets ?? [])
    .filter((item): item is ReadyStickerSheetMeta => (
      Boolean(item)
      && typeof item === 'object'
      && item !== null
      && 'id' in item
      && 'storageId' in item
      && 'previewSource' in item
    ));
}

function clampFiniteNumber(value: number, fallback: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, value));
}

function normalizeAutoLayout(autoLayout?: Partial<StickerAutoLayoutConfig>) {
  const itemSpacing = Number(autoLayout?.itemSpacing ?? DEFAULT_STICKER_AUTO_LAYOUT.itemSpacing);
  const pagePadding = Number(autoLayout?.pagePadding ?? DEFAULT_STICKER_AUTO_LAYOUT.pagePadding);
  const maxItemsPerPage = Number(autoLayout?.maxItemsPerPage ?? DEFAULT_STICKER_AUTO_LAYOUT.maxItemsPerPage);

  return {
    itemSpacing: clampFiniteNumber(
      itemSpacing,
      DEFAULT_STICKER_AUTO_LAYOUT.itemSpacing,
      STICKER_AUTO_LAYOUT_LIMITS.itemSpacing.min,
      STICKER_AUTO_LAYOUT_LIMITS.itemSpacing.max,
    ),
    pagePadding: clampFiniteNumber(
      pagePadding,
      DEFAULT_STICKER_AUTO_LAYOUT.pagePadding,
      STICKER_AUTO_LAYOUT_LIMITS.pagePadding.min,
      STICKER_AUTO_LAYOUT_LIMITS.pagePadding.max,
    ),
    maxItemsPerPage: Math.round(clampFiniteNumber(
      maxItemsPerPage,
      DEFAULT_STICKER_AUTO_LAYOUT.maxItemsPerPage ?? 6,
      STICKER_AUTO_LAYOUT_LIMITS.maxItemsPerPage.min,
      STICKER_AUTO_LAYOUT_LIMITS.maxItemsPerPage.max,
    )),
  };
}

export function getStickerModuleConfig(config: PlannerConfig): StickerModuleConfig {
  const raw = config.modules.stickers.options ?? {};

  return {
    enabled: config.modules.stickers.enabled,
    sourceMode: isSourceMode(raw.sourceMode) ? raw.sourceMode : DEFAULT_STICKER_MODULE_CONFIG.sourceMode,
    categories: normalizeCategories(raw.categories as unknown[] | undefined),
    autoLayout: normalizeAutoLayout(raw.autoLayout as Partial<StickerAutoLayoutConfig> | undefined),
    autoPngs: normalizeAutoPngs(raw.autoPngs as unknown[] | undefined),
    readySheets: normalizeReadySheets(raw.readySheets as unknown[] | undefined),
    backgroundMode: isBackgroundMode(raw.backgroundMode) ? raw.backgroundMode : DEFAULT_STICKER_MODULE_CONFIG.backgroundMode,
  };
}

export function patchStickerModuleConfig(
  currentConfig: PlannerConfig,
  patch: StickerModuleConfigPatch,
): StickerModuleConfig {
  const current = getStickerModuleConfig(currentConfig);

  return {
    ...current,
    ...patch,
    categories: patch.categories ? [...patch.categories] : current.categories,
    autoLayout: normalizeAutoLayout({
      ...current.autoLayout,
      ...patch.autoLayout,
    }),
    autoPngs: patch.autoPngs ?? current.autoPngs,
    readySheets: patch.readySheets ?? current.readySheets,
  };
}

export function getStickerCategoriesForMode(config: StickerModuleConfig) {
  return (config.categories?.length ? config.categories : STICKER_CATEGORY_ORDER) as StickerCategory[];
}

export function getAutoStickerAssetsByCategory(
  config: StickerModuleConfig,
  category: StickerCategory,
) {
  const uploaded = (config.autoPngs ?? []).filter((item) => item.category === category);

  if (uploaded.length > 0) {
    return uploaded;
  }

  return stickerAssets.filter((sticker) => sticker.category === category);
}

export function getAutoStickerAssetById(config: StickerModuleConfig, assetId: string) {
  return (config.autoPngs ?? []).find((item) => item.id === assetId);
}

export function getStickerRenderableAssetById(config: StickerModuleConfig, assetId: string) {
  return getAutoStickerAssetById(config, assetId)
    ?? stickerAssets.find((item) => item.id === assetId);
}

export function getReadyStickerSheetById(config: StickerModuleConfig, sheetId: string) {
  return (config.readySheets ?? []).find((item) => item.id === sheetId);
}

export function getStickerStorageIds(config: StickerModuleConfig) {
  return [
    ...(config.autoPngs ?? []).map((item) => item.storageId),
    ...(config.readySheets ?? []).map((item) => item.storageId),
  ];
}

export function getObsoleteStickerStorageIds(currentConfig: StickerModuleConfig, nextConfig: StickerModuleConfig) {
  const nextStorageIds = new Set(getStickerStorageIds(nextConfig));
  return getStickerStorageIds(currentConfig).filter((storageId) => !nextStorageIds.has(storageId));
}

export interface StickerAutoPageGroup {
  category: StickerCategory;
  assetIds: string[];
  title: string;
  label: string;
}

export function buildAutoStickerPageGroups(config: StickerModuleConfig) {
  const categories = getStickerCategoriesForMode(config);
  const maxItemsPerPage = Math.max(1, Number(config.autoLayout?.maxItemsPerPage ?? DEFAULT_STICKER_AUTO_LAYOUT.maxItemsPerPage));
  const groups: StickerAutoPageGroup[] = [];

  categories.forEach((category) => {
    const categoryAssets = getAutoStickerAssetsByCategory(config, category);

    for (let index = 0; index < categoryAssets.length; index += maxItemsPerPage) {
      const chunk = categoryAssets.slice(index, index + maxItemsPerPage);
      if (chunk.length === 0) {
        continue;
      }

      groups.push({
        category,
        assetIds: chunk.map((item) => item.id),
        title: category === 'functional'
          ? 'Функциональные стикеры'
          : category === 'decorative'
            ? 'Декоративные стикеры'
            : 'Эмодзи и иконки',
        label: chunk.length > 1 ? `${chunk.length} элементов` : '1 элемент',
      });
    }
  });

  return groups;
}

export function getStickerGeneratedPageCount(config: StickerModuleConfig) {
  return config.sourceMode === 'ready-sheet'
    ? Math.max(0, config.readySheets?.length ?? 0)
    : buildAutoStickerPageGroups(config).length;
}

export function isUploadedStickerAsset(asset: StickerAsset | StickerUploadAssetMeta): asset is StickerUploadAssetMeta {
  return 'storageId' in asset;
}
