import { InfoCard } from '../InfoCard';
import { Panel } from '../Panel';
import {
  ASTROLOGY_CALCULATION_TIME_LABEL,
  ASTROLOGY_ICON_STYLE_LABEL,
  ASTROLOGY_LINE_DENSITY_LABELS,
  ASTROLOGY_LINE_PRESET_LABELS,
} from '../../lib/astrology/astrologyConfig';
import { ASTROLOGY_LAYER_LABELS } from '../../lib/astrology/jyotishDaily';
import type {
  AstrologyLineDensity,
  AstrologyLinePresetId,
  PlannerAstrologyConfig,
  PlannerAstrologyLayers,
} from '../../types/planner';

interface AstrologyOverlaySettingsPanelProps {
  astrology: PlannerAstrologyConfig;
  stickerPageCount: number;
  onWeekPresetChange: (preset: AstrologyLinePresetId) => void;
  onDayPresetChange: (preset: AstrologyLinePresetId) => void;
  onLineDensityChange: (density: AstrologyLineDensity) => void;
  onLayerToggle: (layer: keyof PlannerAstrologyLayers) => void;
  onIncludeLegendChange: (enabled: boolean) => void;
}

export function AstrologyOverlaySettingsPanel({
  astrology,
  stickerPageCount,
  onWeekPresetChange,
  onDayPresetChange,
  onLineDensityChange,
  onLayerToggle,
  onIncludeLegendChange,
}: AstrologyOverlaySettingsPanelProps) {
  return (
    <Panel title="Слои наложения" eyebrow="Состав">
      <p className="muted-copy">
        Эти же слои используются в обычном PDF-экспорте: month остаётся компактным, а для week/day можно
        отдельно выбрать full preset, compact preset или текстовый режим с короткими подписями.
      </p>

      <div className="form-grid workflow-panel__space">
        <label className="field">
          <span className="field__label">Weekly preset</span>
          <select
            value={astrology.display.weekPreset}
            onChange={(event) => onWeekPresetChange(event.target.value as AstrologyLinePresetId)}
            className="select"
          >
            {(Object.entries(ASTROLOGY_LINE_PRESET_LABELS) as Array<[AstrologyLinePresetId, string]>).map(([preset, label]) => (
              <option key={preset} value={preset}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">Daily preset</span>
          <select
            value={astrology.display.dayPreset}
            onChange={(event) => onDayPresetChange(event.target.value as AstrologyLinePresetId)}
            className="select"
          >
            {(Object.entries(ASTROLOGY_LINE_PRESET_LABELS) as Array<[AstrologyLinePresetId, string]>).map(([preset, label]) => (
              <option key={preset} value={preset}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">Плотность строки</span>
          <select
            value={astrology.display.lineDensity}
            onChange={(event) => onLineDensityChange(event.target.value as AstrologyLineDensity)}
            className="select"
          >
            {(Object.entries(ASTROLOGY_LINE_DENSITY_LABELS) as Array<[AstrologyLineDensity, string]>).map(([density, label]) => (
              <option key={density} value={density}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="workflow-panel__space">
        <p className="small-label">Что показывать в астростроке</p>
        <p className="muted-copy">
          Эти кнопки включают и выключают элементы, которые попадут в weekly и daily астрологическую строку.
        </p>
      </div>

      <div className="pill-list workflow-panel__space astro-layer-pills">
        {(Object.entries(ASTROLOGY_LAYER_LABELS) as Array<[keyof PlannerAstrologyLayers, string]>).map(([layer, label]) => (
          <button
            key={layer}
            type="button"
            onClick={() => onLayerToggle(layer)}
            className={`pill ${astrology.layers[layer] ? 'pill--active' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="summary-grid workflow-panel__space">
        <InfoCard label="Расчёт" value={ASTROLOGY_CALCULATION_TIME_LABEL} />
        <InfoCard label="Иконки" value={ASTROLOGY_ICON_STYLE_LABEL} />
        <InfoCard label="Weekly строка" value={ASTROLOGY_LINE_PRESET_LABELS[astrology.display.weekPreset]} />
        <InfoCard label="Daily строка" value={ASTROLOGY_LINE_PRESET_LABELS[astrology.display.dayPreset]} />
        <InfoCard label="Плотность" value={ASTROLOGY_LINE_DENSITY_LABELS[astrology.display.lineDensity]} />
        <InfoCard label="Легенда" value={astrology.includeLegend ? 'включена' : 'выключена'} />
        <InfoCard label="Записей" value={`${astrology.data?.entries.length ?? 0}`} />
        <InfoCard label="Sticker pages" value={stickerPageCount > 0 ? `${stickerPageCount}` : 'нет'} />
      </div>

      <div className="workflow-mode-toggle workflow-panel__space">
        <button
          type="button"
          onClick={() => onIncludeLegendChange(true)}
          className={`workflow-mode-toggle__button ${astrology.includeLegend ? 'workflow-mode-toggle__button--active' : ''}`}
        >
          легенда в PDF
        </button>
        <button
          type="button"
          onClick={() => onIncludeLegendChange(false)}
          className={`workflow-mode-toggle__button ${!astrology.includeLegend ? 'workflow-mode-toggle__button--active' : ''}`}
        >
          без легенды
        </button>
      </div>
    </Panel>
  );
}
