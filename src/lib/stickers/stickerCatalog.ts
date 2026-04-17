import type { StickerCategory } from '../../types/planner';

export interface StickerCategoryMeta {
  id: StickerCategory;
  title: string;
  label: string;
  description: string;
  usageHint: string;
  chips: string[];
}

export const STICKER_CATEGORY_ORDER: StickerCategory[] = ['functional', 'decorative', 'emoji'];

export const STICKER_CATEGORY_META: Record<StickerCategory, StickerCategoryMeta> = {
  functional: {
    id: 'functional',
    title: 'Функциональные стикеры',
    label: 'Планирование и статусы',
    description: 'Метки для задач, встреч, глубокого фокуса, оплаты и рутинных действий.',
    usageHint: 'Лучше всего подходят для планирования, трекеров и выделения важных задач.',
    chips: ['Задачи', 'Фокус', 'Встречи'],
  },
  decorative: {
    id: 'decorative',
    title: 'Декоративные стикеры',
    label: 'Акценты и атмосфера',
    description: 'Мягкие визуальные элементы для оформления разворотов, заметок и сезонных акцентов.',
    usageHint: 'Используйте для оформления свободных зон, заголовков и визуального ритма страницы.',
    chips: ['Настроение', 'Цветы', 'Акценты'],
  },
  emoji: {
    id: 'emoji',
    title: 'Эмодзи и иконки',
    label: 'Быстрые маркеры',
    description: 'Компактные символы для коротких сигналов, реакций, отметок и визуальных маркеров.',
    usageHint: 'Хорошо работают как мини-иконки в чек-листах, календарях и трекерах привычек.',
    chips: ['Отметки', 'Настроение', 'Мини-теги'],
  },
};

export function getStickerCategoryMeta(category: StickerCategory) {
  return STICKER_CATEGORY_META[category];
}
