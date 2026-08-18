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

export function buildIndexPage(model: PlannerRenderModel, renderPage: PlannerRenderPage, links: PlannerLinkDefinition[]) {
  const { theme } = model;
  const { page, layout, nodes } = renderPage;
  const monthBlock = getBlock(layout, 'group', 0);
  const sectionBlock = getBlock(layout, 'group', 1);

  if (monthBlock) {
    nodes.push(blockSurface(monthBlock, `${page.id}-months-surface`));
    const area = withPadding(monthBlock);
    const monthRects = gridRects(area, 3, 4, 28);

    RU_MONTHS_SHORT.forEach((month, index) => {
      const rect = monthRects[index];
      nodes.push(createRectNode(`${page.id}-month-card-${index}`, rect, {
        fill: theme.id === 'dark' ? 'rgba(19, 23, 34, 0.34)' : 'rgba(255,255,255,0.72)',
        stroke: theme.colors.border,
        strokeWidth: 2,
        radius: createRadius(18),
      }));
      nodes.push(createTextNode(`${page.id}-month-label-${index}`, month, rect.x + 28, rect.y + 22, 26, 'bold', theme.colors.text, rect.width - 56));
      addLink(links, page.id, getPageById(model.plan, `page-month-${index + 1}`)?.id, rect);
    });
  }

  if (sectionBlock) {
    nodes.push(blockSurface(sectionBlock, `${page.id}-sections-surface`));
    const area = withPadding(sectionBlock);
    const sectionRects = gridRects(area, 2, 3, 28);
    const items = [
      { label: 'Year overview', target: getFirstPageBySection(model.plan, 'year')?.id },
      { label: 'Weekly', target: getFirstPageBySection(model.plan, 'weekly')?.id },
      { label: 'Daily', target: getFirstPageBySection(model.plan, 'daily')?.id },
      { label: 'Notes', target: getFirstPageBySection(model.plan, 'notes')?.id },
      { label: 'Checklist', target: getFirstPageBySection(model.plan, 'checklist')?.id },
      { label: 'Stickers', target: getFirstPageBySection(model.plan, 'stickers')?.id },
    ];

    items.forEach((item, index) => {
      const rect = sectionRects[index];
      nodes.push(createRectNode(`${page.id}-section-card-${index}`, rect, {
        fill: item.target ? theme.colors.paper : 'rgba(18, 26, 43, 0.04)',
        stroke: theme.colors.border,
        strokeWidth: 2,
        radius: createRadius(18),
      }));
      nodes.push(createTextNode(`${page.id}-section-text-${index}`, item.label, rect.x + 24, rect.y + 26, 24, 'bold', theme.colors.text, rect.width - 48));
      nodes.push(createTextNode(`${page.id}-section-subtext-${index}`, item.target ? 'Open section' : 'Disabled', rect.x + 24, rect.y + 62, 18, 'body', theme.colors.muted, rect.width - 48));
      addLink(links, page.id, item.target, rect);
    });
  }
}

export function buildYearPage(model: PlannerRenderModel, renderPage: PlannerRenderPage, links: PlannerLinkDefinition[]) {
  const { theme } = model;
  const { page, layout, nodes } = renderPage;
  const calendarBlock = getBlock(layout, 'calendar');
  if (!calendarBlock) {
    return;
  }

  nodes.push(blockSurface(calendarBlock, `${page.id}-calendar-surface`));
  const area = withPadding(calendarBlock);
  const monthRects = gridRects(area, 3, 4, 28);

  RU_MONTHS_SHORT.forEach((month, index) => {
    const rect = monthRects[index];
    nodes.push(createRectNode(`${page.id}-month-card-${index}`, rect, {
      fill: theme.colors.paper,
      stroke: theme.colors.border,
      strokeWidth: 2,
      radius: createRadius(20),
    }));
    nodes.push(createTextNode(`${page.id}-month-title-${index}`, month, rect.x + 24, rect.y + 20, 24, 'bold', theme.colors.text, rect.width - 48));
    drawWritingLines(nodes, { x: rect.x + 24, y: rect.y + 72, width: rect.width - 48, height: rect.height - 96 }, 3, theme.colors.border, `${page.id}-month-lines-${index}`);
    addLink(links, page.id, getPageById(model.plan, `page-month-${index + 1}`)?.id, rect);
  });
}

