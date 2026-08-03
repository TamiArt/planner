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

function drawMoonPhaseLabel(
  nodes: PlannerRenderPage['nodes'],
  phase: MoonPhaseDisplay | undefined,
  id: string,
  x: number,
  y: number,
  width: number,
  color: string,
  size = 14,
  align: 'left' | 'center' | 'right' = 'left',
) {
  if (!phase) {
    return;
  }

  nodes.push(createTextNode(id, phase.shortLabel, x, y, size, 'bold', color, width, align));
}

type AstroInlineSegment =
  | { kind: 'icon'; icon: string }
  | { kind: 'text'; text: string }
  | { kind: 'separator' };

const ASTRO_INLINE_GAP_MULTIPLIER: Record<AstrologyLineDensity, number> = {
  compact: 0.72,
  standard: 1,
  wide: 1.45,
};

const TITHI_NAMES = [
  'Пратипада',
  'Двития',
  'Трития',
  'Чатуртхи',
  'Панчами',
  'Шаштхи',
  'Саптами',
  'Аштами',
  'Навами',
  'Дашами',
  'Экадаши',
  'Двадаши',
  'Трайодаши',
  'Чатурдаши',
  'Пурнима / Амавасья',
] as const;

function estimateInlineTextWidth(text: string, fontSize: number) {
  return text.length * fontSize * 0.62;
}

function getAstroInlineGap(iconSize: number, density: AstrologyLineDensity) {
  return Math.max(3, iconSize * 0.18 * ASTRO_INLINE_GAP_MULTIPLIER[density]);
}

function drawAstroInline(
  nodes: PlannerRenderPage['nodes'],
  id: string,
  segments: AstroInlineSegment[],
  x: number,
  y: number,
  color: string,
  iconSize: number,
  fontSize: number,
  density: AstrologyLineDensity = 'standard',
) {
  let cursor = x;
  const textY = y + Math.max(0, (iconSize - fontSize) / 2);
  const gap = getAstroInlineGap(iconSize, density);

  segments.forEach((segment, index) => {
    if (segment.kind === 'separator') {
      const text = '·';
      const width = estimateInlineTextWidth(text, fontSize);
      nodes.push(createTextNode(`${id}-separator-${index}`, text, cursor + gap, textY, fontSize, 'bold', color, width));
      cursor += width + gap * 3;
      return;
    }

    if (segment.kind === 'text') {
      const width = estimateInlineTextWidth(segment.text, fontSize);
      nodes.push(createTextNode(`${id}-text-${index}`, segment.text, cursor, textY, fontSize, 'bold', color, width));
      cursor += width + gap;
      return;
    }

    const src = getAstroIconDataUri(segment.icon);
    if (!src) {
      return;
    }

    nodes.push({
      id: `${id}-icon-${index}`,
      kind: 'image',
      x: cursor,
      y,
      width: iconSize,
      height: iconSize,
      src,
      fit: 'contain',
    });
    cursor += iconSize + gap;
  });
}

function estimateAstroInlineWidth(
  segments: AstroInlineSegment[],
  iconSize: number,
  fontSize: number,
  density: AstrologyLineDensity = 'standard',
) {
  const gap = getAstroInlineGap(iconSize, density);
  let width = 0;

  segments.forEach((segment) => {
    if (segment.kind === 'separator') {
      width += estimateInlineTextWidth('·', fontSize) + gap * 3;
      return;
    }

    if (segment.kind === 'text') {
      width += estimateInlineTextWidth(segment.text, fontSize) + gap;
      return;
    }

    width += iconSize + gap;
  });

  return Math.max(0, width - gap);
}

function getMoonPhaseSegments(phase: MoonPhaseDisplay | undefined): AstroInlineSegment[] {
  if (!phase) {
    return [];
  }

  if (phase.id === 'new') {
    return [{ kind: 'icon', icon: 'new-moon' }, { kind: 'text', text: '↑' }];
  }

  if (phase.id === 'full') {
    return [{ kind: 'icon', icon: 'full-moon' }, { kind: 'icon', icon: 'high-voltage' }];
  }

  if (phase.id.startsWith('waning') || phase.id === 'last-quarter') {
    return [{ kind: 'icon', icon: 'waning-crescent-moon' }, { kind: 'text', text: '↓' }];
  }

  return [{ kind: 'icon', icon: 'waxing-crescent-moon' }, { kind: 'text', text: '↑' }];
}

