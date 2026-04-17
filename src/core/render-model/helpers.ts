import { PAGE_HEIGHT } from '../../lib/templates/layout';
import type { LayoutBlock, LayoutBlockRadius } from '../../shared/layout';
import type { PlannerLinkDefinition } from '../types/pdf';
import type { PlannerRenderNode, RenderFontToken } from './types';

export type TopRect = { x: number; y: number; width: number; height: number };

export function createRadius(value: number): LayoutBlockRadius {
  return {
    topLeft: value,
    topRight: value,
    bottomLeft: value,
    bottomRight: value,
  };
}

export function createRectNode(
  id: string,
  rect: TopRect,
  patch: Partial<Extract<PlannerRenderNode, { kind: 'rect' }>> = {},
): PlannerRenderNode {
  return {
    id,
    kind: 'rect',
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    ...patch,
  };
}

function estimateTextWidth(text: string, fontSize: number, font: RenderFontToken) {
  const factor = font === 'heading' ? 0.62 : font === 'bold' ? 0.6 : 0.56;
  return text.length * fontSize * factor;
}

export function wrapText(text: string, maxWidth: number, fontSize: number, font: RenderFontToken) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (estimateTextWidth(candidate, fontSize, font) <= maxWidth) {
      current = candidate;
      return;
    }

    if (current) {
      lines.push(current);
    }

    current = word;
  });

  if (current) {
    lines.push(current);
  }

  return lines;
}

export function createTextNode(
  id: string,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  font: RenderFontToken,
  color: string,
  maxWidth?: number,
  align: 'left' | 'center' | 'right' = 'left',
  lineHeight = Math.round(fontSize * 1.35),
): PlannerRenderNode {
  return {
    id,
    kind: 'text',
    x,
    y,
    font,
    fontSize,
    color,
    maxWidth,
    align,
    lineHeight,
    lines: maxWidth ? wrapText(text, maxWidth, fontSize, font) : [text],
  };
}

export function withPadding(block: LayoutBlock) {
  return {
    x: block.x + block.padding.left,
    y: block.y + block.padding.top,
    width: Math.max(1, block.width - block.padding.left - block.padding.right),
    height: Math.max(1, block.height - block.padding.top - block.padding.bottom),
  };
}

export function blockSurface(block: LayoutBlock, id: string, fillOverride?: string): PlannerRenderNode {
  return createRectNode(id, block, {
    fill: fillOverride ?? block.backgroundColor,
    stroke: block.border.color,
    strokeWidth: block.border.width,
    dashArray: block.border.style === 'dashed' ? [16, 10] : undefined,
    radius: block.radius,
    opacity: block.opacity ?? 1,
  });
}

export function drawWritingLines(nodes: PlannerRenderNode[], area: TopRect, count: number, color: string, prefix: string) {
  const gap = area.height / Math.max(1, count + 1);

  for (let index = 1; index <= count; index += 1) {
    const y = area.y + gap * index;
    nodes.push({
      id: `${prefix}-line-${index}`,
      kind: 'line',
      x1: area.x,
      y1: y,
      x2: area.x + area.width,
      y2: y,
      stroke: color,
      strokeWidth: 2,
      opacity: 0.5,
    });
  }
}

export function gridRects(area: TopRect, rows: number, columns: number, gap: number) {
  const cellWidth = (area.width - gap * (columns - 1)) / columns;
  const cellHeight = (area.height - gap * (rows - 1)) / rows;

  return Array.from({ length: rows * columns }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    return {
      x: area.x + column * (cellWidth + gap),
      y: area.y + row * (cellHeight + gap),
      width: cellWidth,
      height: cellHeight,
    } satisfies TopRect;
  });
}

export function toLinkRect(rect: TopRect) {
  return {
    x: rect.x,
    y: PAGE_HEIGHT - rect.y - rect.height,
    width: rect.width,
    height: rect.height,
  };
}

export function addLink(links: PlannerLinkDefinition[], sourcePageId: string, targetPageId: string | undefined, rect: TopRect) {
  if (!targetPageId) {
    return;
  }

  links.push({
    sourcePageId,
    targetPageId,
    rect: toLinkRect(rect),
  });
}
