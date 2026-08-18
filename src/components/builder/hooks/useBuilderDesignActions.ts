import { startTransition, type ChangeEvent, type RefObject } from 'react';
import { openFilePicker } from '../builderUtils';
import { getBackgroundById, getBackgroundsForTheme } from '../../../lib/assets/assetRegistry';
import {
  createGradientBackground,
  createSolidColorBackground,
  createUploadedBackground,
  isCustomBackground,
  isCustomColorBackground,
  isCustomGradientBackground,
  isCustomPhotoBackground,
  normalizeBackgroundOpacity,
} from '../../../lib/assets/uploadBackground';
import {
  COVER_UPLOAD_SIZE,
  createPlannerArtwork,
  formatPlannerArtworkSize,
  PAGE_BACKGROUND_UPLOAD_SIZE,
} from '../../../lib/assets/uploadPlannerArtwork';
import { getThemeById } from '../../../lib/themes/themeRegistry';
import type { BackgroundAsset, PlannerConfig } from '../../../types/planner';

type SetPlannerField = <K extends keyof PlannerConfig>(field: K, value: PlannerConfig[K]) => void;
type SetFeedback = (message: string | null) => void;

export function useBuilderDesignActions(
  config: PlannerConfig,
  setField: SetPlannerField,
  setCustomBackground: (background: BackgroundAsset) => void,
  setActiveStep: (step: 'design') => void,
  setFeedback: SetFeedback,
  backgroundInputRef: RefObject<HTMLInputElement | null>,
  coverInputRef: RefObject<HTMLInputElement | null>,
  pageBackgroundInputRef: RefObject<HTMLInputElement | null>,
) {
  const availableBackgrounds = getBackgroundsForTheme(config.themeId, config.customBackground);
  const selectedBackground = getBackgroundById(config.backgroundId, config.customBackground);
  const selectedTheme = getThemeById(config.themeId);
  const hasCustomBackground = isCustomBackground(config.customBackground);
  const hasCustomColorBackground = isCustomColorBackground(config.customBackground);
  const hasCustomGradientBackground = isCustomGradientBackground(config.customBackground);
  const hasCustomPhotoBackground = isCustomPhotoBackground(config.customBackground);
  const coverUploadSizeLabel = formatPlannerArtworkSize(COVER_UPLOAD_SIZE);
  const pageBackgroundUploadSizeLabel = formatPlannerArtworkSize(PAGE_BACKGROUND_UPLOAD_SIZE);
  const colorPickerValue = hasCustomColorBackground ? config.customBackground?.source ?? selectedTheme.colors.background : selectedTheme.colors.background;
  const gradientStartValue = hasCustomGradientBackground ? config.customBackground?.gradient?.startColor ?? selectedTheme.colors.background : selectedTheme.colors.background;
  const gradientEndValue = hasCustomGradientBackground ? config.customBackground?.gradient?.endColor ?? selectedTheme.colors.paper : selectedTheme.colors.paper;
  const gradientAngleValue = hasCustomGradientBackground ? config.customBackground?.gradient?.angle ?? 135 : 135;
  const backgroundOpacityValue = Math.round(normalizeBackgroundOpacity(config.backgroundOpacity) * 100);

  function handleBackgroundUploadClick() { openFilePicker(backgroundInputRef.current); }
  function handleCoverUploadClick() { openFilePicker(coverInputRef.current); }
  function handlePageBackgroundUploadClick() { openFilePicker(pageBackgroundInputRef.current); }

  async function handleBackgroundUploadChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const uploadedBackground = await createUploadedBackground(file);
      startTransition(() => setCustomBackground(uploadedBackground));
      setActiveStep('design');
      setFeedback(`Фон "${file.name}" загружен, оптимизирован и выбран для экспорта.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Не удалось подготовить фоновое изображение.');
    } finally { event.target.value = ''; }
  }

  async function handleCoverUploadChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const coverImage = await createPlannerArtwork(file, 'cover');
      startTransition(() => setField('coverImage', coverImage));
      setActiveStep('design');
      setFeedback(`Обложка "${file.name}" загружена и будет добавлена первой страницей PDF.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Не удалось подготовить PNG-обложку.');
    } finally { event.target.value = ''; }
  }

  async function handlePageBackgroundUploadChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const pageBackgroundImage = await createPlannerArtwork(file, 'page-background');
      startTransition(() => setField('pageBackgroundImage', pageBackgroundImage));
      setActiveStep('design');
      setFeedback(`Фон листов "${file.name}" загружен и будет применен ко всем листам планера.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Не удалось подготовить PNG-фон листов.');
    } finally { event.target.value = ''; }
  }

  function handleBackgroundColorChange(event: ChangeEvent<HTMLInputElement>) {
    const colorBackground = createSolidColorBackground(event.target.value);
    startTransition(() => setCustomBackground(colorBackground));
    setActiveStep('design');
    setFeedback(`Фон обновлен на цвет ${colorBackground.source}.`);
  }

  function handleGradientBackgroundChange(patch: Partial<{ startColor: string; endColor: string; angle: number }>) {
    const gradientBackground = createGradientBackground(
      patch.startColor ?? gradientStartValue,
      patch.endColor ?? gradientEndValue,
      patch.angle ?? gradientAngleValue,
    );
    startTransition(() => setCustomBackground(gradientBackground));
    setActiveStep('design');
    setFeedback(`Градиентный фон обновлен: ${gradientBackground.gradient?.startColor} -> ${gradientBackground.gradient?.endColor}.`);
  }

  function handleBackgroundOpacityChange(event: ChangeEvent<HTMLInputElement>) {
    const nextOpacity = normalizeBackgroundOpacity(Number(event.target.value) / 100);
    startTransition(() => setField('backgroundOpacity', nextOpacity));
    setActiveStep('design');
    setFeedback(`Прозрачность фона обновлена: ${Math.round(nextOpacity * 100)}%.`);
  }

  function handleTabPositionChange(position: PlannerConfig['tabPosition']) {
    startTransition(() => setField('tabPosition', position));
    setActiveStep('design');
    setFeedback(`Расположение вкладок обновлено: ${position === 'top' ? 'сверху' : 'справа'}.`);
  }

  function handleRemoveCoverImage() {
    startTransition(() => setField('coverImage', undefined));
    setActiveStep('design');
    setFeedback('Обложка удалена из текущей конфигурации.');
  }

  function handleRemovePageBackgroundImage() {
    startTransition(() => setField('pageBackgroundImage', undefined));
    setActiveStep('design');
    setFeedback('Фон листов удален из текущей конфигурации.');
  }

  return {
    availableBackgrounds,
    selectedBackground,
    selectedTheme,
    hasCustomBackground,
    hasCustomColorBackground,
    hasCustomGradientBackground,
    hasCustomPhotoBackground,
    coverUploadSizeLabel,
    pageBackgroundUploadSizeLabel,
    colorPickerValue,
    gradientStartValue,
    gradientEndValue,
    gradientAngleValue,
    backgroundOpacityValue,
    handleBackgroundUploadClick,
    handleCoverUploadClick,
    handlePageBackgroundUploadClick,
    handleBackgroundUploadChange,
    handleCoverUploadChange,
    handlePageBackgroundUploadChange,
    handleBackgroundColorChange,
    handleGradientBackgroundChange,
    handleBackgroundOpacityChange,
    handleTabPositionChange,
    handleRemoveCoverImage,
    handleRemovePageBackgroundImage,
  };
}