function getMoonPhaseSegmentsForEntry(entry: PlannerAstrologyDayEntry | undefined, phase: MoonPhaseDisplay | undefined): AstroInlineSegment[] {
  const sourceSegments = getMoonPhaseSegments(phase);
  if (sourceSegments.length > 0 || !entry) {
    return sourceSegments;
  }

  if (entry.tithiPakshaNumber === 1) {
    return [{ kind: 'icon', icon: 'new-moon' }, { kind: 'text', text: '↑' }];
  }

  if (entry.tithiPakshaNumber === 15 && entry.tithiNumber <= 15) {
    return [{ kind: 'icon', icon: 'full-moon' }, { kind: 'icon', icon: 'high-voltage' }];
  }

  return entry.tithiNumber <= 15
    ? [{ kind: 'icon' as const, icon: 'waxing-crescent-moon' }, { kind: 'text' as const, text: '↑' }]
    : [{ kind: 'icon' as const, icon: 'waning-crescent-moon' }, { kind: 'text' as const, text: '↓' }];
}

function getFallbackMoonPhaseText(entry: PlannerAstrologyDayEntry) {
  if (entry.tithiPakshaNumber === 1) {
    return 'Новолуние';
  }

  if (entry.tithiPakshaNumber === 15 && entry.tithiNumber <= 15) {
    return 'Полнолуние';
  }

  return entry.tithiNumber <= 15 ? 'Растущая луна' : 'Убывающая луна';
}

function getMoonPhaseText(entry: PlannerAstrologyDayEntry, phase: MoonPhaseDisplay | undefined) {
  if (phase?.label) {
    return phase.label.replace(/[^\p{L}\p{N}\s/-]/gu, '').trim();
  }

  return getFallbackMoonPhaseText(entry);
}

function getTithiName(entry: PlannerAstrologyDayEntry) {
  return TITHI_NAMES[entry.tithiPakshaNumber - 1] ?? 'Титхи';
}

function withSeparators(groups: AstroInlineSegment[][]) {
  return groups.flatMap((group, index) => (index === 0 ? group : [{ kind: 'separator' } as const, ...group]));
}

function splitAstroSegmentsIntoLines(segments: AstroInlineSegment[], lineCount: number) {
  const groups: AstroInlineSegment[][] = [];
  let currentGroup: AstroInlineSegment[] = [];

  segments.forEach((segment) => {
    if (segment.kind === 'separator') {
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
        currentGroup = [];
      }
      return;
    }

    currentGroup.push(segment);
  });

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  if (groups.length <= 1 || lineCount <= 1) {
    return [segments];
  }

  const groupsPerLine = Math.ceil(groups.length / lineCount);
  const lines: AstroInlineSegment[][] = [];

  for (let index = 0; index < groups.length; index += groupsPerLine) {
    lines.push(withSeparators(groups.slice(index, index + groupsPerLine)));
  }

  return lines;
}

function getCompactAstroSegments(
  entry: PlannerAstrologyDayEntry | undefined,
  phase: MoonPhaseDisplay | undefined,
  model: PlannerRenderModel,
): AstroInlineSegment[] {
  if (!entry) {
    return [];
  }

  const groups: AstroInlineSegment[][] = [];
  const layers = model.config.astrology.layers;

  if (layers.moon) {
    const moonSegments = getMoonPhaseSegmentsForEntry(entry, phase);
    if (moonSegments.length > 0) {
      groups.push(moonSegments);
    }
  }

  if (layers.planet) {
    groups.push([{ kind: 'icon', icon: PLANET_DAY_META[entry.planetDay].icon }]);
  }

  if (layers.focus) {
    groups.push([{ kind: 'icon', icon: FOCUS_META[entry.focus].icon }]);
  }

  return withSeparators(groups);
}

function getFullAstroSegments(
  entry: PlannerAstrologyDayEntry | undefined,
  phase: MoonPhaseDisplay | undefined,
  _model: PlannerRenderModel,
): AstroInlineSegment[] {
  if (!entry) {
    return [];
  }

  const groups: AstroInlineSegment[][] = [];

  const moonSegments = getMoonPhaseSegmentsForEntry(entry, phase);
  if (moonSegments.length > 0) {
    groups.push(moonSegments);
  }

  groups.push([{ kind: 'text', text: String(entry.tithiNumber) }, { kind: 'icon', icon: TITHI_TYPE_META[entry.tithiType].icon }]);

  groups.push([{ kind: 'text', text: String(entry.nakshatraNumber) }, { kind: 'icon', icon: NAKSHATRA_TYPE_META[entry.nakshatraType].icon }]);

  groups.push([{ kind: 'icon', icon: PLANET_DAY_META[entry.planetDay].icon }]);

  groups.push([{ kind: 'icon', icon: ENERGY_META[entry.energy].icon }]);

  groups.push([{ kind: 'icon', icon: FOCUS_META[entry.focus].icon }]);

  return withSeparators(groups);
}

