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

export function drawMoonPhaseLabel(
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

export function drawAstroInline(
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

export function estimateAstroInlineWidth(
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

export function splitAstroSegmentsIntoLines(segments: AstroInlineSegment[], lineCount: number) {
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

export function getAstroSegmentsForPreset(
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

export function getAstroLineSizing(scope: 'month' | 'week' | 'day', preset: AstrologyLinePresetId) {
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

export function drawAstroLegendPage(model: PlannerRenderModel, renderPage: PlannerRenderPage) {
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
