import {
  addDays as addDaysFn,
  eachDayOfInterval,
  eachWeekOfInterval,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  getDay,
  getDaysInMonth as getDaysInMonthFn,
  getMonth,
  getYear,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns';
import { ru } from 'date-fns/locale';

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function cleanShortMonth(value: string) {
  return capitalize(value.replace('.', ''));
}

function toWeekdayIndex(date: Date) {
  const day = getDay(date);
  return day === 0 ? 6 : day - 1;
}

function toIsoDate(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

const RU_WEEKDAY_SHORT_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const;

function formatWeekdayShort(date: Date) {
  return RU_WEEKDAY_SHORT_LABELS[toWeekdayIndex(date)];
}

function formatWeekdayLong(date: Date) {
  return capitalize(format(date, 'EEEE', { locale: ru }));
}

export const RU_MONTHS = Array.from({ length: 12 }, (_, monthIndex) =>
  capitalize(format(new Date(2026, monthIndex, 1), 'LLLL', { locale: ru })),
);

export const RU_MONTHS_GENITIVE = Array.from({ length: 12 }, (_, monthIndex) =>
  format(new Date(2026, monthIndex, 1), 'd MMMM', { locale: ru }).replace(/^\d+\s+/, ''),
);

export const RU_MONTHS_SHORT = Array.from({ length: 12 }, (_, monthIndex) =>
  cleanShortMonth(format(new Date(2026, monthIndex, 1), 'LLL', { locale: ru })),
);

export const RU_WEEKDAYS = [...RU_WEEKDAY_SHORT_LABELS] as [string, string, string, string, string, string, string];

export interface CalendarDayDescriptor {
  date: Date;
  iso: string;
  year: number;
  monthIndex: number;
  dayOfMonth: number;
  weekdayIndex: number;
  weekdayLabel: string;
  weekdayLong: string;
  monthLabel: string;
  monthLabelShort: string;
  title: string;
  shortLabel: string;
}

export interface MonthCalendarCell {
  date: Date;
  iso: string;
  dayOfMonth: number;
  monthIndex: number;
  weekdayIndex: number;
  inCurrentMonth: boolean;
}

export interface MonthCalendarDescriptor {
  year: number;
  monthIndex: number;
  title: string;
  shortTitle: string;
  genitiveTitle: string;
  daysInMonth: number;
  days: CalendarDayDescriptor[];
  grid: MonthCalendarCell[][];
}

export interface WeekDescriptor {
  index: number;
  monthIndex: number;
  start: Date;
  end: Date;
  startIso: string;
  endIso: string;
  title: string;
  label: string;
  days: CalendarDayDescriptor[];
}

export interface DailyDescriptor {
  index: number;
  monthIndex: number;
  date?: Date;
  iso?: string;
  weekdayIndex?: number;
  weekdayLabel?: string;
  dayOfMonth?: number;
  title: string;
  label: string;
}

export interface PlannerYearCalendar {
  year: number;
  months: MonthCalendarDescriptor[];
  weeks: WeekDescriptor[];
  allDays: CalendarDayDescriptor[];
}

export interface PlannerCalendar extends PlannerYearCalendar {
  dailyPages: DailyDescriptor[];
}

const yearCalendarCache = new Map<number, PlannerYearCalendar>();
const plannerCalendarCache = new Map<string, PlannerCalendar>();

function createCalendarDay(date: Date): CalendarDayDescriptor {
  return {
    date,
    iso: toIsoDate(date),
    year: getYear(date),
    monthIndex: getMonth(date),
    dayOfMonth: date.getDate(),
    weekdayIndex: toWeekdayIndex(date),
    weekdayLabel: formatWeekdayShort(date),
    weekdayLong: formatWeekdayLong(date),
    monthLabel: capitalize(format(date, 'LLLL', { locale: ru })),
    monthLabelShort: cleanShortMonth(format(date, 'LLL', { locale: ru })),
    title: format(date, "d MMMM yyyy 'года'", { locale: ru }),
    shortLabel: format(date, 'd MMMM', { locale: ru }),
  };
}

function buildMonthGrid(year: number, monthIndex: number) {
  const monthStart = startOfMonth(new Date(year, monthIndex, 1));
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const cells = Array.from({ length: 42 }, (_, index) => {
    const date = addDaysFn(gridStart, index);

    return {
      date,
      iso: toIsoDate(date),
      dayOfMonth: date.getDate(),
      monthIndex: getMonth(date),
      weekdayIndex: toWeekdayIndex(date),
      inCurrentMonth: getMonth(date) === monthIndex,
    } satisfies MonthCalendarCell;
  });

  return Array.from({ length: 6 }, (_, rowIndex) => cells.slice(rowIndex * 7, rowIndex * 7 + 7));
}

function createMonthDescriptor(year: number, monthIndex: number): MonthCalendarDescriptor {
  const monthStart = startOfMonth(new Date(year, monthIndex, 1));
  const monthEnd = endOfMonth(monthStart);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd }).map(createCalendarDay);

  return {
    year,
    monthIndex,
    title: capitalize(format(monthStart, 'LLLL', { locale: ru })),
    shortTitle: cleanShortMonth(format(monthStart, 'LLL', { locale: ru })),
    genitiveTitle: format(monthStart, 'LLLL', { locale: ru }),
    daysInMonth: getDaysInMonthFn(monthStart),
    days,
    grid: buildMonthGrid(year, monthIndex),
  };
}

