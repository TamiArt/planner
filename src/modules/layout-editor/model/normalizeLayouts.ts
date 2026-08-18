import type { LayoutBlock, PlannerLayoutsConfig } from '../../../shared/layout/types';
import { constrainLayoutToCanvas } from '../../../shared/layout/updateBlock';
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

function migrateMonthBlockRoles(blocks: LayoutBlock[]) {
  const roleByType = new Map([
    ['header', 'month-header'],
    ['calendar', 'month-calendar'],
    ['note-area', 'month-focus'],
    ['group', 'month-week-links'],
  ]);
  const assignedRoles = new Set(
    blocks.map((block) => block.meta?.role).filter((role): role is string => typeof role === 'string'),
  );

  return blocks.map((block) => {
    if (block.meta?.userAdded === true || typeof block.meta?.role === 'string') {
      return block;
    }

    const role = roleByType.get(block.type);
    if (!role || assignedRoles.has(role)) {
      return block;
    }

    assignedRoles.add(role);
    return { ...block, meta: { ...block.meta, role } };
  });
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

    defaults[target as keyof PlannerLayoutsConfig] = constrainLayoutToCanvas({
      ...normalizedLayout,
      blocks: target === 'week-left'
        ? migrateWeekLeftFooterBlocks(normalizedLayout.blocks)
        : target === 'month'
          ? migrateMonthBlockRoles(normalizedLayout.blocks)
          : normalizedLayout.blocks,
    });
  });

  return Object.fromEntries(
    Object.entries(defaults).map(([target, layout]) => [target, constrainLayoutToCanvas(layout)]),
  ) as PlannerLayoutsConfig;
}
