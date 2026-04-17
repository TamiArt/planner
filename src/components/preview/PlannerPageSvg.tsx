import type { CSSProperties } from 'react';
import { PAGE_HEIGHT } from '../../lib/templates/layout';
import type { PlannerLinkDefinition } from '../../types/pdf';
import type { PlannerRenderNode, PlannerRenderPage } from '../../core/render-model';
import type { PlannerTheme } from '../../types/planner';

interface PlannerPageSvgProps {
  page: PlannerRenderPage;
  links: PlannerLinkDefinition[];
  theme: PlannerTheme;
  onNavigate?: (pageId: string) => void;
}

function toTopRect(link: PlannerLinkDefinition['rect']) {
  return {
    x: link.x,
    y: PAGE_HEIGHT - link.y - link.height,
    width: link.width,
    height: link.height,
  };
}

function getFontStyles(node: Extract<PlannerRenderNode, { kind: 'text' }>, theme: PlannerTheme) {
  if (node.font === 'heading') {
    return {
      fontFamily: theme.fonts.heading,
      fontWeight: 600,
    } satisfies CSSProperties;
  }

  if (node.font === 'bold') {
    return {
      fontFamily: theme.fonts.body,
      fontWeight: 700,
    } satisfies CSSProperties;
  }

  return {
    fontFamily: theme.fonts.body,
    fontWeight: 400,
  } satisfies CSSProperties;
}

function RenderNode({ node, theme }: { node: PlannerRenderNode; theme: PlannerTheme }) {
  if (node.kind === 'rect') {
    return (
      <rect
        x={node.x}
        y={node.y}
        width={node.width}
        height={node.height}
        rx={node.radius?.topLeft ?? 0}
        ry={node.radius?.topLeft ?? 0}
        fill={node.fill ?? 'transparent'}
        stroke={node.stroke}
        strokeWidth={node.strokeWidth}
        strokeDasharray={node.dashArray?.join(' ')}
        opacity={node.opacity}
      />
    );
  }

  if (node.kind === 'line') {
    return (
      <line
        x1={node.x1}
        y1={node.y1}
        x2={node.x2}
        y2={node.y2}
        stroke={node.stroke}
        strokeWidth={node.strokeWidth}
        strokeDasharray={node.dashArray?.join(' ')}
        opacity={node.opacity}
      />
    );
  }

  if (node.kind === 'circle') {
    return (
      <circle
        cx={node.cx}
        cy={node.cy}
        r={node.r}
        fill={node.fill ?? 'transparent'}
        stroke={node.stroke}
        strokeWidth={node.strokeWidth}
        opacity={node.opacity}
      />
    );
  }

  if (node.kind === 'image') {
    return (
      <image
        href={node.src}
        x={node.x}
        y={node.y}
        width={node.width}
        height={node.height}
        preserveAspectRatio={node.fit === 'cover' ? 'xMidYMid slice' : 'xMidYMid meet'}
        opacity={node.opacity}
      />
    );
  }

  const textAnchor = node.align === 'center' ? 'middle' : node.align === 'right' ? 'end' : 'start';
  const x = node.align === 'center'
    ? node.x
    : node.align === 'right'
      ? node.x + (node.maxWidth ?? 0)
      : node.x;

  return (
    <text
      x={x}
      y={node.y + node.fontSize}
      fill={node.color}
      textAnchor={textAnchor}
      opacity={node.opacity}
      style={getFontStyles(node, theme)}
      fontSize={node.fontSize}
    >
      {node.lines.map((line, index) => (
        <tspan
          key={`${node.id}-${index}`}
          x={x}
          dy={index === 0 ? 0 : node.lineHeight}
        >
          {line}
        </tspan>
      ))}
    </text>
  );
}

export function PlannerPageSvg({ page, links, theme, onNavigate }: PlannerPageSvgProps) {
  return (
    <svg viewBox={`0 0 ${page.layout.width} ${page.layout.height}`} className="planner-preview__svg" role="img" aria-label={page.page.title}>
      {page.nodes.map((node) => (
        <RenderNode key={node.id} node={node} theme={theme} />
      ))}

      {links.map((link, index) => {
        const rect = toTopRect(link.rect);
        return (
          <rect
            key={`${link.sourcePageId}-${link.targetPageId}-${index}`}
            x={rect.x}
            y={rect.y}
            width={rect.width}
            height={rect.height}
            fill="transparent"
            pointerEvents={onNavigate ? 'auto' : 'none'}
            onClick={() => onNavigate?.(link.targetPageId)}
            style={{ cursor: onNavigate ? 'pointer' : 'default' }}
          />
        );
      })}
    </svg>
  );
}
