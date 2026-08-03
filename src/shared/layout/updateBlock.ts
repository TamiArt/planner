import { snapToGrid } from './snapToGrid';
import type { LayoutBlock, PageLayout } from './types';

const MIN_BLOCK_SIZE = 40;
const BLOCK_GAP = 24;
// Reserve space for the right-side tab rail plus a small visual gutter.
export const LAYOUT_CONTENT_RIGHT_GUTTER = 248;
const UNBOUNDED_BLOCK_TYPES = new Set<LayoutBlock['type'] | string>(['image', 'shape', 'decoration']);

function touchLayout(layout: PageLayout) {
  return {
    ...layout,
    updatedAt: new Date().toISOString(),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function shouldClampBlockToContentColumn(block: LayoutBlock) {
  return !UNBOUNDED_BLOCK_TYPES.has(block.type);
}

function clampBlockToCanvas(block: LayoutBlock, layout: PageLayout): LayoutBlock {
  const maxRight = shouldClampBlockToContentColumn(block)
    ? Math.max(MIN_BLOCK_SIZE, layout.width - LAYOUT_CONTENT_RIGHT_GUTTER)
    : layout.width;
  const width = clamp(block.width, MIN_BLOCK_SIZE, maxRight);
  const height = clamp(block.height, MIN_BLOCK_SIZE, layout.height);
  const maxX = shouldClampBlockToContentColumn(block)
    ? Math.max(0, maxRight - width)
    : layout.width - width;

  return {
    ...block,
    width,
    height,
    x: clamp(block.x, 0, maxX),
    y: clamp(block.y, 0, layout.height - height),
  };
}

export function constrainBlockPosition(
  layout: PageLayout,
  block: LayoutBlock,
  position: { x: number; y: number },
  options?: { snapToGrid?: boolean },
) {
  const shouldSnapToGrid = options?.snapToGrid ?? true;
  const positionedBlock = clampBlockToCanvas({
    ...block,
    x: shouldSnapToGrid ? snapToGrid(position.x, layout.grid) : Math.round(position.x),
    y: shouldSnapToGrid ? snapToGrid(position.y, layout.grid) : Math.round(position.y),
  }, layout);

  if (shouldSnapToGrid && layout.grid?.snap && layout.grid.size > 1) {
    return {
      x: Math.floor(positionedBlock.x / layout.grid.size) * layout.grid.size,
      y: Math.floor(positionedBlock.y / layout.grid.size) * layout.grid.size,
    };
  }

  return { x: positionedBlock.x, y: positionedBlock.y };
}

function blocksOverlap(a: LayoutBlock, b: LayoutBlock) {
  return a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y;
}

function resolveBlockCollisions(block: LayoutBlock, placedBlocks: LayoutBlock[], layout: PageLayout) {
  let nextBlock = clampBlockToCanvas(block, layout);
  let guard = 0;

  while (placedBlocks.some((placedBlock) => blocksOverlap(nextBlock, placedBlock)) && guard < placedBlocks.length + 8) {
    const conflicts = placedBlocks.filter((placedBlock) => blocksOverlap(nextBlock, placedBlock));
    const nextY = Math.max(...conflicts.map((placedBlock) => placedBlock.y + placedBlock.height)) + BLOCK_GAP;

    if (nextY + nextBlock.height <= layout.height) {
      nextBlock = {
        ...nextBlock,
        y: nextY,
      };
      guard += 1;
      continue;
    }

    const nextX = Math.max(...conflicts.map((placedBlock) => placedBlock.x + placedBlock.width)) + BLOCK_GAP;
    if (nextX + nextBlock.width <= layout.width) {
      nextBlock = {
        ...nextBlock,
        x: nextX,
      };
      guard += 1;
      continue;
    }

    const availableHeight = Math.max(MIN_BLOCK_SIZE, layout.height - nextBlock.y);
    nextBlock = clampBlockToCanvas(
      {
        ...nextBlock,
        height: Math.min(nextBlock.height, availableHeight),
      },
      layout,
    );
    break;
  }

  return clampBlockToCanvas(nextBlock, layout);
}

export function normalizeLayoutGeometry(layout: PageLayout): PageLayout {
  const placedBlocks: LayoutBlock[] = [];

  const blocks = layout.blocks.map((block) => {
    const resolvedBlock = resolveBlockCollisions(block, placedBlocks, layout);
    placedBlocks.push(resolvedBlock);
    return resolvedBlock;
  });

  return {
    ...layout,
    blocks,
  };
}

export function updateBlockPosition(
  layout: PageLayout,
  blockId: string,
  position: { x: number; y: number },
  options?: { snapToGrid?: boolean; resolveCollisions?: boolean },
) {
  const targetBlock = layout.blocks.find((block) => block.id === blockId);
  if (!targetBlock) {
    return layout;
  }

  const constrainedPosition = constrainBlockPosition(layout, targetBlock, position, options);
  const nextLayout = {
    ...layout,
    blocks: layout.blocks.map((block) => (
      block.id === blockId
        ? { ...block, ...constrainedPosition }
        : block
    )),
  };

  return touchLayout(
    options?.resolveCollisions === false ? nextLayout : normalizeLayoutGeometry(nextLayout),
  );
}

export function updateBlockSize(
  layout: PageLayout,
  blockId: string,
  size: { width: number; height: number },
  options?: { snapToGrid?: boolean },
) {
  const shouldSnapToGrid = options?.snapToGrid ?? true;

  return touchLayout(
    normalizeLayoutGeometry({
      ...layout,
      blocks: layout.blocks.map((block) => (
        block.id === blockId
          ? {
              ...block,
              width: Math.max(MIN_BLOCK_SIZE, shouldSnapToGrid ? snapToGrid(size.width, layout.grid) : Math.round(size.width)),
              height: Math.max(MIN_BLOCK_SIZE, shouldSnapToGrid ? snapToGrid(size.height, layout.grid) : Math.round(size.height)),
            }
          : block
      )),
    }),
  );
}
