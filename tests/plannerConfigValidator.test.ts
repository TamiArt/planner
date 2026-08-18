import assert from 'node:assert/strict';
import test from 'node:test';
import { createDefaultPlannerConfig } from '../src/lib/config/defaultPlannerConfig';
import { parsePlannerConfig, validatePlannerConfig } from '../src/lib/validators/plannerConfigValidator';

test('migrates legacy configs that omit newer optional module fields', () => {
  const current = createDefaultPlannerConfig();
  const legacy = { ...current } as Record<string, unknown>;

  delete legacy.modules;
  delete legacy.sections;
  delete legacy.layouts;
  delete legacy.background;
  delete legacy.astrology;
  delete legacy.moonPhases;
  delete legacy.backgroundOpacity;
  delete legacy.tabs;
  delete legacy.tabPosition;

  const parsed = parsePlannerConfig(legacy);
  assert.equal(parsed.success, true);

  if (!parsed.success) {
    return;
  }

  assert.equal(parsed.data.modules.index.enabled, true);
  assert.equal(parsed.data.sections.some((section) => section.type === 'index'), true);
  assert.equal(parsed.data.backgroundOpacity, 1);
  assert.equal(parsed.data.astrology.ayanamsa, 'lahiri');
  assert.equal(parsed.data.moonPhases.source, 'usno');
  assert.equal(parsed.data.tabPosition, 'right');
});

test('rejects a dated config without a year', () => {
  const config = createDefaultPlannerConfig();
  const result = parsePlannerConfig({ ...config, mode: 'dated', year: undefined });

  assert.equal(result.success, false);
});

test('normal validation stays clean for a freshly created default config', () => {
  const validation = validatePlannerConfig(createDefaultPlannerConfig());
  assert.deepEqual(validation.errors, []);
});
