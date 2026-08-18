import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveBackgroundIdForTheme } from '../src/lib/assets/assetRegistry';
import type { BackgroundAsset } from '../src/types/planner';

const customBackground: BackgroundAsset = {
  id: 'custom-background',
  name: 'Custom',
  type: 'color',
  source: '#ffffff',
  preview: '#ffffff',
  themeId: 'custom',
  isCustom: true,
  variant: 'custom-color',
  color: '#ffffff',
};

test('preserves a custom background only when it is currently selected', () => {
  assert.equal(
    resolveBackgroundIdForTheme('soft', customBackground.id, customBackground),
    customBackground.id,
  );
});

test('switches to the new theme default when custom background exists but is not selected', () => {
  assert.equal(
    resolveBackgroundIdForTheme('soft', 'minimal-paper', customBackground),
    'soft-paper',
  );
});

test('keeps an already valid background from the target theme', () => {
  assert.equal(resolveBackgroundIdForTheme('dark', 'dark-texture', customBackground), 'dark-texture');
});
