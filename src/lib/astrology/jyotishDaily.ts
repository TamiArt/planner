import { Body, EclipticLongitude, MoonPhase, Observer, SearchRiseSet } from 'astronomy-engine';
import type {
  AstrologyDayEnergy,
  AstrologyDayFocus,
  AstrologyNakshatraType,
  AstrologyPlanetDay,
  AstrologyTithiType,
  PlannerAstrologyConfig,
  PlannerAstrologyDataConfig,
  PlannerAstrologyDayEntry,
  PlannerConfig,
} from '../../types/planner';
import { getCapitalCityById } from './capitalCities';

const NAKSHATRA_SPAN_DEGREES = 360 / 27;

export const ASTROLOGY_LAYER_LABELS = {
  moon: 'Луна',
  tithi: 'Титхи',
  nakshatra: 'Накшатра',
  planet: 'Планета дня',
  energy: 'Энергия дня',
  focus: 'Фокус дня',
} as const;

export const TITHI_TYPE_META: Record<AstrologyTithiType, { icon: string; label: string; range: string }> = {
  start: { icon: 'rocket', label: 'старт', range: '1-5' },
  active: { icon: 'person-running', label: 'рост / активность', range: '6-10' },
  cleansing: { icon: 'broom', label: 'очищение', range: '11' },
  peak: { icon: 'high-voltage', label: 'пик / напряжение', range: '12-15' },
};

export const NAKSHATRA_TYPE_META: Record<AstrologyNakshatraType, { icon: string; label: string }> = {
  start: { icon: 'seedling', label: 'стартовые' },
  soft: { icon: 'herb', label: 'мягкие' },
  sharp: { icon: 'crossed-swords', label: 'резкие' },
  active: { icon: 'bow-and-arrow', label: 'активные' },
  heavy: { icon: 'rock', label: 'тяжёлые' },
};

export const PLANET_DAY_META: Record<AstrologyPlanetDay, { icon: string; label: string }> = {
  sun: { icon: 'sun', label: 'Солнце' },
  moon: { icon: 'crescent-moon', label: 'Луна' },
  mars: { icon: 'fire', label: 'Марс' },
  mercury: { icon: 'writing-hand', label: 'Меркурий' },
  jupiter: { icon: 'books', label: 'Юпитер' },
  venus: { icon: 'two-hearts', label: 'Венера' },
  saturn: { icon: 'rock', label: 'Сатурн' },
};

export const ENERGY_META: Record<AstrologyDayEnergy, { icon: string; label: string }> = {
  growth: { icon: 'seedling', label: 'лёгкий рост' },
  calm: { icon: 'herb', label: 'спокойствие' },
  active: { icon: 'person-running', label: 'активность' },
  tension: { icon: 'crossed-swords', label: 'напряжение' },
  heavy: { icon: 'rock', label: 'тяжесть' },
};

export const FOCUS_META: Record<AstrologyDayFocus, { icon: string; label: string }> = {
  action: { icon: 'person-running', label: 'действие' },
  communication: { icon: 'speech-balloon', label: 'общение' },
  creativity: { icon: 'artist-palette', label: 'творчество' },
  cleansing: { icon: 'broom', label: 'очищение' },
  rest: { icon: 'person-in-bed', label: 'отдых' },
};

export const NAKSHATRA_NAMES = [
  'Ашвини',
  'Бхарани',
  'Криттика',
  'Рохини',
  'Мригашира',
  'Ардра',
  'Пунарвасу',
  'Пушья',
  'Ашлеша',
  'Магха',
  'Пурва Пхалгуни',
  'Уттара Пхалгуни',
  'Хаста',
  'Читра',
  'Свати',
  'Вишакха',
  'Анурадха',
  'Джйештха',
  'Мула',
  'Пурва Ашадха',
  'Уттара Ашадха',
  'Шравана',
  'Дхаништха',
  'Шатабхиша',
  'Пурва Бхадрапада',
  'Уттара Бхадрапада',
  'Ревати',
] as const;

const NAKSHATRA_TYPES: AstrologyNakshatraType[] = [
  'start',
  'heavy',
  'sharp',
  'soft',
  'soft',
  'sharp',
  'start',
  'start',
  'sharp',
  'active',
  'soft',
  'active',
  'start',
  'active',
  'active',
  'active',
  'soft',
  'heavy',
  'heavy',
  'active',
  'heavy',
  'soft',
  'active',
  'sharp',
  'heavy',
  'heavy',
  'soft',
];

