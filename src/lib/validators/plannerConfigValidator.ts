import { z } from 'zod';
import { buildPlannerPlan } from '../navigation/buildPlannerPlan';
import { createDefaultModulesConfig } from '../../core/config/moduleState';
import { moduleRegistry } from '../../core/registry/moduleRegistry';
import type { PlannerConfig } from '../../core/types/planner';
import { getBackgroundsForTheme } from '../assets/assetRegistry';
import { normalizeBackgroundOpacity, normalizeHexColor } from '../assets/uploadBackground';
import {
  COVER_UPLOAD_SIZE,
  formatPlannerArtworkSize,
  PAGE_BACKGROUND_UPLOAD_SIZE,
} from '../assets/uploadPlannerArtwork';
import { syncPlannerConfig } from '../config/defaultPlannerConfig';
import { getStickerModuleConfig } from '../stickers/stickerModuleConfig';
import {
  isReadyStickerSheetSizeSupported,
  READY_SHEET_ALLOWED_DIMENSIONS_LABEL,
  READY_SHEET_MAX_SIZE_BYTES,
} from '../stickers/readySheetDimensions';
import { normalizePlannerLayouts } from '../../modules/layout-editor/model/normalizeLayouts';
import { CAPITAL_CITY_OPTIONS, getCapitalCityById } from '../astrology/capitalCities';
import { resolveAstrologyLocation } from '../astrology/astrologyConfig';

const AUTO_STICKER_MAX_SIZE_BYTES = 1_000_000;

const plannerSectionTypeSchema = z.enum([
  'cover',
  'index',
  'year',
  'monthly',
  'weekly',
  'daily',
  'notes',
  'checklist',
  'stickers',
]);

const plannerSectionSchema = z.object({
  type: plannerSectionTypeSchema,
  enabled: z.boolean(),
  variant: z.string().optional(),
  count: z.number().int().positive().optional(),
  options: z.record(z.unknown()).optional(),
});

const tabSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  target: z.string().min(1),
  kind: z.enum(['month', 'section']),
});

const backgroundAssetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['color', 'texture', 'image']),
  source: z.string().min(1),
  preview: z.string().min(1),
  themeId: z.string().min(1),
  isCustom: z.boolean().optional(),
  variant: z.enum(['theme-preset', 'custom-color', 'generated-gradient', 'uploaded-photo']).optional(),
  color: z.string().optional(),
  gradient: z.object({
    startColor: z.string().min(1),
    endColor: z.string().min(1),
    angle: z.number().finite(),
  }).optional(),
});

const plannerModuleStateSchema = z.object({
  enabled: z.boolean(),
  order: z.number().int().nonnegative(),
  count: z.number().int().nonnegative().optional(),
  options: z.record(z.unknown()).optional(),
});

const plannerUploadedPngAssetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  source: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  sizeBytes: z.number().int().nonnegative(),
});

const moonPhaseEventSchema = z.object({
  phase: z.enum(['new', 'first-quarter', 'full', 'last-quarter']),
  phaseName: z.string().min(1),
  year: z.number().int().min(1700).max(2100),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  time: z.string().min(1),
  iso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  instant: z.string().min(1),
});

const moonPhaseConfigSchema = z.object({
  enabled: z.boolean(),
  source: z.literal('usno'),
  sourceUrl: z.string().url(),
  fetchedAt: z.string().optional(),
  years: z.array(z.number().int().min(1700).max(2100)),
  events: z.array(moonPhaseEventSchema),
});

const astrologyLayersSchema = z.object({
  moon: z.boolean(),
  tithi: z.boolean(),
  nakshatra: z.boolean(),
  planet: z.boolean(),
  energy: z.boolean(),
  focus: z.boolean(),
});

const astrologyDisplaySchema = z.object({
  weekPreset: z.enum(['compact-icons', 'full-icons', 'text-icons']),
  dayPreset: z.enum(['compact-icons', 'full-icons', 'text-icons']),
  lineDensity: z.enum(['compact', 'standard', 'wide']),
});

