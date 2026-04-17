import clsx from 'clsx';
import { useEffect, useMemo, useState, type CSSProperties, type KeyboardEvent } from 'react';
import type { PlannerModulePanelProps } from '../../../core/registry/plannerModule';
import { Panel } from '../../../components/Panel';
import {
  LAYOUT_CANVAS_HEIGHT,
  LAYOUT_CANVAS_WIDTH,
  type GridSettings,
  type LayoutBlock,
  type LayoutPageTarget,
} from '../../../shared/layout';
import { updateBlockPosition, updateBlockSize } from '../../../shared/layout/updateBlock';
import { updateBlockStyle } from '../../../shared/layout/updateBlockStyle';
import { normalizePlannerLayouts } from '../model/normalizeLayouts';

const GRID_OPTIONS = [8, 16, 32] as const;

const TARGET_LABELS: Record<LayoutPageTarget, string> = {
  index: 'Индекс',
  year: 'Обзор года',
  month: 'Месяц',
  'week-left': 'Неделя слева',
  'week-right': 'Неделя справа',
  day: 'День',
  notes: 'Заметки',
  checklist: 'Чек-лист',
  sticker: 'Стикеры',
};

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

function getBlockTypeLabel(type: LayoutBlock['type']) {
  return BLOCK_TYPE_LABELS[type] ?? type;
}

function toColorInputValue(value: string | undefined, fallback: string) {
  return typeof value === 'string' && value.startsWith('#') ? value : fallback;
}

function parseModuleOptions(config: PlannerModulePanelProps['config']) {
  const raw = config.modules['layout-editor'].options ?? {};

  return {
    selectedLayout: (raw.selectedLayout as LayoutPageTarget | undefined) ?? 'month',
    selectedBlockId: typeof raw.selectedBlockId === 'string' ? raw.selectedBlockId : '',
  };
}

function updateModules(config: PlannerModulePanelProps['config'], patch: Record<string, unknown>) {
  return {
    ...config.modules,
    'layout-editor': {
      ...config.modules['layout-editor'],
      options: {
        ...config.modules['layout-editor'].options,
        ...patch,
      },
    },
  };
}

function formatNumericDraft(value: number) {
  return Number.isFinite(value) ? String(value) : '';
}

