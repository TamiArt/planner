import { plannerThemes } from '../../data/themes/themes';
import type { PlannerThemeId } from '../../types/planner';

const SUPPORTED_THEME_IDS = new Set<PlannerThemeId>(['minimal', 'soft', 'dark']);

export function resolvePlannerThemeId(value: unknown): PlannerThemeId {
  return typeof value === 'string' && SUPPORTED_THEME_IDS.has(value as PlannerThemeId)
    ? value as PlannerThemeId
    : 'minimal';
}

export function getThemeById(themeId: string) {
  return plannerThemes.find((theme) => theme.id === themeId) ?? plannerThemes[0];
}
