import clsx from 'clsx';
import type { PlannerSectionConfig } from '../types/planner';

interface SectionCardProps {
  section: PlannerSectionConfig;
  label: string;
  description: string;
  locked?: boolean;
  onToggle: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onCountChange?: (value: number) => void;
}

const VARIANT_LABELS: Record<string, string> = {
  'mvp-index': 'Базовый индекс',
  'year-overview': 'Обзор года',
  'monthly-standard': 'Стандартный месяц',
  'weekly-template-1': 'Недельный разворот 1',
  'daily-template-1': 'Дневная страница 1',
  'notes-template': 'Страница заметок',
  'checklist-mixed': 'Смешанные чек-листы',
  'sticker-sheet-template': 'Автоматическая раскладка',
  'ready-sheet-template': 'Готовые листы',
};

function formatVariantLabel(variant?: string) {
  if (!variant) {
    return 'Не задан';
  }

  return VARIANT_LABELS[variant] ?? variant;
}

export function SectionCard({
  section,
  label,
  description,
  locked = false,
  onToggle,
  onMoveUp,
  onMoveDown,
  onCountChange,
}: SectionCardProps) {
  return (
    <article className="section-card">
      <div className="section-card__header">
        <div>
          <div className="section-card__title-row">
            <h3 className="section-card__title">{label}</h3>
            {locked ? (
              <span className="section-card__badge">Зафиксировано</span>
            ) : null}
          </div>
          <p className="section-card__description">{description}</p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          disabled={locked}
          className={clsx(
            'section-card__toggle',
            section.enabled && 'section-card__toggle--active',
            locked && 'section-card__toggle--locked',
          )}
        >
          {section.enabled ? 'Включено' : 'Выключено'}
        </button>
      </div>

      <div className="section-card__controls">
        {typeof section.count === 'number' ? (
          <label className="field-chip">
            <span>Страниц</span>
            <input
              type="number"
              min={1}
              value={section.count}
              onChange={(event) => onCountChange?.(Number(event.target.value))}
              className="count-input"
            />
          </label>
        ) : null}

        <span className="field-chip">Шаблон: {formatVariantLabel(section.variant)}</span>

        <div className="inline-actions">
          <button
            type="button"
            onClick={onMoveUp}
            className="action-button"
          >
            Выше
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            className="action-button"
          >
            Ниже
          </button>
        </div>
      </div>
    </article>
  );
}
