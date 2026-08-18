import assert from 'node:assert/strict';
import test from 'node:test';
import { isPlannerStorageKey, PLANNER_STORAGE_KEY } from '../src/store/usePlannerStorageSync';

test('planner cross-tab sync reacts only to the persisted planner key', () => {
  assert.equal(isPlannerStorageKey(PLANNER_STORAGE_KEY), true);
  assert.equal(isPlannerStorageKey('other-key'), false);
  assert.equal(isPlannerStorageKey(null), false);
});
