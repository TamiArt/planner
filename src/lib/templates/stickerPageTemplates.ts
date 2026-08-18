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
  drawCenteredText,
  drawChip,
  drawDivider,
  drawHeader,
  drawImageFit,
  drawSurface,
  drawWrappedText,
  textY,
  toColor,
  type RenderPageContext,
  type TemplateFonts,
} from './templatePrimitives';

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

export function drawStickerPage(page: PDFPage, currentPage: BuiltPlannerPage, context: RenderPageContext) {
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
