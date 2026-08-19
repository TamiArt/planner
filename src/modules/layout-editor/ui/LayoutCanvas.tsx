import clsx from 'clsx';
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent } from 'react';
import type { PlannerModulePanelProps } from '../../../core/registry/plannerModule';
import {
  constrainBlockPosition,
  constrainBlockRect,
  updateBlockPosition,
  updateBlockRect,
  type LayoutPageTarget,
} from '../../../shared/layout';
import { useLayoutBlockDrag } from '../hooks/useLayoutBlockDrag';
import { useLayoutBlockResize, type LayoutResizeHandle } from '../hooks/useLayoutBlockResize';
import { getBlockTypeLabel, MONTH_BLOCK_OPTIONS, type AddableMonthBlockType } from '../model/blockCatalog';
import { addMonthLayoutBlockAt, removeLayoutBlock } from '../model/blockOperations';
import { getA4GuideRect, getA4PaperLabel, type LayoutPaperOrientation } from '../model/pageGuide';
import { normalizePlannerLayouts } from '../model/normalizeLayouts';

const RESIZE_HANDLES: LayoutResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const CONTEXT_MENU_WIDTH = 230;
const CONTEXT_MENU_HEIGHT = 250;
const CONTEXT_MENU_MARGIN = 12;

interface CanvasContextMenuState {
  clientX: number;
  clientY: number;
  canvasX: number;
  canvasY: number;
}

function getEditorOptions(config: PlannerModulePanelProps['config']) {
  const options = config.modules['layout-editor'].options ?? {};
  return {
    paperOrientation: options.paperOrientation === 'portrait' ? 'portrait' as const : 'landscape' as const,
    showPaperBounds: options.showPaperBounds !== false,
  };
}

