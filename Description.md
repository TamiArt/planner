# Description

Legacy alias документации.

Каноническое имя файла: `Description.md`.

Этот файл оставлен для обратной совместимости, чтобы человек или ИИ не потеряли описание проекта из-за старого имени с опечаткой. Содержимое `Discription.md` и `Description.md` должно оставаться синхронным.

## Назначение

`Planner Builder` — внутреннее React/TypeScript-приложение для сборки цифровых планеров и связанных PDF-инструментов.

Основные задачи приложения:

- собрать конфиг планера;
- показать живой preview;
- экспортировать итоговый интерактивный PDF;
- экспортировать JSON-конфиг и usage guide;
- накладывать астрологию на уже готовый PDF;
- накладывать фазы Луны на уже готовый PDF;
- дописывать sticker pages в уже готовый PDF.

Приложение ориентировано на работу с PDF в Goodnotes, Notability, Samsung Notes, Xodo и Noteshelf.

## Стек

- React 18
- TypeScript
- Vite
- SCSS
- Zustand
- Zod
- pdf-lib
- astronomy-engine
- date-fns

## Быстрый старт

```bash
npm install
npm run dev
```

Сборка:

```bash
npm run build
```

## Known Issues / Current Behavior

Ниже перечислены важные особенности текущего поведения, которые нужно знать до внесения правок.

### Астрология и overlay-режим

- Астрология в builder и астрология при наложении на готовый PDF используют общий render pipeline, но не всегда одинаковые правила позиционирования.
- Overlay-режим опирается на текущий `PlannerConfig` как на reference model. Если загруженный PDF был создан не из текущего конфига, выравнивание может выглядеть сдвинутым даже при корректной логике.
- Полная астрострока и компактные значки — это разные представления. Их нельзя править как одну и ту же сущность.
- Для week view сейчас используется полная астрострока под датой каждого дня.
- Для month grid используются компактные значки снизу ячейки.
- Для day page используется полная астрострока над первым основным блоком.

### PDF overlay alignment

- Режимы выравнивания астрологии вынесены в именованные стратегии в [src/core/render-model/astrologyAlignmentStrategies.ts](<C:/Programming/Planner/src/core/render-model/astrologyAlignmentStrategies.ts:1>).
- На текущий момент есть отдельные стратегии для:
  - month grid
  - week columns
  - day page
  - day page overlay после существующего moon label
- Если меняется позиционирование астрологии, сначала нужно менять стратегии, а не встраивать новые `if` прямо в `pageBuilders.ts`.
- Overlay-движки не пересобирают весь PDF заново, а рисуют узлы поверх существующего документа. Поэтому у них всегда выше риск визуальной рассинхронизации, чем у full export.

### Что особенно легко сломать

- совпадение между SVG preview и полным PDF export;
- week/day/month астрологию при одновременной правке `pageBuilders.ts`;
- overlay-режим после правок month/week/day geometry;
- совместимость moon phases и astrology на одной странице.

## Главные экраны

Точка входа: [src/app/App.tsx](<C:/Programming/Planner/src/app/App.tsx:1>)

Маршрутизация сделана через `window.location.hash`.

Доступные view:

- `#/` -> основной конструктор: `BuilderWorkflowPage`
- `#/templates` -> витрина/preview шаблонов
- `#/append-stickers` -> дописывание sticker pages в готовый PDF
- `#/moon-phases-pdf` -> наложение фаз Луны на готовый PDF
- `#/astrology-pdf` -> наложение астрологии на готовый PDF

## Что является центром системы

Главная сущность проекта — `PlannerConfig`.

Практический смысл:

- UI редактирует `PlannerConfig`;
- store хранит `PlannerConfig`;
- planner modules читают `PlannerConfig`;
- document composer строит страницы из `PlannerConfig`;
- RenderModel строится из `PlannerConfig`;
- preview и экспорт PDF используют один и тот же RenderModel;
- отдельные PDF-инструменты тоже используют текущий `PlannerConfig` как источник логики и геометрии.

## Где хранится состояние

Файл: [src/store/plannerStore.ts](<C:/Programming/Planner/src/store/plannerStore.ts:1>)

