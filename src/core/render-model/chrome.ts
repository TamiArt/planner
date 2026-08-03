import { getPaperRect, PAGE_HEIGHT, PAGE_WIDTH, TAB_GAP, TAB_HEIGHT, TAB_TOP, TAB_WIDTH, TAB_X } from '../../lib/templates/layout';
import type { PlannerRenderModel, PlannerRenderNode, PlannerRenderPage } from './types';
import { createRadius, createRectNode, createTextNode } from './helpers';
import { getFirstPageBySection, getSectionLabel } from './selectors';
import { addLink } from './helpers';

const HOME_RECT = { x: 104, y: 52, width: 232, height: 68 } as const;
const TOP_TAB_Y = 52;
const TOP_TAB_HEIGHT = 56;
const TOP_TAB_GAP = 8;
const TOP_TAB_START_X = HOME_RECT.x + HOME_RECT.width + 20;
const TOP_TAB_AVAILABLE_WIDTH = PAGE_WIDTH - TOP_TAB_START_X - 88;

function getTabBaseWidth(tab: PlannerRenderModel['plan']['tabs'][number]) {
  if (tab.kind === 'month') {
    return 68;
  }

  return Math.max(88, Math.min(120, 36 + tab.label.length * 10));
}

function fitTopTabWidths(tabs: PlannerRenderModel['plan']['tabs']) {
  const baseWidths = tabs.map((tab) => getTabBaseWidth(tab));
  const totalWidth = baseWidths.reduce((sum, width) => sum + width, 0) + Math.max(0, tabs.length - 1) * TOP_TAB_GAP;

  if (totalWidth <= TOP_TAB_AVAILABLE_WIDTH) {
    return baseWidths;
  }

  const minWidths = tabs.map((tab) => (tab.kind === 'month' ? 56 : 76));
  const shrinkable = baseWidths.map((width, index) => width - minWidths[index]);
  const totalShrinkable = shrinkable.reduce((sum, value) => sum + Math.max(0, value), 0);

  if (totalShrinkable <= 0) {
    return minWidths;
  }

  const overflow = totalWidth - TOP_TAB_AVAILABLE_WIDTH;
  return baseWidths.map((width, index) => {
    const share = Math.max(0, shrinkable[index]) / totalShrinkable;
    return Math.max(minWidths[index], Math.round(width - overflow * share));
  });
}

function getChromeTabRects(model: PlannerRenderModel) {
  if (model.config.tabPosition === 'top') {
    const widths = fitTopTabWidths(model.plan.tabs);
    let x = TOP_TAB_START_X;

    return model.plan.tabs.map((_, index) => {
      const rect = {
        x,
        y: TOP_TAB_Y,
        width: widths[index],
        height: TOP_TAB_HEIGHT,
      };
      x += widths[index] + TOP_TAB_GAP;
      return rect;
    });
  }

  return model.plan.tabs.map((_, index) => ({
    x: TAB_X,
    y: TAB_TOP + index * (TAB_HEIGHT + TAB_GAP),
    width: TAB_WIDTH,
    height: TAB_HEIGHT,
  }));
}

export function buildCoverNodes(model: PlannerRenderModel, page: PlannerRenderPage['page']) {
  const { config, theme } = model;
  const nodes: PlannerRenderNode[] = [
    createRectNode(`${page.id}-cover-base`, { x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT }, {
      fill: theme.colors.paper,
    }),
  ];

  if (config.coverImage?.source.startsWith('data:image/png')) {
    nodes.push({
      id: `${page.id}-cover-image`,
      kind: 'image',
      x: 0,
      y: 0,
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      src: config.coverImage.source,
      fit: 'cover',
    });
  }

  return nodes;
}

