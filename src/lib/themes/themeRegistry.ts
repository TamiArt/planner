import { plannerThemes } from '../../data/themes/themes';

export function getThemeById(themeId: string) {
  return plannerThemes.find((theme) => theme.id === themeId) ?? plannerThemes[0];
}
