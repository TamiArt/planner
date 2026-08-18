import { plannerThemes } from '../../data/themes/themes';
import type { PlannerThemeId } from '../../types/planner';

const SUPPORTED_THEME_IDS = new Set<PlannerThemeId>(['minimal', 'soft', 'dark']);

function isPlannerThemeId(value: unknown): value is PlannerThemeId {
  return typeof value === 'string' && SUPPORTED_THEME_IDS.has(value as PlannerThemeId);
}

export function resolvePlannerThemeId(value: unknown, fallback?: unknown): PlannerThemeId {
  if (isPlannerThemeId(value)) {
    return value;
  }

  return isPlannerThemeId(fallback) ? fallback : 'minimal';
}

export function getThemeById(themeId: string) {
  return plannerThemes.find((theme) => theme.id === themeId) ?? plannerThemes[0];
}
