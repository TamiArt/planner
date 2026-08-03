import type {
  AstrologyCityMode,
  AstrologyLineDensity,
  AstrologyLinePresetId,
  PlannerAstrologyConfig,
  PlannerAstrologyCustomCity,
  PlannerAstrologyDataConfig,
  PlannerAstrologyDisplayConfig,
  PlannerAstrologyDayEntry,
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

export interface AstrologyLocationSummary {
  cityId: string;
  mode: AstrologyCityMode;
  name: string;
  country: string;
  timezone: string;
  latitudeText: string;
  longitudeText: string;
  latitude?: number;
  longitude?: number;
  isValid: boolean;
}

export interface ResolvedAstrologyLocation {
  cityId: string;
  mode: AstrologyCityMode;
  name: string;
  country: string;
  timezone: string;
  latitude: number;
  longitude: number;
}

function formatCoordinate(value: number) {
  const formatted = value.toFixed(4);
  return formatted.replace(/\.?0+$/, '');
}

function normalizeCoordinateInput(value: unknown, fallback: number) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return formatCoordinate(value);
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  return formatCoordinate(fallback);
}

function parseCoordinate(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const normalized = Number(value.replace(',', '.'));
  return Number.isFinite(normalized) ? normalized : undefined;
}

function isValidLatitude(value: number | undefined) {
  return typeof value === 'number' && value >= -90 && value <= 90;
}

function isValidLongitude(value: number | undefined) {
  return typeof value === 'number' && value >= -180 && value <= 180;
}

export function isValidIanaTimeZone(timezone: string | undefined) {
  if (!timezone) {
    return false;
  }

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function slugifyLocationPart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .slice(0, 48);
}

function createCustomLocationId(customCity: PlannerAstrologyCustomCity) {
  const latitude = parseCoordinate(customCity.latitude);
  const longitude = parseCoordinate(customCity.longitude);
  const latitudeLabel = typeof latitude === 'number' ? latitude.toFixed(4) : 'na';
  const longitudeLabel = typeof longitude === 'number' ? longitude.toFixed(4) : 'na';
  const name = slugifyLocationPart(customCity.name) || 'custom-city';
  const country = slugifyLocationPart(customCity.country ?? '') || 'custom-country';
  const timezone = customCity.timezone.trim() || 'unknown-timezone';

  return `custom:${name}:${country}:${timezone}:${latitudeLabel}:${longitudeLabel}`;
}

function normalizeCustomCity(
  customCity: Partial<PlannerAstrologyCustomCity> | undefined,
  fallbackCityId: string,
) {
  const fallbackCity = getCapitalCityById(fallbackCityId) ?? getCapitalCityById(DEFAULT_ASTROLOGY_CITY_ID) ?? CAPITAL_CITY_OPTIONS[0];

  return {
    name: typeof customCity?.name === 'string' ? customCity.name.trim() : fallbackCity?.name ?? 'Свой город',
    country: typeof customCity?.country === 'string' ? customCity.country.trim() : fallbackCity?.country ?? '',
    timezone: typeof customCity?.timezone === 'string' ? customCity.timezone.trim() : fallbackCity?.timezone ?? 'Europe/Moscow',
    latitude: normalizeCoordinateInput(customCity?.latitude, fallbackCity?.latitude ?? 0),
    longitude: normalizeCoordinateInput(customCity?.longitude, fallbackCity?.longitude ?? 0),
  } satisfies PlannerAstrologyCustomCity;
}

function normalizeAstrologyEntry(
  entry: PlannerAstrologyDayEntry,
  location: ResolvedAstrologyLocation,
): PlannerAstrologyDayEntry {
  return {
    ...entry,
    cityId: typeof entry.cityId === 'string' && entry.cityId ? entry.cityId : location.cityId,
    locationMode: entry.locationMode === 'custom' ? 'custom' : 'preset',
    locationName: typeof entry.locationName === 'string' && entry.locationName ? entry.locationName : location.name,
    timezone: typeof entry.timezone === 'string' && entry.timezone ? entry.timezone : location.timezone,
    latitude: typeof entry.latitude === 'number' && Number.isFinite(entry.latitude) ? entry.latitude : location.latitude,
    longitude: typeof entry.longitude === 'number' && Number.isFinite(entry.longitude) ? entry.longitude : location.longitude,
  };
}

