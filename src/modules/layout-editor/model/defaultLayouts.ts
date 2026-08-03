import { createBlock } from '../../../shared/layout/createBlock';
import type { LayoutPageTarget, PageLayout, PlannerLayoutsConfig } from '../../../shared/layout/types';
import { LAYOUT_CANVAS_HEIGHT, LAYOUT_CANVAS_WIDTH } from '../../../shared/layout/types';

function createLayout(target: LayoutPageTarget, title: string, blocks: PageLayout['blocks']): PageLayout {
  return {
    id: `layout-${target}`,
    target,
    title,
    width: LAYOUT_CANVAS_WIDTH,
    height: LAYOUT_CANVAS_HEIGHT,
    grid: {
      visible: true,
      snap: true,
      size: 16,
      subdivisions: 4,
    },
    blocks,
    updatedAt: new Date().toISOString(),
  };
}

export function createDefaultPlannerLayouts(): Record<LayoutPageTarget, PageLayout> {
  return {
    index: createLayout('index', 'Макет индекса', [
      createBlock({ type: 'header', name: 'Главный блок', x: 120, y: 108, width: 1680, height: 180 }),
      createBlock({ type: 'group', name: 'Сетка месяцев', x: 120, y: 340, width: 1680, height: 520 }),
      createBlock({ type: 'group', name: 'Разделы', x: 120, y: 920, width: 1680, height: 300 }),
    ]),
    year: createLayout('year', 'Макет обзора года', [
      createBlock({ type: 'header', name: 'Заголовок', x: 120, y: 108, width: 1680, height: 160 }),
      createBlock({ type: 'calendar', name: 'Карта месяцев', x: 120, y: 320, width: 1680, height: 940 }),
    ]),
    month: createLayout('month', 'Макет месяца', [
      createBlock({ type: 'header', name: 'Заголовок', x: 120, y: 108, width: 1680, height: 150 }),
      createBlock({ type: 'calendar', name: 'Сетка календаря', x: 980, y: 320, width: 820, height: 760 }),
      createBlock({ type: 'note-area', name: 'Фокус месяца', x: 120, y: 320, width: 780, height: 760 }),
      createBlock({ type: 'group', name: 'Ссылки на недели', x: 120, y: 1120, width: 1680, height: 220 }),
    ]),
    'week-left': createLayout('week-left', 'Макет недели слева', [
      createBlock({ type: 'header', name: 'Заголовок', x: 120, y: 108, width: 1680, height: 150 }),
      createBlock({ type: 'group', name: 'Колонка дня 1', x: 120, y: 320, width: 520, height: 840 }),
      createBlock({ type: 'group', name: 'Колонка дня 2', x: 680, y: 320, width: 520, height: 840 }),
      createBlock({ type: 'group', name: 'Колонка дня 3', x: 1240, y: 320, width: 520, height: 840 }),
      createBlock({ type: 'note-area', name: 'Фокус недели', x: 120, y: 1200, width: 1220, height: 180 }),
      createBlock({ type: 'note-area', name: 'Благодарность', x: 1380, y: 1200, width: 380, height: 180 }),
    ]),
    'week-right': createLayout('week-right', 'Макет недели справа', [
      createBlock({ type: 'header', name: 'Заголовок', x: 120, y: 108, width: 1680, height: 150 }),
      createBlock({ type: 'group', name: 'Колонка дня 4', x: 120, y: 320, width: 390, height: 840 }),
      createBlock({ type: 'group', name: 'Колонка дня 5', x: 550, y: 320, width: 390, height: 840 }),
      createBlock({ type: 'group', name: 'Колонка дня 6', x: 980, y: 320, width: 390, height: 840 }),
      createBlock({ type: 'group', name: 'Колонка дня 7', x: 1410, y: 320, width: 390, height: 840 }),
      createBlock({ type: 'note-area', name: 'Заметки / трекер', x: 120, y: 1200, width: 1680, height: 180 }),
    ]),
    day: createLayout('day', 'Макет дня', [
      createBlock({ type: 'header', name: 'Заголовок', x: 120, y: 108, width: 1680, height: 150 }),
      createBlock({ type: 'note-area', name: 'План дня', x: 120, y: 320, width: 860, height: 980 }),
      createBlock({ type: 'checklist', name: 'Приоритеты', x: 1030, y: 320, width: 360, height: 980 }),
      createBlock({ type: 'note-area', name: 'Заметки', x: 1440, y: 320, width: 360, height: 980 }),
    ]),
    notes: createLayout('notes', 'Макет заметок', [
      createBlock({ type: 'header', name: 'Заголовок', x: 120, y: 108, width: 1680, height: 150 }),
      createBlock({ type: 'note-area', name: 'Область для письма', x: 120, y: 320, width: 1680, height: 1060 }),
    ]),
    checklist: createLayout('checklist', 'Макет чек-листа', [
      createBlock({ type: 'header', name: 'Заголовок', x: 120, y: 108, width: 1680, height: 150 }),
      createBlock({ type: 'checklist', name: 'Область чек-листа', x: 120, y: 320, width: 1680, height: 1060 }),
    ]),
    sticker: createLayout('sticker', 'Макет стикеров', [
      createBlock({ type: 'header', name: 'Заголовок', x: 120, y: 108, width: 1680, height: 150 }),
      createBlock({ type: 'text', name: 'Вступление категории', x: 120, y: 300, width: 1680, height: 160 }),
      createBlock({ type: 'sticker-grid', name: 'Сетка стикеров', x: 120, y: 500, width: 1680, height: 820 }),
    ]),
  };
}

export function clonePlannerLayouts(layouts: Record<LayoutPageTarget, PageLayout>): PlannerLayoutsConfig {
  return Object.fromEntries(
    Object.entries(layouts).map(([target, layout]) => [
      target,
      {
        ...layout,
        width: layout.width,
        height: layout.height,
        grid: { ...layout.grid },
        blocks: layout.blocks.map((block) => ({
          ...block,
          radius: { ...block.radius },
          border: { ...block.border },
          padding: { ...block.padding },
          meta: block.meta ? { ...block.meta } : undefined,
        })),
      },
    ]),
  ) as PlannerLayoutsConfig;
}