const WEEKDAY_PLANETS: AstrologyPlanetDay[] = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'];

function normalizeDegrees(value: number) {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function getIsoParts(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  return { year, month, day };
}

function getTimeZoneParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const hour = value('hour');
  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour: hour === 24 ? 0 : hour,
    minute: value('minute'),
    second: value('second'),
  };
}

function zonedTimeToUtcDate(year: number, month: number, day: number, hour: number, minute: number, timezone: string) {
  const targetUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  let utcMillis = targetUtc;

  for (let index = 0; index < 4; index += 1) {
    const parts = getTimeZoneParts(new Date(utcMillis), timezone);
    const localAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    utcMillis -= localAsUtc - targetUtc;
  }

  return new Date(utcMillis);
}

function getDaysInYear(year: number) {
  const result: string[] = [];
  const cursor = new Date(Date.UTC(year, 0, 1));

  while (cursor.getUTCFullYear() === year) {
    result.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return result;
}

function getDecimalYear(date: Date) {
  const year = date.getUTCFullYear();
  const start = Date.UTC(year, 0, 1);
  const next = Date.UTC(year + 1, 0, 1);
  return year + (date.getTime() - start) / (next - start);
}

function calculateLahiriAyanamsa(date: Date) {
  const tropicalYear = getDecimalYear(date);
  const centuriesFrom1900 = (tropicalYear - 1900) / 100;
  return normalizeDegrees(22.460148 + 1.396042 * centuriesFrom1900 + 0.000087 * centuriesFrom1900 * centuriesFrom1900);
}

function findLocalSunrise(iso: string, latitude: number, longitude: number, timezone: string) {
  const { year, month, day } = getIsoParts(iso);
  const localMidnightUtc = zonedTimeToUtcDate(year, month, day, 0, 0, timezone);
  const localNoonUtc = zonedTimeToUtcDate(year, month, day, 12, 0, timezone);
  const observer = new Observer(latitude, longitude, 0);
  return SearchRiseSet(Body.Sun, observer, 1, localMidnightUtc, 1.25)?.date ?? localNoonUtc;
}

function getTithiType(pakshaNumber: number): AstrologyTithiType {
  if (pakshaNumber <= 5) {
    return 'start';
  }

  if (pakshaNumber <= 10) {
    return 'active';
  }

  if (pakshaNumber === 11) {
    return 'cleansing';
  }

  return 'peak';
}

function getPlanetDay(iso: string): AstrologyPlanetDay {
  const { year, month, day } = getIsoParts(iso);
  const weekdayIndex = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return WEEKDAY_PLANETS[weekdayIndex] ?? 'sun';
}

function addScore(scores: Record<AstrologyDayEnergy, number>, energy: AstrologyDayEnergy, value: number) {
  scores[energy] += value;
}

function deriveEnergy(
  tithiType: AstrologyTithiType,
  nakshatraType: AstrologyNakshatraType,
  planetDay: AstrologyPlanetDay,
  moonAngle: number,
): AstrologyDayEnergy {
  const scores: Record<AstrologyDayEnergy, number> = {
    growth: 0,
    calm: 0,
    active: 0,
    tension: 0,
    heavy: 0,
  };

  const tithiEnergy: Record<AstrologyTithiType, AstrologyDayEnergy> = {
    start: 'growth',
    active: 'active',
    cleansing: 'calm',
    peak: 'tension',
  };
  addScore(scores, tithiEnergy[tithiType], 2);

  const nakshatraEnergy: Record<AstrologyNakshatraType, AstrologyDayEnergy> = {
    start: 'growth',
    soft: 'calm',
    sharp: 'tension',
    active: 'active',
    heavy: 'heavy',
  };
  addScore(scores, nakshatraEnergy[nakshatraType], 2);

  if (moonAngle < 20 || moonAngle > 340) {
    addScore(scores, 'growth', 1);
  } else if (moonAngle > 160 && moonAngle < 200) {
    addScore(scores, 'tension', 1);
  } else if (moonAngle > 180) {
    addScore(scores, 'calm', 1);
  } else {
    addScore(scores, 'growth', 1);
  }

  const planetEnergy: Record<AstrologyPlanetDay, AstrologyDayEnergy> = {
    sun: 'active',
    moon: 'calm',
    mars: 'active',
    mercury: 'active',
    jupiter: 'growth',
    venus: 'calm',
    saturn: 'heavy',
  };
  addScore(scores, planetEnergy[planetDay], 1);

  return (Object.keys(scores) as AstrologyDayEnergy[])
    .sort((left, right) => scores[right] - scores[left] || ['tension', 'heavy', 'active', 'growth', 'calm'].indexOf(left) - ['tension', 'heavy', 'active', 'growth', 'calm'].indexOf(right))[0];
}

function deriveFocus(
  tithiType: AstrologyTithiType,
  nakshatraType: AstrologyNakshatraType,
  planetDay: AstrologyPlanetDay,
  energy: AstrologyDayEnergy,
): AstrologyDayFocus {
  if (tithiType === 'cleansing') {
    return 'cleansing';
  }

  if (energy === 'heavy') {
    return 'rest';
  }

  if (planetDay === 'mercury') {
    return 'communication';
  }

  if (planetDay === 'venus' || planetDay === 'jupiter' || nakshatraType === 'soft') {
    return 'creativity';
  }

  if (energy === 'calm') {
    return 'rest';
  }

  return 'action';
}

export function calculateAstrologyDayEntry(iso: string, config: PlannerAstrologyConfig): PlannerAstrologyDayEntry | undefined {
  const city = getCapitalCityById(config.cityId);
  if (!city) {
    return undefined;
  }

  const sunrise = findLocalSunrise(iso, city.latitude, city.longitude, city.timezone);
  const moonAngle = normalizeDegrees(MoonPhase(sunrise));
  const tithiNumber = Math.min(30, Math.floor(moonAngle / 12) + 1);
  const tithiPakshaNumber = ((tithiNumber - 1) % 15) + 1;
  const tithiType = getTithiType(tithiPakshaNumber);
  const tropicalMoonLongitude = EclipticLongitude(Body.Moon, sunrise);
  const siderealMoonLongitude = normalizeDegrees(tropicalMoonLongitude - calculateLahiriAyanamsa(sunrise));
  const nakshatraIndex = Math.min(26, Math.floor(siderealMoonLongitude / NAKSHATRA_SPAN_DEGREES));
  const planetDay = getPlanetDay(iso);
  const nakshatraType = NAKSHATRA_TYPES[nakshatraIndex] ?? 'soft';
  const energy = deriveEnergy(tithiType, nakshatraType, planetDay, moonAngle);

  return {
    iso,
    cityId: city.id,
    timezone: city.timezone,
    sunriseInstant: sunrise.toISOString(),
    tithiNumber,
    tithiPakshaNumber,
    tithiType,
    nakshatraNumber: nakshatraIndex + 1,
    nakshatraName: NAKSHATRA_NAMES[nakshatraIndex] ?? 'Накшатра',
    nakshatraType,
    planetDay,
    energy,
    focus: deriveFocus(tithiType, nakshatraType, planetDay, energy),
  };
}

export function calculateAstrologyDataForYear(year: number, config: PlannerAstrologyConfig): PlannerAstrologyDataConfig {
  const city = getCapitalCityById(config.cityId);
  if (!city) {
    throw new Error('Выберите город из списка столиц для расчёта астрологии.');
  }

  return {
    source: 'astronomy-engine',
    year,
    cityId: city.id,
    timezone: city.timezone,
    ayanamsa: 'lahiri',
    calculationTime: 'sunrise',
    calculatedAt: new Date().toISOString(),
    entries: getDaysInYear(year)
      .map((iso) => calculateAstrologyDayEntry(iso, config))
      .filter((entry): entry is PlannerAstrologyDayEntry => Boolean(entry)),
  };
}

export function hasAstrologyDataForConfig(config: PlannerConfig) {
  const year = config.year;
  const data = config.astrology.data;

  return Boolean(
    config.mode === 'dated'
      && year
      && data
      && data.year === year
      && data.cityId === config.astrology.cityId
      && data.ayanamsa === 'lahiri'
      && data.calculationTime === 'sunrise'
      && data.entries.length >= 365,
  );
}

export function getAstrologyEntryForConfig(config: PlannerConfig, iso: string | undefined) {
  if (!iso || !hasAstrologyDataForConfig(config)) {
    return undefined;
  }

  return config.astrology.data?.entries.find((entry) => entry.iso === iso);
}
