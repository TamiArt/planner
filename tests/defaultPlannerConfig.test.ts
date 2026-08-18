import assert from 'node:assert/strict';
import test from 'node:test';
import { createDefaultPlannerConfig, syncPlannerConfig } from '../src/lib/config/defaultPlannerConfig';
import type { BackgroundAsset } from '../src/types/planner';

const storedCustomBackground: BackgroundAsset = {
  id: 'custom-background',
  name: 'Stored custom background',
  type: 'color',
  source: '#ffffff',
  preview: '#ffffff',
  themeId: 'custom',
  isCustom: true,
  variant: 'custom-color',
  color: '#ffffff',
};

test('uses themeId as the canonical theme when legacy theme disagrees', () => {
  const base = createDefaultPlannerConfig();
  const normalized = syncPlannerConfig({
    ...base,
    theme: 'minimal',
    themeId: 'soft',
    backgroundId: 'soft-paper',
  });

  assert.equal(normalized.themeId, 'soft');
  assert.equal(normalized.theme, 'soft');
  assert.equal(normalized.backgroundId, 'soft-paper');
});

test('does not reactivate an unselected stored custom background', () => {
  const base = createDefaultPlannerConfig();
  const normalized = syncPlannerConfig({
    ...base,
    theme: 'soft',
    themeId: 'soft',
    backgroundId: 'missing-old-background',
    customBackground: storedCustomBackground,
  });

  assert.equal(normalized.backgroundId, 'soft-paper');
  assert.notEqual(normalized.backgroundId, storedCustomBackground.id);
});

test('keeps a custom background when it is explicitly selected', () => {
  const base = createDefaultPlannerConfig();
  const normalized = syncPlannerConfig({
    ...base,
    theme: 'dark',
    themeId: 'dark',
    backgroundId: storedCustomBackground.id,
    customBackground: storedCustomBackground,
  });

  assert.equal(normalized.backgroundId, storedCustomBackground.id);
});
