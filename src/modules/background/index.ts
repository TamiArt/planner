import type { PlannerModule } from '../../core/registry/plannerModule';
import { getBackgroundById } from '../../lib/assets/assetRegistry';
import { resolvePlannerThemeId } from '../../lib/themes/themeRegistry';
import { backgroundManifest } from './manifest';

export const backgroundModule: PlannerModule = {
  manifest: backgroundManifest,
  isEnabled: () => true,
  lifecycle: {
    normalizeConfig: (config) => {
      const resolvedBackground = getBackgroundById(config.backgroundId, config.customBackground);

      return {
        theme: resolvePlannerThemeId(config.themeId, config.theme),
        background: {
          type: resolvedBackground.type,
          image: resolvedBackground.type === 'image' ? resolvedBackground.source : undefined,
          opacity: config.background?.opacity ?? config.backgroundOpacity,
          color: resolvedBackground.type === 'color'
            ? (resolvedBackground.color ?? (resolvedBackground.source.startsWith('#') ? resolvedBackground.source : undefined))
            : undefined,
        },
      };
    },
  },
  validate: ({ config }) => {
    const messages: string[] = [];

    if (!config.themeId) {
      messages.push('Не выбрана тема планера.');
    }

    if (!config.backgroundId) {
      messages.push('Не выбран фон планера.');
    }

    if (config.background.type === 'image' && !config.background.image && !config.customBackground?.source) {
      messages.push('Для фонового изображения не найден источник данных.');
    }

    return messages;
  },
};
