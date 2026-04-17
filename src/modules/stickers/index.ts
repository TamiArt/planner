import type { PlannerModule } from '../../core/registry/plannerModule';
import type { StickerCategory } from '../../core/types/planner';
import { NEXT_RECT, PREVIOUS_RECT } from '../../lib/templates/layout';
import {
  buildAutoStickerPageGroups,
  getReadyStickerSheetById,
  getStickerModuleConfig,
} from '../../lib/stickers/stickerModuleConfig';
import { getStickerCategoryMeta } from '../../lib/stickers/stickerCatalog';
import { stickersManifest } from './manifest';

function buildLinearLinks(pageIds: string[]) {
  return pageIds.flatMap((pageId, index) => {
    const links = [];
    const previous = pageIds[index - 1];
    const next = pageIds[index + 1];

    if (previous) {
      links.push({ sourcePageId: pageId, targetPageId: previous, rect: PREVIOUS_RECT });
    }
    if (next) {
      links.push({ sourcePageId: pageId, targetPageId: next, rect: NEXT_RECT });
    }

    return links;
  });
}

export const stickersModule: PlannerModule = {
  manifest: stickersManifest,
  createSection: (config) => {
    const stickerConfig = getStickerModuleConfig(config);
    const count = stickerConfig.sourceMode === 'ready-sheet'
      ? Math.max(0, stickerConfig.readySheets?.length ?? 0)
      : buildAutoStickerPageGroups(stickerConfig).length;

    return {
      type: 'stickers',
      enabled: config.modules.stickers.enabled,
      count,
      variant: stickerConfig.sourceMode === 'ready-sheet' ? 'ready-sheet-template' : 'sticker-sheet-template',
      options: config.modules.stickers.options,
    };
  },
  isEnabled: (config) => config.modules.stickers.enabled,
  getPages: (config) => {
    const stickerConfig = getStickerModuleConfig(config);

    if (stickerConfig.sourceMode === 'ready-sheet') {
      return (stickerConfig.readySheets ?? []).map((sheet, index) => ({
        id: `page-sticker-${index + 1}`,
        kind: 'sticker' as const,
        title: sheet.name,
        label: 'Готовый лист',
        sectionType: 'stickers' as const,
        stickerSourceMode: 'ready-sheet' as const,
        stickerReadySheetId: sheet.id,
        stickerReadySheetName: sheet.name,
      }));
    }

    return buildAutoStickerPageGroups(stickerConfig).map((group, index) => {
      const categoryMeta = getStickerCategoryMeta(group.category as StickerCategory);

      return {
        id: `page-sticker-${index + 1}`,
        kind: 'sticker' as const,
        title: group.title,
        label: group.label || categoryMeta.label,
        sectionType: 'stickers' as const,
        stickerCategory: group.category,
        stickerSourceMode: 'auto-png-pack' as const,
        stickerAssetIds: group.assetIds,
      };
    });
  },
  getTabs: ({ pages }) => {
    const firstPage = pages.find((page) => page.sectionType === 'stickers');
    return firstPage
      ? [{ id: 'tab-stickers', label: 'Стикеры', kind: 'section' as const, targetPageId: firstPage.id }]
      : [];
  },
  getLinks: ({ pages }) => buildLinearLinks(pages.filter((page) => page.kind === 'sticker').map((page) => page.id)),
  validate: ({ config }) => {
    const stickerConfig = getStickerModuleConfig(config);
    const messages: string[] = [];

    if (!config.modules.stickers.enabled) {
      return messages;
    }

    if (stickerConfig.sourceMode === 'auto-png-pack') {
      const groups = buildAutoStickerPageGroups(stickerConfig);
      if (groups.length === 0) {
        messages.push('Модуль стикеров включен, но для авто-режима не загружены PNG и не найден базовый набор.');
      }
    }

    if (stickerConfig.sourceMode === 'ready-sheet' && (stickerConfig.readySheets?.length ?? 0) === 0) {
      messages.push('Модуль стикеров включен в режиме готовых листов, но сами листы не загружены.');
    }

    if (stickerConfig.sourceMode === 'ready-sheet') {
      (stickerConfig.readySheets ?? []).forEach((sheet) => {
        if (!getReadyStickerSheetById(stickerConfig, sheet.id)) {
          messages.push('В конфигурации стикеров найден некорректный готовый лист.');
        }
      });
    }

    return messages;
  },
};
