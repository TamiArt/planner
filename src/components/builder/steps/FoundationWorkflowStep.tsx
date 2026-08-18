import { Panel } from '../../Panel';
import { plannerPresets, type PlannerPresetId } from '../../../lib/config/plannerPresets';
import type { PlannerConfig } from '../../../types/planner';

interface FoundationWorkflowStepProps {
  config: PlannerConfig;
  onPresetApply: (presetId: PlannerPresetId) => void;
  onTitleChange: (value: string) => void;
  onModeChange: (mode: PlannerConfig['mode']) => void;
  onYearChange: (value: string) => void;
}

export function FoundationWorkflowStep({
  config,
  onPresetApply,
  onTitleChange,
  onModeChange,
  onYearChange,
}: FoundationWorkflowStepProps) {
  return (
    <Panel title="Основа планера" eyebrow="Шаг 1">
      <p className="muted-copy">
        Начните с базового сценария продукта: режим, год, название и стартовый пресет. Это задает основу
        для всех следующих шагов.
      </p>

      <div className="preset-grid workflow-panel__space">
        {plannerPresets.map((preset) => (
          <button key={preset.id} type="button" onClick={() => onPresetApply(preset.id)} className="preset-card">
            <p className="preset-card__title">{preset.name}</p>
            <p className="preset-card__copy">{preset.description}</p>
          </button>
        ))}
      </div>

      <div className="form-grid workflow-panel__space">
        <label className="field">
          <span className="field__label">Название продукта</span>
          <input value={config.title} onChange={(event) => onTitleChange(event.target.value)} className="input" />
        </label>

        <label className="field">
          <span className="field__label">Режим</span>
          <select value={config.mode} onChange={(event) => onModeChange(event.target.value as PlannerConfig['mode'])} className="select">
            <option value="dated">датированный</option>
            <option value="undated">недатированный</option>
          </select>
        </label>

        <label className="field">
          <span className="field__label">Год</span>
          <input
            type="number"
            min={2020}
            max={2100}
            value={config.year ?? ''}
            onChange={(event) => onYearChange(event.target.value)}
            disabled={config.mode === 'undated'}
            className="input"
          />
        </label>

        <label className="field">
          <span className="field__label">Язык</span>
          <input value="ru" disabled className="input" />
        </label>
      </div>

      <div className="meta-grid">
        <div className="field-meta"><p className="field-meta__label">Размер страницы</p><p className="field-meta__value">iPad landscape</p></div>
        <div className="field-meta"><p className="field-meta__label">Ориентация</p><p className="field-meta__value">альбомная</p></div>
        <div className="field-meta"><p className="field-meta__label">Начало недели</p><p className="field-meta__value">понедельник</p></div>
      </div>
    </Panel>
  );
}