export function formatWeekRange(start: Date, end: Date) {
  if (start.getMonth() === end.getMonth()) {
    return `${format(start, 'd', { locale: ru })}-${format(end, 'd', { locale: ru })} ${cleanShortMonth(
      format(end, 'LLL', { locale: ru }),
    ).toLowerCase()}`;
  }

  return `${format(start, 'd', { locale: ru })} ${cleanShortMonth(format(start, 'LLL', { locale: ru })).toLowerCase()} - ${format(
    end,
    'd',
    { locale: ru },
  )} ${cleanShortMonth(format(end, 'LLL', { locale: ru })).toLowerCase()}`;
}

function buildWeekDescriptors(year: number) {
  const yearStart = startOfYear(new Date(year, 0, 1));
  const yearEnd = endOfYear(yearStart);

  return eachWeekOfInterval(
    { start: yearStart, end: yearEnd },
    { weekStartsOn: 1 },
  ).map((weekStart, index) => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd }).map(createCalendarDay);
    const pivotDay = days[3] ?? days[0];

    return {
      index,
      monthIndex: pivotDay.monthIndex,
      start: weekStart,
      end: weekEnd,
      startIso: toIsoDate(weekStart),
      endIso: toIsoDate(weekEnd),
      title: `Неделя ${String(index + 1).padStart(2, '0')}`,
      label: formatWeekRange(weekStart, weekEnd),
      days,
    } satisfies WeekDescriptor;
  });
}

function selectDistributedDays(days: CalendarDayDescriptor[], count: number) {
  const normalizedCount = Math.min(Math.max(0, count), days.length);

  if (normalizedCount === 0) {
    return [] as CalendarDayDescriptor[];
  }

  if (normalizedCount === 1) {
    return [days[0]];
  }

  const step = (days.length - 1) / (normalizedCount - 1);
  const usedIndexes = new Set<number>();
  const selectedIndexes = Array.from({ length: normalizedCount }, (_, index) => {
    let candidate = Math.round(index * step);

    while (usedIndexes.has(candidate) && candidate < days.length - 1) {
      candidate += 1;
    }

    while (usedIndexes.has(candidate) && candidate > 0) {
      candidate -= 1;
    }

    usedIndexes.add(candidate);
    return candidate;
  }).sort((left, right) => left - right);

  return selectedIndexes.map((index) => days[index]);
}

function buildDailyDescriptorsFromDays(
  mode: 'dated' | 'undated',
  selectedDays: CalendarDayDescriptor[],
) {
  const monthCounters = new Map<number, number>();

  return selectedDays.map((day, index) => {
    const monthCounter = (monthCounters.get(day.monthIndex) ?? 0) + 1;
    monthCounters.set(day.monthIndex, monthCounter);

    if (mode === 'dated') {
      return {
        index,
        monthIndex: day.monthIndex,
        date: day.date,
        iso: day.iso,
        weekdayIndex: day.weekdayIndex,
        weekdayLabel: day.weekdayLong,
        dayOfMonth: day.dayOfMonth,
        title: day.title,
        label: `${day.weekdayLong} · Датированная страница`,
      } satisfies DailyDescriptor;
    }

    return {
      index,
      monthIndex: day.monthIndex,
      title: `${day.monthLabel} · День ${monthCounter}`,
      label: 'Гибкий дневной шаблон',
    } satisfies DailyDescriptor;
  });
}

export function addDays(date: Date, days: number) {
  return addDaysFn(date, days);
}

export function getDaysInMonth(year: number, monthIndex: number) {
  return getDaysInMonthFn(new Date(year, monthIndex, 1));
}

export function formatDateForLabel(date: Date) {
  return format(date, 'd MMMM', { locale: ru });
}

export function buildYearCalendar(year: number): PlannerYearCalendar {
  const cached = yearCalendarCache.get(year);

  if (cached) {
    return cached;
  }

  const months = Array.from({ length: 12 }, (_, monthIndex) => createMonthDescriptor(year, monthIndex));
  const allDays = months.flatMap((month) => month.days);
  const weeks = buildWeekDescriptors(year);

  const calendar = {
    year,
    months,
    weeks,
    allDays,
  } satisfies PlannerYearCalendar;

  yearCalendarCache.set(year, calendar);
  return calendar;
}

export function buildPlannerCalendar(mode: 'dated' | 'undated', year: number, dailyCount: number): PlannerCalendar {
  const cacheKey = `${mode}:${year}:${dailyCount}`;
  const cached = plannerCalendarCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const yearCalendar = buildYearCalendar(year);
  const selectedDays = selectDistributedDays(yearCalendar.allDays, dailyCount);
  const dailyPages = buildDailyDescriptorsFromDays(mode, selectedDays);
  const calendar = {
    ...yearCalendar,
    dailyPages,
  } satisfies PlannerCalendar;

  plannerCalendarCache.set(cacheKey, calendar);
  return calendar;
}

export function getMonthCalendar(year: number, monthIndex: number) {
  return buildYearCalendar(year).months[monthIndex];
}

export function getWeekCalendar(year: number, weekIndex: number) {
  return buildYearCalendar(year).weeks[weekIndex];
}

export function buildDatedWeekDescriptors(year: number): WeekDescriptor[] {
  return buildYearCalendar(year).weeks;
}

export function buildDailyDescriptors(mode: 'dated' | 'undated', year: number, count: number): DailyDescriptor[] {
  return buildPlannerCalendar(mode, year, count).dailyPages;
}