function getTextAstroSegments(
  entry: PlannerAstrologyDayEntry | undefined,
  phase: MoonPhaseDisplay | undefined,
  model: PlannerRenderModel,
): AstroInlineSegment[] {
  if (!entry) {
    return [];
  }

  const layers = model.config.astrology.layers;
  const groups: AstroInlineSegment[][] = [];

  if (layers.moon) {
    const moonSegments = getMoonPhaseSegmentsForEntry(entry, phase);
    if (moonSegments.length > 0) {
      groups.push([...moonSegments, { kind: 'text', text: getMoonPhaseText(entry, phase) }]);
    }
  }

  if (layers.tithi) {
    groups.push([
      { kind: 'icon', icon: TITHI_TYPE_META[entry.tithiType].icon },
      { kind: 'text', text: `Титхи ${entry.tithiNumber} ${getTithiName(entry)}` },
    ]);
  }

  if (layers.nakshatra) {
    groups.push([
      { kind: 'icon', icon: NAKSHATRA_TYPE_META[entry.nakshatraType].icon },
      { kind: 'text', text: `Накшатра ${entry.nakshatraNumber} ${entry.nakshatraName}` },
    ]);
  }

  if (layers.planet) {
    groups.push([
      { kind: 'icon', icon: PLANET_DAY_META[entry.planetDay].icon },
      { kind: 'text', text: PLANET_DAY_META[entry.planetDay].label },
    ]);
  }

  if (layers.energy) {
    groups.push([
      { kind: 'icon', icon: ENERGY_META[entry.energy].icon },
      { kind: 'text', text: ENERGY_META[entry.energy].label },
    ]);
  }

  if (layers.focus) {
    groups.push([
      { kind: 'icon', icon: FOCUS_META[entry.focus].icon },
      { kind: 'text', text: FOCUS_META[entry.focus].label },
    ]);
  }

  return withSeparators(groups);
}

function getAstroSegmentsForPreset(
  entry: PlannerAstrologyDayEntry | undefined,
  phase: MoonPhaseDisplay | undefined,
  model: PlannerRenderModel,
  preset: AstrologyLinePresetId,
): AstroInlineSegment[] {
  if (preset === 'compact-icons') {
    return getCompactAstroSegments(entry, phase, model);
  }

  if (preset === 'text-icons') {
    return getTextAstroSegments(entry, phase, model);
  }

  return getFullAstroSegments(entry, phase, model);
}

function getAstroLineSizing(scope: 'month' | 'week' | 'day', preset: AstrologyLinePresetId) {
  if (scope === 'month') {
    return { iconSize: 14, fontSize: 11 };
  }

  if (scope === 'week') {
    if (preset === 'text-icons') {
      return { iconSize: 19, fontSize: 14 };
    }

    if (preset === 'compact-icons') {
      return { iconSize: 20, fontSize: 14 };
    }

    return { iconSize: 22, fontSize: 16 };
  }

  if (preset === 'text-icons') {
    return { iconSize: 25, fontSize: 17 };
  }

  if (preset === 'compact-icons') {
    return { iconSize: 25, fontSize: 17 };
  }

  return { iconSize: 30, fontSize: 21 };
}