const astrologyCustomCitySchema = z.object({
  name: z.string().min(1),
  country: z.string().optional(),
  timezone: z.string().min(1),
  latitude: z.string().min(1),
  longitude: z.string().min(1),
});

const astrologyDayEntrySchema = z.object({
  iso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cityId: z.string().min(1),
  locationMode: z.enum(['preset', 'custom']).optional(),
  locationName: z.string().min(1).optional(),
  timezone: z.string().min(1),
  latitude: z.number().finite().optional(),
  longitude: z.number().finite().optional(),
  sunriseInstant: z.string().min(1),
  tithiNumber: z.number().int().min(1).max(30),
  tithiPakshaNumber: z.number().int().min(1).max(15),
  tithiType: z.enum(['start', 'active', 'cleansing', 'peak']),
  nakshatraNumber: z.number().int().min(1).max(27),
  nakshatraName: z.string().min(1),
  nakshatraType: z.enum(['start', 'soft', 'sharp', 'active', 'heavy']),
  planetDay: z.enum(['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn']),
  energy: z.enum(['growth', 'calm', 'active', 'tension', 'heavy']),
  focus: z.enum(['action', 'communication', 'creativity', 'cleansing', 'rest']),
});

const astrologyDataSchema = z.object({
  source: z.literal('astronomy-engine'),
  year: z.number().int().min(2020).max(2100),
  cityId: z.string().min(1),
  locationMode: z.enum(['preset', 'custom']).optional(),
  locationName: z.string().min(1).optional(),
  timezone: z.string().min(1),
  latitude: z.number().finite().optional(),
  longitude: z.number().finite().optional(),
  ayanamsa: z.literal('lahiri'),
  calculationTime: z.literal('sunrise'),
  calculatedAt: z.string().min(1),
  entries: z.array(astrologyDayEntrySchema),
});

const astrologyConfigSchema = z.object({
  cityMode: z.enum(['preset', 'custom']).optional(),
  cityId: z.string().min(1),
  customCity: astrologyCustomCitySchema.optional(),
  ayanamsa: z.literal('lahiri'),
  calculationTime: z.literal('sunrise').optional(),
  iconStyle: z.literal('fluent-flat').optional(),
  includeLegend: z.boolean().optional(),
  layers: astrologyLayersSchema.optional(),
  display: astrologyDisplaySchema.optional(),
  data: astrologyDataSchema.optional(),
});

function validatePlannerPngAsset(
  asset: z.infer<typeof plannerUploadedPngAssetSchema>,
  path: Array<string>,
  label: string,
  size: { width: number; height: number },
  context: z.RefinementCtx,
) {
  if (!asset.source.startsWith('data:image/png')) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path,
      message: `${label} должна храниться как встроенный PNG.`,
    });
  }

  if (asset.width !== size.width || asset.height !== size.height) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path,
      message: `${label} должна иметь размер ${formatPlannerArtworkSize(size)}.`,
    });
  }
}

