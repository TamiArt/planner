import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createDefaultModulesConfig,
  createModulesFromSections,
  createSectionsFromModules,
  getModuleIdsInOrder,
  normalizeModulesConfig,
} from '../src/core/config/moduleState';

test('keeps locked modules enabled during normalization', () => {
  const modules = normalizeModulesConfig({
    background: { enabled: false },
    monthly: { enabled: false },
    weekly: { enabled: false },
  });

  assert.equal(modules.background.enabled, true);
  assert.equal(modules.monthly.enabled, true);
  assert.equal(modules.weekly.enabled, true);
});

test('migrates legacy year module id to year-overview', () => {
  const modules = normalizeModulesConfig({
    year: {
      enabled: false,
      count: 3,
      options: { variant: 'legacy-year' },
    },
  });

  assert.equal(modules['year-overview'].enabled, false);
  assert.equal(modules['year-overview'].count, 3);
  assert.equal(modules['year-overview'].options?.count, 3);
  assert.equal(modules['year-overview'].options?.variant, 'legacy-year');
});

test('normalizes negative and fractional module counts', () => {
  const modules = normalizeModulesConfig({
    daily: { count: -4 },
    notes: { count: 3.9 },
  });

  assert.equal(modules.daily.count, 0);
  assert.equal(modules.daily.options?.count, 0);
  assert.equal(modules.notes.count, 3);
  assert.equal(modules.notes.options?.count, 3);
});

test('orders modules by configured order without dropping registry modules', () => {
  const defaults = createDefaultModulesConfig();
  const ordered = getModuleIdsInOrder({
    ...defaults,
    stickers: { ...defaults.stickers, order: -10 },
    daily: { ...defaults.daily, order: 100 },
  });

  assert.equal(ordered[0], 'stickers');
  assert.equal(ordered.at(-1), 'daily');
  assert.equal(new Set(ordered).size, ordered.length);
  assert.equal(ordered.length, Object.keys(defaults).length);
});

test('round-trips section state through module config', () => {
  const defaults = createDefaultModulesConfig();
  const sections = createSectionsFromModules(defaults).map((section) =>
    section.type === 'notes'
      ? { ...section, enabled: false, count: 7, variant: 'notes-custom' }
      : section,
  );
  const modules = createModulesFromSections(sections, defaults);
  const roundTripped = createSectionsFromModules(modules);
  const notes = roundTripped.find((section) => section.type === 'notes');

  assert.ok(notes);
  assert.equal(notes.enabled, false);
  assert.equal(notes.count, 7);
  assert.equal(notes.variant, 'notes-custom');
});
