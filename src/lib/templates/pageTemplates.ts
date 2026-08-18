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

import {
  drawBackground,
  drawChip,
  drawDivider,
  drawHeader,
  drawHomeButton,
  drawSurface,
  drawTabs,
  drawWrappedText,
  textY,
  toColor,
  type RenderPageContext,
} from './templatePrimitives';
import { drawStickerPage } from './stickerPageTemplates';
export type { RenderPageContext, TemplateFonts } from './templatePrimitives';

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
