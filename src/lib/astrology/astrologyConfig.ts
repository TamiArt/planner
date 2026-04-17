import type {
  AstrologyLineDensity,
  AstrologyLinePresetId,
  PlannerAstrologyConfig,
  PlannerAstrologyDisplayConfig,
  PlannerAstrologyLayers,
} from '../../types/planner';
import { CAPITAL_CITY_OPTIONS, getCapitalCityById } from './capitalCities';

export const DEFAULT_ASTROLOGY_CITY_ID = 'moscow';
export const JYOTISH_AYANAMSA_LABEL = 'Lahiri Ayanamsa';
export const ASTROLOGY_CALCULATION_TIME_LABEL = 'локальный восход солнца';
export const ASTROLOGY_ICON_STYLE_LABEL = 'Emoji SVG';
export const ASTROLOGY_SOURCE_LABEL = 'Astronomy Engine';
export const ASTROLOGY_REFERENCE_LABEL = 'Swiss Ephemeris только для сверки методики';

export const DEFAULT_ASTROLOGY_LAYERS: PlannerAstrologyLayers = {
  moon: true,
  tithi: true,
  nakshatra: true,
  planet: true,
  energy: true,
  focus: true,
};

export const DEFAULT_ASTROLOGY_DISPLAY: PlannerAstrologyDisplayConfig = {
  weekPreset: 'full-icons',
  dayPreset: 'full-icons',
  lineDensity: 'standard',
};

export const ASTROLOGY_LINE_PRESET_LABELS: Record<AstrologyLinePresetId, string> = {
  'compact-icons': 'Компактные значки',
  'full-icons': 'Полная строка',
  'text-icons': 'Значки + подписи',
};

export const ASTROLOGY_LINE_DENSITY_LABELS: Record<AstrologyLineDensity, string> = {
  compact: 'Плотно',
  standard: 'Стандартно',
  wide: 'Свободно',
};

export function createDefaultAstrologyConfig(): PlannerAstrologyConfig {
  return {
    cityId: DEFAULT_ASTROLOGY_CITY_ID,
    ayanamsa: 'lahiri',
    calculationTime: 'sunrise',
    iconStyle: 'fluent-flat',
    includeLegend: false,
    layers: DEFAULT_ASTROLOGY_LAYERS,
    display: DEFAULT_ASTROLOGY_DISPLAY,
  };
}

export function normalizeAstrologyConfig(
  config: Partial<PlannerAstrologyConfig> | undefined,
): PlannerAstrologyConfig {
  const defaults = createDefaultAstrologyConfig();
  const cityId = typeof config?.cityId === 'string' && getCapitalCityById(config.cityId)
    ? config.cityId
    : defaults.cityId;
  const data = config?.data
    && config.data.cityId === cityId
    && config.data.ayanamsa === 'lahiri'
    && config.data.calculationTime === 'sunrise'
    && config.data.source === 'astronomy-engine'
    ? config.data
    : undefined;

  return {
    cityId,
    ayanamsa: 'lahiri',
    calculationTime: 'sunrise',
    iconStyle: 'fluent-flat',
    includeLegend: typeof config?.includeLegend === 'boolean' ? config.includeLegend : defaults.includeLegend,
    layers: {
      ...defaults.layers,
      ...(config?.layers ?? {}),
    },
    display: {
      ...defaults.display,
      ...(config?.display ?? {}),
    },
    data,
  };
}

export function getAstrologyCity(config: PlannerAstrologyConfig | undefined) {
  return getCapitalCityById(config?.cityId) ?? getCapitalCityById(DEFAULT_ASTROLOGY_CITY_ID) ?? CAPITAL_CITY_OPTIONS[0];
}