function normalizeAstrologyData(
  data: PlannerAstrologyDataConfig | undefined,
  location: ResolvedAstrologyLocation | undefined,
) {
  if (
    !data
    || data.ayanamsa !== 'lahiri'
    || data.calculationTime !== 'sunrise'
    || data.source !== 'astronomy-engine'
    || !location
    || data.cityId !== location.cityId
  ) {
    return undefined;
  }

  return {
    ...data,
    locationMode: data.locationMode === 'custom' ? 'custom' : location.mode,
    locationName: typeof data.locationName === 'string' && data.locationName ? data.locationName : location.name,
    timezone: typeof data.timezone === 'string' && data.timezone ? data.timezone : location.timezone,
    latitude: typeof data.latitude === 'number' && Number.isFinite(data.latitude) ? data.latitude : location.latitude,
    longitude: typeof data.longitude === 'number' && Number.isFinite(data.longitude) ? data.longitude : location.longitude,
    entries: Array.isArray(data.entries)
      ? data.entries.map((entry) => normalizeAstrologyEntry(entry, location))
      : [],
  } satisfies PlannerAstrologyDataConfig;
}

function getAstrologyCityFromNormalized(config: Omit<PlannerAstrologyConfig, 'data'>): AstrologyLocationSummary {
  if (config.cityMode === 'custom') {
    const customCity = config.customCity ?? normalizeCustomCity(undefined, config.cityId);
    const latitude = parseCoordinate(customCity.latitude);
    const longitude = parseCoordinate(customCity.longitude);

    return {
      cityId: createCustomLocationId(customCity),
      mode: 'custom',
      name: customCity.name || 'Свой город',
      country: customCity.country || 'Пользовательский город',
      timezone: customCity.timezone || '',
      latitudeText: customCity.latitude || '',
      longitudeText: customCity.longitude || '',
      latitude,
      longitude,
      isValid:
        Boolean(customCity.name.trim())
        && isValidIanaTimeZone(customCity.timezone)
        && isValidLatitude(latitude)
        && isValidLongitude(longitude),
    };
  }

  const city = getCapitalCityById(config.cityId) ?? getCapitalCityById(DEFAULT_ASTROLOGY_CITY_ID) ?? CAPITAL_CITY_OPTIONS[0];

  return {
    cityId: city.id,
    mode: 'preset',
    name: city.name,
    country: city.country,
    timezone: city.timezone,
    latitudeText: formatCoordinate(city.latitude),
    longitudeText: formatCoordinate(city.longitude),
    latitude: city.latitude,
    longitude: city.longitude,
    isValid: true,
  };
}

function resolveAstrologyLocationFromNormalized(config: Omit<PlannerAstrologyConfig, 'data'>): ResolvedAstrologyLocation | undefined {
  const summary = getAstrologyCityFromNormalized(config);

  if (!summary.isValid || typeof summary.latitude !== 'number' || typeof summary.longitude !== 'number') {
    return undefined;
  }

  return {
    cityId: summary.cityId,
    mode: summary.mode,
    name: summary.name,
    country: summary.country,
    timezone: summary.timezone,
    latitude: summary.latitude,
    longitude: summary.longitude,
  };
}

export function createDefaultAstrologyConfig(): PlannerAstrologyConfig {
  return {
    cityMode: 'preset',
    cityId: DEFAULT_ASTROLOGY_CITY_ID,
    customCity: normalizeCustomCity(undefined, DEFAULT_ASTROLOGY_CITY_ID),
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
  const cityMode = config?.cityMode === 'custom' ? 'custom' : defaults.cityMode;
  const customCity = normalizeCustomCity(config?.customCity, cityId);
  const nextConfig = {
    cityMode,
    cityId,
    customCity,
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
  } satisfies Omit<PlannerAstrologyConfig, 'data'>;
  const data = normalizeAstrologyData(config?.data, resolveAstrologyLocationFromNormalized(nextConfig));

  return {
    ...nextConfig,
    data,
  };
}

export function getAstrologyCity(config: PlannerAstrologyConfig | undefined) {
  const normalized = normalizeAstrologyConfig(config);
  return getAstrologyCityFromNormalized({
    cityMode: normalized.cityMode,
    cityId: normalized.cityId,
    customCity: normalized.customCity,
    ayanamsa: normalized.ayanamsa,
    calculationTime: normalized.calculationTime,
    iconStyle: normalized.iconStyle,
    includeLegend: normalized.includeLegend,
    layers: normalized.layers,
    display: normalized.display,
  });
}

export function resolveAstrologyLocation(config: Partial<PlannerAstrologyConfig> | undefined): ResolvedAstrologyLocation | undefined {
  const normalized = normalizeAstrologyConfig(config);
  return resolveAstrologyLocationFromNormalized({
    cityMode: normalized.cityMode,
    cityId: normalized.cityId,
    customCity: normalized.customCity,
    ayanamsa: normalized.ayanamsa,
    calculationTime: normalized.calculationTime,
    iconStyle: normalized.iconStyle,
    includeLegend: normalized.includeLegend,
    layers: normalized.layers,
    display: normalized.display,
  });
}
