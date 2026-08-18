import { backgroundAssets } from '../../data/backgrounds/backgrounds';
import { stickerAssets } from '../../data/stickers/stickers';
import type { BackgroundAsset, StickerCategory } from '../../types/planner';

export function getBackgroundById(backgroundId: string, customBackground?: BackgroundAsset) {
  if (customBackground?.id === backgroundId) {
    return customBackground;
  }

  return backgroundAssets.find((background) => background.id === backgroundId) ?? customBackground ?? backgroundAssets[0];
}

export function getBackgroundsForTheme(themeId: string, customBackground?: BackgroundAsset) {
  const themedBackgrounds = backgroundAssets.filter((background) => background.themeId === themeId);
  return customBackground ? [customBackground, ...themedBackgrounds] : themedBackgrounds;
}

export function resolveBackgroundIdForTheme(
  themeId: string,
  currentBackgroundId: string,
  customBackground?: BackgroundAsset,
) {
  if (customBackground?.id === currentBackgroundId) {
    return currentBackgroundId;
  }

  const themedBackgrounds = getBackgroundsForTheme(themeId);
  if (themedBackgrounds.some((background) => background.id === currentBackgroundId)) {
    return currentBackgroundId;
  }

  return themedBackgrounds[0]?.id ?? customBackground?.id ?? currentBackgroundId;
}

export function getStickersByCategory(category: StickerCategory) {
  return stickerAssets.filter((sticker) => sticker.category === category);
}