Ключевые факты:

- store построен на `zustand`;
- используется `persist`, имя хранилища: `planner-builder-config`;
- после каждого изменения конфиг прогоняется через `syncPlannerConfig()`;
- это значит, что store не хранит "сырые" данные надолго: почти всё нормализуется сразу.

Главные методы store:

- `setField`
- `setTheme`
- `setBackground`
- `setCustomBackground`
- `clearCustomBackground`
- `updateSection`
- `toggleSection`
- `moveSection`
- `applyPreset`
- `resetConfig`
- `loadConfig`

## Как создаётся и нормализуется конфиг

Файл: [src/lib/config/defaultPlannerConfig.ts](<C:/Programming/Planner/src/lib/config/defaultPlannerConfig.ts:1>)

Главные функции:

- `createDefaultPlannerConfig()` — создаёт базовый конфиг
- `syncPlannerConfig()` — нормализует конфиг и синхронизирует связанные поля

Что делает `syncPlannerConfig()`:

- синхронизирует `modules` и `sections`;
- нормализует тему, фон, прозрачность;
- нормализует `astrology`;
- нормализует `moonPhases`;
- пересчитывает tabs;
- держит размер страницы фиксированным: `iPadLandscape`, `2048 x 1536`.

Важно:

- почти любое изменение в конфиге проходит через этот слой;
- если кажется, что UI "сам что-то меняет", сначала надо смотреть именно `syncPlannerConfig()`.

## Архитектурная схема

Основной pipeline:

`PlannerConfig -> syncPlannerConfig -> module registry -> composePlannerDocument -> buildPlannerRenderModel -> preview / pdf export / pdf overlay`

Смысл слоёв:

1. `Config`
2. `Planning`
3. `Modules`
4. `RenderModel`
5. `Preview`
6. `PDF export / PDF overlay`

## Core и Modules

### Core

Папка: `src/core`

Здесь живут:

- типы;
- contracts модулей;
- registry;
- composer;
- render-model;
- экспорт PDF;
- общая навигация;
- lifecycle-конвейер модулей.

### Modules

Папка: `src/modules`

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

Registry:

- [src/core/registry/moduleRegistry.ts](<C:/Programming/Planner/src/core/registry/moduleRegistry.ts:1>)

Контракт модуля:

- `manifest`
- `isEnabled(config)`
- `createSection(config)` или логика секции
- `getPages(config)`
- `getTabs(context)`
- `getLinks(context)`

Практический принцип:

- ядро не должно знать детали конкретного модуля;
- модуль должен подключаться через registry и общий контракт;
- если новый функциональный блок можно оформить как модуль, лучше сделать именно так.

## Как строится документ

Файл: [src/core/composer/composePlannerDocument.ts](<C:/Programming/Planner/src/core/composer/composePlannerDocument.ts:1>)

Что делает composer:

- берёт активные модули из registry;
- вызывает `getPages()` у модулей;
- присваивает `pageNumber`;
- собирает tabs;
- собирает links;
- возвращает `PlannerDocumentPlan`.

Итог:

- composer ничего не рисует;
- он только описывает структуру документа.

## Как строится RenderModel

Файл: [src/core/render-model/buildPlannerRenderModel.ts](<C:/Programming/Planner/src/core/render-model/buildPlannerRenderModel.ts:1>)

Что делает:

- берёт `PlannerConfig`;
- получает `plan`;
- поднимает theme и background;
- выбирает layout;
- для каждой страницы собирает список render nodes;
- добавляет links.

Ключевой принцип проекта:

- SVG preview и PDF export должны использовать одну и ту же геометрию;
- если визуально что-то "поехало" только в PDF, надо сравнивать `RenderModel` и pdf drawing code;
- если "поехало" и в preview, и в PDF, проблема почти всегда в `pageBuilders.ts`, layout или config.

## Где описана отрисовка страниц

Главный файл: [src/core/render-model/pageBuilders.ts](<C:/Programming/Planner/src/core/render-model/pageBuilders.ts:1>)

Здесь сосредоточено:

- построение month pages;
- построение week pages;
- построение daily pages;
- астрологические строки;
- компактные астрологические иконки;
- легенда астрологии;
- вставка фаз Луны;
- навигационные кнопки и микроразметка страниц.

