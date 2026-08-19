import {
  constrainBlockPosition,
  createBlock,
  LAYOUT_CONTENT_RIGHT_GUTTER,
  snapToGrid,
  type LayoutBlockType,
  type PageLayout,
} from '../../../shared/layout';
import { getMonthBlockPreset, type AddableMonthBlockType } from './blockCatalog';

function overlaps(
  candidate: { x: number; y: number; width: number; height: number },
  block: PageLayout['blocks'][number],
) {
  return candidate.x < block.x + block.width
    && candidate.x + candidate.width > block.x
    && candidate.y < block.y + block.height
    && candidate.y + candidate.height > block.y;
}

function findFreePosition(layout: PageLayout, width: number, height: number) {
  const step = layout.grid?.snap ? Math.max(1, layout.grid.size) : 16;
  const maxX = Math.max(0, layout.width - width - LAYOUT_CONTENT_RIGHT_GUTTER);
  const maxY = Math.max(0, layout.height - height);

  for (let y = 0; y <= maxY; y += step) {
    for (let x = 0; x <= maxX; x += step) {
      const candidate = { x, y, width, height };
      if (!layout.blocks.some((block) => overlaps(candidate, block))) {
        return { x, y };
      }
    }
  }

  return { x: snapToGrid(120, layout.grid), y: snapToGrid(320, layout.grid) };
}

function createMonthLayoutBlock(
  layout: PageLayout,
  type: AddableMonthBlockType,
  requestedPosition?: { x: number; y: number },
) {
  const preset = getMonthBlockPreset(type);
  const width = snapToGrid(Math.min(preset.width, layout.width - LAYOUT_CONTENT_RIGHT_GUTTER), layout.grid);
  const height = snapToGrid(Math.min(preset.height, layout.height), layout.grid);
  const fallbackPosition = findFreePosition(layout, width, height);
  const draftBlock = createBlock({
    type: type as LayoutBlockType,
    name: preset.label,
    ...(requestedPosition ?? fallbackPosition),
    width,
    height,
    meta: { userAdded: true },
  });
  const position = requestedPosition
    ? constrainBlockPosition(layout, draftBlock, requestedPosition)
    : fallbackPosition;
  const block = { ...draftBlock, ...position };

  return {
    layout: {
      ...layout,
      updatedAt: new Date().toISOString(),
      blocks: [...layout.blocks, block],
    },
    block,
  };
}

export function addMonthLayoutBlock(layout: PageLayout, type: AddableMonthBlockType) {
  return createMonthLayoutBlock(layout, type);
}

export function addMonthLayoutBlockAt(
  layout: PageLayout,
  type: AddableMonthBlockType,
  point: { x: number; y: number },
) {
  const preset = getMonthBlockPreset(type);
  return createMonthLayoutBlock(layout, type, {
    x: point.x - preset.width / 2,
    y: point.y - preset.height / 2,
  });
}

export function removeLayoutBlock(layout: PageLayout, blockId: string) {
  return {
    ...layout,
    updatedAt: new Date().toISOString(),
    blocks: layout.blocks.filter((block) => block.id !== blockId),
  };
}

export function updateLayoutBlockContent(
  layout: PageLayout,
  blockId: string,
  patch: { name?: string; content?: string },
) {
  return {
    ...layout,
    updatedAt: new Date().toISOString(),
    blocks: layout.blocks.map((block) => block.id === blockId ? {
      ...block,
      name: patch.name ?? block.name,
      meta: patch.content === undefined ? block.meta : { ...block.meta, content: patch.content },
    } : block),
  };
}
