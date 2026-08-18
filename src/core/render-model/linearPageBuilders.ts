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

import {
  drawAstroInline,
  drawAstroLegendPage,
  drawMoonPhaseLabel,
  estimateAstroInlineWidth,
  getAstroLineSizing,
  getAstroSegmentsForPreset,
  splitAstroSegmentsIntoLines,
} from './astrologyPageBuilders';

export function buildLinearControls(model: PlannerRenderModel, renderPage: PlannerRenderPage, links: PlannerLinkDefinition[], label: string) {
  const { theme } = model;
  const pageIndex = model.plan.pages.findIndex((candidate) => candidate.id === renderPage.page.id);
  const previous = model.plan.pages[pageIndex - 1]?.id;
  const next = model.plan.pages[pageIndex + 1]?.id;

  [
    { id: 'prev', title: `Prev ${label}`, target: previous, rect: { x: 120, y: 1388, width: 260, height: 64 } },
    { id: 'next', title: `Next ${label}`, target: next, rect: { x: 400, y: 1388, width: 260, height: 64 } },
  ].forEach((item) => {
    renderPage.nodes.push(createRectNode(`${renderPage.page.id}-${item.id}`, item.rect, {
      fill: theme.colors.paper,
      stroke: theme.colors.border,
      strokeWidth: 2,
      radius: createRadius(16),
    }));
    renderPage.nodes.push(createTextNode(`${renderPage.page.id}-${item.id}-text`, item.title, item.rect.x + 24, item.rect.y + 18, 20, 'bold', theme.colors.text, item.rect.width - 48));
    addLink(links, renderPage.page.id, item.target, item.rect);
  });
}

export function buildDayPage(model: PlannerRenderModel, renderPage: PlannerRenderPage, links: PlannerLinkDefinition[]) {
  const { theme, config } = model;
  const moonPhase = getMoonPhaseForConfig(config, renderPage.page.dateIso);
  const astrologyEntry = getAstrologyEntryForConfig(config, renderPage.page.dateIso);
  const dayPreset = config.astrology.display.dayPreset;
  const density = config.astrology.display.lineDensity;
  const dayLineSizing = getAstroLineSizing('day', dayPreset);
  const dailySegments = getAstroSegmentsForPreset(astrologyEntry, moonPhase, model, dayPreset);
  const titles = ['Agenda', 'Priorities', 'Notes'];
  const firstBlock = renderPage.layout.blocks.find((block) => block.type === 'note-area' || block.type === 'checklist');

  if (dailySegments.length > 0 && firstBlock) {
    const area = withPadding(firstBlock);
    if (getAstrologyRenderMode(model.config) === 'overlay' && moonPhase) {
      renderPage.nodes.push(createRectNode(`${renderPage.page.id}-astro-mask`, {
        x: area.x - 4,
        y: Math.max(280, firstBlock.y - 50),
        width: area.width + 8,
        height: 28,
      }, {
        fill: theme.colors.paper,
      }));
    }
    const placement = ASTROLOGY_ALIGNMENT_STRATEGIES.dayPageInline.place({
      area,
      firstBlockY: firstBlock.y,
      inlineWidth: estimateAstroInlineWidth(
        dailySegments,
        dayLineSizing.iconSize,
        dayLineSizing.fontSize,
        density,
      ),
      moonLabelWidth: 0,
    });
    drawAstroInline(
      renderPage.nodes,
      `${renderPage.page.id}-astro-line`,
      dailySegments,
      placement.x,
      placement.y,
      theme.colors.muted,
      dayLineSizing.iconSize,
      dayLineSizing.fontSize,
      density,
    );
  } else if (moonPhase && firstBlock) {
    const area = withPadding(firstBlock);
    renderPage.nodes.push(createTextNode(
      `${renderPage.page.id}-moon-phase`,
      `Фаза Луны: ${moonPhase.label}`,
      area.x,
      Math.max(286, firstBlock.y - 42),
      18,
      'bold',
      theme.colors.muted,
      area.width,
    ));
  }

  renderPage.layout.blocks
    .filter((block) => block.type === 'note-area' || block.type === 'checklist')
    .forEach((block, index) => {
      renderPage.nodes.push(blockSurface(block, `${renderPage.page.id}-block-${index}`));
      const area = withPadding(block);
      renderPage.nodes.push(createTextNode(`${renderPage.page.id}-block-title-${index}`, titles[index] ?? 'Section', area.x, area.y, 22, 'bold', theme.colors.text, area.width));

      if (block.type === 'checklist') {
        const rowHeight = Math.min(74, (area.height - 56) / 9);
        for (let row = 0; row < 9; row += 1) {
          const y = area.y + 54 + row * rowHeight;
          renderPage.nodes.push(createRectNode(`${renderPage.page.id}-checkbox-${row}`, { x: area.x, y, width: 24, height: 24 }, {
            stroke: theme.colors.border,
            strokeWidth: 2,
            radius: createRadius(6),
          }));
          renderPage.nodes.push({
            id: `${renderPage.page.id}-priority-line-${row}`,
            kind: 'line',
            x1: area.x + 42,
            y1: y + 14,
            x2: area.x + area.width,
            y2: y + 14,
            stroke: theme.colors.border,
            strokeWidth: 2,
            opacity: 0.6,
          });
        }
      } else {
        drawWritingLines(renderPage.nodes, { x: area.x, y: area.y + 52, width: area.width, height: area.height - 64 }, 10, theme.colors.border, `${renderPage.page.id}-lines-${index}`);
      }
    });

  buildLinearControls(model, renderPage, links, 'day');
}

export function buildNotesPage(model: PlannerRenderModel, renderPage: PlannerRenderPage, links: PlannerLinkDefinition[]) {
  const { theme } = model;
  const noteBlock = getBlock(renderPage.layout, 'note-area');
  if (noteBlock) {
    renderPage.nodes.push(blockSurface(noteBlock, `${renderPage.page.id}-notes-surface`));
    drawWritingLines(renderPage.nodes, withPadding(noteBlock), 18, theme.colors.border, `${renderPage.page.id}-note-lines`);
  }
  buildLinearControls(model, renderPage, links, 'note');
}

export function buildChecklistPage(model: PlannerRenderModel, renderPage: PlannerRenderPage, links: PlannerLinkDefinition[]) {
  const { theme } = model;
  const checklistBlock = getBlock(renderPage.layout, 'checklist');
  if (checklistBlock) {
    renderPage.nodes.push(blockSurface(checklistBlock, `${renderPage.page.id}-checklist-surface`));
    const area = withPadding(checklistBlock);
    const rowHeight = Math.min(68, (area.height - 40) / 12);
    for (let row = 0; row < 12; row += 1) {
      const y = area.y + 24 + row * rowHeight;
      renderPage.nodes.push(createRectNode(`${renderPage.page.id}-check-${row}`, { x: area.x, y, width: 24, height: 24 }, {
        stroke: theme.colors.border,
        strokeWidth: 2,
        radius: createRadius(6),
      }));
      renderPage.nodes.push({
        id: `${renderPage.page.id}-row-${row}`,
        kind: 'line',
        x1: area.x + 40,
        y1: y + 14,
        x2: area.x + area.width,
        y2: y + 14,
        stroke: theme.colors.border,
        strokeWidth: 2,
        opacity: 0.65,
      });
    }
  }
  buildLinearControls(model, renderPage, links, 'list');
}
