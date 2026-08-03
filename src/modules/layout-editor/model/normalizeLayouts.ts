import type { LayoutBlock, PlannerLayoutsConfig } from '../../../shared/layout/types';
import { normalizeLayoutGeometry } from '../../../shared/layout/updateBlock';
import { createDefaultPlannerLayouts, clonePlannerLayouts } from './defaultLayouts';

const DEFAULT_LAYOUT_BLOCK_RADIUS = {
  topLeft: 16,
  topRight: 16,
  bottomLeft: 16,
  bottomRight: 16,
};

const DEFAULT_LAYOUT_BLOCK_BORDER = {
  width: 1,
  color: 'rgba(18, 26, 43, 0.18)',
  style: 'solid' as const,
};

const DEFAULT_LAYOUT_BLOCK_PADDING = {
  top: 16,
  right: 16,
  bottom: 16,
  left: 16,
};

const DEFAULT_LAYOUT_GRID = {
  visible: true,
  snap: true,
  size: 16,
  subdivisions: 4,
};

const DEFAULT_LAYOUT_BLOCK_STYLE = {
  backgroundColor: 'rgba(255, 255, 255, 0.82)',
  opacity: 1,
};

function migrateWeekLeftFooterBlocks(blocks: LayoutBlock[]) {
  const noteBlocks = blocks.filter((block) => block.type === 'note-area');

  if (noteBlocks.length !== 1) {
    return blocks;
  }

  const footerBlock = noteBlocks[0];
  const gratitudeWidth = Math.min(380, Math.max(300, Math.round(footerBlock.width * 0.23)));
  const gap = Math.min(40, Math.max(24, Math.round(footerBlock.width * 0.024)));
  const focusWidth = footerBlock.width - gratitudeWidth - gap;

  if (focusWidth < 360) {
    return blocks;
  }

  const gratitudeBlock: LayoutBlock = {
    ...footerBlock,
    id: `${footerBlock.id}-gratitude`,
    name: 'Благодарность',
    x: footerBlock.x + focusWidth + gap,
    width: gratitudeWidth,
  };

  return blocks.flatMap((block) => (
    block.id === footerBlock.id
      ? [{ ...block, width: focusWidth }, gratitudeBlock]
      : [block]
  ));
}

export function normalizePlannerLayouts(layouts?: PlannerLayoutsConfig): PlannerLayoutsConfig {
  const defaults = clonePlannerLayouts(createDefaultPlannerLayouts());

  if (!layouts) {
    return defaults;
  }

  Object.entries(layouts).forEach(([target, layout]) => {
    if (!layout) {
      return;
    }

    const normalizedLayout = {
      ...defaults[target as keyof PlannerLayoutsConfig],
      ...layout,
      width: layout.width ?? defaults[target as keyof PlannerLayoutsConfig]?.width,
      height: layout.height ?? defaults[target as keyof PlannerLayoutsConfig]?.height,
      grid: {
        ...DEFAULT_LAYOUT_GRID,
        ...defaults[target as keyof PlannerLayoutsConfig]?.grid,
        ...(layout.grid ?? {}),
      },
      blocks: layout.blocks?.map((block) => ({
        ...DEFAULT_LAYOUT_BLOCK_STYLE,
        ...block,
        radius: {
          ...DEFAULT_LAYOUT_BLOCK_RADIUS,
          ...(block.radius ?? {}),
        },
        border: {
          ...DEFAULT_LAYOUT_BLOCK_BORDER,
          ...(block.border ?? {}),
        },
        padding: {
          ...DEFAULT_LAYOUT_BLOCK_PADDING,
          ...(block.padding ?? {}),
        },
      })) ?? defaults[target as keyof PlannerLayoutsConfig]?.blocks ?? [],
    };

    defaults[target as keyof PlannerLayoutsConfig] = normalizeLayoutGeometry({
      ...normalizedLayout,
      blocks: target === 'week-left'
        ? migrateWeekLeftFooterBlocks(normalizedLayout.blocks)
        : normalizedLayout.blocks,
    });
  });

  return Object.fromEntries(
    Object.entries(defaults).map(([target, layout]) => [target, normalizeLayoutGeometry(layout)]),
  ) as PlannerLayoutsConfig;
}
