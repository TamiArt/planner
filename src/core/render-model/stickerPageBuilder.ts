import { getMonthCalendar, getWeekCalendar, RU_MONTHS_SHORT, RU_WEEKDAYS } from '../../lib/navigation/dateHelpers';
import { getPaperRect } from '../../lib/templates/layout';
import { getMoonPhaseForConfig, type MoonPhaseDisplay } from '../../lib/moon/moonPhases';
import { getAstroIconDataUri } from '../../lib/astrology/astroIcons';
import {
  ENERGY_META,
  FOCUS_META,
  getAstrologyEntryForConfig,
  NAKSHATRA_NAMES,
  NAKSHATRA_TYPE_META,
  PLANET_DAY_META,
  TITHI_TYPE_META,
} from '../../lib/astrology/jyotishDaily';
import {
  ASTROLOGY_ALIGNMENT_STRATEGIES,
  getAstrologyRenderMode,
} from './astrologyAlignmentStrategies';
import { getStickersByCategory } from '../../lib/assets/assetRegistry';
import {
  getReadyStickerSheetById,
  getStickerModuleConfig,
  getStickerRenderableAssetById,
  isUploadedStickerAsset,
} from '../../lib/stickers/stickerModuleConfig';
import { getStickerCategoryMeta } from '../../lib/stickers/stickerCatalog';
import type { PlannerLinkDefinition } from '../types/pdf';
import type { AstrologyLineDensity, AstrologyLinePresetId, PlannerAstrologyDayEntry } from '../types/planner';
import type { PlannerRenderModel, PlannerRenderPage } from './types';
import { addLink, blockSurface, createRadius, createRectNode, createTextNode, drawWritingLines, gridRects, withPadding } from './helpers';
import { getBlock, getBlocks, getFirstPageBySection, getPageById } from './selectors';
import { buildLinearControls } from './linearPageBuilders';

export function buildStickerPage(model: PlannerRenderModel, renderPage: PlannerRenderPage, links: PlannerLinkDefinition[]) {
  const { theme, config } = model;
  const stickerConfig = getStickerModuleConfig(config);
  const introBlock = getBlock(renderPage.layout, 'text');
  const gridBlock = getBlock(renderPage.layout, 'sticker-grid');
  const category = renderPage.page.stickerCategory ?? 'functional';
  const meta = getStickerCategoryMeta(category);

  if (introBlock) {
    renderPage.nodes.push(blockSurface(introBlock, `${renderPage.page.id}-intro`));
    const area = withPadding(introBlock);
    renderPage.nodes.push(createTextNode(`${renderPage.page.id}-intro-title`, renderPage.page.stickerSourceMode === 'ready-sheet' ? 'Ready sheet' : meta.label, area.x, area.y, 24, 'bold', theme.colors.text, area.width));
    renderPage.nodes.push(createTextNode(`${renderPage.page.id}-intro-copy`, renderPage.page.stickerSourceMode === 'ready-sheet' ? 'Один файл = одна страница без перекомпоновки.' : meta.description, area.x, area.y + 38, 18, 'body', theme.colors.muted, area.width));
  }

  if (gridBlock) {
    renderPage.nodes.push(blockSurface(gridBlock, `${renderPage.page.id}-grid`));
    const area = withPadding(gridBlock);

    if (renderPage.page.stickerSourceMode === 'ready-sheet') {
      const sheet = renderPage.page.stickerReadySheetId ? getReadyStickerSheetById(stickerConfig, renderPage.page.stickerReadySheetId) : undefined;
      if (sheet) {
        renderPage.nodes.push({
          id: `${renderPage.page.id}-sheet`,
          kind: 'image',
          x: area.x,
          y: area.y,
          width: area.width,
          height: area.height,
          src: sheet.previewSource,
          storageId: sheet.storageId,
          fit: 'contain',
        });
      }
    } else {
      const assets = renderPage.page.stickerAssetIds?.length
        ? renderPage.page.stickerAssetIds.map((assetId) => getStickerRenderableAssetById(stickerConfig, assetId)).filter((asset): asset is NonNullable<typeof asset> => Boolean(asset))
        : getStickersByCategory(category).slice(0, 6);
      const columns = assets.length <= 2 ? 2 : 3;
      const rows = Math.max(1, Math.ceil(assets.length / columns));
      const cards = gridRects(area, rows, columns, 24);

      assets.forEach((asset, index) => {
        const card = cards[index];
        renderPage.nodes.push(createRectNode(`${renderPage.page.id}-sticker-card-${index}`, card, {
          fill: theme.colors.paper,
          stroke: theme.colors.border,
          strokeWidth: 2,
          radius: createRadius(20),
        }));

        if (isUploadedStickerAsset(asset)) {
          renderPage.nodes.push({
            id: `${renderPage.page.id}-sticker-image-${index}`,
            kind: 'image',
            x: card.x + 18,
            y: card.y + 18,
            width: card.width - 36,
            height: card.height - 64,
            src: asset.previewSource,
            storageId: asset.storageId,
            fit: 'contain',
          });
          renderPage.nodes.push(createTextNode(`${renderPage.page.id}-sticker-name-${index}`, asset.name, card.x + 18, card.y + card.height - 34, 16, 'body', theme.colors.muted, card.width - 36));
        } else {
          renderPage.nodes.push({
            id: `${renderPage.page.id}-sticker-badge-${index}`,
            kind: 'circle',
            cx: card.x + card.width / 2,
            cy: card.y + card.height / 2 - 14,
            r: Math.min(card.width, card.height) * 0.18,
            fill: asset.backgroundMode === 'transparent' ? 'rgba(255,255,255,0.08)' : asset.color,
            stroke: asset.color,
            strokeWidth: 2,
          });
          renderPage.nodes.push(createTextNode(`${renderPage.page.id}-sticker-emoji-${index}`, asset.emoji ?? asset.name.slice(0, 2).toUpperCase(), card.x + card.width / 2, card.y + card.height / 2 - 28, 24, 'bold', theme.colors.text, 120, 'center'));
          renderPage.nodes.push(createTextNode(`${renderPage.page.id}-sticker-title-${index}`, asset.name, card.x + 18, card.y + card.height - 34, 16, 'body', theme.colors.muted, card.width - 36, 'center'));
        }
      });
    }
  }

  buildLinearControls(model, renderPage, links, 'sheet');
}
