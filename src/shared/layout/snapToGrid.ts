import type { GridSettings } from './types';

export function snapToGrid(value: number, grid?: GridSettings) {
  if (!grid) {
    return Math.round(value);
  }

  if (!grid.snap || grid.size <= 1) {
    return Math.round(value);
  }

  return Math.round(value / grid.size) * grid.size;
}