export function buildBackgroundNodes(model: PlannerRenderModel, page: PlannerRenderPage['page']) {
  const { config, background, theme } = model;
  const nodes: PlannerRenderNode[] = [
    createRectNode(`${page.id}-canvas`, { x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT }, {
      fill: theme.colors.background,
    }),
  ];

  if (background.type === 'color') {
    nodes.push(createRectNode(`${page.id}-background-color`, { x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT }, {
      fill: background.color ?? (background.source.startsWith('#') ? background.source : theme.colors.paper),
      opacity: config.background.opacity ?? config.backgroundOpacity,
    }));
  }

  if (background.type === 'texture') {
    for (let x = 64; x < PAGE_WIDTH; x += 92) {
      for (let y = 56; y < PAGE_HEIGHT; y += 92) {
        nodes.push({
          id: `${page.id}-texture-${x}-${y}`,
          kind: 'circle',
          cx: x,
          cy: y,
          r: 2,
          fill: theme.colors.border,
          opacity: 0.22 * (config.background.opacity ?? config.backgroundOpacity),
        });
      }
    }
  }

  if (background.type === 'image') {
    if (background.source.startsWith('data:image/')) {
      nodes.push({
        id: `${page.id}-background-image`,
        kind: 'image',
        x: 0,
        y: 0,
        width: PAGE_WIDTH,
        height: PAGE_HEIGHT,
        src: background.source,
        fit: 'cover',
        opacity: config.background.opacity ?? config.backgroundOpacity,
      });
    } else {
      nodes.push({
        id: `${page.id}-accent-a`,
        kind: 'circle',
        cx: PAGE_WIDTH - 320,
        cy: 220,
        r: 180,
        fill: theme.colors.accent,
        opacity: 0.12 * (config.background.opacity ?? config.backgroundOpacity),
      });
      nodes.push({
        id: `${page.id}-accent-b`,
        kind: 'circle',
        cx: 280,
        cy: PAGE_HEIGHT - 220,
        r: 150,
        fill: theme.colors.border,
        opacity: 0.2 * (config.background.opacity ?? config.backgroundOpacity),
      });
    }
  }

  const paperRect = getPaperRect();
  const paperOpacity = theme.id === 'dark' ? 0.96 : 0.94;

  if (config.pageBackgroundImage?.source.startsWith('data:image/png')) {
    nodes.push(createRectNode(`${page.id}-paper-fill`, paperRect, {
      fill: theme.colors.paper,
      radius: createRadius(28),
      opacity: paperOpacity,
    }));
    nodes.push({
      id: `${page.id}-paper-image`,
      kind: 'image',
      x: paperRect.x,
      y: paperRect.y,
      width: paperRect.width,
      height: paperRect.height,
      src: config.pageBackgroundImage.source,
      fit: 'cover',
    });
    nodes.push(createRectNode(`${page.id}-paper-border`, paperRect, {
      stroke: theme.colors.border,
      strokeWidth: 2,
      radius: createRadius(28),
    }));
  } else {
    nodes.push(createRectNode(`${page.id}-paper`, paperRect, {
      fill: theme.colors.paper,
      stroke: theme.colors.border,
      strokeWidth: 2,
      radius: createRadius(28),
      opacity: paperOpacity,
    }));
  }

  return nodes;
}

