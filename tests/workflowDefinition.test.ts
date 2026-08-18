import assert from 'node:assert/strict';
import test from 'node:test';
import { buildWorkflowStepItems, getPreferredPreviewSection } from '../src/components/builder/workflowDefinition';

const baseInput = {
  config: { mode: 'dated' as const, year: 2026 },
  astrologyCityName: 'Москва',
  moonPhasesEnabled: true,
  moonPhaseDataReady: true,
  astrologyDataReady: true,
  enabledSectionsCount: 6,
  themeName: 'Минимал',
  backgroundName: 'Бумага',
  layoutEditorEnabled: true,
  layoutCount: 2,
  stickersEnabled: true,
  stickerPageCount: 3,
  pageCount: 120,
  tabCount: 16,
  exportStatusLabel: 'Готов к экспорту',
  exportReady: true,
  ayanamsaLabel: 'Лахири',
};

test('foundation requires a year only for dated mode', () => {
  const dated = buildWorkflowStepItems({ ...baseInput, config: { mode: 'dated', year: undefined } });
  assert.equal(dated.find((step) => step.id === 'foundation')?.status, 'attention');

  const undated = buildWorkflowStepItems({ ...baseInput, config: { mode: 'undated', year: undefined } });
  assert.equal(undated.find((step) => step.id === 'foundation')?.status, 'ready');
});

test('astrology warns when required calculated data is missing', () => {
  const items = buildWorkflowStepItems({ ...baseInput, astrologyDataReady: false });
  assert.equal(items.find((step) => step.id === 'astrology')?.status, 'attention');
});

test('sticker status distinguishes disabled, empty and ready states', () => {
  const disabled = buildWorkflowStepItems({ ...baseInput, stickersEnabled: false, stickerPageCount: 0 });
  const empty = buildWorkflowStepItems({ ...baseInput, stickersEnabled: true, stickerPageCount: 0 });
  const ready = buildWorkflowStepItems(baseInput);

  assert.equal(disabled.find((step) => step.id === 'stickers')?.status, 'neutral');
  assert.equal(empty.find((step) => step.id === 'stickers')?.status, 'attention');
  assert.equal(ready.find((step) => step.id === 'stickers')?.status, 'ready');
});

test('astrology preview preference keeps the original weekly/daily fallback order', () => {
  assert.equal(getPreferredPreviewSection('astrology', true, true, 'full-icons'), 'weekly');
  assert.equal(getPreferredPreviewSection('astrology', true, true, 'compact-icons'), 'daily');
  assert.equal(getPreferredPreviewSection('astrology', true, false, 'compact-icons'), 'weekly');
  assert.equal(getPreferredPreviewSection('astrology', false, false, 'compact-icons'), 'monthly');
  assert.equal(getPreferredPreviewSection('design', false, false, 'compact-icons'), 'monthly');
});
