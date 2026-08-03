import assert from 'node:assert/strict';
import test from 'node:test';
import { addMonthLayoutBlock, removeLayoutBlock } from '../src/modules/layout-editor/model/blockOperations';
import { constrainBlockPosition, updateBlockPosition } from '../src/shared/layout/updateBlock';
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
