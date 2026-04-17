export const LAYOUT_CANVAS_WIDTH = 2048;
export const LAYOUT_CANVAS_HEIGHT = 1536;

export type LayoutPageTarget =
  | 'index'
  | 'year'
  | 'month'
  | 'week-left'
  | 'week-right'
  | 'day'
  | 'notes'
  | 'checklist'
  | 'sticker';

export type LayoutBlockType =
  | 'header'
  | 'text'
  | 'calendar'
  | 'note-area'
  | 'checklist'
  | 'image'
  | 'sticker-grid'
  | 'shape'
  | 'decoration'
  | 'group';

export interface LayoutBlockRadius {
  topLeft: number;
  topRight: number;
  bottomLeft: number;
  bottomRight: number;
}

export interface LayoutBlockBorder {
  width: number;
  color: string;
  style: 'solid' | 'dashed';
}

export interface LayoutBlockPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface LayoutBlock {
  id: string;
  type: LayoutBlockType | string;
  name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  radius: LayoutBlockRadius;
  border: LayoutBlockBorder;
  padding: LayoutBlockPadding;
  backgroundColor?: string;
  opacity?: number;
  locked?: boolean;
  meta?: Record<string, unknown>;
}

export interface GridSettings {
  visible: boolean;
  snap: boolean;
  size: number;
  subdivisions: number;
}

export interface PageLayout {
  id?: string;
  target?: LayoutPageTarget;
  title?: string;
  width: number;
  height: number;
  grid?: GridSettings;
  blocks: LayoutBlock[];
  updatedAt?: string;
}

export type PlannerLayoutsConfig = Partial<Record<LayoutPageTarget, PageLayout>>;
