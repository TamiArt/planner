import assert from 'node:assert/strict';
import test from 'node:test';
import { A4_PAPER_MM, getA4GuideRect, getA4PaperLabel } from '../src/modules/layout-editor/model/pageGuide';

test('uses physical A4 dimensions for both orientations', () => {
  assert.deepEqual(A4_PAPER_MM.landscape, { width: 297, height: 210 });
  assert.deepEqual(A4_PAPER_MM.portrait, { width: 210, height: 297 });
  assert.equal(getA4PaperLabel('landscape'), 'A4 · 297 × 210 мм');
  assert.equal(getA4PaperLabel('portrait'), 'A4 · 210 × 297 мм');
});

test('fits the landscape A4 guide inside the layout canvas without changing canvas geometry', () => {
  const guide = getA4GuideRect(2048, 1536, 'landscape');

  assert.equal(guide.x, 0);
  assert.equal(guide.width, 2048);
  assert.ok(guide.y > 0);
  assert.ok(guide.height < 1536);
  assert.ok(Math.abs((guide.width / guide.height) - (297 / 210)) < 0.000001);
});

test('centers a portrait A4 guide inside the existing landscape layout canvas', () => {
  const guide = getA4GuideRect(2048, 1536, 'portrait');

  assert.equal(guide.y, 0);
  assert.equal(guide.height, 1536);
  assert.ok(guide.x > 0);
  assert.ok(guide.width < 2048);
  assert.ok(Math.abs((guide.width / guide.height) - (210 / 297)) < 0.000001);
});
