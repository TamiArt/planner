import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeAppHash, resolveAppView } from '../src/app/routeResolver';

test('keeps all existing hash routes unchanged', () => {
  assert.equal(resolveAppView('#/templates'), 'templates');
  assert.equal(resolveAppView('#/append-stickers'), 'append-stickers');
  assert.equal(resolveAppView('#/moon-phases-pdf'), 'moon-phases-pdf');
  assert.equal(resolveAppView('#/astrology-pdf'), 'astrology-pdf');
  assert.equal(resolveAppView('#/'), 'builder');
  assert.equal(resolveAppView(''), 'builder');
});

test('accepts harmless trailing slashes and hash query parameters', () => {
  assert.equal(resolveAppView('#/templates/'), 'templates');
  assert.equal(resolveAppView('#/append-stickers/?source=builder'), 'append-stickers');
  assert.equal(resolveAppView('#/moon-phases-pdf?year=2026'), 'moon-phases-pdf');
});

test('unknown routes safely fall back to the builder', () => {
  assert.equal(resolveAppView('#/unknown'), 'builder');
  assert.equal(normalizeAppHash('#///templates///'), '/templates');
});
