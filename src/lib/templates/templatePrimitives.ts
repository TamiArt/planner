import { type PDFFont, type PDFImage, type PDFPage, rgb } from 'pdf-lib';
import type { BuiltPlannerPage, PlannerDocumentPlan, PlannerTabTarget } from '../../types/pdf';
import type { BackgroundAsset, PlannerConfig, PlannerTheme, StickerAsset, StickerCategory, StickerUploadAssetMeta } from '../../types/planner';
import { getStickersByCategory } from '../assets/assetRegistry';
import { isCustomColorBackground, isCustomGradientBackground, normalizeBackgroundOpacity } from '../assets/uploadBackground';
import { getMonthCalendar, getWeekCalendar, RU_MONTHS_SHORT, RU_WEEKDAYS } from '../navigation/dateHelpers';
import {
  getReadyStickerSheetById,
  getStickerModuleConfig,
  getStickerRenderableAssetById,
  isUploadedStickerAsset,
} from '../stickers/stickerModuleConfig';
import { getStickerCategoryMeta } from '../stickers/stickerCatalog';
import {
  CONTENT_LEFT,
  CONTENT_WIDTH,
  HOME_BUTTON_RECT,
  INDEX_MONTH_RECTS,
  INDEX_SECTION_RECTS,
  MONTH_DAILY_RECT,
  MONTH_WEEK_RECTS,
  MONTH_YEAR_RECT,
  NEXT_RECT,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  PREVIOUS_RECT,
  TAB_GAP,
  TAB_HEIGHT,
  TAB_TOP,
  TAB_WIDTH,
  TAB_X,
  YEAR_MONTH_RECTS,
  rectFromTop,
} from './layout';

export interface TemplateFonts {
  heading: PDFFont;
  body: PDFFont;
  bold: PDFFont;
}

export interface RenderPageContext {
  config: PlannerConfig;
  plan: PlannerDocumentPlan;
  theme: PlannerTheme;
  background: BackgroundAsset;
  embeddedBackgroundImage?: PDFImage;
  embeddedStickerImages?: Map<string, PDFImage>;
  fonts: TemplateFonts;
}

export function toColor(hex: string) {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized
        .split('')
        .map((char) => `${char}${char}`)
        .join('')
    : normalized;

  const red = Number.parseInt(value.slice(0, 2), 16) / 255;
  const green = Number.parseInt(value.slice(2, 4), 16) / 255;
  const blue = Number.parseInt(value.slice(4, 6), 16) / 255;

  return rgb(red, green, blue);
}

export function textY(top: number, size: number) {
  return PAGE_HEIGHT - top - size;
}

export function wrapText(text: string, maxWidth: number, font: PDFFont, size: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
      return;
    }

    if (current) {
      lines.push(current);
    }
    current = word;
  });

  if (current) {
    lines.push(current);
  }

  return lines;
}

export function drawWrappedText(
  page: PDFPage,
  text: string,
  x: number,
  top: number,
  maxWidth: number,
  size: number,
  font: PDFFont,
  colorHex: string,
  lineHeight = size * 1.35,
) {
  wrapText(text, maxWidth, font, size).forEach((line, index) => {
    page.drawText(line, {
      x,
      y: textY(top + index * lineHeight, size),
      size,
      font,
      color: toColor(colorHex),
    });
  });
}

export function drawCenteredText(
  page: PDFPage,
  text: string,
  centerX: number,
  y: number,
  size: number,
  font: PDFFont,
  colorHex: string,
) {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: centerX - width / 2,
    y,
    size,
    font,
    color: toColor(colorHex),
  });
}

export function drawSurface(page: PDFPage, x: number, top: number, width: number, height: number, theme: PlannerTheme, fillOpacity = 1) {
  const rect = rectFromTop(x, top, width, height);
  page.drawRectangle({
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    color: toColor(theme.colors.paper),
    opacity: fillOpacity,
    borderColor: toColor(theme.colors.border),
    borderWidth: 1,
  });
}

export function drawDivider(page: PDFPage, x1: number, y1: number, x2: number, y2: number, theme: PlannerTheme, thickness = 1) {
  page.drawLine({
    start: { x: x1, y: y1 },
    end: { x: x2, y: y2 },
    color: toColor(theme.colors.border),
    thickness,
    opacity: 0.9,
  });
}

