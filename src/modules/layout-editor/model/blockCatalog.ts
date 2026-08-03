import type { LayoutBlock } from '../../../shared/layout';

export type AddableMonthBlockType = 'note-area' | 'checklist' | 'text' | 'shape';

export const MONTH_BLOCK_OPTIONS: ReadonlyArray<{
  type: AddableMonthBlockType;
  label: string;
  width: number;
  height: number;
}> = [
  { type: 'note-area', label: 'Область заметок', width: 480, height: 320 },
  { type: 'checklist', label: 'Чек-лист', width: 480, height: 320 },
  { type: 'text', label: 'Текст', width: 480, height: 180 },
  { type: 'shape', label: 'Форма', width: 320, height: 240 },
];

const BLOCK_TYPE_LABELS: Partial<Record<string, string>> = {
  header: 'заголовок',
  text: 'текст',
  calendar: 'календарь',
  'note-area': 'область заметок',
  checklist: 'чек-лист',
  image: 'изображение',
  'sticker-grid': 'сетка стикеров',
  shape: 'форма',
  decoration: 'декор',
  group: 'группа',
};

export function getBlockTypeLabel(type: LayoutBlock['type']) {
  return BLOCK_TYPE_LABELS[type] ?? type;
}

export function getMonthBlockPreset(type: AddableMonthBlockType) {
  return MONTH_BLOCK_OPTIONS.find((option) => option.type === type)!;
}
