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

function toColor(hex: string) {
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

function textY(top: number, size: number) {
  return PAGE_HEIGHT - top - size;
}

function wrapText(text: string, maxWidth: number, font: PDFFont, size: number) {
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

function drawWrappedText(
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

function drawCenteredText(
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

function drawSurface(page: PDFPage, x: number, top: number, width: number, height: number, theme: PlannerTheme, fillOpacity = 1) {
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

function drawDivider(page: PDFPage, x1: number, y1: number, x2: number, y2: number, theme: PlannerTheme, thickness = 1) {
  page.drawLine({
    start: { x: x1, y: y1 },
    end: { x: x2, y: y2 },
    color: toColor(theme.colors.border),
    thickness,
    opacity: 0.9,
  });
}

function drawChip(
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

function drawCoverImage(page: PDFPage, image: PDFImage, opacity = 1) {
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

function drawImageFit(page: PDFPage, image: PDFImage, rect: ReturnType<typeof rectFromTop>, padding = 0) {
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

function drawBackground(
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

function getActiveTab(page: BuiltPlannerPage, tab: PlannerTabTarget) {
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

function drawTabs(page: PDFPage, tabs: PlannerTabTarget[], theme: PlannerTheme, currentPage: BuiltPlannerPage, fonts: TemplateFonts) {
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

function drawHomeButton(page: PDFPage, theme: PlannerTheme, fonts: TemplateFonts, showActive = false) {
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

function drawHeader(page: PDFPage, currentPage: BuiltPlannerPage, context: RenderPageContext, subtitle: string) {
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

function drawIndexPage(page: PDFPage, currentPage: BuiltPlannerPage, context: RenderPageContext) {
  const { config, theme, fonts } = context;
  drawHeader(page, currentPage, context, 'Единый entry-point документа с месячной и секционной навигацией.');

  drawSurface(page, 60, 182, 684, 120, theme, 0.98);
  drawWrappedText(
    page,
    'Соберите dated или undated planner, выберите тему, фон и структуру разделов, затем экспортируйте единый PDF для Goodnotes, Notability, Samsung Notes и других аннотаторов.',
    82,
    206,
    640,
    15,
    fonts.body,
    theme.colors.text,
  );

  drawChip(page, config.mode === 'dated' ? 'Dated planner' : 'Undated planner', 82, 250, theme, fonts, true);
  drawChip(page, `${context.theme.name} theme`, 230, 250, theme, fonts);
  drawChip(page, 'Landscape 4:3', 366, 250, theme, fonts);
  drawChip(page, 'Interactive tabs', 498, 250, theme, fonts);

  INDEX_MONTH_RECTS.forEach((rect, monthIndex) => {
    page.drawRectangle({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      color: toColor(theme.id === 'dark' ? theme.colors.background : theme.colors.paper),
      borderColor: toColor(theme.colors.border),
      borderWidth: 1,
    });
    page.drawText(RU_MONTHS_SHORT[monthIndex], {
      x: rect.x + 16,
      y: rect.y + 20,
      size: 15,
      font: fonts.bold,
      color: toColor(theme.colors.text),
    });
  });

  const sectionLabels = {
    year: 'Year overview',
    weekly: 'Weekly section',
    daily: 'Daily pages',
    notes: 'Notes',
    checklist: 'Checklist',
    stickers: 'Sticker sheets',
  } as const;

  (Object.keys(INDEX_SECTION_RECTS) as Array<keyof typeof INDEX_SECTION_RECTS>).forEach((key) => {
    const rect = INDEX_SECTION_RECTS[key];
    page.drawRectangle({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      color: toColor(theme.colors.paper),
      borderColor: toColor(theme.colors.border),
      borderWidth: 1,
    });
    page.drawText(sectionLabels[key], {
      x: rect.x + 16,
      y: rect.y + 34,
      size: 14,
      font: fonts.bold,
      color: toColor(theme.colors.text),
    });
    page.drawText('Open', {
      x: rect.x + 16,
      y: rect.y + 14,
      size: 10,
      font: fonts.body,
      color: toColor(theme.colors.muted),
    });
  });
}

function drawYearPage(page: PDFPage, currentPage: BuiltPlannerPage, context: RenderPageContext) {
  const { theme, fonts } = context;
  drawHeader(page, currentPage, context, 'Годовая карта продукта с быстрыми переходами по месяцам.');

  YEAR_MONTH_RECTS.forEach((rect, index) => {
    page.drawRectangle({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      color: toColor(theme.colors.paper),
      borderColor: toColor(theme.colors.border),
      borderWidth: 1.2,
    });

    page.drawText(RU_MONTHS_SHORT[index], {
      x: rect.x + 18,
      y: rect.y + rect.height - 28,
      size: 16,
      font: fonts.bold,
      color: toColor(theme.colors.text),
    });

    for (let row = 0; row < 4; row += 1) {
      drawDivider(page, rect.x + 16, rect.y + 72 - row * 18, rect.x + rect.width - 16, rect.y + 72 - row * 18, theme);
    }

    page.drawText('Перейти к месяцу', {
      x: rect.x + 18,
      y: rect.y + 18,
      size: 10,
      font: fonts.body,
      color: toColor(theme.colors.accent),
    });
  });
}

function drawMonthPage(page: PDFPage, currentPage: BuiltPlannerPage, context: RenderPageContext) {
  const { config, plan, theme, fonts } = context;
  const monthCalendar = getMonthCalendar(config.year ?? new Date().getFullYear(), currentPage.monthIndex ?? 0);
  drawHeader(page, currentPage, context, 'Месячный обзор, календарная сетка и переходы к неделям / daily pages.');

  drawSurface(page, 62, 188, 340, 462, theme);
  drawSurface(page, 428, 188, 314, 330, theme);
  drawSurface(page, 428, 534, 314, 116, theme);

  page.drawText('Фокус месяца', {
    x: 82,
    y: textY(214, 18),
    size: 18,
    font: fonts.bold,
    color: toColor(theme.colors.text),
  });

  ['Три главные цели', 'Проекты / кампании', 'Личный ритм'].forEach((label, index) => {
    const top = 248 + index * 90;
    page.drawText(label, {
      x: 82,
      y: textY(top, 12),
      size: 12,
      font: fonts.bold,
      color: toColor(theme.colors.muted),
    });
    for (let line = 0; line < 3; line += 1) {
      drawDivider(page, 82, PAGE_HEIGHT - (top + 28 + line * 18), 376, PAGE_HEIGHT - (top + 28 + line * 18), theme);
    }
  });

  page.drawText('Недельные развороты', {
    x: 82,
    y: textY(500, 16),
    size: 16,
    font: fonts.bold,
    color: toColor(theme.colors.text),
  });

  const weekPages = plan.pages.filter((item) => item.kind === 'week-left' && item.monthIndex === currentPage.monthIndex);
  weekPages.slice(0, MONTH_WEEK_RECTS.length).forEach((item, index) => {
    const rect = MONTH_WEEK_RECTS[index];
    page.drawRectangle({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      color: toColor(theme.colors.paper),
      borderColor: toColor(theme.colors.border),
      borderWidth: 1,
    });
    page.drawText(item.title, {
      x: rect.x + 16,
      y: rect.y + 22,
      size: 12,
      font: fonts.bold,
      color: toColor(theme.colors.text),
    });
    page.drawText(item.label, {
      x: rect.x + 16,
      y: rect.y + 8,
      size: 9,
      font: fonts.body,
      color: toColor(theme.colors.muted),
    });
  });

  RU_WEEKDAYS.forEach((label, index) => {
    page.drawText(label, {
      x: 448 + index * 40,
      y: textY(214, 10),
      size: 10,
      font: fonts.bold,
      color: toColor(theme.colors.muted),
    });
  });

  monthCalendar.grid.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      const x = 442 + colIndex * 42;
      const top = 234 + rowIndex * 38;
      const rect = rectFromTop(x, top, 34, 30);
      page.drawRectangle({
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        color: toColor(theme.colors.paper),
        borderColor: toColor(theme.colors.border),
        borderWidth: 0.8,
      });

      if (config.mode === 'dated' && cell.inCurrentMonth) {
        page.drawText(String(cell.dayOfMonth), {
          x: rect.x + 11,
          y: rect.y + 10,
          size: 10,
          font: fonts.body,
          color: toColor(theme.colors.text),
        });
      }
    });
  });

  const buttons = [
    { rect: MONTH_DAILY_RECT, label: 'Daily pages', hint: 'Open section' },
    { rect: MONTH_YEAR_RECT, label: 'Year overview', hint: 'Back to map' },
  ];

  buttons.forEach((item) => {
    page.drawRectangle({
      x: item.rect.x,
      y: item.rect.y,
      width: item.rect.width,
      height: item.rect.height,
      color: toColor(theme.colors.paper),
      borderColor: toColor(theme.colors.border),
      borderWidth: 1,
    });
    page.drawText(item.label, {
      x: item.rect.x + 18,
      y: item.rect.y + 26,
      size: 14,
      font: fonts.bold,
      color: toColor(theme.colors.text),
    });
    page.drawText(item.hint, {
      x: item.rect.x + 18,
      y: item.rect.y + 12,
      size: 9,
      font: fonts.body,
      color: toColor(theme.colors.muted),
    });
  });
}

function drawWeekBlocks(page: PDFPage, currentPage: BuiltPlannerPage, context: RenderPageContext) {
  const { config, theme, fonts } = context;
  drawHeader(page, currentPage, context, 'Недельный spread на 2 страницы с чистой композицией и местом для ручного письма.');

  const descriptor = getWeekCalendar(config.year ?? new Date().getFullYear(), currentPage.weekIndex ?? 0);
  const offset = currentPage.kind === 'week-left' ? 0 : 3;

  drawSurface(page, 62, 188, 676, 460, theme);

  descriptor.days.slice(offset, offset + (currentPage.kind === 'week-left' ? 3 : 4)).forEach((day, index) => {
    const x = 82 + index * (currentPage.kind === 'week-left' ? 212 : 160);
    const width = currentPage.kind === 'week-left' ? 188 : 144;
    const top = 210;
    const rect = rectFromTop(x, top, width, 320);

    page.drawRectangle({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      color: toColor(theme.colors.paper),
      borderColor: toColor(theme.colors.border),
      borderWidth: 1,
    });

    page.drawText(config.mode === 'dated' ? day.weekdayLabel : RU_WEEKDAYS[offset + index], {
      x: rect.x + 16,
      y: rect.y + rect.height - 28,
      size: 15,
      font: fonts.bold,
      color: toColor(theme.colors.text),
    });

    const dayDate = config.mode === 'dated'
      ? `${day.dayOfMonth} ${day.monthLabelShort.toLowerCase()}`
      : 'Свободный слот';

    page.drawText(dayDate, {
      x: rect.x + 16,
      y: rect.y + rect.height - 46,
      size: 9,
      font: fonts.body,
      color: toColor(theme.colors.muted),
    });

    for (let row = 0; row < 7; row += 1) {
      drawDivider(page, rect.x + 16, rect.y + rect.height - 74 - row * 28, rect.x + rect.width - 16, rect.y + rect.height - 74 - row * 28, theme);
    }
  });

  const footerRect = rectFromTop(82, 548, 654, 92);
  page.drawRectangle({
    x: footerRect.x,
    y: footerRect.y,
    width: footerRect.width,
    height: footerRect.height,
    color: toColor(theme.colors.paper),
    borderColor: toColor(theme.colors.border),
    borderWidth: 1,
  });
  page.drawText(currentPage.kind === 'week-left' ? 'Weekly focus' : 'Notes & tracker', {
    x: footerRect.x + 16,
    y: footerRect.y + footerRect.height - 26,
    size: 14,
    font: fonts.bold,
    color: toColor(theme.colors.text),
  });
  for (let row = 0; row < 3; row += 1) {
    drawDivider(page, footerRect.x + 16, footerRect.y + footerRect.height - 46 - row * 16, footerRect.x + footerRect.width - 16, footerRect.y + footerRect.height - 46 - row * 16, theme);
  }

  [
    { rect: PREVIOUS_RECT, label: 'Prev' },
    { rect: NEXT_RECT, label: 'Next' },
    { rect: rectFromTop(382, 680, 150, 34), label: 'Month' },
    { rect: rectFromTop(724, 680, 150, 34), label: currentPage.kind === 'week-left' ? 'Page 2' : 'Page 1' },
  ].forEach((button) => {
    page.drawRectangle({
      x: button.rect.x,
      y: button.rect.y,
      width: button.rect.width,
      height: button.rect.height,
      color: toColor(theme.colors.paper),
      borderColor: toColor(theme.colors.border),
      borderWidth: 1,
    });
    page.drawText(button.label, {
      x: button.rect.x + 20,
      y: button.rect.y + 10,
      size: 11,
      font: fonts.bold,
      color: toColor(theme.colors.text),
    });
  });
}

function drawDayPage(page: PDFPage, currentPage: BuiltPlannerPage, context: RenderPageContext) {
  const { theme, fonts } = context;
  drawHeader(page, currentPage, context, 'Отдельная дневная страница для расширенной версии планера.');

  const blocks = [
    rectFromTop(68, 196, 276, 420),
    rectFromTop(364, 196, 176, 420),
    rectFromTop(560, 196, 176, 420),
  ];

  ['Agenda', 'Top priorities', 'Notes'].forEach((label, index) => {
    const rect = blocks[index];
    page.drawRectangle({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      color: toColor(theme.colors.paper),
      borderColor: toColor(theme.colors.border),
      borderWidth: 1,
    });
    page.drawText(label, {
      x: rect.x + 16,
      y: rect.y + rect.height - 26,
      size: 14,
      font: fonts.bold,
      color: toColor(theme.colors.text),
    });

    const rows = index === 0 ? 10 : 9;
    for (let row = 0; row < rows; row += 1) {
      drawDivider(page, rect.x + 16, rect.y + rect.height - 48 - row * 30, rect.x + rect.width - 16, rect.y + rect.height - 48 - row * 30, theme);
    }
  });

  [
    { rect: PREVIOUS_RECT, label: 'Prev day' },
    { rect: NEXT_RECT, label: 'Next day' },
  ].forEach((button) => {
    page.drawRectangle({
      x: button.rect.x,
      y: button.rect.y,
      width: button.rect.width,
      height: button.rect.height,
      color: toColor(theme.colors.paper),
      borderColor: toColor(theme.colors.border),
      borderWidth: 1,
    });
    page.drawText(button.label, {
      x: button.rect.x + 18,
      y: button.rect.y + 10,
      size: 11,
      font: fonts.bold,
      color: toColor(theme.colors.text),
    });
  });
}

function drawNotesPage(page: PDFPage, currentPage: BuiltPlannerPage, context: RenderPageContext) {
  const { theme, fonts } = context;
  drawHeader(page, currentPage, context, 'Свободный лист для заметок, схем и быстрых записей.');
  drawSurface(page, 64, 188, 674, 470, theme);

  for (let line = 0; line < 16; line += 1) {
    drawDivider(page, 86, PAGE_HEIGHT - (224 + line * 26), 712, PAGE_HEIGHT - (224 + line * 26), theme);
  }

  [PREVIOUS_RECT, NEXT_RECT].forEach((rect, index) => {
    page.drawRectangle({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      color: toColor(theme.colors.paper),
      borderColor: toColor(theme.colors.border),
      borderWidth: 1,
    });
    page.drawText(index === 0 ? 'Prev note' : 'Next note', {
      x: rect.x + 18,
      y: rect.y + 10,
      size: 11,
      font: fonts.bold,
      color: toColor(theme.colors.text),
    });
  });
}

function drawChecklistPage(page: PDFPage, currentPage: BuiltPlannerPage, context: RenderPageContext) {
  const { theme, fonts } = context;
  drawHeader(page, currentPage, context, 'Checklist section с чередованием шаблонов для разных задач.');

  drawSurface(page, 64, 188, 674, 470, theme);
  page.drawText(currentPage.checklistVariant ?? 'Checklist', {
    x: 84,
    y: textY(214, 18),
    size: 18,
    font: fonts.bold,
    color: toColor(theme.colors.text),
  });

  for (let row = 0; row < 12; row += 1) {
    const top = 256 + row * 28;
    const box = rectFromTop(84, top, 14, 14);
    page.drawRectangle({
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      borderColor: toColor(theme.colors.border),
      borderWidth: 1,
    });
    drawDivider(page, 110, PAGE_HEIGHT - (top + 6), 714, PAGE_HEIGHT - (top + 6), theme);
  }

  [PREVIOUS_RECT, NEXT_RECT].forEach((rect, index) => {
    page.drawRectangle({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      color: toColor(theme.colors.paper),
      borderColor: toColor(theme.colors.border),
      borderWidth: 1,
    });
    page.drawText(index === 0 ? 'Prev list' : 'Next list', {
      x: rect.x + 18,
      y: rect.y + 10,
      size: 11,
      font: fonts.bold,
      color: toColor(theme.colors.text),
    });
  });
}

function drawStickerShape(page: PDFPage, sticker: StickerAsset, x: number, y: number, width: number, height: number, theme: PlannerTheme, fonts: TemplateFonts) {
  const fill = sticker.backgroundMode === 'transparent' ? theme.colors.paper : sticker.color;
  const opacity = sticker.backgroundMode === 'transparent' ? 0.12 : 1;

  if (sticker.shape === 'circle') {
    page.drawCircle({
      x: x + width / 2,
      y: y + height / 2,
      size: Math.min(width, height) / 2 - 8,
      color: toColor(fill),
      opacity,
      borderColor: toColor(sticker.color),
      borderWidth: 1.2,
    });
  } else {
    page.drawRectangle({
      x,
      y,
      width,
      height,
      color: toColor(fill),
      opacity,
      borderColor: toColor(sticker.color),
      borderWidth: 1.2,
    });
  }

  const stickerLabel = sticker.emoji ?? sticker.name.slice(0, 2).toUpperCase();
  const labelSize = sticker.shape === 'circle' ? 18 : stickerLabel.length > 4 ? 11 : 14;
  const labelWidth = fonts.bold.widthOfTextAtSize(stickerLabel, labelSize);

  page.drawText(stickerLabel, {
    x: x + width / 2 - labelWidth / 2,
    y: y + height / 2 - labelSize / 2 + 3,
    size: labelSize,
    font: fonts.bold,
    color: toColor(sticker.backgroundMode === 'transparent' ? sticker.color : '#1f2937'),
  });
}

function getStickerPageGrid(category: StickerCategory) {
  if (category === 'functional') {
    return Array.from({ length: 6 }, (_, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      return rectFromTop(84 + column * 314, 314 + row * 108, 294, 88);
    });
  }

  if (category === 'decorative') {
    return Array.from({ length: 6 }, (_, index) => {
      const column = index % 3;
      const row = Math.floor(index / 3);
      return rectFromTop(84 + column * 206, 314 + row * 138, 186, 118);
    });
  }

  return Array.from({ length: 6 }, (_, index) => {
    const column = index % 3;
    const row = Math.floor(index / 3);
    return rectFromTop(84 + column * 206, 324 + row * 132, 186, 104);
  });
}

function getUploadedStickerGrid(count: number, config: PlannerConfig) {
  const stickerConfig = getStickerModuleConfig(config);
  const padding = Math.max(16, Number(stickerConfig.autoLayout?.pagePadding ?? 72) * 0.5);
  const spacing = Math.max(10, Number(stickerConfig.autoLayout?.itemSpacing ?? 24) * 0.5);
  const area = rectFromTop(84, 314, 622, 298);
  const columns = Math.max(1, Math.min(3, Math.ceil(Math.sqrt(count || 1))));
  const rows = Math.max(1, Math.ceil(count / columns));
  const cellWidth = (area.width - padding * 2 - spacing * (columns - 1)) / columns;
  const cellHeight = (area.height - padding * 2 - spacing * (rows - 1)) / rows;

  return Array.from({ length: count }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    return rectFromTop(
      area.x + padding + column * (cellWidth + spacing),
      314 + padding + row * (cellHeight + spacing),
      cellWidth,
      cellHeight,
    );
  });
}

function drawStickerModeLabel(page: PDFPage, sticker: StickerAsset, x: number, y: number, theme: PlannerTheme, fonts: TemplateFonts) {
  const label = sticker.backgroundMode === 'transparent' ? 'Прозрачный фон' : 'Белый фон';
  const width = fonts.body.widthOfTextAtSize(label, 8) + 18;

  page.drawRectangle({
    x,
    y,
    width,
    height: 18,
    color: toColor(theme.colors.paper),
    opacity: 0.92,
    borderColor: toColor(theme.colors.border),
    borderWidth: 0.8,
  });

  page.drawText(label, {
    x: x + 9,
    y: y + 5,
    size: 8,
    font: fonts.body,
    color: toColor(theme.colors.muted),
  });
}

function drawStickerIntro(page: PDFPage, category: StickerCategory, theme: PlannerTheme, fonts: TemplateFonts) {
  const meta = getStickerCategoryMeta(category);
  const hintRect = rectFromTop(472, 214, 232, 60);

  drawSurface(page, 84, 206, 622, 84, theme, 0.72);

  page.drawText(meta.label, {
    x: 104,
    y: textY(220, 16),
    size: 16,
    font: fonts.bold,
    color: toColor(theme.colors.text),
  });

  drawWrappedText(page, meta.description, 104, 244, 332, 10, fonts.body, theme.colors.muted, 13);

  page.drawRectangle({
    x: hintRect.x,
    y: hintRect.y,
    width: hintRect.width,
    height: hintRect.height,
    color: toColor(theme.colors.accent),
    opacity: 0.08,
    borderColor: toColor(theme.colors.border),
    borderWidth: 0.8,
  });

  page.drawText('Как использовать', {
    x: hintRect.x + 14,
    y: hintRect.y + hintRect.height - 18,
    size: 10,
    font: fonts.bold,
    color: toColor(theme.colors.text),
  });

  drawWrappedText(page, meta.usageHint, hintRect.x + 14, 238, 204, 9, fonts.body, theme.colors.muted, 11.5);

  meta.chips.forEach((chip, index) => {
    drawChip(page, chip, 104 + index * 104, 268, theme, fonts, index === 0);
  });
}

function drawFunctionalStickerCard(page: PDFPage, sticker: StickerAsset, card: ReturnType<typeof rectFromTop>, theme: PlannerTheme, fonts: TemplateFonts) {
  page.drawRectangle({
    x: card.x,
    y: card.y,
    width: card.width,
    height: card.height,
    color: toColor(theme.colors.paper),
    borderColor: toColor(theme.colors.border),
    borderWidth: 1,
  });

  page.drawText(sticker.name, {
    x: card.x + 16,
    y: card.y + card.height - 22,
    size: 13,
    font: fonts.bold,
    color: toColor(theme.colors.text),
  });

  page.drawText('Служебная метка для задач и событий', {
    x: card.x + 16,
    y: card.y + card.height - 38,
    size: 8,
    font: fonts.body,
    color: toColor(theme.colors.muted),
  });

  drawStickerModeLabel(page, sticker, card.x + 16, card.y + 14, theme, fonts);
  drawStickerShape(page, sticker, card.x + card.width - 140, card.y + 18, 116, 52, theme, fonts);
}

function drawDecorativeStickerCard(page: PDFPage, sticker: StickerAsset, card: ReturnType<typeof rectFromTop>, theme: PlannerTheme, fonts: TemplateFonts) {
  page.drawRectangle({
    x: card.x,
    y: card.y,
    width: card.width,
    height: card.height,
    color: toColor(theme.colors.paper),
    borderColor: toColor(theme.colors.border),
    borderWidth: 1,
  });

  page.drawRectangle({
    x: card.x + 16,
    y: card.y + 14,
    width: card.width - 32,
    height: card.height - 28,
    color: toColor(theme.colors.accent),
    opacity: 0.05,
  });

  drawStickerShape(page, sticker, card.x + 56, card.y + 42, 74, 48, theme, fonts);
  drawCenteredText(page, sticker.name, card.x + card.width / 2, card.y + 24, 11, fonts.bold, theme.colors.text);
  drawCenteredText(page, 'Для декора и атмосферы', card.x + card.width / 2, card.y + 10, 8, fonts.body, theme.colors.muted);
}

function drawIconStickerCard(page: PDFPage, sticker: StickerAsset, card: ReturnType<typeof rectFromTop>, theme: PlannerTheme, fonts: TemplateFonts) {
  page.drawRectangle({
    x: card.x,
    y: card.y,
    width: card.width,
    height: card.height,
    color: toColor(theme.colors.paper),
    borderColor: toColor(theme.colors.border),
    borderWidth: 1,
  });

  drawStickerShape(page, sticker, card.x + 60, card.y + 26, 66, 56, theme, fonts);
  drawCenteredText(page, sticker.name, card.x + card.width / 2, card.y + 16, 10, fonts.bold, theme.colors.text);
  drawCenteredText(page, 'Мини-маркер', card.x + card.width / 2, card.y + 6, 8, fonts.body, theme.colors.muted);
}

function drawStickerCard(
  page: PDFPage,
  category: StickerCategory,
  sticker: StickerAsset,
  card: ReturnType<typeof rectFromTop>,
  theme: PlannerTheme,
  fonts: TemplateFonts,
) {
  if (category === 'functional') {
    drawFunctionalStickerCard(page, sticker, card, theme, fonts);
    return;
  }

  if (category === 'decorative') {
    drawDecorativeStickerCard(page, sticker, card, theme, fonts);
    return;
  }

  drawIconStickerCard(page, sticker, card, theme, fonts);
}

function drawUploadedStickerCard(
  page: PDFPage,
  sticker: StickerUploadAssetMeta,
  card: ReturnType<typeof rectFromTop>,
  context: RenderPageContext,
) {
  const { theme, fonts, embeddedStickerImages } = context;
  const image = embeddedStickerImages?.get(sticker.storageId);

  page.drawRectangle({
    x: card.x,
    y: card.y,
    width: card.width,
    height: card.height,
    color: toColor(theme.colors.paper),
    borderColor: toColor(theme.colors.border),
    borderWidth: 1,
  });

  if (image) {
    drawImageFit(page, image, card, 14);
  }

  page.drawText(sticker.name, {
    x: card.x + 12,
    y: card.y + 10,
    size: 9,
    font: fonts.body,
    color: toColor(theme.colors.muted),
  });
}

function drawReadySheetPage(page: PDFPage, currentPage: BuiltPlannerPage, context: RenderPageContext) {
  const { theme, fonts, embeddedStickerImages } = context;
  const stickerConfig = getStickerModuleConfig(context.config);
  const sheet = currentPage.stickerReadySheetId ? getReadyStickerSheetById(stickerConfig, currentPage.stickerReadySheetId) : undefined;
  const image = sheet ? embeddedStickerImages?.get(sheet.storageId) : undefined;

  drawHeader(page, currentPage, context, 'Ready Sheet Mode: готовый лист вставляется как отдельная sticker page без перекомпоновки.');
  drawSurface(page, 64, 188, 674, 470, theme);

  if (image) {
    drawImageFit(page, image, rectFromTop(84, 214, 622, 420), 0);
  }

  page.drawText(sheet?.name ?? currentPage.stickerReadySheetName ?? 'Ready sticker sheet', {
    x: 84,
    y: textY(646, 10),
    size: 10,
    font: fonts.body,
    color: toColor(theme.colors.muted),
  });

  [PREVIOUS_RECT, NEXT_RECT].forEach((rect, index) => {
    page.drawRectangle({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      color: toColor(theme.colors.paper),
      borderColor: toColor(theme.colors.border),
      borderWidth: 1,
    });
    page.drawText(index === 0 ? 'Prev sheet' : 'Next sheet', {
      x: rect.x + 18,
      y: rect.y + 10,
      size: 11,
      font: fonts.bold,
      color: toColor(theme.colors.text),
    });
  });
}

function drawStickerPage(page: PDFPage, currentPage: BuiltPlannerPage, context: RenderPageContext) {
  if (currentPage.stickerSourceMode === 'ready-sheet') {
    drawReadySheetPage(page, currentPage, context);
    return;
  }

  const { theme, fonts } = context;
  const category = currentPage.stickerCategory ?? 'functional';
  const stickerConfig = getStickerModuleConfig(context.config);
  drawHeader(page, currentPage, context, 'Sticker pages разделены на 3 категории: функциональные, декоративные и эмодзи / иконки.');

  drawSurface(page, 64, 188, 674, 470, theme);
  drawStickerIntro(page, category, theme, fonts);

  const stickerIds = currentPage.stickerAssetIds ?? [];
  const renderableAssets = stickerIds.length > 0
    ? stickerIds
      .map((assetId) => getStickerRenderableAssetById(stickerConfig, assetId))
      .filter((asset): asset is StickerAsset | StickerUploadAssetMeta => Boolean(asset))
    : getStickersByCategory(category);
  const cards = renderableAssets.some((asset) => isUploadedStickerAsset(asset))
    ? getUploadedStickerGrid(renderableAssets.length, context.config)
    : getStickerPageGrid(category);

  renderableAssets.forEach((sticker, index) => {
    const card = cards[index];

    if (!card) {
      return;
    }

    if (isUploadedStickerAsset(sticker)) {
      drawUploadedStickerCard(page, sticker, card, context);
      return;
    }

    drawStickerCard(page, category, sticker, card, theme, fonts);
  });

  [PREVIOUS_RECT, NEXT_RECT].forEach((rect, index) => {
    page.drawRectangle({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      color: toColor(theme.colors.paper),
      borderColor: toColor(theme.colors.border),
      borderWidth: 1,
    });
    page.drawText(index === 0 ? 'Prev sheet' : 'Next sheet', {
      x: rect.x + 18,
      y: rect.y + 10,
      size: 11,
      font: fonts.bold,
      color: toColor(theme.colors.text),
    });
  });
}

export function renderPlannerPage(page: PDFPage, currentPage: BuiltPlannerPage, context: RenderPageContext) {
  drawBackground(
    page,
    context.background,
    context.theme,
    context.embeddedBackgroundImage,
    context.config.backgroundOpacity,
  );

  switch (currentPage.kind) {
    case 'index':
      drawIndexPage(page, currentPage, context);
      break;
    case 'year':
      drawYearPage(page, currentPage, context);
      break;
    case 'month':
      drawMonthPage(page, currentPage, context);
      break;
    case 'week-left':
    case 'week-right':
      drawWeekBlocks(page, currentPage, context);
      break;
    case 'day':
      drawDayPage(page, currentPage, context);
      break;
    case 'notes':
      drawNotesPage(page, currentPage, context);
      break;
    case 'checklist':
      drawChecklistPage(page, currentPage, context);
      break;
    case 'sticker':
      drawStickerPage(page, currentPage, context);
      break;
    default:
      break;
  }
}