function drawAstroLegendPage(model: PlannerRenderModel, renderPage: PlannerRenderPage) {
  const { theme } = model;
  const groups = [
    {
      title: 'Луна',
      items: [
        { text: 'новолуние', segments: [{ kind: 'icon' as const, icon: 'new-moon' }, { kind: 'text' as const, text: '↑' }] },
        { text: 'растущая', segments: [{ kind: 'icon' as const, icon: 'waxing-crescent-moon' }, { kind: 'text' as const, text: '↑' }] },
        { text: 'полнолуние', segments: [{ kind: 'icon' as const, icon: 'full-moon' }, { kind: 'icon' as const, icon: 'high-voltage' }] },
        { text: 'убывающая', segments: [{ kind: 'icon' as const, icon: 'waning-crescent-moon' }, { kind: 'text' as const, text: '↓' }] },
      ],
    },
    {
      title: 'Титхи',
      items: (Object.entries(TITHI_TYPE_META) as Array<[keyof typeof TITHI_TYPE_META, typeof TITHI_TYPE_META[keyof typeof TITHI_TYPE_META]]>)
        .map(([, item]) => ({ text: `${item.label}, ${item.range}`, segments: [{ kind: 'icon' as const, icon: item.icon }] })),
    },
    {
      title: 'Накшатра',
      items: (Object.entries(NAKSHATRA_TYPE_META) as Array<[keyof typeof NAKSHATRA_TYPE_META, typeof NAKSHATRA_TYPE_META[keyof typeof NAKSHATRA_TYPE_META]]>)
        .map(([, item]) => ({ text: item.label, segments: [{ kind: 'icon' as const, icon: item.icon }] })),
    },
    {
      title: 'Планета дня',
      items: (Object.entries(PLANET_DAY_META) as Array<[keyof typeof PLANET_DAY_META, typeof PLANET_DAY_META[keyof typeof PLANET_DAY_META]]>)
        .map(([, item]) => ({ text: item.label, segments: [{ kind: 'icon' as const, icon: item.icon }] })),
    },
    {
      title: 'Энергия',
      items: (Object.entries(ENERGY_META) as Array<[keyof typeof ENERGY_META, typeof ENERGY_META[keyof typeof ENERGY_META]]>)
        .map(([, item]) => ({ text: item.label, segments: [{ kind: 'icon' as const, icon: item.icon }] })),
    },
    {
      title: 'Фокус',
      items: (Object.entries(FOCUS_META) as Array<[keyof typeof FOCUS_META, typeof FOCUS_META[keyof typeof FOCUS_META]]>)
        .map(([, item]) => ({ text: item.label, segments: [{ kind: 'icon' as const, icon: item.icon }] })),
    },
  ];

  const paper = getPaperRect();
  const legendRect = {
    x: paper.x + 86,
    y: 300,
    width: paper.width - 182,
    height: 1032,
  };
  renderPage.nodes.push(createRectNode(`${renderPage.page.id}-legend-main-card`, legendRect, {
    fill: theme.colors.paper,
    stroke: theme.colors.border,
    strokeWidth: 2,
    radius: createRadius(20),
  }));

  const topArea = {
    x: legendRect.x + 28,
    y: legendRect.y + 28,
    width: legendRect.width - 56,
    height: 470,
  };
  const cards = gridRects(topArea, 2, 3, 22);
  groups.forEach((group, groupIndex) => {
    const rect = cards[groupIndex];
    const emphasizeGroup = group.title === 'Титхи' || group.title === 'Накшатра';
    renderPage.nodes.push(createTextNode(
      `${renderPage.page.id}-legend-title-${groupIndex}`,
      group.title,
      rect.x,
      rect.y,
      emphasizeGroup ? 34 : 30,
      'bold',
      theme.colors.text,
      rect.width,
    ));

    group.items.forEach((item, itemIndex) => {
      const rowY = rect.y + 42 + itemIndex * 34;
      drawAstroInline(renderPage.nodes, `${renderPage.page.id}-legend-${groupIndex}-${itemIndex}`, item.segments, rect.x, rowY, theme.colors.text, 24, 18);
      renderPage.nodes.push(createTextNode(
        `${renderPage.page.id}-legend-label-${groupIndex}-${itemIndex}`,
        item.text,
        rect.x + 54,
        rowY,
        emphasizeGroup ? 24 : 22,
        'body',
        theme.colors.muted,
        rect.width - 60,
        'left',
        20,
      ));
    });
  });

  const dividerY = legendRect.y + 540;
  renderPage.nodes.push({
    id: `${renderPage.page.id}-legend-divider`,
    kind: 'line',
    x1: legendRect.x + 28,
    y1: dividerY,
    x2: legendRect.x + legendRect.width - 28,
    y2: dividerY,
    stroke: theme.colors.border,
    strokeWidth: 2,
    opacity: 0.55,
  });

  const detailSections = [
    {
      id: 'tithi-names',
      title: 'Титхи 1-15',
      items: TITHI_NAMES.map((name, index) => `${index + 1}. ${name}`),
      x: legendRect.x + 28,
      y: dividerY + 34,
      width: (legendRect.width - 84) * 0.42,
      columns: 2,
    },
    {
      id: 'nakshatra-names',
      title: 'Накшатры 1-27',
      items: NAKSHATRA_NAMES.map((name, index) => `${index + 1}. ${name}`),
      x: legendRect.x + 28 + (legendRect.width - 84) * 0.42 + 28,
      y: dividerY + 34,
      width: (legendRect.width - 84) * 0.58,
      columns: 2,
    },
  ];

  detailSections.forEach((section) => {
    const columnGap = 18;
    const contentY = section.y + 36;
    const rowHeight = 24;
    const rows = Math.max(1, Math.ceil(section.items.length / section.columns));
    const columnWidth = (section.width - columnGap * (section.columns - 1)) / section.columns;

    renderPage.nodes.push(createTextNode(
      `${renderPage.page.id}-${section.id}-title`,
      section.title,
      section.x,
      section.y,
      30,
      'bold',
      theme.colors.text,
      section.width,
    ));

    section.items.forEach((item, index) => {
      const column = Math.floor(index / rows);
      const row = index % rows;
      renderPage.nodes.push(createTextNode(
        `${renderPage.page.id}-${section.id}-item-${index}`,
        item,
        section.x + column * (columnWidth + columnGap),
        contentY + row * rowHeight,
        24,
        'body',
        theme.colors.muted,
        columnWidth,
        'left',
        rowHeight,
      ));
    });
  });
}

