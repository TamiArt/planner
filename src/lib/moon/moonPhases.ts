import type {
  MoonPhaseEvent,
  MoonPhaseId,
  MoonPrimaryPhaseId,
  PlannerConfig,
  PlannerMoonPhaseConfig,
} from '../../types/planner';

export const MOON_PHASE_SOURCE_URL = 'https://aa.usno.navy.mil/api/moon/phases/year';
export const MOON_PHASE_SOURCE_DOCS_URL = 'https://aa.usno.navy.mil/data/api';

const USNO_SUPPORTED_MIN_YEAR = 1700;
const USNO_SUPPORTED_MAX_YEAR = 2100;

interface UsnoMoonPhaseResponse {
  error?: string;
  phasedata?: UsnoMoonPhaseRawEvent[];
}

interface UsnoMoonPhaseRawEvent {
  phase: string;
  year: number;
  month: number;
  day: number;
  time: string;
}

export interface MoonPhaseDisplay {
  id: MoonPhaseId;
  label: string;
  shortLabel: string;
}

export const MOON_PHASE_DISPLAY: Record<MoonPhaseId, MoonPhaseDisplay> = {
  new: {
    id: 'new',
    label: '🌑 ↑ Новолуние',
    shortLabel: '🌑 ↑',
  },
  'waxing-crescent': {
    id: 'waxing-crescent',
    label: '🌙 ↑ Растущий серп',
    shortLabel: '🌙 ↑',
  },
  'first-quarter': {
    id: 'first-quarter',
    label: '🌙 ↑ Первая четверть',
    shortLabel: '🌙 ↑',
  },
  'waxing-gibbous': {
    id: 'waxing-gibbous',
    label: '🌙 ↑ Растущая луна',
    shortLabel: '🌙 ↑',
  },
  full: {
    id: 'full',
    label: '🌕 ⚡ Полнолуние',
    shortLabel: '🌕 ⚡',
  },
  'waning-gibbous': {
    id: 'waning-gibbous',
    label: '🌙 ↓ Убывающая луна',
    shortLabel: '🌙 ↓',
  },
  'last-quarter': {
    id: 'last-quarter',
    label: '🌙 ↓ Последняя четверть',
    shortLabel: '🌙 ↓',
  },
  'waning-crescent': {
    id: 'waning-crescent',
    label: '🌙 ↓ Убывающий серп',
    shortLabel: '🌙 ↓',
  },
};

export function createDefaultMoonPhaseConfig(): PlannerMoonPhaseConfig {
  return {
    enabled: false,
    source: 'usno',
    sourceUrl: MOON_PHASE_SOURCE_DOCS_URL,
    years: [],
    events: [],
  };
}

export function normalizeMoonPhaseConfig(
  config: Partial<PlannerMoonPhaseConfig> | undefined,
): PlannerMoonPhaseConfig {
  const defaults = createDefaultMoonPhaseConfig();

  if (!config || typeof config !== 'object') {
    return defaults;
  }

  return {
    enabled: Boolean(config.enabled),
    source: config.source === 'usno' ? 'usno' : defaults.source,
    sourceUrl: typeof config.sourceUrl === 'string' && config.sourceUrl ? config.sourceUrl : defaults.sourceUrl,
    fetchedAt: typeof config.fetchedAt === 'string' ? config.fetchedAt : undefined,
    years: Array.isArray(config.years)
      ? Array.from(new Set(config.years.filter((year) => Number.isInteger(year)))).sort((left, right) => left - right)
      : [],
    events: Array.isArray(config.events)
      ? config.events
          .filter((event): event is MoonPhaseEvent => Boolean(event?.iso && event.instant && event.phase))
          .sort((left, right) => Date.parse(left.instant) - Date.parse(right.instant))
      : [],
  };
}

export function getRequiredMoonPhaseYears(year: number) {
  return [year - 1, year, year + 1]
    .filter((candidate) => candidate >= USNO_SUPPORTED_MIN_YEAR && candidate <= USNO_SUPPORTED_MAX_YEAR);
}

export function hasMoonPhaseDataForYear(config: PlannerMoonPhaseConfig | undefined, year: number) {
  if (!config?.events.length) {
    return false;
  }

  const loadedYears = new Set(config.years);
  return getRequiredMoonPhaseYears(year).every((requiredYear) => loadedYears.has(requiredYear));
}

function padDatePart(value: number) {
  return String(value).padStart(2, '0');
}

function toIsoDate(year: number, month: number, day: number) {
  return `${year}-${padDatePart(month)}-${padDatePart(day)}`;
}

