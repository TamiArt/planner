import assert from 'node:assert/strict';
import test from 'node:test';
import { getThemeById, resolvePlannerThemeId } from '../src/lib/themes/themeRegistry';

test('keeps supported planner theme ids unchanged', () => {
  assert.equal(resolvePlannerThemeId('minimal'), 'minimal');
  assert.equal(resolvePlannerThemeId('soft'), 'soft');
  assert.equal(resolvePlannerThemeId('dark'), 'dark');
});

test('falls back to minimal for missing or unsupported legacy theme ids', () => {
  assert.equal(resolvePlannerThemeId(undefined), 'minimal');
  assert.equal(resolvePlannerThemeId('custom-theme'), 'minimal');
  assert.equal(resolvePlannerThemeId(42), 'minimal');
});

test('theme lookup still falls back to the first registered theme', () => {
  assert.equal(getThemeById('unknown-theme').id, 'minimal');
});