function buildIndexPage(model: PlannerRenderModel, renderPage: PlannerRenderPage, links: PlannerLinkDefinition[]) {
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

function buildYearPage(model: PlannerRenderModel, renderPage: PlannerRenderPage, links: PlannerLinkDefinition[]) {
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

function buildMonthPage(model: PlannerRenderModel, renderPage: PlannerRenderPage, links: PlannerLinkDefinition[]) {
  const { theme, config } = model;
  const { page, layout, nodes } = renderPage;
  const focusBlock = getBlock(layout, 'note-area');
  const calendarBlock = getBlock(layout, 'calendar');
  const weekLinksBlock = getBlock(layout, 'group');
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
}

function buildWeekPage(model: PlannerRenderModel, renderPage: PlannerRenderPage, links: PlannerLinkDefinition[]) {
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

function buildLinearControls(model: PlannerRenderModel, renderPage: PlannerRenderPage, links: PlannerLinkDefinition[], label: string) {
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

function buildDayPage(model: PlannerRenderModel, renderPage: PlannerRenderPage, links: PlannerLinkDefinition[]) {
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

function buildNotesPage(model: PlannerRenderModel, renderPage: PlannerRenderPage, links: PlannerLinkDefinition[]) {
  const { theme } = model;
  const noteBlock = getBlock(renderPage.layout, 'note-area');
  if (noteBlock) {
    renderPage.nodes.push(blockSurface(noteBlock, `${renderPage.page.id}-notes-surface`));
    drawWritingLines(renderPage.nodes, withPadding(noteBlock), 18, theme.colors.border, `${renderPage.page.id}-note-lines`);
  }
  buildLinearControls(model, renderPage, links, 'note');
}

function buildChecklistPage(model: PlannerRenderModel, renderPage: PlannerRenderPage, links: PlannerLinkDefinition[]) {
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

function buildStickerPage(model: PlannerRenderModel, renderPage: PlannerRenderPage, links: PlannerLinkDefinition[]) {
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

export function buildPageContent(model: PlannerRenderModel, renderPage: PlannerRenderPage, links: PlannerLinkDefinition[]) {
  switch (renderPage.page.kind) {
    case 'index':
      buildIndexPage(model, renderPage, links);
      break;
    case 'astro-legend':
      drawAstroLegendPage(model, renderPage);
      break;
    case 'year':
      buildYearPage(model, renderPage, links);
      break;
    case 'month':
      buildMonthPage(model, renderPage, links);
      break;
    case 'week-left':
    case 'week-right':
      buildWeekPage(model, renderPage, links);
      break;
    case 'day':
      buildDayPage(model, renderPage, links);
      break;
    case 'notes':
      buildNotesPage(model, renderPage, links);
      break;
    case 'checklist':
      buildChecklistPage(model, renderPage, links);
      break;
    case 'sticker':
      buildStickerPage(model, renderPage, links);
      break;
  }
}
