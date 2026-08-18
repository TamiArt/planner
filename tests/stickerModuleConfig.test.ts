import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildAutoStickerPageGroups,
  DEFAULT_STICKER_MODULE_CONFIG,
  getStickerGeneratedPageCount,
  getStickerStorageIds,
  patchStickerModuleConfig,
} from '../src/lib/stickers/stickerModuleConfig';
import { createDefaultPlannerConfig } from '../src/lib/config/defaultPlannerConfig';
import type { StickerModuleConfig, StickerUploadAssetMeta } from '../src/types/planner';

function uploadedSticker(id: string, category: StickerUploadAssetMeta['category']): StickerUploadAssetMeta {
  return {
    id,
    name: `${id}.png`,
    category,
    storageId: `storage-${id}`,
    previewSource: `blob:${id}`,
    width: 128,
    height: 128,
    sizeBytes: 1024,
  };
}

test('splits uploaded sticker packs by maxItemsPerPage', () => {
  const config: StickerModuleConfig = {
    ...DEFAULT_STICKER_MODULE_CONFIG,
    categories: ['functional'],
    autoLayout: { ...DEFAULT_STICKER_MODULE_CONFIG.autoLayout, maxItemsPerPage: 2 },
    autoPngs: [
      uploadedSticker('a', 'functional'),
      uploadedSticker('b', 'functional'),
      uploadedSticker('c', 'functional'),
      uploadedSticker('d', 'functional'),
      uploadedSticker('e', 'functional'),
    ],
  };

  const groups = buildAutoStickerPageGroups(config);

  assert.equal(groups.length, 3);
  assert.deepEqual(groups.map((group) => group.assetIds), [['a', 'b'], ['c', 'd'], ['e']]);
  assert.equal(getStickerGeneratedPageCount(config), 3);
});

test('never allows zero maxItemsPerPage to create an infinite grouping loop', () => {
  const config: StickerModuleConfig = {
    ...DEFAULT_STICKER_MODULE_CONFIG,
    categories: ['functional'],
    autoLayout: { ...DEFAULT_STICKER_MODULE_CONFIG.autoLayout, maxItemsPerPage: 0 },
    autoPngs: [uploadedSticker('a', 'functional'), uploadedSticker('b', 'functional')],
  };

  const groups = buildAutoStickerPageGroups(config);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups.map((group) => group.assetIds), [['a'], ['b']]);
});

test('counts ready sheets directly in ready-sheet mode', () => {
  const config: StickerModuleConfig = {
    ...DEFAULT_STICKER_MODULE_CONFIG,
    sourceMode: 'ready-sheet',
    readySheets: [
      { id: 'sheet-1', name: 'one.png', storageId: 'ready-1', previewSource: 'blob:1', width: 2048, height: 1536, sizeBytes: 10 },
      { id: 'sheet-2', name: 'two.png', storageId: 'ready-2', previewSource: 'blob:2', width: 2048, height: 1536, sizeBytes: 10 },
    ],
  };

  assert.equal(getStickerGeneratedPageCount(config), 2);
  assert.deepEqual(getStickerStorageIds(config), ['ready-1', 'ready-2']);
});

test('patches sticker config without mutating existing nested values', () => {
  const planner = createDefaultPlannerConfig();
  const currentOptions = planner.modules.stickers.options;
  const patched = patchStickerModuleConfig(planner, {
    backgroundMode: 'white',
    autoLayout: { maxItemsPerPage: 4 },
  });

  assert.equal(patched.backgroundMode, 'white');
  assert.equal(patched.autoLayout.maxItemsPerPage, 4);
  assert.equal(patched.autoLayout.itemSpacing, DEFAULT_STICKER_MODULE_CONFIG.autoLayout.itemSpacing);
  assert.equal(planner.modules.stickers.options, currentOptions);
});
