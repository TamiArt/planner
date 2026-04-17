import type { LayoutBlockBorder, LayoutBlockPadding, LayoutBlockRadius, PageLayout } from './types';

export interface LayoutBlockDecorationPatch {
  radius?: Partial<LayoutBlockRadius>;
  border?: Partial<LayoutBlockBorder>;
  padding?: Partial<LayoutBlockPadding>;
  backgroundColor?: string;
  opacity?: number;
}

export function updateBlockStyle(
  layout: PageLayout,
  blockId: string,
  stylePatch: LayoutBlockDecorationPatch,
) {
  return {
    ...layout,
    updatedAt: new Date().toISOString(),
    blocks: layout.blocks.map((block) => (
      block.id === blockId
        ? {
            ...block,
            radius: {
              ...block.radius,
              ...(stylePatch.radius ?? {}),
            },
            border: {
              ...block.border,
              ...(stylePatch.border ?? {}),
            },
            padding: {
              ...block.padding,
              ...(stylePatch.padding ?? {}),
            },
            backgroundColor: stylePatch.backgroundColor ?? block.backgroundColor,
            opacity: stylePatch.opacity ?? block.opacity,
          }
        : block
    )),
  };
}