export function buildMonthPage(model: PlannerRenderModel, renderPage: PlannerRenderPage, links: PlannerLinkDefinition[]) {
  const { theme, config } = model;
  const { page, layout, nodes } = renderPage;
  const focusBlock = layout.blocks.find((block) => block.meta?.role === 'month-focus')
    ?? layout.blocks.find((block) => block.type === 'note-area' && block.meta?.userAdded !== true);
  const calendarBlock = layout.blocks.find((block) => block.meta?.role === 'month-calendar') ?? getBlock(layout, 'calendar');
  const weekLinksBlock = layout.blocks.find((block) => block.meta?.role === 'month-week-links') ?? getBlock(layout, 'group');
  const activeYear = config.year ?? new Date().getFullYear();
  const monthCalendar = getMonthCalendar(activeYear, page.monthIndex ?? 0);
  const weekTargetByIso = new Map<string, string>();

  model.plan.pages
    .filter((candidate) => candidate.kind === 'week-left')
    .forEach((candidate) => {
      if (typeof candidate.weekIndex !== 'number') {
        return;
      }

      getWeekCalendar(activeYear, candidate.weekIndex).days.forEach((day) => {
        if (!weekTargetByIso.has(day.iso)) {
          weekTargetByIso.set(day.iso, candidate.id);
        }
      });
    });

  if (focusBlock) {
    nodes.push(blockSurface(focusBlock, `${page.id}-focus-surface`));
    const area = withPadding(focusBlock);
    ['Goals', 'Projects', 'Rhythm'].forEach((label, index) => {
      const sectionTop = area.y + index * (area.height / 3);
      nodes.push(createTextNode(`${page.id}-focus-title-${index}`, label, area.x, sectionTop, 22, 'bold', theme.colors.text, area.width));
      drawWritingLines(nodes, { x: area.x, y: sectionTop + 42, width: area.width, height: area.height / 3 - 54 }, 4, theme.colors.border, `${page.id}-focus-${index}`);
    });
  }

  if (calendarBlock) {
    nodes.push(blockSurface(calendarBlock, `${page.id}-calendar-surface`));
    const area = withPadding(calendarBlock);
    const cellArea = { x: area.x, y: area.y + 44, width: area.width, height: area.height - 180 };
    const cellRects = gridRects(cellArea, 6, 7, 12);

    RU_WEEKDAYS.forEach((weekday, index) => {
      nodes.push(createTextNode(`${page.id}-weekday-${index}`, weekday, area.x + index * (area.width / 7), area.y, 18, 'bold', theme.colors.muted, area.width / 7 - 8));
    });

    monthCalendar.grid.flat().forEach((cell, index) => {
      const rect = cellRects[index];
      nodes.push(createRectNode(`${page.id}-cell-${index}`, rect, {
        fill: cell.inCurrentMonth ? theme.colors.paper : 'rgba(18, 26, 43, 0.04)',
        stroke: theme.colors.border,
        strokeWidth: 1.5,
        radius: createRadius(12),
      }));
      if (config.mode === 'dated' && cell.inCurrentMonth) {
        nodes.push(createTextNode(`${page.id}-cell-text-${index}`, String(cell.dayOfMonth), rect.x + 16, rect.y + 12, 18, 'body', theme.colors.text));
        const moonPhase = getMoonPhaseForConfig(config, cell.iso);
        const astrologyEntry = getAstrologyEntryForConfig(config, cell.iso);
        const density = config.astrology.display.lineDensity;
        const monthPreset: AstrologyLinePresetId = 'compact-icons';
        const monthLineSizing = getAstroLineSizing('month', monthPreset);
        const miniSegments = getAstroSegmentsForPreset(astrologyEntry, moonPhase, model, monthPreset);
        if (miniSegments.length > 0) {
          if (getAstrologyRenderMode(model.config) === 'overlay' && moonPhase) {
            nodes.push(createRectNode(`${page.id}-cell-astro-mask-${index}`, {
              x: rect.x + rect.width - 82,
              y: rect.y + rect.height - 38,
              width: 70,
              height: 24,
            }, {
              fill: theme.colors.paper,
            }));
          }
          const placement = ASTROLOGY_ALIGNMENT_STRATEGIES.monthCellBottom.place({ rect });
          drawAstroInline(
            nodes,
            `${page.id}-cell-astro-${index}`,
            miniSegments,
            placement.x,
            placement.y,
            theme.colors.muted,
            monthLineSizing.iconSize,
            monthLineSizing.fontSize,
            density,
          );
        } else {
          drawMoonPhaseLabel(
            nodes,
            moonPhase,
            `${page.id}-cell-moon-${index}`,
            rect.x + rect.width - 70,
            rect.y + rect.height - 30,
            56,
            theme.colors.muted,
            12,
            'right',
          );
        }
      }

      if (config.mode === 'dated') {
        addLink(links, page.id, weekTargetByIso.get(cell.iso), rect);
      }
    });

    const buttonHeight = 72;
    const buttonGap = 24;
    const buttonWidth = (area.width - buttonGap) / 2;
    const buttons = [
      { id: 'daily', label: 'Daily pages', target: model.plan.pages.find((candidate) => candidate.kind === 'day' && candidate.monthIndex === page.monthIndex)?.id, rect: { x: area.x, y: area.y + area.height - buttonHeight, width: buttonWidth, height: buttonHeight } },
      { id: 'year', label: 'Year overview', target: getFirstPageBySection(model.plan, 'year')?.id, rect: { x: area.x + buttonWidth + buttonGap, y: area.y + area.height - buttonHeight, width: buttonWidth, height: buttonHeight } },
    ];

    buttons.forEach((button) => {
      nodes.push(createRectNode(`${page.id}-button-${button.id}`, button.rect, {
        fill: theme.colors.paper,
        stroke: theme.colors.border,
        strokeWidth: 2,
        radius: createRadius(16),
      }));
      nodes.push(createTextNode(`${page.id}-button-text-${button.id}`, button.label, button.rect.x + 24, button.rect.y + 22, 22, 'bold', theme.colors.text, button.rect.width - 48));
      addLink(links, page.id, button.target, button.rect);
    });
  }

  if (weekLinksBlock) {
    nodes.push(blockSurface(weekLinksBlock, `${page.id}-weeks-surface`));
    const weekRects = gridRects(withPadding(weekLinksBlock), 2, 3, 24);
    const weekPages = model.plan.pages.filter((candidate) => candidate.kind === 'week-left' && candidate.monthIndex === page.monthIndex).slice(0, 6);

    weekPages.forEach((week, index) => {
      const rect = weekRects[index];
      nodes.push(createRectNode(`${page.id}-week-card-${week.id}`, rect, {
        fill: theme.colors.paper,
        stroke: theme.colors.border,
        strokeWidth: 2,
        radius: createRadius(16),
      }));
      nodes.push(createTextNode(`${page.id}-week-title-${index}`, week.title, rect.x + 20, rect.y + 16, 20, 'bold', theme.colors.text, rect.width - 40));
      nodes.push(createTextNode(`${page.id}-week-label-${index}`, week.label, rect.x + 20, rect.y + 48, 16, 'body', theme.colors.muted, rect.width - 40));
      addLink(links, page.id, week.id, rect);
    });
  }

  layout.blocks
    .filter((block) => block.meta?.userAdded === true && block.id !== focusBlock?.id)
    .forEach((block, index) => {
      const blockId = `${page.id}-custom-month-block-${index}`;
      nodes.push(blockSurface(block, `${blockId}-surface`));
      const area = withPadding(block);

      if (block.type === 'note-area') {
        nodes.push(createTextNode(`${blockId}-title`, block.name ?? 'Заметки', area.x, area.y, 22, 'bold', theme.colors.text, area.width));
        drawWritingLines(nodes, { x: area.x, y: area.y + 48, width: area.width, height: area.height - 56 }, 6, theme.colors.border, `${blockId}-lines`);
      } else if (block.type === 'checklist') {
        nodes.push(createTextNode(`${blockId}-title`, block.name ?? 'Чек-лист', area.x, area.y, 22, 'bold', theme.colors.text, area.width));
        const rowCount = Math.max(1, Math.min(8, Math.floor((area.height - 54) / 42)));
        for (let row = 0; row < rowCount; row += 1) {
          const y = area.y + 50 + row * 42;
          nodes.push(createRectNode(`${blockId}-checkbox-${row}`, { x: area.x, y, width: 22, height: 22 }, {
            stroke: theme.colors.border,
            strokeWidth: 2,
            radius: createRadius(5),
          }));
          nodes.push({
            id: `${blockId}-line-${row}`,
            kind: 'line',
            x1: area.x + 38,
            y1: y + 12,
            x2: area.x + area.width,
            y2: y + 12,
            stroke: theme.colors.border,
            strokeWidth: 2,
            opacity: 0.6,
          });
        }
      } else if (block.type === 'text') {
        const content = typeof block.meta?.content === 'string' && block.meta.content.trim()
          ? block.meta.content
          : block.name ?? 'Текст';
        nodes.push(createTextNode(`${blockId}-text`, content, area.x, area.y, 22, 'body', theme.colors.text, area.width));
      }
    });
}