function clampMenuCoordinate(value: number, viewportSize: number, menuSize: number) {
  return Math.max(
    CONTEXT_MENU_MARGIN,
    Math.min(value, Math.max(CONTEXT_MENU_MARGIN, viewportSize - menuSize - CONTEXT_MENU_MARGIN)),
  );
}

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
  const editorOptions = getEditorOptions(config);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<CanvasContextMenuState | null>(null);
  const canDirectEdit = layoutTarget === 'month';
  const gridOpacity = layout.grid?.visible ? 1 : 0;
  const gridSize = layout.grid?.size ?? 16;
  const paperGuide = getA4GuideRect(layout.width, layout.height, editorOptions.paperOrientation);

  function buildModulesPatch(patch: Record<string, unknown>) {
    return {
      ...config.modules,
      'layout-editor': {
        ...config.modules['layout-editor'],
        options: {
          ...config.modules['layout-editor'].options,
          ...patch,
        },
      },
    };
  }

  function updateEditorOptions(patch: { paperOrientation?: LayoutPaperOrientation; showPaperBounds?: boolean }) {
    onConfigChange({ modules: buildModulesPatch(patch) });
  }

  function commitLayout(nextLayout: typeof layout, nextSelectedBlockId = selectedBlockId) {
    onConfigChange({
      layouts: {
        ...config.layouts,
        [layoutTarget]: nextLayout,
      },
      modules: buildModulesPatch({ selectedBlockId: nextSelectedBlockId }),
    });
  }

  function deleteBlock(blockId: string) {
    if (!canDirectEdit) {
      return;
    }

    const block = layout.blocks.find((item) => item.id === blockId);
    if (!block || block.locked) {
      return;
    }

    const isFunctionalBlock = typeof block.meta?.role === 'string';
    if (isFunctionalBlock && !window.confirm('Этот блок отвечает за содержимое или навигацию страницы месяца. Удалить его?')) {
      return;
    }

    const blockIndex = layout.blocks.findIndex((item) => item.id === blockId);
    const nextLayout = removeLayoutBlock(layout, blockId);
    const nextSelectedBlockId = nextLayout.blocks[Math.min(blockIndex, nextLayout.blocks.length - 1)]?.id
      ?? nextLayout.blocks[0]?.id
      ?? '';
    commitLayout(nextLayout, nextSelectedBlockId);
  }

  const drag = useLayoutBlockDrag({
    layout,
    surfaceRef,
    enabled: canDirectEdit,
    onSelect: onSelectBlock,
    constrainPosition: (block, position) => constrainBlockPosition(layout, block, position),
    onCommit: (blockId, position) => {
      commitLayout(updateBlockPosition(layout, blockId, position, { resolveCollisions: false }), blockId);
    },
  });

  const resize = useLayoutBlockResize({
    layout,
    surfaceRef,
    enabled: canDirectEdit,
    onSelect: onSelectBlock,
    constrainRect: (block, rect) => constrainBlockRect(layout, block, rect),
    onCommit: (blockId, rect) => {
      commitLayout(updateBlockRect(layout, blockId, rect, { resolveCollisions: false }), blockId);
    },
  });

  useEffect(() => {
    if (!contextMenu) {
      return;
    }

    const focusFrame = window.requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    });

    function closeMenu(event: PointerEvent) {
      if (menuRef.current?.contains(event.target as Node)) {
        return;
      }
      setContextMenu(null);
    }

    function closeOnKey(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        setContextMenu(null);
      }
    }

    function closeOnViewportChange() {
      setContextMenu(null);
    }

    window.addEventListener('pointerdown', closeMenu);
    window.addEventListener('keydown', closeOnKey);
    window.addEventListener('resize', closeOnViewportChange);
    window.addEventListener('scroll', closeOnViewportChange, true);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener('pointerdown', closeMenu);
      window.removeEventListener('keydown', closeOnKey);
      window.removeEventListener('resize', closeOnViewportChange);
      window.removeEventListener('scroll', closeOnViewportChange, true);
    };
  }, [contextMenu]);

  function handleSurfaceContextMenu(event: MouseEvent<HTMLDivElement>) {
    if (!canDirectEdit) {
      return;
    }

    event.preventDefault();
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    setContextMenu({
      clientX: clampMenuCoordinate(event.clientX, window.innerWidth, CONTEXT_MENU_WIDTH),
      clientY: clampMenuCoordinate(event.clientY, window.innerHeight, CONTEXT_MENU_HEIGHT),
      canvasX: ((event.clientX - rect.left) / rect.width) * layout.width,
      canvasY: ((event.clientY - rect.top) / rect.height) * layout.height,
    });
  }

  function addBlockAt(type: AddableMonthBlockType, point: { x: number; y: number }) {
    if (!canDirectEdit) {
      return;
    }

    const result = addMonthLayoutBlockAt(layout, type, point);
    commitLayout(result.layout, result.block.id);
  }

  function handleBlockKeyDown(event: KeyboardEvent<HTMLDivElement>, blockId: string) {
    if (event.target !== event.currentTarget) {
      return;
    }

    if ((event.key === 'Delete' || event.key === 'Backspace') && canDirectEdit && blockId === selectedBlockId) {
      event.preventDefault();
      deleteBlock(blockId);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelectBlock(blockId);
    }
  }

  return (
    <div className="layout-editor__canvas">
      <div className="layout-editor__paper-controls" aria-label="Параметры ориентира A4">
        <span className="layout-editor__paper-title">Ориентир A4 · не меняет PDF</span>
        <button
          type="button"
          onClick={() => updateEditorOptions({ paperOrientation: 'portrait' })}
          className={clsx('layout-editor__paper-button', editorOptions.paperOrientation === 'portrait' && 'layout-editor__paper-button--active')}
        >
          Книжная · 210 × 297 мм
        </button>
        <button
          type="button"
          onClick={() => updateEditorOptions({ paperOrientation: 'landscape' })}
          className={clsx('layout-editor__paper-button', editorOptions.paperOrientation === 'landscape' && 'layout-editor__paper-button--active')}
        >
          Альбомная · 297 × 210 мм
        </button>
        <label className="layout-editor__paper-toggle">
          <input
            type="checkbox"
            checked={editorOptions.showPaperBounds}
            onChange={(event) => updateEditorOptions({ showPaperBounds: event.target.checked })}
          />
          <span>Показывать ориентир</span>
        </label>
      </div>

      {canDirectEdit ? (
        <div className="layout-editor__canvas-help">
          <span>Перетаскивание — переместить</span>
          <span>Маркеры — изменить размер</span>
          <span>ПКМ по сетке — добавить окно</span>
          <span>Delete — удалить выбранное</span>
        </div>
      ) : null}

      <div className="layout-editor__surface-frame">
        <span className="layout-editor__surface-label">Текущий лист · 4:3 · {layout.width} × {layout.height}</span>
        <div
          ref={surfaceRef}
          className="layout-editor__surface"
          onContextMenu={handleSurfaceContextMenu}
          style={{
            '--layout-grid-size': `${(gridSize / layout.width) * 100}%`,
            '--layout-grid-opacity': `${gridOpacity}`,
          } as CSSProperties}
        >
          {editorOptions.showPaperBounds ? (
            <div
              className="layout-editor__paper-guide"
              style={{
                left: `${(paperGuide.x / layout.width) * 100}%`,
                top: `${(paperGuide.y / layout.height) * 100}%`,
                width: `${(paperGuide.width / layout.width) * 100}%`,
                height: `${(paperGuide.height / layout.height) * 100}%`,
              }}
            >
              <span className="layout-editor__paper-guide-label">{getA4PaperLabel(editorOptions.paperOrientation)}</span>
            </div>
          ) : null}

          {layout.blocks.map((block) => {
            const dragPosition = drag.getBlockPosition(block);
            const resizeRect = resize.getBlockRect(block);
            const isResizing = block.id === resize.resizingBlockId;
            const position = isResizing ? resizeRect : { ...resizeRect, ...dragPosition };
            const isSelected = block.id === selectedBlockId;

            return (
              <div
                key={block.id}
                role="button"
                tabIndex={0}
                aria-label={`${block.name ?? block.type}. ${getBlockTypeLabel(block.type)}`}
                aria-pressed={isSelected}
                onPointerDown={(event) => drag.handlePointerDown(event, block)}
                onClick={() => onSelectBlock(block.id)}
                onFocus={() => onSelectBlock(block.id)}
                onKeyDown={(event) => handleBlockKeyDown(event, block.id)}
                onContextMenu={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onSelectBlock(block.id);
                }}
                className={clsx(
                  'layout-editor__block',
                  canDirectEdit && 'layout-editor__block--draggable',
                  isSelected && 'layout-editor__block--active',
                  block.id === drag.draggingBlockId && 'layout-editor__block--dragging',
                  isResizing && 'layout-editor__block--resizing',
                  block.locked && 'layout-editor__block--locked',
                )}
                style={{
                  left: `${(position.x / layout.width) * 100}%`,
                  top: `${(position.y / layout.height) * 100}%`,
                  width: `${(position.width / layout.width) * 100}%`,
                  height: `${(position.height / layout.height) * 100}%`,
                  borderRadius: `${Math.max(4, block.radius.topLeft * 0.18)}px ${Math.max(4, block.radius.topRight * 0.18)}px ${Math.max(4, block.radius.bottomRight * 0.18)}px ${Math.max(4, block.radius.bottomLeft * 0.18)}px`,
                  borderWidth: `${Math.max(1, block.border.width)}px`,
                  borderColor: block.border.color,
                  borderStyle: block.border.style,
                  background: block.backgroundColor,
                  opacity: block.opacity ?? 1,
                }}
              >
                <div className="layout-editor__block-label">
                  <strong>{block.name ?? block.type}</strong>
                  <span>{getBlockTypeLabel(block.type)}</span>
                </div>

                {isSelected && canDirectEdit && !block.locked ? (
                  <button
                    type="button"
                    className="layout-editor__block-delete"
                    aria-label={`Удалить ${block.name ?? 'окно'}`}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteBlock(block.id);
                    }}
                  >
                    ×
                  </button>
                ) : null}

                {isSelected && canDirectEdit && !block.locked ? RESIZE_HANDLES.map((handle) => (
                  <span
                    key={handle}
                    className={`layout-editor__resize-handle layout-editor__resize-handle--${handle}`}
                    onPointerDown={(event) => resize.handlePointerDown(event, block, handle)}
                    aria-hidden="true"
                  />
                )) : null}
              </div>
            );
          })}
        </div>
      </div>

      {contextMenu ? (
        <div
          ref={menuRef}
          className="layout-editor__context-menu"
          style={{ left: contextMenu.clientX, top: contextMenu.clientY }}
          role="menu"
          aria-label="Добавить окно"
        >
          <p className="layout-editor__context-title">Добавить новое окно</p>
          {MONTH_BLOCK_OPTIONS.map((option) => (
            <button
              key={option.type}
              type="button"
              role="menuitem"
              onClick={() => {
                addBlockAt(option.type, { x: contextMenu.canvasX, y: contextMenu.canvasY });
                setContextMenu(null);
              }}
            >
              <strong>{option.label}</strong>
              <span>{option.width} × {option.height}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