export function buildHeaderNodes(model: PlannerRenderModel, renderPage: PlannerRenderPage) {
  const { theme, config, plan } = model;
  const { page, layout } = renderPage;
  const tabRects = getChromeTabRects(model);
  const headerBlock = layout.blocks.find((block) => block.type === 'header');
  if (!headerBlock) {
    return [] as PlannerRenderNode[];
  }

  const inner = {
    x: headerBlock.x + headerBlock.padding.left,
    y: headerBlock.y + headerBlock.padding.top,
    width: headerBlock.width - headerBlock.padding.left - headerBlock.padding.right,
    height: headerBlock.height - headerBlock.padding.top - headerBlock.padding.bottom,
  };

  const nodes: PlannerRenderNode[] = [
    createRectNode(`${page.id}-header-surface`, headerBlock, {
      fill: theme.id === 'dark' ? 'rgba(26, 32, 48, 0.82)' : 'rgba(255,255,255,0.82)',
      stroke: headerBlock.border.color,
      strokeWidth: headerBlock.border.width,
      dashArray: headerBlock.border.style === 'dashed' ? [16, 10] : undefined,
      radius: headerBlock.radius,
      opacity: headerBlock.opacity ?? 1,
    }),
    createTextNode(`${page.id}-header-section`, getSectionLabel(page.sectionType), inner.x, inner.y + 10, 20, 'bold', theme.colors.accent),
    createTextNode(`${page.id}-header-title`, page.title, inner.x, inner.y + 50, 42, 'heading', theme.colors.text, inner.width - 260),
    createTextNode(
      `${page.id}-header-subtitle`,
      config.mode === 'dated' ? `${page.label} · ${config.year} · ${theme.name}` : `${page.label} · undated · ${theme.name}`,
      inner.x,
      inner.y + 106,
      22,
      'body',
      theme.colors.muted,
      inner.width - 260,
    ),
    createTextNode(`${page.id}-header-page-number`, `${page.pageNumber} / ${plan.pages.length}`, inner.x + inner.width - 180, inner.y + 16, 20, 'bold', theme.colors.text, 180, 'right'),
  ];

  nodes.push(createRectNode(`${page.id}-home`, HOME_RECT, {
    fill: page.kind === 'index' ? theme.colors.accent : theme.colors.paper,
    stroke: theme.colors.border,
    strokeWidth: 2,
    radius: createRadius(18),
  }));
  nodes.push(createTextNode(`${page.id}-home-text`, 'Home', HOME_RECT.x + 44, HOME_RECT.y + 18, 24, 'bold', page.kind === 'index' ? theme.colors.tabText : theme.colors.text));

  plan.tabs.forEach((tab, index) => {
    const rect = tabRects[index];
    if (!rect) {
      return;
    }

    const active = page.monthIndex === Number(tab.id.replace('tab-month-', '')) - 1
      || (tab.id === 'tab-notes' && page.sectionType === 'notes')
      || (tab.id === 'tab-checklist' && page.sectionType === 'checklist')
      || (tab.id === 'tab-stickers' && page.sectionType === 'stickers')
      || (tab.id === 'tab-astro-legend' && page.kind === 'astro-legend');

    nodes.push(createRectNode(`${page.id}-tab-${tab.id}`, rect, {
      fill: active ? theme.colors.accent : theme.colors.paper,
      stroke: theme.colors.border,
      strokeWidth: 2,
      radius: createRadius(16),
    }));

    if (config.tabPosition === 'top') {
      nodes.push(createTextNode(
        `${page.id}-tab-${tab.id}-text`,
        tab.label,
        rect.x + rect.width / 2,
        rect.y + 18,
        16,
        'bold',
        active ? theme.colors.tabText : theme.colors.text,
        rect.width - 16,
        'center',
      ));
      return;
    }

    nodes.push(createTextNode(`${page.id}-tab-${tab.id}-text`, tab.label, rect.x + 26, rect.y + 18, 18, 'bold', active ? theme.colors.tabText : theme.colors.text, rect.width - 36));
  });

  return nodes;
}

export function buildChromeLinks(model: PlannerRenderModel) {
  const homeTargetId = getFirstPageBySection(model.plan, 'index')?.id;
  const tabRects = getChromeTabRects(model);

  model.pages.forEach((renderPage) => {
    if (renderPage.page.sectionType === 'cover') {
      return;
    }

    if (homeTargetId && renderPage.page.id !== homeTargetId) {
      addLink(model.links, renderPage.page.id, homeTargetId, HOME_RECT);
    }

    model.plan.tabs.forEach((tab, index) => {
      const rect = tabRects[index];
      if (!rect) {
        return;
      }

      addLink(model.links, renderPage.page.id, tab.targetPageId, rect);
    });
  });
}
