import { InfoCard } from '../InfoCard';
import { Panel } from '../Panel';
import {
  ASTROLOGY_CALCULATION_TIME_LABEL,
  ASTROLOGY_ICON_STYLE_LABEL,
  ASTROLOGY_LINE_DENSITY_LABELS,
  ASTROLOGY_LINE_PRESET_LABELS,
  ASTROLOGY_REFERENCE_LABEL,
  ASTROLOGY_SOURCE_LABEL,
  JYOTISH_AYANAMSA_LABEL,
  getAstrologyCity,
} from '../../lib/astrology/astrologyConfig';
import { CAPITAL_CITY_OPTIONS } from '../../lib/astrology/capitalCities';
import { ASTROLOGY_LAYER_LABELS } from '../../lib/astrology/jyotishDaily';
import type {
  AstrologyLineDensity,
  AstrologyLinePresetId,
  PlannerAstrologyConfig,
  PlannerAstrologyCustomCity,
  PlannerAstrologyLayers,
} from '../../types/planner';

interface AstrologyEditorSettingsProps {
  astrology: PlannerAstrologyConfig;
  selectedYear: number;
  selectedAstrologyCity: ReturnType<typeof getAstrologyCity>;
  dataReady: boolean;
  astrologyCalculatedAtLabel: string;
  isCalculatingAstrology: boolean;
  stickerPageCount: number;
  onCityModeChange: (mode: PlannerAstrologyConfig['cityMode']) => void;
  onYearChange: (value: string) => void;
  onCityIdChange: (cityId: string) => void;
  onCustomCityChange: (field: keyof PlannerAstrologyCustomCity, value: string) => void;
  onCalculate: () => void;
  onWeekPresetChange: (preset: AstrologyLinePresetId) => void;
  onDayPresetChange: (preset: AstrologyLinePresetId) => void;
  onLineDensityChange: (density: AstrologyLineDensity) => void;
  onLayerToggle: (layer: keyof PlannerAstrologyLayers) => void;
  onIncludeLegendChange: (enabled: boolean) => void;
}

export function AstrologyEditorSettings({
  astrology,
  selectedYear,
  selectedAstrologyCity,
  dataReady,
  astrologyCalculatedAtLabel,
  isCalculatingAstrology,
  stickerPageCount,
  onCityModeChange,
  onYearChange,
  onCityIdChange,
  onCustomCityChange,
  onCalculate,
  onWeekPresetChange,
  onDayPresetChange,
  onLineDensityChange,
  onLayerToggle,
  onIncludeLegendChange,
}: AstrologyEditorSettingsProps) {
  return (
    <>
      <Panel title="Расчёт астрологии" eyebrow="Шаг 2">
        <p className="muted-copy">
          Титхи, накшатра, планета дня, энергия и фокус считаются локально через Astronomy Engine.
          Swiss Ephemeris не встраивается в проект и остается только внешним ориентиром для сверки методики.
        </p>

        <div className="workflow-mode-toggle workflow-panel__space">
          <button
            type="button"
            onClick={() => onCityModeChange('preset')}
            className={astrology.cityMode === 'preset' ? 'workflow-mode-toggle__button workflow-mode-toggle__button--active' : 'workflow-mode-toggle__button'}
          >
            Из списка
          </button>
          <button
            type="button"
            onClick={() => onCityModeChange('custom')}
            className={astrology.cityMode === 'custom' ? 'workflow-mode-toggle__button workflow-mode-toggle__button--active' : 'workflow-mode-toggle__button'}
          >
            Свой город
          </button>
        </div>

        <div className="form-grid workflow-panel__space">
          <label className="field">
            <span className="field__label">Год планера</span>
            <input
              type="number"
              min={2020}
              max={2100}
              value={selectedYear}
              onChange={(event) => onYearChange(event.target.value)}
              className="input"
            />
          </label>

          {astrology.cityMode === 'preset' ? (
            <label className="field">
              <span className="field__label">Город пользователя</span>
              <select
                value={astrology.cityId}
                onChange={(event) => onCityIdChange(event.target.value)}
                className="select"
              >
                {CAPITAL_CITY_OPTIONS.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name} · {city.country}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <>
              <label className="field">
                <span className="field__label">Название города</span>
                <input
                  value={astrology.customCity?.name ?? ''}
                  onChange={(event) => onCustomCityChange('name', event.target.value)}
                  className="input"
                  placeholder="Например, Казань"
                />
              </label>

              <label className="field">
                <span className="field__label">Страна или регион</span>
                <input
                  value={astrology.customCity?.country ?? ''}
                  onChange={(event) => onCustomCityChange('country', event.target.value)}
                  className="input"
                  placeholder="Россия"
                />
              </label>

              <label className="field">
                <span className="field__label">Часовой пояс</span>
                <input
                  value={astrology.customCity?.timezone ?? ''}
                  onChange={(event) => onCustomCityChange('timezone', event.target.value)}
                  className="input"
                  placeholder="Europe/Moscow"
                />
              </label>

              <label className="field">
                <span className="field__label">Широта</span>
                <input
                  value={astrology.customCity?.latitude ?? ''}
                  onChange={(event) => onCustomCityChange('latitude', event.target.value)}
                  className="input"
                  placeholder="55.7558"
                />
              </label>

              <label className="field">
                <span className="field__label">Долгота</span>
                <input
                  value={astrology.customCity?.longitude ?? ''}
                  onChange={(event) => onCustomCityChange('longitude', event.target.value)}
                  className="input"
                  placeholder="37.6173"
                />
              </label>
            </>
          )}
        </div>

        <div className="summary-grid">
          <InfoCard label="Статус" value={dataReady ? 'готово' : 'нужен расчёт'} />
          <InfoCard label="Режим города" value={astrology.cityMode === 'custom' ? 'свой город' : 'из списка'} />
          <InfoCard label="Город" value={`${selectedAstrologyCity.name} · ${selectedAstrologyCity.country}`} />
          <InfoCard label="Часовой пояс" value={selectedAstrologyCity.timezone} />
          <InfoCard label="Координаты" value={`${selectedAstrologyCity.latitudeText}, ${selectedAstrologyCity.longitudeText}`} />
          <InfoCard label="Аянамша" value={JYOTISH_AYANAMSA_LABEL} />
          <InfoCard label="Рассчитано" value={astrologyCalculatedAtLabel} />
          <InfoCard label="Источник" value={ASTROLOGY_SOURCE_LABEL} />
          <InfoCard label="Сверка" value={ASTROLOGY_REFERENCE_LABEL} />
        </div>

        <div className="background-tools workflow-panel__space">
          <button
            type="button"
            onClick={onCalculate}
            disabled={isCalculatingAstrology}
            className="button button--secondary"
          >
            {isCalculatingAstrology ? 'Считаем...' : dataReady ? 'Пересчитать астрологию' : 'Рассчитать астрологию'}
          </button>
        </div>
      </Panel>

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
    </>
  );
}
