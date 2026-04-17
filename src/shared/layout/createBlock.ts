import { nanoid } from 'nanoid';
import type { LayoutBlock, LayoutBlockBorder, LayoutBlockPadding, LayoutBlockRadius } from './types';

const DEFAULT_BLOCK_RADIUS: LayoutBlockRadius = {
  topLeft: 16,
  topRight: 16,
  bottomLeft: 16,
  bottomRight: 16,
};

const DEFAULT_BLOCK_BORDER: LayoutBlockBorder = {
  width: 1,
  color: 'rgba(18, 26, 43, 0.18)',
  style: 'solid',
};

const DEFAULT_BLOCK_PADDING: LayoutBlockPadding = {
  top: 16,
  right: 16,
  bottom: 16,
  left: 16,
};

export function createBlock(
  partial: Omit<LayoutBlock, 'id' | 'radius' | 'border' | 'padding'> & {
    radius?: Partial<LayoutBlockRadius>;
    border?: Partial<LayoutBlockBorder>;
    padding?: Partial<LayoutBlockPadding>;
  },
): LayoutBlock {
  return {
    ...partial,
    id: `layout-block-${nanoid(10)}`,
    radius: {
      ...DEFAULT_BLOCK_RADIUS,
      ...partial.radius,
    },
    border: {
      ...DEFAULT_BLOCK_BORDER,
      ...partial.border,
    },
    padding: {
      ...DEFAULT_BLOCK_PADDING,
      ...partial.padding,
    },
    backgroundColor: partial.backgroundColor ?? 'rgba(255, 255, 255, 0.82)',
    opacity: partial.opacity ?? 1,
  };
}
