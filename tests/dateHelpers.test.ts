import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDailyDescriptors,
  buildYearCalendar,
  formatWeekRange,
  getDaysInMonth,
  getMonthCalendar,
} from '../src/lib/navigation/dateHelpers';

test('builds leap-year calendar with 366 unique dated days', () => {
  const calendar = buildYearCalendar(2028);

  assert.equal(calendar.allDays.length, 366);
  assert.equal(new Set(calendar.allDays.map((day) => day.iso)).size, 366);
  assert.equal(calendar.months[1].daysInMonth, 29);
  assert.equal(getDaysInMonth(2028, 1), 29);
});

test('builds every month as a stable six-by-seven calendar grid', () => {
  const calendar = buildYearCalendar(2026);

  assert.equal(calendar.months.length, 12);
  calendar.months.forEach((month) => {
    assert.equal(month.grid.length, 6);
    month.grid.forEach((week) => assert.equal(week.length, 7));
    assert.equal(month.grid.flat().length, 42);
  });
});

test('keeps Monday as the first weekday in month grids', () => {
  const january = getMonthCalendar(2026, 0);

  january.grid.forEach((week) => {
    assert.equal(week[0].weekdayIndex, 0);
    assert.equal(week[6].weekdayIndex, 6);
  });
});

test('formats week ranges both within one month and across month boundary', () => {
  assert.equal(formatWeekRange(new Date(2026, 0, 5), new Date(2026, 0, 11)), '5-11 янв');
  assert.equal(formatWeekRange(new Date(2026, 0, 26), new Date(2026, 1, 1)), '26 янв - 1 февр');
});

test('distributes dated daily pages without duplicates and preserves chronological order', () => {
  const pages = buildDailyDescriptors('dated', 2026, 30);
  const dates = pages.map((page) => page.iso);

  assert.equal(pages.length, 30);
  assert.equal(new Set(dates).size, 30);
  assert.ok(dates.every(Boolean));
  assert.deepEqual([...dates].sort(), dates);
  assert.equal(dates[0], '2026-01-01');
  assert.equal(dates.at(-1), '2026-12-31');
});

test('clamps daily page count to available days and supports zero pages', () => {
  assert.equal(buildDailyDescriptors('dated', 2026, 0).length, 0);
  assert.equal(buildDailyDescriptors('dated', 2026, 999).length, 365);
  assert.equal(buildDailyDescriptors('dated', 2028, 999).length, 366);
});

test('keeps undated daily pages free of concrete dates', () => {
  const pages = buildDailyDescriptors('undated', 2026, 12);

  assert.equal(pages.length, 12);
  pages.forEach((page) => {
    assert.equal(page.date, undefined);
    assert.equal(page.iso, undefined);
    assert.match(page.label, /Гибкий дневной шаблон/);
  });
});
