import type { PageLayout } from '../../../shared/layout';

export function getBlockSelectionAfterRemoval(layout: PageLayout, removedBlockId: string) {
  const removedIndex = layout.blocks.findIndex((block) => block.id === removedBlockId);
  const remainingBlocks = layout.blocks.filter((block) => block.id !== removedBlockId);

  if (remainingBlocks.length === 0) {
    return '';
  }

  if (removedIndex < 0) {
    return remainingBlocks[0].id;
  }

  return remainingBlocks[Math.min(removedIndex, remainingBlocks.length - 1)].id;
}
