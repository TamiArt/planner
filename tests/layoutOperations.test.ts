import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addMonthLayoutBlock,
  addMonthLayoutBlockAt,
  removeLayoutBlock,
  updateLayoutBlockContent,
} from '../src/modules/layout-editor/model/blockOperations';
import { getBlockSelectionAfterRemoval } from '../src/modules/layout-editor/model/layoutSelection';
import { normalizePlannerLayouts } from '../src/modules/layout-editor/model/normalizeLayouts';
import { buildPlannerRenderModel } from '../src/core/render-model/buildPlannerRenderModel';
import { createDefaultPlannerConfig } from '../src/lib/config/defaultPlannerConfig';
import { constrainBlockPosition, constrainBlockRect, updateBlockPosition, updateBlockRect } from '../src/shared/layout/updateBlock';
import type { PageLayout } from '../src/shared/layout/types';

function createLayout(): PageLayout {
  return {
    width: 2048,
    height: 1536,
    grid: { visible: true, snap: true, size: 32, subdivisions: 4 },
    blocks: [
      {
        id: 'existing',
        type: 'note-area',
        x: 128,
        y: 320,
        width: 768,
        height: 736,
        radius: { topLeft: 16, topRight: 16, bottomLeft: 16, bottomRight: 16 },
        border: { width: 1, color: '#000000', style: 'solid' },
        padding: { top: 16, right: 16, bottom: 16, left: 16 },
      },
    ],
  };
}

test('constrains dragged blocks to the grid and month content area', () => {
  const layout = createLayout();
  const block = layout.blocks[0];
  assert.deepEqual(constrainBlockPosition(layout, block, { x: 1900, y: -19 }), { x: 1024, y: 0 });
});

test('moves only the selected block when collision resolution is disabled', () => {
  const layout = createLayout();
  const secondBlock = { ...layout.blocks[0], id: 'second', x: 960 };
  layout.blocks.push(secondBlock);

  const result = updateBlockPosition(layout, 'existing', { x: 960, y: 320 }, { resolveCollisions: false });
  assert.deepEqual(result.blocks.map(({ id, x, y }) => ({ id, x, y })), [
    { id: 'existing', x: 960, y: 320 },
    { id: 'second', x: 960, y: 320 },
  ]);
});

test('adds and removes a month block without mutating the source layout', () => {
  const layout = createLayout();
  const result = addMonthLayoutBlock(layout, 'checklist');

  assert.equal(layout.blocks.length, 1);
  assert.equal(result.layout.blocks.length, 2);
  assert.equal(result.block.type, 'checklist');
  assert.equal(result.block.meta?.userAdded, true);
  assert.equal(result.block.x % 32, 0);
  assert.equal(result.block.y % 32, 0);

  const removed = removeLayoutBlock(result.layout, result.block.id);
  assert.deepEqual(removed.blocks.map((block) => block.id), ['existing']);
});

test('preserves deliberate overlaps while normalizing saved layouts', () => {
  const layout = createLayout();
  layout.target = 'month';
  layout.blocks.push({ ...layout.blocks[0], id: 'overlapping', x: 128, y: 320, meta: { userAdded: true } });

  const normalized = normalizePlannerLayouts({ month: layout }).month!;
  assert.deepEqual(normalized.blocks.slice(-2).map(({ x, y }) => ({ x, y })), [
    { x: 128, y: 320 },
    { x: 128, y: 320 },
  ]);
});

test('migrates month system roles without assigning them to user blocks', () => {
  const layout = createLayout();
  layout.target = 'month';
  layout.blocks[0].meta = { userAdded: true };
  layout.blocks.push({ ...layout.blocks[0], id: 'system-focus', meta: undefined });

  const normalized = normalizePlannerLayouts({ month: layout }).month!;
  assert.equal(normalized.blocks.find((block) => block.id === 'existing')?.meta?.role, undefined);
  assert.equal(normalized.blocks.find((block) => block.id === 'system-focus')?.meta?.role, 'month-focus');
});

test('updates custom content immutably', () => {
  const layout = createLayout();

  const updated = updateLayoutBlockContent(layout, 'existing', { name: 'Планы', content: 'Главная цель' });
  assert.equal(updated.blocks[0].name, 'Планы');
  assert.equal(updated.blocks[0].meta?.content, 'Главная цель');
  assert.equal(layout.blocks[0].name, undefined);
});

test('renders custom month text content through the shared render model', () => {
  const config = createDefaultPlannerConfig();
  const monthLayout = normalizePlannerLayouts(config.layouts).month!;
  const added = addMonthLayoutBlock(monthLayout, 'text');
  const withContent = updateLayoutBlockContent(added.layout, added.block.id, { content: 'Важная цель месяца' });
  config.layouts = { ...config.layouts, month: withContent };

  const model = buildPlannerRenderModel(config);
  const monthPage = model.pages.find((page) => page.page.kind === 'month');
  assert.ok(monthPage);
  assert.ok(monthPage.nodes.some((node) => node.kind === 'text' && node.lines.includes('Важная цель месяца')));
});

test('adds a month block at the requested grid point and keeps it inside the editable area', () => {
  const layout = createLayout();
  const result = addMonthLayoutBlockAt(layout, 'text', { x: 1900, y: 1500 });

  assert.equal(result.block.type, 'text');
  assert.equal(result.block.x % 32, 0);
  assert.equal(result.block.y % 32, 0);
  assert.ok(result.block.x + result.block.width <= layout.width - 248);
  assert.ok(result.block.y + result.block.height <= layout.height);
});

test('constrains direct resize geometry to grid and canvas bounds', () => {
  const layout = createLayout();
  const block = layout.blocks[0];
  const rect = constrainBlockRect(layout, block, {
    x: -300,
    y: -100,
    width: 4000,
    height: 2000,
  });

  assert.deepEqual(rect, { x: 0, y: 0, width: 1800, height: 1536 });
});

test('direct resize can preserve deliberate overlaps', () => {
  const layout = createLayout();
  layout.blocks.push({ ...layout.blocks[0], id: 'second', x: 896 });

  const result = updateBlockRect(layout, 'existing', {
    x: 128,
    y: 320,
    width: 1200,
    height: 736,
  }, { resolveCollisions: false });

  assert.equal(result.blocks[0].width, 1216);
  assert.equal(result.blocks[1].x, 896);
  assert.equal(result.blocks[1].y, 320);
});

test('locked blocks cannot be moved, resized or removed through shared operations', () => {
  const layout = createLayout();
  layout.blocks[0] = { ...layout.blocks[0], locked: true };

  assert.equal(updateBlockPosition(layout, 'existing', { x: 640, y: 640 }), layout);
  assert.equal(updateBlockRect(layout, 'existing', { x: 64, y: 64, width: 480, height: 480 }), layout);
  assert.equal(removeLayoutBlock(layout, 'existing'), layout);
});

test('selects the nearest remaining block after removal', () => {
  const layout = createLayout();
  layout.blocks.push(
    { ...layout.blocks[0], id: 'second', x: 960 },
    { ...layout.blocks[0], id: 'third', x: 1280 },
  );

  assert.equal(getBlockSelectionAfterRemoval(layout, 'second'), 'third');
  assert.equal(getBlockSelectionAfterRemoval(layout, 'third'), 'second');
  assert.equal(getBlockSelectionAfterRemoval(createLayout(), 'existing'), '');
});