function parseNumericDraft(value: string) {
  const normalized = value.trim().replace(',', '.');

  if (normalized === '' || normalized === '-' || normalized === '.' || normalized === '-.') {
    return undefined;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function clampDraftValue(value: number, min?: number, max?: number) {
  if (typeof min === 'number') {
    value = Math.max(min, value);
  }

  if (typeof max === 'number') {
    value = Math.min(max, value);
  }

  return value;
}

function isNumericDraft(value: string) {
  return /^-?\d*(?:[.,]\d*)?$/.test(value);
}

function LayoutNumberField({
  label,
  value,
  onCommit,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onCommit: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const [draft, setDraft] = useState(() => formatNumericDraft(value));

  useEffect(() => {
    setDraft(formatNumericDraft(value));
  }, [value]);

  function commitDraft() {
    const parsed = parseNumericDraft(draft);

    if (parsed === undefined) {
      setDraft(formatNumericDraft(value));
      return;
    }

    onCommit(clampDraftValue(parsed, min, max));
  }

  function handleChange(nextValue: string) {
    if (!isNumericDraft(nextValue)) {
      return;
    }

    setDraft(nextValue);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.currentTarget.blur();
      return;
    }

    if (event.key === 'Escape') {
      setDraft(formatNumericDraft(value));
      event.currentTarget.blur();
    }
  }

  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <input
        type="text"
        inputMode={step && step < 1 ? 'decimal' : 'numeric'}
        value={draft}
        onChange={(event) => handleChange(event.target.value)}
        onBlur={commitDraft}
        onKeyDown={handleKeyDown}
        className="input"
      />
    </label>
  );
}

function LayoutCanvas({
  layoutTarget,
  selectedBlockId,
  onSelectBlock,
  config,
}: {
  layoutTarget: LayoutPageTarget;
  selectedBlockId: string;
  onSelectBlock: (blockId: string) => void;
  config: PlannerModulePanelProps['config'];
}) {
  const layouts = normalizePlannerLayouts(config.layouts);
  const layout = layouts[layoutTarget];

  if (!layout) {
    return null;
  }

  const gridOpacity = layout.grid?.visible ? 1 : 0;
  const gridSize = layout.grid?.size ?? 16;

  return (
    <div className="layout-editor__canvas">
      <div
        className="layout-editor__surface"
        style={{
          '--layout-grid-size': `${(gridSize / layout.width) * 100}%`,
          '--layout-grid-opacity': `${gridOpacity}`,
        } as CSSProperties}
      >
        {layout.blocks.map((block) => (
          <button
            key={block.id}
            type="button"
            onClick={() => onSelectBlock(block.id)}
            className={clsx('layout-editor__block', block.id === selectedBlockId && 'layout-editor__block--active')}
            style={{
              left: `${(block.x / layout.width) * 100}%`,
              top: `${(block.y / layout.height) * 100}%`,
              width: `${(block.width / layout.width) * 100}%`,
              height: `${(block.height / layout.height) * 100}%`,
              borderRadius: `${Math.max(4, block.radius.topLeft * 0.18)}px ${Math.max(4, block.radius.topRight * 0.18)}px ${Math.max(4, block.radius.bottomRight * 0.18)}px ${Math.max(4, block.radius.bottomLeft * 0.18)}px`,
              borderWidth: `${Math.max(1, block.border.width)}px`,
              borderColor: block.border.color,
              borderStyle: block.border.style,
              background: block.backgroundColor,
              opacity: block.opacity ?? 1,
            }}
          >
            <strong>{block.name ?? block.type}</strong>
            <span>{getBlockTypeLabel(block.type)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function LayoutInspector({
  block,
  layoutTarget,
  config,
  onConfigChange,
}: {
  block?: LayoutBlock;
  layoutTarget: LayoutPageTarget;
  config: PlannerModulePanelProps['config'];
  onConfigChange: PlannerModulePanelProps['onConfigChange'];
}) {
  const layouts = normalizePlannerLayouts(config.layouts);
  const layout = layouts[layoutTarget];

  if (!layout || !block) {
    return (
      <div className="layout-editor__empty">
        <strong>Выберите блок</strong>
        <p>Кликните по блоку на холсте, чтобы отредактировать его координаты, размеры и стили.</p>
      </div>
    );
  }

  function commit(nextLayout: typeof layout) {
    onConfigChange({
      layouts: {
        ...config.layouts,
        [layoutTarget]: nextLayout,
      },
    });
  }

  return (
    <div className="layout-editor__inspector">
      <div className="layout-editor__inspector-head">
        <strong>{block.name ?? block.type}</strong>
        <span>{getBlockTypeLabel(block.type)}</span>
      </div>

      <div className="form-grid">
        <LayoutNumberField
          label="X"
          value={block.x}
          onCommit={(value) => commit(updateBlockPosition(layout, block.id, { x: value, y: block.y }, { snapToGrid: false }))}
        />

        <LayoutNumberField
          label="Y"
          value={block.y}
          onCommit={(value) => commit(updateBlockPosition(layout, block.id, { x: block.x, y: value }, { snapToGrid: false }))}
        />

        <LayoutNumberField
          label="Ширина"
          value={block.width}
          onCommit={(value) => commit(updateBlockSize(layout, block.id, { width: value, height: block.height }, { snapToGrid: false }))}
        />

        <LayoutNumberField
          label="Высота"
          value={block.height}
          onCommit={(value) => commit(updateBlockSize(layout, block.id, { width: block.width, height: value }, { snapToGrid: false }))}
        />

        <LayoutNumberField
          label="Радиус TL"
          value={block.radius.topLeft}
          onCommit={(value) => commit(updateBlockStyle(layout, block.id, { radius: { topLeft: value } }))}
        />

        <LayoutNumberField
          label="Радиус TR"
          value={block.radius.topRight}
          onCommit={(value) => commit(updateBlockStyle(layout, block.id, { radius: { topRight: value } }))}
        />

        <LayoutNumberField
          label="Радиус BL"
          value={block.radius.bottomLeft}
          onCommit={(value) => commit(updateBlockStyle(layout, block.id, { radius: { bottomLeft: value } }))}
        />

        <LayoutNumberField
          label="Радиус BR"
          value={block.radius.bottomRight}
          onCommit={(value) => commit(updateBlockStyle(layout, block.id, { radius: { bottomRight: value } }))}
        />

        <LayoutNumberField
          label="Толщина рамки"
          value={block.border.width}
          onCommit={(value) => commit(updateBlockStyle(layout, block.id, { border: { width: value } }))}
        />

        <label className="field">
          <span className="field__label">Стиль рамки</span>
          <select
            value={block.border.style}
            onChange={(event) => commit(updateBlockStyle(layout, block.id, { border: { style: event.target.value as 'solid' | 'dashed' } }))}
            className="select"
          >
            <option value="solid">solid</option>
            <option value="dashed">dashed</option>
          </select>
        </label>

        <LayoutNumberField
          label="Padding top"
          value={block.padding.top}
          onCommit={(value) => commit(updateBlockStyle(layout, block.id, { padding: { top: value } }))}
        />

        <LayoutNumberField
          label="Padding right"
          value={block.padding.right}
          onCommit={(value) => commit(updateBlockStyle(layout, block.id, { padding: { right: value } }))}
        />

        <LayoutNumberField
          label="Padding bottom"
          value={block.padding.bottom}
          onCommit={(value) => commit(updateBlockStyle(layout, block.id, { padding: { bottom: value } }))}
        />

        <LayoutNumberField
          label="Padding left"
          value={block.padding.left}
          onCommit={(value) => commit(updateBlockStyle(layout, block.id, { padding: { left: value } }))}
        />

        <LayoutNumberField
          label="Прозрачность"
          value={block.opacity ?? 1}
          min={0}
          max={1}
          step={0.05}
          onCommit={(value) => commit(updateBlockStyle(layout, block.id, { opacity: value }))}
        />

        <label className="field">
          <span className="field__label">Цвет рамки</span>
          <input
            type="color"
            value={toColorInputValue(block.border.color, '#1A2333')}
            onChange={(event) => commit(updateBlockStyle(layout, block.id, { border: { color: event.target.value } }))}
            className="layout-editor__color-input"
          />
        </label>

        <label className="field">
          <span className="field__label">Фон</span>
          <input
            type="color"
            value={toColorInputValue(block.backgroundColor, '#FFFFFF')}
            onChange={(event) => commit(updateBlockStyle(layout, block.id, { backgroundColor: event.target.value }))}
            className="layout-editor__color-input"
          />
        </label>
      </div>
    </div>
  );
}

export function LayoutEditorPanel({ config, onConfigChange }: PlannerModulePanelProps) {
  const layouts = normalizePlannerLayouts(config.layouts);
  const moduleState = config.modules['layout-editor'];
  const editorState = parseModuleOptions(config);
  const selectedLayout = editorState.selectedLayout;
  const activeLayout = layouts[selectedLayout];
  const selectedBlock = activeLayout?.blocks.find((block) => block.id === editorState.selectedBlockId) ?? activeLayout?.blocks[0];

  const canvasMeta = useMemo(() => ({
    blockCount: activeLayout?.blocks.length ?? 0,
    grid: activeLayout?.grid?.size ?? 16,
  }), [activeLayout]);

  function updateEditorState(patch: Partial<ReturnType<typeof parseModuleOptions>>) {
    onConfigChange({
      modules: updateModules(config, patch),
    });
  }

  function updateLayoutTarget(target: LayoutPageTarget) {
    const nextLayout = layouts[target];
    updateEditorState({
      selectedLayout: target,
      selectedBlockId: nextLayout?.blocks[0]?.id ?? '',
    });
  }

  function updateGrid(patch: Partial<GridSettings>) {
    if (!activeLayout) {
      return;
    }

    onConfigChange({
      layouts: {
        ...config.layouts,
        [selectedLayout]: {
          ...activeLayout,
          updatedAt: new Date().toISOString(),
          grid: {
            ...activeLayout.grid,
            ...patch,
          },
        },
      },
    });
  }

  function resetCurrentLayout() {
    const defaults = normalizePlannerLayouts();
    onConfigChange({
      layouts: {
        ...config.layouts,
        [selectedLayout]: defaults[selectedLayout],
      },
    });
  }

  return (
    <>
      <Panel title="Редактор макета" eyebrow="Шаг 5">
        <p className="muted-copy">
          Этот модуль редактирует геометрию страницы как набор блоков: позицию, размеры, скругления, рамки,
          внутренние отступы и сетку. Ядро получает готовый `PageLayout`, а не логику интерфейса редактора.
        </p>

        <div className="workflow-panel__space layout-editor__toolbar">
          <div className="field">
            <span className="field__label">Состояние модуля</span>
            <div className="workflow-mode-toggle">
              <button
                type="button"
                onClick={() => onConfigChange({ modules: { ...config.modules, 'layout-editor': { ...moduleState, enabled: true } } })}
                className={clsx('workflow-mode-toggle__button', moduleState.enabled && 'workflow-mode-toggle__button--active')}
              >
                Включен
              </button>
              <button
                type="button"
                onClick={() => onConfigChange({ modules: { ...config.modules, 'layout-editor': { ...moduleState, enabled: false } } })}
                className={clsx('workflow-mode-toggle__button', !moduleState.enabled && 'workflow-mode-toggle__button--active')}
              >
                Выключен
              </button>
            </div>
          </div>

          <label className="field">
            <span className="field__label">Страница</span>
            <select
              value={selectedLayout}
              onChange={(event) => updateLayoutTarget(event.target.value as LayoutPageTarget)}
              className="select"
            >
              {Object.entries(TARGET_LABELS).map(([target, label]) => (
                <option key={target} value={target}>{label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="summary-grid layout-editor__summary">
          <div className="field-meta">
            <p className="field-meta__label">Холст</p>
            <p className="field-meta__value">{activeLayout?.width ?? LAYOUT_CANVAS_WIDTH} × {activeLayout?.height ?? LAYOUT_CANVAS_HEIGHT}</p>
          </div>
          <div className="field-meta">
            <p className="field-meta__label">Блоки</p>
            <p className="field-meta__value">{canvasMeta.blockCount}</p>
          </div>
          <div className="field-meta">
            <p className="field-meta__label">Сетка</p>
            <p className="field-meta__value">{canvasMeta.grid}px</p>
          </div>
        </div>
      </Panel>

      <Panel title={activeLayout?.title ?? 'Макет страницы'} eyebrow="Холст">
        <div className="layout-editor">
          <div className="layout-editor__left">
            <div className="layout-editor__grid-controls">
              <label className="field-chip">
                <span>Показывать сетку</span>
                <input
                  type="checkbox"
                  checked={activeLayout?.grid?.visible ?? true}
                  onChange={(event) => updateGrid({ visible: event.target.checked })}
                />
              </label>

              <label className="field-chip">
                <span>Привязка</span>
                <input
                  type="checkbox"
                  checked={activeLayout?.grid?.snap ?? true}
                  onChange={(event) => updateGrid({ snap: event.target.checked })}
                />
              </label>

              <label className="field-chip">
                <span>Размер сетки</span>
                <select
                  value={activeLayout?.grid?.size ?? 16}
                  onChange={(event) => updateGrid({ size: Number(event.target.value) })}
                  className="select"
                >
                  {GRID_OPTIONS.map((size) => (
                    <option key={size} value={size}>{size}px</option>
                  ))}
                </select>
              </label>

              <button type="button" onClick={resetCurrentLayout} className="button button--ghost">
                Сбросить макет
              </button>
            </div>

            <LayoutCanvas
              layoutTarget={selectedLayout}
              selectedBlockId={selectedBlock?.id ?? ''}
              onSelectBlock={(blockId) => updateEditorState({ selectedBlockId: blockId })}
              config={config}
            />
          </div>

          <div className="layout-editor__right">
            <LayoutInspector
              block={selectedBlock}
              layoutTarget={selectedLayout}
              config={config}
              onConfigChange={onConfigChange}
            />
          </div>
        </div>
      </Panel>
    </>
  );
}
