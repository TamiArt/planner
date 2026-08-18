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

export function buildWeekPage(model: PlannerRenderModel, renderPage: PlannerRenderPage, links: PlannerLinkDefinition[]) {
  const { theme, config } = model;
  const { page, layout, nodes } = renderPage;
  const dayBlocks = getBlocks(layout, 'group');
  const noteBlocks = getBlocks(layout, 'note-area').slice().sort((left, right) => left.x - right.x);
  let footerBlock = noteBlocks[0];
  let gratitudeBlock = page.kind === 'week-left' ? noteBlocks[1] : undefined;
  const descriptor = getWeekCalendar(config.year ?? new Date().getFullYear(), page.weekIndex ?? 0);
  const days = page.kind === 'week-left' ? descriptor.days.slice(0, 3) : descriptor.days.slice(3);

  if (page.kind === 'week-left' && footerBlock && !gratitudeBlock && footerBlock.width >= 760) {
    const gratitudeWidth = Math.min(380, Math.max(300, Math.round(footerBlock.width * 0.23)));
    const gap = Math.min(40, Math.max(24, Math.round(footerBlock.width * 0.024)));
    const focusWidth = footerBlock.width - gratitudeWidth - gap;

    if (focusWidth >= 360) {
      gratitudeBlock = {
        ...footerBlock,
        id: `${footerBlock.id}-gratitude-fallback`,
        name: 'Благодарность',
        x: footerBlock.x + focusWidth + gap,
        width: gratitudeWidth,
      };
      footerBlock = {
        ...footerBlock,
        width: focusWidth,
      };
    }
  }

  dayBlocks.forEach((block, index) => {
    nodes.push(blockSurface(block, `${page.id}-day-block-${index}`));
    const area = withPadding(block);
    const day = days[index];
    if (!day) {
      return;
    }

    nodes.push(createTextNode(`${page.id}-day-name-${index}`, config.mode === 'dated' ? day.weekdayLabel : RU_WEEKDAYS[day.weekdayIndex], area.x, area.y, 22, 'bold', theme.colors.text, area.width));
    const moonPhase = getMoonPhaseForConfig(config, day.iso);
    const dayDateLabel = config.mode === 'dated'
        ? day.shortLabel
        : 'Flexible slot';
    nodes.push(createTextNode(`${page.id}-day-date-${index}`, dayDateLabel, area.x, area.y + 34, 18, 'body', theme.colors.muted, area.width));
    const astrologyEntry = getAstrologyEntryForConfig(config, day.iso);
    const weekPreset = config.astrology.display.weekPreset;
    const density = config.astrology.display.lineDensity;
    const weekLineSizing = getAstroLineSizing('week', weekPreset);
    const dailySegments = getAstroSegmentsForPreset(astrologyEntry, moonPhase, model, weekPreset);
    const weeklyTextLines = weekPreset === 'text-icons' ? splitAstroSegmentsIntoLines(dailySegments, 2) : [dailySegments];
    if (dailySegments.length > 0) {
      if (getAstrologyRenderMode(model.config) === 'overlay' && moonPhase) {
        nodes.push(createRectNode(`${page.id}-day-astro-mask-${index}`, {
          x: area.x + area.width - 82,
          y: area.y - 4,
          width: 74,
          height: 24,
        }, {
          fill: theme.colors.paper,
        }));
      }
      const placement = ASTROLOGY_ALIGNMENT_STRATEGIES.weekColumnBelowDate.place({ area });
      weeklyTextLines.forEach((lineSegments, lineIndex) => {
        drawAstroInline(
          nodes,
          `${page.id}-day-astro-${index}-line-${lineIndex}`,
          lineSegments,
          placement.x,
          placement.y + lineIndex * (weekLineSizing.iconSize + 8),
          theme.colors.accent,
          weekLineSizing.iconSize,
          weekLineSizing.fontSize,
          density,
        );
      });
    } else {
      drawMoonPhaseLabel(
        nodes,
        moonPhase,
        `${page.id}-day-moon-${index}`,
        area.x + area.width - 66,
        area.y,
        58,
        theme.colors.accent,
        14,
        'right',
      );
    }
    const writingLinesTop = weekPreset === 'text-icons' ? area.y + 134 : area.y + 108;
    drawWritingLines(
      nodes,
      { x: area.x, y: writingLinesTop, width: area.width, height: area.height - (writingLinesTop - area.y) - 14 },
      8,
      theme.colors.border,
      `${page.id}-day-lines-${index}`,
    );
  });

  if (footerBlock) {
    nodes.push(blockSurface(footerBlock, `${page.id}-footer`));
    const area = withPadding(footerBlock);
    nodes.push(createTextNode(`${page.id}-footer-title`, page.kind === 'week-left' ? 'Weekly focus' : 'Notes & tracker', area.x, area.y, 22, 'bold', theme.colors.text, area.width));
    drawWritingLines(nodes, { x: area.x, y: area.y + 40, width: area.width, height: area.height - 56 }, 3, theme.colors.border, `${page.id}-footer-lines`);
  }

  if (gratitudeBlock) {
    nodes.push(blockSurface(gratitudeBlock, `${page.id}-gratitude`));
    const area = withPadding(gratitudeBlock);
    nodes.push(createTextNode(`${page.id}-gratitude-title`, 'Благодарность:', area.x, area.y, 20, 'bold', theme.colors.text, area.width));
    drawWritingLines(nodes, { x: area.x, y: area.y + 38, width: area.width, height: area.height - 54 }, 3, theme.colors.border, `${page.id}-gratitude-lines`);
  }

  const footerAnchors = [footerBlock, gratitudeBlock].filter(
    (block): block is NonNullable<typeof footerBlock> => Boolean(block),
  );
  const navAreaY = (footerAnchors.length > 0
    ? Math.max(...footerAnchors.map((block) => block.y + block.height))
    : 1280) + 28;
  const items = [
    { id: 'prev', label: 'Prev', target: page.kind === 'week-left' ? getPageById(model.plan, `page-week-${(page.weekIndex ?? 0)}-left`)?.id : getPageById(model.plan, `page-week-${(page.weekIndex ?? 0)}-right`)?.id, rect: { x: 120, y: navAreaY, width: 220, height: 64 } },
    { id: 'next', label: 'Next', target: page.kind === 'week-left' ? getPageById(model.plan, `page-week-${(page.weekIndex ?? 0) + 2}-left`)?.id : getPageById(model.plan, `page-week-${(page.weekIndex ?? 0) + 2}-right`)?.id, rect: { x: 360, y: navAreaY, width: 220, height: 64 } },
    { id: 'month', label: 'Month', target: model.plan.pages.find((candidate) => candidate.kind === 'month' && candidate.monthIndex === page.monthIndex)?.id, rect: { x: 764, y: navAreaY, width: 260, height: 64 } },
    { id: 'pair', label: page.kind === 'week-left' ? 'Page 2' : 'Page 1', target: page.kind === 'week-left' ? getPageById(model.plan, `page-week-${(page.weekIndex ?? 0) + 1}-right`)?.id : getPageById(model.plan, `page-week-${(page.weekIndex ?? 0) + 1}-left`)?.id, rect: { x: 1448, y: navAreaY, width: 260, height: 64 } },
  ];

  items.forEach((item) => {
    nodes.push(createRectNode(`${page.id}-nav-${item.id}`, item.rect, {
      fill: theme.colors.paper,
      stroke: theme.colors.border,
      strokeWidth: 2,
      radius: createRadius(16),
    }));
    nodes.push(createTextNode(`${page.id}-nav-text-${item.id}`, item.label, item.rect.x + 28, item.rect.y + 18, 20, 'bold', theme.colors.text, item.rect.width - 56));
    addLink(links, page.id, item.target, item.rect);
  });
}