Если нужно менять расположение астрологии, фаз Луны или контента на страницах:

- почти всегда начинать нужно с `pageBuilders.ts`.

## Preview

SVG preview:

- [src/components/preview/PlannerPageSvg.tsx](<C:/Programming/Planner/src/components/preview/PlannerPageSvg.tsx:1>)
- [src/components/PlannerRenderPreviewPanel.tsx](<C:/Programming/Planner/src/components/PlannerRenderPreviewPanel.tsx:1>)

Сводный preview:

- [src/components/PreviewPanel.tsx](<C:/Programming/Planner/src/components/PreviewPanel.tsx:1>)

Практический смысл:

- `PlannerPageSvg` показывает render nodes как SVG;
- это самый быстрый способ понять, правильно ли строится page geometry до экспорта.

## Экспорт PDF

Главный файл: [src/core/export/PdfExportEngine.ts](<C:/Programming/Planner/src/core/export/PdfExportEngine.ts:1>)

Уровень orchestration:

- [src/lib/export/exportPlannerPdf.ts](<C:/Programming/Planner/src/lib/export/exportPlannerPdf.ts:1>)

Что происходит:

1. конфиг валидируется;
2. строится `RenderModel`;
3. nodes переводятся в вызовы `pdf-lib`;
4. добавляются link annotations;
5. PDF сохраняется.

Важно:

- full export строит новый PDF с нуля;
- overlay-инструменты не пересобирают документ полностью, а рисуют дополнительные узлы поверх уже существующего PDF.

## Отдельные PDF-инструменты

### 1. Astrology PDF

Экран:

- [src/pages/AstrologyPdfEditorPage.tsx](<C:/Programming/Planner/src/pages/AstrologyPdfEditorPage.tsx:1>)

Главные файлы:

- [src/lib/astrology/astrologyConfig.ts](<C:/Programming/Planner/src/lib/astrology/astrologyConfig.ts:1>)
- [src/lib/astrology/jyotishDaily.ts](<C:/Programming/Planner/src/lib/astrology/jyotishDaily.ts:1>)
- [src/core/export/AnnotateAstrologyPdfEngine.ts](<C:/Programming/Planner/src/core/export/AnnotateAstrologyPdfEngine.ts:1>)
- [src/lib/export/annotateAstrologyPdf.ts](<C:/Programming/Planner/src/lib/export/annotateAstrologyPdf.ts:1>)

Что делает:

- рассчитывает астрологические данные на год по выбранной столице;
- сохраняет их в `config.astrology.data`;
- строит overlay поверх существующего PDF.

Важно:

- обычный builder и astrology overlay используют общую логику астрорендера;
- но overlay-режим местами имеет отдельное поведение выравнивания.

### 2. Moon Phases PDF

Экран:

- [src/pages/MoonPhasePdfEditorPage.tsx](<C:/Programming/Planner/src/pages/MoonPhasePdfEditorPage.tsx:1>)

Главные файлы:

- [src/lib/moon/moonPhases.ts](<C:/Programming/Planner/src/lib/moon/moonPhases.ts:1>)
- [src/core/export/AnnotateMoonPhasesPdfEngine.ts](<C:/Programming/Planner/src/core/export/AnnotateMoonPhasesPdfEngine.ts:1>)

Что делает:

- использует данные USNO;
- накладывает фазы Луны поверх существующего PDF.

### 3. Append Stickers

Экран:

- [src/pages/StickerPdfAppenderPage.tsx](<C:/Programming/Planner/src/pages/StickerPdfAppenderPage.tsx:1>)

Что делает:

- генерирует sticker pages текущим движком;
- дописывает их в конец уже загруженного PDF.

## Астрология: фактическая модель

Астрологические данные живут в `config.astrology`.

Ключевые части:

- `cityId`
- `ayanamsa`
- `calculationTime`
- `layers`
- `includeLegend`
- `data`

Расчёт находится в:

- [src/lib/astrology/jyotishDaily.ts](<C:/Programming/Planner/src/lib/astrology/jyotishDaily.ts:1>)

Что считается:

