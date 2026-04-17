import type { PageLayout, LayoutBlockRadius } from '../../shared/layout';
import type { PlannerDocumentPlan, BuiltPlannerPage, PlannerLinkDefinition } from '../types/pdf';
import type { BackgroundAsset, PlannerConfig, PlannerTheme } from '../types/planner';

export type RenderFontToken = 'heading' | 'body' | 'bold';

export interface RenderBaseNode {
  id: string;
  opacity?: number;
}

export interface RenderRectNode extends RenderBaseNode {
  kind: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  dashArray?: number[];
  radius?: LayoutBlockRadius;
}

export interface RenderLineNode extends RenderBaseNode {
  kind: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: string;
  strokeWidth?: number;
  dashArray?: number[];
}

export interface RenderTextNode extends RenderBaseNode {
  kind: 'text';
  x: number;
  y: number;
  lines: string[];
  maxWidth?: number;
  font: RenderFontToken;
  fontSize: number;
  lineHeight: number;
  color: string;
  align?: 'left' | 'center' | 'right';
}

export interface RenderImageNode extends RenderBaseNode {
  kind: 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  src: string;
  fit?: 'contain' | 'cover';
  radius?: LayoutBlockRadius;
  storageId?: string;
}

export interface RenderCircleNode extends RenderBaseNode {
  kind: 'circle';
  cx: number;
  cy: number;
  r: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export type PlannerRenderNode =
  | RenderRectNode
  | RenderLineNode
  | RenderTextNode
  | RenderImageNode
  | RenderCircleNode;

export interface PlannerRenderPage {
  page: BuiltPlannerPage;
  layout: PageLayout;
  nodes: PlannerRenderNode[];
}

export interface PlannerRenderModel {
  width: number;
  height: number;
  config: PlannerConfig;
  theme: PlannerTheme;
  background: BackgroundAsset;
  plan: PlannerDocumentPlan;
  pages: PlannerRenderPage[];
  links: PlannerLinkDefinition[];
}
