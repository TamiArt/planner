import type { BackgroundAsset } from '../../types/planner';

export function openFilePicker(input: HTMLInputElement | null) {
  if (!input) {
    return;
  }

  input.value = '';

  const pickerInput = input as HTMLInputElement & { showPicker?: () => void };
  if (typeof pickerInput.showPicker === 'function') {
    try {
      pickerInput.showPicker();
      return;
    } catch {
      // Fallback to click for browsers that restrict showPicker on hidden inputs.
    }
  }

  input.click();
}

export function getBackgroundTypeLabel(background: BackgroundAsset) {
  if (background.isCustom) {
    if (background.type === 'color') {
      return 'пользовательский цвет';
    }

    if (background.variant === 'generated-gradient') {
      return 'пользовательский градиент';
    }

    return 'загруженное фото';
  }

  if (background.type === 'color') {
    return 'сплошной';
  }

  if (background.type === 'texture') {
    return 'текстура';
  }

  return 'изображение';
}

export function getCurrentBackgroundStyleLabel({
  hasCustomPhotoBackground,
  hasCustomGradientBackground,
  hasCustomColorBackground,
}: {
  hasCustomPhotoBackground: boolean;
  hasCustomGradientBackground: boolean;
  hasCustomColorBackground: boolean;
}) {
  if (hasCustomPhotoBackground) {
    return 'фото с наложением';
  }

  if (hasCustomGradientBackground) {
    return 'свой градиент';
  }

  if (hasCustomColorBackground) {
    return 'свой сплошной цвет';
  }

  return 'тематический фон';
}
