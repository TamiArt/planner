import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import type { LayoutBlock, PageLayout } from '../../../shared/layout';
import type { LayoutBlockRect } from '../../../shared/layout/updateBlock';

const MIN_RESIZE_SIZE = 40;

export type LayoutResizeHandle = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

interface ResizeState extends LayoutBlockRect {
  blockId: string;
  block: LayoutBlock;
  pointerId: number;
  handle: LayoutResizeHandle;
  startClientX: number;
  startClientY: number;
  startRect: LayoutBlockRect;
}

function resizeRect(
  state: ResizeState,
  deltaX: number,
  deltaY: number,
): LayoutBlockRect {
  const { handle, startRect } = state;
  let { x, y, width, height } = startRect;

  if (handle.includes('e')) {
    width += deltaX;
  }
  if (handle.includes('s')) {
    height += deltaY;
  }
  if (handle.includes('w')) {
    x += deltaX;
    width -= deltaX;
  }
  if (handle.includes('n')) {
    y += deltaY;
    height -= deltaY;
  }

  if (width < MIN_RESIZE_SIZE) {
    if (handle.includes('w')) {
      x = startRect.x + startRect.width - MIN_RESIZE_SIZE;
    }
    width = MIN_RESIZE_SIZE;
  }

  if (height < MIN_RESIZE_SIZE) {
    if (handle.includes('n')) {
      y = startRect.y + startRect.height - MIN_RESIZE_SIZE;
    }
    height = MIN_RESIZE_SIZE;
  }

  return { x, y, width, height };
}

export function useLayoutBlockResize({
  layout,
  surfaceRef,
  enabled = true,
  onSelect,
  onCommit,
  constrainRect = (_block, rect) => rect,
}: {
  layout: PageLayout;
  surfaceRef: RefObject<HTMLDivElement>;
  enabled?: boolean;
  onSelect: (blockId: string) => void;
  onCommit: (blockId: string, rect: LayoutBlockRect) => void;
  constrainRect?: (block: LayoutBlock, rect: LayoutBlockRect) => LayoutBlockRect;
}) {
  const [resize, setResize] = useState<ResizeState | null>(null);
  const resizeRef = useRef<ResizeState | null>(null);
  const commitRef = useRef(onCommit);
  const constrainRectRef = useRef(constrainRect);
  commitRef.current = onCommit;
  constrainRectRef.current = constrainRect;

  useEffect(() => {
    if (!resize) {
      return;
    }

    function handlePointerMove(event: PointerEvent) {
      const active = resizeRef.current;
      if (!active || event.pointerId !== active.pointerId) {
        return;
      }

      const surface = surfaceRef.current;
      if (!surface) {
        return;
      }

      const surfaceRect = surface.getBoundingClientRect();
      const deltaX = ((event.clientX - active.startClientX) / surfaceRect.width) * layout.width;
      const deltaY = ((event.clientY - active.startClientY) / surfaceRect.height) * layout.height;
      const constrained = constrainRectRef.current(active.block, resizeRect(active, deltaX, deltaY));
      const nextResize = { ...active, ...constrained };
      resizeRef.current = nextResize;
      setResize(nextResize);
    }

    function finishResize(event: PointerEvent) {
      const active = resizeRef.current;
      if (!active || event.pointerId !== active.pointerId) {
        return;
      }

      commitRef.current(active.blockId, {
        x: active.x,
        y: active.y,
        width: active.width,
        height: active.height,
      });
      resizeRef.current = null;
      setResize(null);
    }

    function cancelResize(event: PointerEvent) {
      if (event.pointerId !== resizeRef.current?.pointerId) {
        return;
      }
      resizeRef.current = null;
      setResize(null);
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', finishResize);
    window.addEventListener('pointercancel', cancelResize);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', finishResize);
      window.removeEventListener('pointercancel', cancelResize);
    };
  }, [layout.height, layout.width, resize?.pointerId, surfaceRef]);

  function handlePointerDown(
    event: ReactPointerEvent<HTMLElement>,
    block: LayoutBlock,
    handle: LayoutResizeHandle,
  ) {
    if (!enabled || event.button !== 0 || block.locked) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onSelect(block.id);
    event.currentTarget.setPointerCapture(event.pointerId);
    const startRect = { x: block.x, y: block.y, width: block.width, height: block.height };
    const nextResize: ResizeState = {
      blockId: block.id,
      block,
      pointerId: event.pointerId,
      handle,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startRect,
      ...startRect,
    };
    resizeRef.current = nextResize;
    setResize(nextResize);
  }

  return {
    resizingBlockId: resize?.blockId,
    getBlockRect: (block: LayoutBlock): LayoutBlockRect => resize?.blockId === block.id
      ? { x: resize.x, y: resize.y, width: resize.width, height: resize.height }
      : { x: block.x, y: block.y, width: block.width, height: block.height },
    handlePointerDown,
  };
}