- Луна
- Титхи
- Накшатра
- Планета дня
- Энергия дня
- Фокус дня

Порядок полной строки:

- Луна
- Титхи
- Накшатра
- Планета
- Энергия
- Фокус

Важно:

- compact mode и full day line — это разные представления;
- month/week/day и PDF overlay могут использовать разную плотность и выравнивание;
- при изменении астрологии надо отдельно проверять:
  - day page
  - week page
  - month grid
  - astrology overlay on existing PDF

## Фазы Луны: фактическая модель

Данные лежат в `config.moonPhases`.

Ключевые части:

- `enabled`
- `source`
- `years`
- `events`

Файл:

- [src/lib/moon/moonPhases.ts](<C:/Programming/Planner/src/lib/moon/moonPhases.ts:1>)

Важно:

- если данных USNO нет, некоторые места используют fallback-поведение;
- астрология и фазы Луны могут сосуществовать и визуально влиять друг на друга.

## Layout system

В проекте используется абсолютная система координат страницы.

Базовый размер:

- `2048 x 1536`

Это важно для:

- layout editor;
- render model;
- preview;
- PDF export;
- overlay engines.

Если правится позиционирование:

- всегда нужно помнить, что preview рисуется в top-left координатах;
- `pdf-lib` рисует в bottom-left системе;
- движки экспорта и overlay содержат преобразование координат.

## Валидация

Файл:

- [src/lib/validators/plannerConfigValidator.ts](<C:/Programming/Planner/src/lib/validators/plannerConfigValidator.ts:1>)

Здесь проверяются:

- обязательные поля конфига;
- совместимость астрологических данных с текущим годом/городом;
- корректность moon phase data;
- принадлежность фона теме;
- корректность layout bounds;
- общая экспортная готовность.

Важно:

- перед экспортом смотреть сначала сюда;
- часть "неочевидных" предупреждений формируется именно валидатором, а не UI.

## Принципы логики взаимодействия модулей и частей

### 1. Store не должен быть единственным источником бизнес-логики

Store хранит состояние, но реальные правила живут в:

- `syncPlannerConfig`
- module registry
- composer
- render-model
- validator

### 2. Preview и export должны совпадать

Если при изменении UI логики preview и PDF начинают расходиться, это ошибка архитектуры.

Правильный путь:

- менять RenderModel;
- а не отдельно чинить preview и отдельно PDF, если это не overlay-специфика.

### 3. Modules добавляют документ, а не ломают ядро

Если нужна новая секция:

- лучше оформить её как новый `PlannerModule`;
- не зашивать поведение вручную в десяток разных `if`.

### 4. Overlay tools используют текущий конфиг как reference model

Отдельные редакторы PDF не являются полностью независимыми mini-app.

Они зависят от:

- текущего `PlannerConfig`;
- текущей page geometry;
- текущих астрологических и лунных настроек;
- текущего порядка страниц.

### 5. Любая правка астрологии должна проверяться в 4 местах

- builder month view
- builder week view
- builder day view
- astrology overlay on uploaded PDF

### 6. Любая правка moon phases должна проверяться в 3 местах

- month/day preview
- moon phase overlay
- совместимость с astrology overlay

### 7. Любая правка page geometry должна проверяться в 3 местах

- SVG preview
- full PDF export
- overlay tools

## Что читать следующему ИИ в первую очередь

Минимальный пакет файлов для входа в проект:

1. [README.md](<C:/Programming/Planner/README.md:1>)
2. [docs/ARCHITECTURE.md](<C:/Programming/Planner/docs/ARCHITECTURE.md:1>)
3. [src/app/App.tsx](<C:/Programming/Planner/src/app/App.tsx:1>)
4. [src/store/plannerStore.ts](<C:/Programming/Planner/src/store/plannerStore.ts:1>)
5. [src/lib/config/defaultPlannerConfig.ts](<C:/Programming/Planner/src/lib/config/defaultPlannerConfig.ts:1>)
6. [src/core/composer/composePlannerDocument.ts](<C:/Programming/Planner/src/core/composer/composePlannerDocument.ts:1>)
7. [src/core/render-model/buildPlannerRenderModel.ts](<C:/Programming/Planner/src/core/render-model/buildPlannerRenderModel.ts:1>)
8. [src/core/render-model/pageBuilders.ts](<C:/Programming/Planner/src/core/render-model/pageBuilders.ts:1>)
9. [src/core/export/PdfExportEngine.ts](<C:/Programming/Planner/src/core/export/PdfExportEngine.ts:1>)
10. [src/lib/validators/plannerConfigValidator.ts](<C:/Programming/Planner/src/lib/validators/plannerConfigValidator.ts:1>)