export function drawChip(
  page: PDFPage,
  label: string,
  x: number,
  top: number,
  theme: PlannerTheme,
  fonts: TemplateFonts,
  active = false,
) {
  const paddingX = 12;
  const width = 24 + label.length * 6.5;
  const rect = rectFromTop(x, top, width, 28);
  page.drawRectangle({
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    color: active ? toColor(theme.colors.accent) : toColor(theme.colors.paper),
    borderColor: toColor(active ? theme.colors.accent : theme.colors.border),
    borderWidth: 1,
  });
  page.drawText(label, {
    x: rect.x + paddingX,
    y: rect.y + 8,
    size: 10,
    font: fonts.bold,
    color: toColor(active ? theme.colors.tabText : theme.colors.text),
  });
}

export function drawCoverImage(page: PDFPage, image: PDFImage, opacity = 1) {
  const pageRatio = PAGE_WIDTH / PAGE_HEIGHT;
  const imageRatio = image.width / image.height;

  if (imageRatio > pageRatio) {
    const height = PAGE_HEIGHT;
    const width = height * imageRatio;

    page.drawImage(image, {
      x: (PAGE_WIDTH - width) / 2,
      y: 0,
      width,
      height,
      opacity,
    });
    return;
  }

  const width = PAGE_WIDTH;
  const height = width / imageRatio;

  page.drawImage(image, {
    x: 0,
    y: (PAGE_HEIGHT - height) / 2,
    width,
    height,
    opacity,
  });
}

export function drawImageFit(page: PDFPage, image: PDFImage, rect: ReturnType<typeof rectFromTop>, padding = 0) {
  const availableWidth = Math.max(1, rect.width - padding * 2);
  const availableHeight = Math.max(1, rect.height - padding * 2);
  const imageRatio = image.width / image.height;
  const rectRatio = availableWidth / availableHeight;

  let width = availableWidth;
  let height = availableHeight;

  if (imageRatio > rectRatio) {
    height = width / imageRatio;
  } else {
    width = height * imageRatio;
  }

  page.drawImage(image, {
    x: rect.x + (rect.width - width) / 2,
    y: rect.y + (rect.height - height) / 2,
    width,
    height,
  });
}

export function drawBackground(
  page: PDFPage,
  background: BackgroundAsset,
  theme: PlannerTheme,
  embeddedBackgroundImage: PDFImage | undefined,
  backgroundOpacity: number,
) {
  const normalizedOpacity = normalizeBackgroundOpacity(backgroundOpacity);
  const canvasColor = theme.colors.background;

  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    color: toColor(canvasColor),
  });

  if (isCustomColorBackground(background)) {
    page.drawRectangle({
      x: 0,
      y: 0,
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      color: toColor(background.source),
      opacity: normalizedOpacity,
    });
  }

  if (embeddedBackgroundImage) {
    drawCoverImage(page, embeddedBackgroundImage, normalizedOpacity);

    if (!isCustomGradientBackground(background)) {
      page.drawRectangle({
        x: 0,
        y: 0,
        width: PAGE_WIDTH,
        height: PAGE_HEIGHT,
        color: toColor(canvasColor),
        opacity: theme.id === 'dark' ? 0.22 : 0.12,
      });
    }
  }

  if (!embeddedBackgroundImage && background.type === 'texture') {
    for (let x = 32; x < PAGE_WIDTH; x += 48) {
      for (let y = 28; y < PAGE_HEIGHT; y += 48) {
        page.drawCircle({
          x,
          y,
          size: 1.4,
          color: toColor(theme.colors.border),
          opacity: 0.22 * normalizedOpacity,
        });
      }
    }
  }

  if (!embeddedBackgroundImage && background.type === 'image') {
    page.drawCircle({
      x: PAGE_WIDTH - 168,
      y: PAGE_HEIGHT - 104,
      size: 110,
      color: toColor(theme.colors.accent),
      opacity: 0.12 * normalizedOpacity,
    });
    page.drawCircle({
      x: 148,
      y: 108,
      size: 96,
      color: toColor(theme.colors.border),
      opacity: 0.14 * normalizedOpacity,
    });
  }

  page.drawRectangle({
    x: 24,
    y: 20,
    width: PAGE_WIDTH - 146,
    height: PAGE_HEIGHT - 40,
    color: toColor(theme.colors.paper),
    opacity: theme.id === 'dark' ? 0.96 : 0.92,
    borderColor: toColor(theme.colors.border),
    borderWidth: 1.2,
  });
}