export const plannerConfigSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().trim().min(1, 'Укажите название продукта.'),
    language: z.literal('ru'),
    mode: z.enum(['dated', 'undated']),
    year: z.number().int().min(2020).max(2100).optional(),
    themeId: z.string().min(1, 'Выберите тему.'),
    backgroundId: z.string().min(1, 'Выберите фон.'),
    backgroundOpacity: z.number().min(0).max(1).optional(),
    customBackground: backgroundAssetSchema.optional(),
    theme: z.enum(['minimal', 'soft', 'dark']).optional(),
    background: z.object({
      type: z.enum(['color', 'texture', 'image']),
      image: z.string().optional(),
      opacity: z.number().min(0).max(1).optional(),
      color: z.string().optional(),
    }).optional(),
    modules: z.record(z.string(), plannerModuleStateSchema).optional(),
    layouts: z.record(z.unknown()).optional(),
    coverId: z.string().optional(),
    coverImage: plannerUploadedPngAssetSchema.optional(),
    pageBackgroundImage: plannerUploadedPngAssetSchema.optional(),
    astrology: astrologyConfigSchema.optional(),
    moonPhases: moonPhaseConfigSchema.optional(),
    pageSize: z.literal('iPadLandscape'),
    orientation: z.literal('landscape'),
    sections: z.array(plannerSectionSchema).optional(),
    includeIndex: z.boolean().optional(),
    includeStickerSheets: z.boolean().optional(),
    tabs: z.array(tabSchema).optional(),
    tabPosition: z.enum(['right', 'top']).optional(),
    weekStartsOn: z.literal('monday'),
  })
  .superRefine((config, context) => {
    if (config.mode === 'dated' && !config.year) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['year'],
        message: 'Для датированного режима нужен год.',
      });
    }

    if (config.customBackground) {
      if (config.customBackground.type === 'image' && !config.customBackground.source.startsWith('data:image/')) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['customBackground'],
          message: 'Пользовательский фото-фон должен храниться как встроенное изображение.',
        });
      }

      if (config.customBackground.type === 'color') {
        try {
          normalizeHexColor(config.customBackground.source);
        } catch {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['customBackground'],
            message: 'Пользовательский цветовой фон должен храниться как HEX-цвет.',
          });
        }
      }

      if (config.customBackground.variant === 'generated-gradient') {
        if (config.customBackground.type !== 'image' || !config.customBackground.source.startsWith('data:image/')) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['customBackground'],
            message: 'Пользовательский градиентный фон должен храниться как встроенное изображение.',
          });
        }
      }
    }

    if (config.coverImage) {
      validatePlannerPngAsset(config.coverImage, ['coverImage'], 'Обложка', COVER_UPLOAD_SIZE, context);
    }

    if (config.pageBackgroundImage) {
      validatePlannerPngAsset(
        config.pageBackgroundImage,
        ['pageBackgroundImage'],
        'Фон листов',
        PAGE_BACKGROUND_UPLOAD_SIZE,
        context,
      );
    }
  });

export interface PlannerValidationResult {
  errors: string[];
  warnings: string[];
}

function normalizeValidatedConfig(config: z.infer<typeof plannerConfigSchema>) {
  return syncPlannerConfig({
    ...config,
    modules: (config.modules as PlannerConfig['modules'] | undefined) ?? createDefaultModulesConfig(),
    layouts: config.layouts as PlannerConfig['layouts'],
    sections: config.sections ?? [],
    includeIndex: config.includeIndex ?? true,
    includeStickerSheets: config.includeStickerSheets ?? true,
    backgroundOpacity: normalizeBackgroundOpacity(config.backgroundOpacity),
    tabs: config.tabs ?? [],
    tabPosition: config.tabPosition ?? 'right',
    astrology: config.astrology,
    moonPhases: config.moonPhases,
  } as PlannerConfig);
}

export function parsePlannerConfig(raw: unknown) {
  const parsed = plannerConfigSchema.safeParse(raw);

  if (!parsed.success) {
    return parsed;
  }

  return {
    ...parsed,
    data: normalizeValidatedConfig(parsed.data),
  };
}

