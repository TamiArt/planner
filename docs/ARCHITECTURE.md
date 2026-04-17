# Архитектура MVP

## Назначение

Проект реализует закрытый internal builder для сборки цифровых планеров и последующего экспорта в PDF, который используется в Goodnotes, Notability, Samsung Notes, Xodo и Noteshelf.

## Два слоя системы

### 1. Core

`src/core` — стабильное ядро, которое не нужно переписывать при добавлении новых продуктовых пакетов.

В ядре живут:

- базовые типы `PlannerConfig`, `PlannerPageDefinition`, `PlannerModule`;
- `moduleState` для синхронизации `modules <-> sections`;
- `moduleRegistry` и общие контракты модулей;
- `composePlannerDocument` как единый document composer;
- `PlannerComposer`, `NavigationBuilder`, `PdfExportEngine`, `ValidationPipeline`;
- общий `RenderModel` для preview и PDF.

### 2. Modules

`src/modules` — подключаемые функции, которые можно включать, выключать и расширять без переписывания ядра.

Текущие модули:

- `background`
- `index`
- `year-overview`
- `monthly`
- `weekly`
- `daily`
- `notes`
- `checklist`
- `stickers`
- `layout-editor`

Каждый модуль содержит как минимум:

- `manifest.ts` — описание модуля;
- `index.ts` — реализация контракта `PlannerModule`.

## Подсистемы

### 1. Configurator

Реализован на React + Zustand + SCSS. Отвечает за:

- название продукта;
- режим `dated` / `undated`;
- год;
- тему и фон;
- состав разделов;
- порядок разделов;
- экспорт JSON;
- импорт JSON.

### 2. Planner Planning Layer

Файлы:

- `src/core/composer/composePlannerDocument.ts`
- `src/core/registry/moduleRegistry.ts`
- `src/core/config/moduleState.ts`
- `src/lib/config/defaultPlannerConfig.ts`
- `src/lib/navigation/dateHelpers.ts`

Слой отвечает за:

- нормализацию конфигурации;
- активацию модулей через registry;
- генерацию страниц модулями;
- вычисление порядка страниц;
- построение карты вкладок;
- построение карты внутренних ссылок.

Ключевые утилиты:

- `date-fns` для календарной логики;
- `nanoid` для id конфигов;
- `clsx` для условных CSS-классов интерфейса.

### 3. Theme & Assets Layer

Файлы:

- `src/data/themes/themes.ts`
- `src/data/backgrounds/backgrounds.ts`
- `src/data/stickers/stickers.ts`

Слой хранит декларативные данные и не смешивается с логикой UI или PDF-рендеринга.

### 4. Unified RenderModel Layer

Файлы:

- `src/core/render-model/buildPlannerRenderModel.ts`
- `src/core/render-model/chrome.ts`
- `src/core/render-model/pageBuilders.ts`
- `src/components/preview/PlannerPageSvg.tsx`

Слой отвечает за:

- построение общего `RenderModel` из `PlannerConfig`, модулей и `PageLayout`;
- одинаковую геометрию для preview и PDF;
- совпадение sticker pages, фона, темы и контентных блоков;
- генерацию link-hotspots поверх того же render pipeline.

### 5. PDF Rendering Layer

Файлы:

- `src/lib/templates/layout.ts`
- `src/core/export/PdfExportEngine.ts`

Слой отвечает за:

- отрисовку `RenderModel` в `pdf-lib`;
- фоновые слои, текст, блоки и изображения;
- вставку интерактивных link annotations.

### 6. Export Layer

Файл:

- `src/lib/export/exportPlannerPdf.ts`

Слой отвечает за:

- валидацию через `Zod`;
- валидацию перед экспортом;
- вызов `PdfExportEngine`;
- скачивание итогового `planner.pdf`;
- скачивание JSON-конфига;
- скачивание `instruction.pdf`.

## Контракт модуля

Модуль подключается через единый интерфейс `PlannerModule`:

- `manifest` — id, title, description, version, sectionType;
- `isEnabled(config)` — участвует ли модуль в сборке;
- `getPages(config)` — какие страницы модуль регистрирует;
- `getTabs(context)` — какие вкладки добавляет;
- `getLinks(context)` — какие внутренние переходы добавляет;
- `validate(context)` — модульные предупреждения и проверки.

За счёт этого ядро не знает деталей `daily`, `stickers` или будущих `finance-pages`: оно работает только с registry и общим контрактом.

## Ограничения текущего MVP

- cover page отключена по финальной спецификации;
- sticker sheets рендерятся через общий `RenderModel` и совпадают в preview/PDF;
- layout хранится в формате `PageLayout` с абсолютными координатами `2048×1536`;
- preview-страницы больше не используют отдельную HTML-логику отрисовки.