Если задача связана с астрологией, дополнительно читать:

1. [src/pages/AstrologyPdfEditorPage.tsx](<C:/Programming/Planner/src/pages/AstrologyPdfEditorPage.tsx:1>)
2. [src/lib/astrology/astrologyConfig.ts](<C:/Programming/Planner/src/lib/astrology/astrologyConfig.ts:1>)
3. [src/lib/astrology/jyotishDaily.ts](<C:/Programming/Planner/src/lib/astrology/jyotishDaily.ts:1>)
4. [src/core/export/AnnotateAstrologyPdfEngine.ts](<C:/Programming/Planner/src/core/export/AnnotateAstrologyPdfEngine.ts:1>)

Если задача связана с готовым PDF:

1. [src/pages/AstrologyPdfEditorPage.tsx](<C:/Programming/Planner/src/pages/AstrologyPdfEditorPage.tsx:1>)
2. [src/pages/MoonPhasePdfEditorPage.tsx](<C:/Programming/Planner/src/pages/MoonPhasePdfEditorPage.tsx:1>)
3. [src/pages/StickerPdfAppenderPage.tsx](<C:/Programming/Planner/src/pages/StickerPdfAppenderPage.tsx:1>)
4. `src/core/export/*`

## Чекпоинты для любого следующего ИИ

### Чекпоинт 1. Перед правкой

- понять, это правка builder, export или overlay;
- понять, проблема в config, render-model или pdf drawing;
- открыть `pageBuilders.ts`, если вопрос визуальный.

### Чекпоинт 2. После изменения config-логики

- проверить, не ломается ли `syncPlannerConfig`;
- проверить warnings/errors валидатора;
- проверить persistence store.

### Чекпоинт 3. После изменения page layout или pageBuilders

- проверить SVG preview;
- проверить полный PDF export;
- проверить соответствующий overlay tool.

### Чекпоинт 4. После изменения астрологии

- month grid;
- week columns;
- day page;
- astrology overlay preview;
- астрологическая легенда, если затронут порядок/состав данных.

### Чекпоинт 5. После изменения moon phases

- наличие данных на нужный год;
- отображение в builder;
- moon phase overlay;
- совместимость с astrology.

### Чекпоинт 6. После изменения sticker logic

- sticker render preview;
- итоговый appended PDF;
- storage cleanup для blob assets.

### Чекпоинт 7. Перед завершением задачи

- запустить `npm run build`;
- убедиться, что нет несинхронности между preview и PDF;
- кратко описать, какие экраны и сценарии были затронуты.

## Текущие важные практические правила

- не редактировать конфиг напрямую, если можно пройти через store/sync;
- не дублировать layout-логику отдельно для preview и export;
- при визуальных правках сначала менять RenderModel, потом уже overlay-specific детали;
- overlay-режимы могут требовать отдельного позиционирования, потому что рисуют поверх уже существующего PDF;
- week/day/month в астрологии — это три разных сценария, их нельзя считать одним и тем же UI.

## Итог для следующего ИИ

Если нужно продолжить работу над приложением без знания прошлых диалогов, держать в голове простую модель:

- `PlannerConfig` — источник правды;
- `syncPlannerConfig` — слой нормализации;
- `moduleRegistry + composer` — слой структуры документа;
- `buildPlannerRenderModel + pageBuilders` — слой визуальной логики;
- `PlannerPageSvg` — быстрый способ проверить геометрию;
- `PdfExportEngine` — полный экспорт;
- `Annotate*PdfEngine` / append tools — специальные режимы поверх готового PDF;
- любые правки астрологии и выравнивания нужно проверять отдельно в builder и в overlay.