export function validatePlannerConfig(config: PlannerConfig): PlannerValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const parsed = plannerConfigSchema.safeParse(config);

  if (!parsed.success) {
    parsed.error.issues.forEach((issue) => {
      errors.push(issue.message);
    });

    return {
      errors: Array.from(new Set(errors)),
      warnings,
    };
  }

  const validConfig = normalizeValidatedConfig(parsed.data);
  const plan = buildPlannerPlan(validConfig);
  const layouts = normalizePlannerLayouts(validConfig.layouts);

  if (validConfig.includeStickerSheets && !validConfig.modules.stickers.enabled) {
    warnings.push('Флаг includeStickerSheets включён, но секция стикеров выключена. Будет использовано состояние секции.');
  }

  const themeBackgrounds = getBackgroundsForTheme(validConfig.themeId, validConfig.customBackground);
  if (!themeBackgrounds.some((item) => item.id === validConfig.backgroundId)) {
    errors.push('Выбранный фон не принадлежит текущей теме.');
  }

  if (validConfig.customBackground?.type === 'image' && validConfig.customBackground.source.length > 2_500_000) {
    warnings.push('Загруженный фон получился довольно тяжелым. При необходимости используйте фото меньшего размера.');
  }

  if (validConfig.astrology.cityMode === 'preset') {
    if (!getCapitalCityById(validConfig.astrology.cityId)) {
      errors.push('Для астрологических настроек выберите город из списка.');
    }

    if (CAPITAL_CITY_OPTIONS.length === 0) {
      errors.push('Список городов для астрологических настроек пуст.');
    }
  }

  if (validConfig.astrology.cityMode === 'custom' && !resolveAstrologyLocation(validConfig.astrology)) {
    errors.push('Для своего города заполните название, IANA-часовой пояс и корректные координаты.');
  }

  if (validConfig.moonPhases.enabled) {
    if (validConfig.mode !== 'dated') {
      warnings.push('Фазы Луны включены, но недатированный режим не имеет конкретных дат.');
    }

    if (!validConfig.moonPhases.events.length) {
      warnings.push('Фазы Луны включены, но данные USNO еще не загружены.');
    }
  }

  if (validConfig.astrology.data) {
    const currentLocation = resolveAstrologyLocation(validConfig.astrology);

    if (currentLocation && validConfig.astrology.data.cityId !== currentLocation.cityId) {
      warnings.push('Астрологические данные рассчитаны для другого города. Пересчитайте год во вкладке “Астрология”.');
    }

    if (validConfig.year && validConfig.astrology.data.year !== validConfig.year) {
      warnings.push('Астрологические данные рассчитаны для другого года. Пересчитайте год во вкладке “Астрология”.');
    }
  }

  Object.entries(layouts).forEach(([target, layout]) => {
    layout.blocks.forEach((block) => {
      if (block.x < 0 || block.y < 0 || block.x + block.width > layout.width || block.y + block.height > layout.height) {
        errors.push(`Layout "${target}" содержит блок "${block.name ?? block.type}", выходящий за границы страницы.`);
      }
    });
  });

  const stickerConfig = getStickerModuleConfig(validConfig);
  if (validConfig.modules.stickers.enabled) {
    if (stickerConfig.sourceMode === 'auto-png-pack') {
      (stickerConfig.autoPngs ?? []).forEach((asset) => {
        if (asset.width < 300 || asset.height < 300) {
          errors.push(`PNG-стикер "${asset.name}" слишком маленький для авто-режима. Минимум — 300×300 px.`);
        }

        if (asset.width > 1000 || asset.height > 1000) {
          errors.push(`PNG-стикер "${asset.name}" превышает предел авто-режима 1000×1000 px.`);
        }

        if (asset.sizeBytes > AUTO_STICKER_MAX_SIZE_BYTES) {
          errors.push(`PNG-стикер "${asset.name}" превышает 1 MB.`);
        }
      });
    }

    if (stickerConfig.sourceMode === 'ready-sheet') {
      (stickerConfig.readySheets ?? []).forEach((sheet) => {
        if (!isReadyStickerSheetSizeSupported(sheet.width, sheet.height)) {
          errors.push(`Готовый лист "${sheet.name}" должен иметь размер ${READY_SHEET_ALLOWED_DIMENSIONS_LABEL}.`);
        }

        if (sheet.sizeBytes > READY_SHEET_MAX_SIZE_BYTES) {
          errors.push(`Готовый лист "${sheet.name}" превышает 5 MB.`);
        }
      });
    }

    const stickerPageCount = plan.pages.filter((page) => page.sectionType === 'stickers').length;
    if (stickerPageCount === 0) {
      errors.push('Модуль стикеров включен, но sticker pages не были построены.');
    }
  }

  moduleRegistry.forEach((module) => {
    module.validate?.({ config: validConfig }).forEach((message) => warnings.push(message));
  });

  const enabledModules = moduleRegistry.filter((module) => module.manifest.kind !== 'tool' && module.isEnabled(validConfig));
  if (enabledModules.length < 4) {
    warnings.push('Слишком мало активных модулей: итоговый планер может выглядеть неполным.');
  }

  if (plan.pages.length > 220) {
    warnings.push('Документ получается довольно большим. Проверьте, действительно ли нужен такой объем daily и notes страниц.');
  }

  return {
    errors: Array.from(new Set(errors)),
    warnings,
  };
}
