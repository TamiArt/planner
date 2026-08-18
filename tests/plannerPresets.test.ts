import assert from 'node:assert/strict';
import test from 'node:test';
import { createDefaultPlannerConfig } from '../src/lib/config/defaultPlannerConfig';
import { applyPlannerPreset } from '../src/lib/config/plannerPresets';

function getSectionCount(config: ReturnType<typeof createDefaultPlannerConfig>, type: string) {
  return config.sections.find((section) => section.type === type)?.count;
}

function getSectionEnabled(config: ReturnType<typeof createDefaultPlannerConfig>, type: string) {
  return config.sections.find((section) => section.type === type)?.enabled;
}

test('soft-undated preset applies theme, mode and section counts', () => {
  const base = createDefaultPlannerConfig();
  const next = applyPlannerPreset(base, 'soft-undated');

  assert.equal(next.themeId, 'soft');
  assert.equal(next.theme, 'soft');
  assert.equal(next.mode, 'undated');
  assert.equal(next.year, undefined);
  assert.equal(next.modules.daily.enabled, true);
  assert.equal(next.modules.notes.count, 40);
  assert.equal(next.modules.checklist.count, 6);
  assert.equal(getSectionEnabled(next, 'daily'), true);
  assert.equal(getSectionCount(next, 'notes'), 40);
  assert.equal(getSectionCount(next, 'checklist'), 6);
});

test('dark-premium preset keeps dated year and applies premium counts', () => {
  const base = createDefaultPlannerConfig();
  base.year = 2032;
  const next = applyPlannerPreset(base, 'dark-premium');

  assert.equal(next.themeId, 'dark');
  assert.equal(next.theme, 'dark');
  assert.equal(next.mode, 'dated');
  assert.equal(next.year, 2032);
  assert.equal(next.modules.daily.enabled, false);
  assert.equal(next.modules.notes.count, 24);
  assert.equal(next.modules.checklist.count, 12);
  assert.equal(getSectionEnabled(next, 'daily'), false);
  assert.equal(getSectionCount(next, 'notes'), 24);
  assert.equal(getSectionCount(next, 'checklist'), 12);
});

test('minimal-dated preset restores minimal theme and expected module state', () => {
  const base = applyPlannerPreset(createDefaultPlannerConfig(), 'soft-undated');
  const next = applyPlannerPreset(base, 'minimal-dated');

  assert.equal(next.themeId, 'minimal');
  assert.equal(next.theme, 'minimal');
  assert.equal(next.mode, 'dated');
  assert.equal(next.modules.daily.enabled, false);
  assert.equal(next.modules.notes.count, 30);
  assert.equal(next.modules.checklist.count, 9);
  assert.equal(getSectionCount(next, 'notes'), 30);
  assert.equal(getSectionCount(next, 'checklist'), 9);
});
