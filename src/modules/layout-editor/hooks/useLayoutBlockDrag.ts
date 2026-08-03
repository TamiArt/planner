import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import type { LayoutBlock, PageLayout } from '../../../shared/layout';

interface DragState {
  blockId: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  moved: boolean;
}

export function useLayoutBlockDrag({
  layout,
  surfaceRef,
  enabled = true,
  onSelect,
  onCommit,
}: {
  layout: PageLayout;
  surfaceRef: RefObject<HTMLDivElement>;
  enabled?: boolean;
  onSelect: (blockId: string) => void;
  onCommit: (blockId: string, position: { x: number; y: number }) => void;
}) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;

  useEffect(() => {
    if (!drag) {
      return;
    }

    function handlePointerMove(event: PointerEvent) {
      const activeDrag = dragRef.current;
      if (!activeDrag) {
        return;
      }
      if (event.pointerId !== activeDrag.pointerId) {
        return;
      }

      const surface = surfaceRef.current;
      if (!surface) {
        return;
      }

      const rect = surface.getBoundingClientRect();
      const deltaX = ((event.clientX - activeDrag.startClientX) / rect.width) * layout.width;
      const deltaY = ((event.clientY - activeDrag.startClientY) / rect.height) * layout.height;
      const moved = activeDrag.moved || Math.hypot(event.clientX - activeDrag.startClientX, event.clientY - activeDrag.startClientY) >= 4;
      const nextDrag = {
        ...activeDrag,
        x: activeDrag.startX + deltaX,
        y: activeDrag.startY + deltaY,
        moved,
      };
      dragRef.current = nextDrag;
      setDrag(nextDrag);
    }

    function finishDrag(event: PointerEvent) {
      const activeDrag = dragRef.current;
      if (!activeDrag) {
        return;
      }
      if (event.pointerId !== activeDrag.pointerId) {
        return;
      }

      if (activeDrag.moved) {
        commitRef.current(activeDrag.blockId, { x: activeDrag.x, y: activeDrag.y });
      }
      dragRef.current = null;
      setDrag(null);
    }

    function cancelDrag(event: PointerEvent) {
      if (event.pointerId !== dragRef.current?.pointerId) {
        return;
      }

      dragRef.current = null;
      setDrag(null);
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', finishDrag);
    window.addEventListener('pointercancel', cancelDrag);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', finishDrag);
      window.removeEventListener('pointercancel', cancelDrag);
    };
  }, [drag?.pointerId, layout.height, layout.width, surfaceRef]);

  function handlePointerDown(event: ReactPointerEvent<HTMLButtonElement>, block: LayoutBlock) {
    if (!enabled || event.button !== 0 || block.locked) {
      return;
    }

    event.preventDefault();
    onSelect(block.id);
    event.currentTarget.setPointerCapture(event.pointerId);
    const nextDrag = {
      blockId: block.id,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: block.x,
      startY: block.y,
      x: block.x,
      y: block.y,
      moved: false,
    };
    dragRef.current = nextDrag;
    setDrag(nextDrag);
  }

  return {
    draggingBlockId: drag?.blockId,
    getBlockPosition: (block: LayoutBlock) => drag?.blockId === block.id ? { x: drag.x, y: drag.y } : { x: block.x, y: block.y },
    handlePointerDown,
  };
}
