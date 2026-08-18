import assert from 'node:assert/strict';
import test from 'node:test';
import { createDefaultPlannerConfig, syncPlannerConfig } from '../src/lib/config/defaultPlannerConfig';
import { getThemeById, resolvePlannerThemeId } from '../src/lib/themes/themeRegistry';

test('keeps supported planner theme ids unchanged', () => {
  assert.equal(resolvePlannerThemeId('minimal'), 'minimal');
  assert.equal(resolvePlannerThemeId('soft'), 'soft');
  assert.equal(resolvePlannerThemeId('dark'), 'dark');
});

test('falls back to a supported legacy theme before minimal', () => {
  assert.equal(resolvePlannerThemeId(undefined, 'soft'), 'soft');
  assert.equal(resolvePlannerThemeId('custom-theme', 'dark'), 'dark');
  assert.equal(resolvePlannerThemeId(42), 'minimal');
});

test('theme lookup still falls back to the first registered theme', () => {
  assert.equal(getThemeById('unknown-theme').id, 'minimal');
});

test('syncPlannerConfig treats themeId as the canonical user selection', () => {
  const config = createDefaultPlannerConfig();
  const synced = syncPlannerConfig({
    ...config,
    theme: 'minimal',
    themeId: 'soft',
  });

  assert.equal(synced.themeId, 'soft');
  assert.equal(synced.theme, 'soft');
  assert.match(synced.backgroundId, /^soft-/);
});