function parseUsnoPhase(phase: string): MoonPrimaryPhaseId | undefined {
  const normalized = phase.toLowerCase().replace(/\s+/g, ' ').trim();

  if (normalized === 'new moon') {
    return 'new';
  }

  if (normalized === 'first quarter') {
    return 'first-quarter';
  }

  if (normalized === 'full moon') {
    return 'full';
  }

  if (normalized === 'last quarter' || normalized === 'third quarter') {
    return 'last-quarter';
  }

  return undefined;
}

function parseUsnoTime(time: string) {
  const match = time.match(/^(\d{1,2}):(\d{2})/);
  if (!match) {
    return { hour: 0, minute: 0 };
  }

  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
  };
}

function createPhaseEvent(raw: UsnoMoonPhaseRawEvent) {
  const phase = parseUsnoPhase(raw.phase);

  if (!phase) {
    return undefined;
  }

  const { hour, minute } = parseUsnoTime(raw.time);
  const instant = new Date(Date.UTC(raw.year, raw.month - 1, raw.day, hour, minute)).toISOString();

  return {
    phase,
    phaseName: raw.phase,
    year: raw.year,
    month: raw.month,
    day: raw.day,
    time: raw.time,
    iso: toIsoDate(raw.year, raw.month, raw.day),
    instant,
  } satisfies MoonPhaseEvent;
}

async function fetchUsnoYear(year: number) {
  const response = await fetch(`${MOON_PHASE_SOURCE_URL}?year=${year}`);

  if (!response.ok) {
    throw new Error(`USNO API вернул статус ${response.status} для ${year} года.`);
  }

  const payload = await response.json() as UsnoMoonPhaseResponse;

  if (payload.error) {
    throw new Error(payload.error);
  }

  return (payload.phasedata ?? [])
    .map(createPhaseEvent)
    .filter((event): event is MoonPhaseEvent => Boolean(event));
}

export async function fetchMoonPhaseData(year: number): Promise<PlannerMoonPhaseConfig> {
  const years = getRequiredMoonPhaseYears(year);
  const yearlyEvents = await Promise.all(years.map(fetchUsnoYear));
  const events = yearlyEvents.flat().sort((left, right) => Date.parse(left.instant) - Date.parse(right.instant));

  if (events.length === 0) {
    throw new Error('USNO API не вернул данные о фазах Луны.');
  }

  return {
    enabled: true,
    source: 'usno',
    sourceUrl: MOON_PHASE_SOURCE_DOCS_URL,
    fetchedAt: new Date().toISOString(),
    years,
    events,
  };
}

function derivePhaseAfter(primaryPhase: MoonPrimaryPhaseId): MoonPhaseId {
  switch (primaryPhase) {
    case 'new':
      return 'waxing-crescent';
    case 'first-quarter':
      return 'waxing-gibbous';
    case 'full':
      return 'waning-gibbous';
    case 'last-quarter':
      return 'waning-crescent';
  }
}

function derivePhaseBefore(primaryPhase: MoonPrimaryPhaseId): MoonPhaseId {
  switch (primaryPhase) {
    case 'new':
      return 'waning-crescent';
    case 'first-quarter':
      return 'waxing-crescent';
    case 'full':
      return 'waxing-gibbous';
    case 'last-quarter':
      return 'waning-gibbous';
  }
}

function getDayNoonUtc(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  return Date.UTC(year, month - 1, day, 12);
}

export function getMoonPhaseForIso(
  moonPhases: PlannerMoonPhaseConfig | undefined,
  iso: string | undefined,
): MoonPhaseDisplay | undefined {
  if (!moonPhases?.enabled || !iso || moonPhases.events.length === 0) {
    return undefined;
  }

  const exactPrimary = moonPhases.events.find((event) => event.iso === iso);
  if (exactPrimary) {
    return MOON_PHASE_DISPLAY[exactPrimary.phase];
  }

  const dayTime = getDayNoonUtc(iso);
  let previous: MoonPhaseEvent | undefined;
  let next: MoonPhaseEvent | undefined;

  for (const event of moonPhases.events) {
    const eventTime = Date.parse(event.instant);

    if (eventTime <= dayTime) {
      previous = event;
      continue;
    }

    next = event;
    break;
  }

  if (previous) {
    return MOON_PHASE_DISPLAY[derivePhaseAfter(previous.phase)];
  }

  if (next) {
    return MOON_PHASE_DISPLAY[derivePhaseBefore(next.phase)];
  }

  return undefined;
}

export function getMoonPhaseForConfig(config: PlannerConfig, iso: string | undefined) {
  if (config.mode !== 'dated') {
    return undefined;
  }

  return getMoonPhaseForIso(config.moonPhases, iso);
}