export function getActiveTab(page: BuiltPlannerPage, tab: PlannerTabTarget) {
  if (tab.kind === 'month') {
    const monthIndex = Number(tab.id.replace('tab-month-', '')) - 1;
    return page.monthIndex === monthIndex;
  }

  if (tab.targetPageId.startsWith('page-notes')) {
    return page.sectionType === 'notes';
  }

  if (tab.targetPageId.startsWith('page-checklist')) {
    return page.sectionType === 'checklist';
  }

  if (tab.targetPageId.startsWith('page-sticker')) {
    return page.sectionType === 'stickers';
  }

  if (tab.targetPageId === 'page-astro-legend') {
    return page.kind === 'astro-legend';
  }

  return false;
}

export function drawTabs(page: PDFPage, tabs: PlannerTabTarget[], theme: PlannerTheme, currentPage: BuiltPlannerPage, fonts: TemplateFonts) {
  tabs.forEach((tab, index) => {
    const active = getActiveTab(currentPage, tab);
    const y = PAGE_HEIGHT - TAB_TOP - TAB_HEIGHT - index * (TAB_HEIGHT + TAB_GAP);

    page.drawRectangle({
      x: TAB_X,
      y,
      width: TAB_WIDTH,
      height: TAB_HEIGHT,
      color: toColor(active ? theme.colors.accent : theme.colors.paper),
      borderColor: toColor(theme.colors.border),
      borderWidth: 1,
      opacity: active ? 1 : 0.96,
    });

    page.drawText(tab.label, {
      x: TAB_X + 12,
      y: y + 10,
      size: 11,
      font: fonts.bold,
      color: toColor(active ? theme.colors.tabText : theme.colors.text),
    });
  });
}

export function drawHomeButton(page: PDFPage, theme: PlannerTheme, fonts: TemplateFonts, showActive = false) {
  page.drawRectangle({
    x: HOME_BUTTON_RECT.x,
    y: HOME_BUTTON_RECT.y,
    width: HOME_BUTTON_RECT.width,
    height: HOME_BUTTON_RECT.height,
    color: toColor(showActive ? theme.colors.accent : theme.colors.paper),
    borderColor: toColor(theme.colors.border),
    borderWidth: 1,
  });
  page.drawText('Index', {
    x: HOME_BUTTON_RECT.x + 18,
    y: HOME_BUTTON_RECT.y + 10,
    size: 11,
    font: fonts.bold,
    color: toColor(showActive ? theme.colors.tabText : theme.colors.text),
  });
}

export function drawHeader(page: PDFPage, currentPage: BuiltPlannerPage, context: RenderPageContext, subtitle: string) {
  const { config, theme, fonts } = context;

  drawHomeButton(page, theme, fonts, currentPage.kind === 'index');

  page.drawText(currentPage.title, {
    x: CONTENT_LEFT,
    y: textY(82, 28),
    size: 28,
    font: fonts.heading,
    color: toColor(theme.colors.text),
  });

  page.drawText(subtitle, {
    x: CONTENT_LEFT,
    y: textY(120, 12),
    size: 12,
    font: fonts.body,
    color: toColor(theme.colors.muted),
  });

  page.drawText(`${config.mode === 'dated' ? `dated ${config.year}` : 'undated'} · ${context.theme.name}`, {
    x: CONTENT_LEFT,
    y: textY(142, 11),
    size: 11,
    font: fonts.bold,
    color: toColor(theme.colors.accent),
  });

  drawDivider(page, CONTENT_LEFT, PAGE_HEIGHT - 164, CONTENT_LEFT + CONTENT_WIDTH - 70, PAGE_HEIGHT - 164, theme);
  drawTabs(page, context.plan.tabs, theme, currentPage, fonts);
}
