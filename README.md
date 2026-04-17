# Planner Builder

Внутренний конструктор цифровых планеров с экспортом в интерактивный PDF.

## Что умеет MVP

- dated и undated режимы;
- 3 темы: `Minimal`, `Soft`, `Dark`;
- выбор фоновых вариантов внутри темы;
- управление секциями планера;
- строгая схема конфигурации через `Zod`;
- календарная логика через `date-fns`;
- id через `nanoid`;
- условные CSS-классы через `clsx`;
- 12 вкладок месяцев + вкладки `Notes`, `Lists`, `Stick`;
- экспорт единого PDF с внутренними ссылками;
- единый `RenderModel` для preview и PDF без дублирования шаблонной логики;
- экспорт JSON-конфига;
- экспорт инструкции в `instruction.pdf`.

## Стек

- React
- TypeScript
- Vite
- SCSS
- Zustand
- Zod
- date-fns
- nanoid
- clsx
- pdf-lib

## Локальный запуск

```bash
npm install
npm run dev
```

## Сборка

```bash
npm run build
```

## Архитектура

Основной поток:

`PlannerConfig -> Core composer -> Module registry -> PageLayouts -> RenderModel -> Preview/PDF`

Ключевые директории:

- `src/core` — стабильное ядро: типы, registry, composer, навигация и синхронизация config/modules;
- `src/core/render-model` — единый render pipeline для SVG-preview и `pdf-lib`;
- `src/modules` — подключаемые модули планера: `background`, `year-overview`, `monthly`, `weekly`, `daily`, `notes`, `checklist`, `stickers`, `layout-editor`;
- `src/pages` — экран внутреннего конструктора;
- `src/store` — Zustand store и сохранение состояния;
- `src/lib/templates` — отрисовка страниц PDF;
- `src/lib/export` — экспорт PDF, JSON и инструкции;
- `src/data` — декларативные темы, фоны и sticker assets;
- `docs` — документация по MVP и архитектуре.

## Core + Modules

Система разделена на 2 слоя:

- `core` хранит базовый `PlannerConfig`, module registry, document composer, navigation engine и общие контракты;
- `modules` добавляют конкретные секции и не меняют ядро напрямую;
- новый модуль подключается через `src/core/registry/moduleRegistry.ts`;
- пресеты, UI секций и валидация работают через registry, а не через ручные `if` по всем разделам.
