import clsx from 'clsx';
import { useRef, type CSSProperties } from 'react';
import type { PlannerModulePanelProps } from '../../../core/registry/plannerModule';
import { updateBlockPosition, type LayoutPageTarget } from '../../../shared/layout';
import { useLayoutBlockDrag } from '../hooks/useLayoutBlockDrag';
import { getBlockTypeLabel } from '../model/blockCatalog';
import { normalizePlannerLayouts } from '../model/normalizeLayouts';

export function LayoutCanvas({
  layoutTarget,
  selectedBlockId,
  onSelectBlock,
  config,
  onConfigChange,
}: {
  layoutTarget: LayoutPageTarget;
  selectedBlockId: string;
  onSelectBlock: (blockId: string) => void;
  config: PlannerModulePanelProps['config'];
  onConfigChange: PlannerModulePanelProps['onConfigChange'];
}) {
  const layout = normalizePlannerLayouts(config.layouts)[layoutTarget]!;
  const surfaceRef = useRef<HTMLDivElement>(null);
  const canDrag = layoutTarget === 'month';
  const gridOpacity = layout.grid?.visible ? 1 : 0;
  const gridSize = layout.grid?.size ?? 16;
  const drag = useLayoutBlockDrag({
    layout,
    surfaceRef,
    enabled: canDrag,
    onSelect: onSelectBlock,
    onCommit: (blockId, position) => {
      onConfigChange({
        layouts: {
          ...config.layouts,
          [layoutTarget]: updateBlockPosition(layout, blockId, position),
        },
      });
    },
  });

  return (
    <div className="layout-editor__canvas">
      <div
        ref={surfaceRef}
        className="layout-editor__surface"
        style={{
          '--layout-grid-size': `${(gridSize / layout.width) * 100}%`,
          '--layout-grid-opacity': `${gridOpacity}`,
        } as CSSProperties}
      >
        {layout.blocks.map((block) => {
          const position = drag.getBlockPosition(block);
          return (
            <button
              key={block.id}
              type="button"
              onPointerDown={(event) => drag.handlePointerDown(event, block)}
              onClick={() => onSelectBlock(block.id)}
              className={clsx(
                'layout-editor__block',
                canDrag && 'layout-editor__block--draggable',
                block.id === selectedBlockId && 'layout-editor__block--active',
                block.id === drag.draggingBlockId && 'layout-editor__block--dragging',
              )}
              style={{
                left: `${(position.x / layout.width) * 100}%`,
                top: `${(position.y / layout.height) * 100}%`,
                width: `${(block.width / layout.width) * 100}%`,
                height: `${(block.height / layout.height) * 100}%`,
                borderRadius: `${Math.max(4, block.radius.topLeft * 0.18)}px ${Math.max(4, block.radius.topRight * 0.18)}px ${Math.max(4, block.radius.bottomRight * 0.18)}px ${Math.max(4, block.radius.bottomLeft * 0.18)}px`,
                borderWidth: `${Math.max(1, block.border.width)}px`,
                borderColor: block.border.color,
                borderStyle: block.border.style,
                background: block.backgroundColor,
                opacity: block.opacity ?? 1,
              }}
            >
              <strong>{block.name ?? block.type}</strong>
              <span>{getBlockTypeLabel(block.type)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
