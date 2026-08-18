import clsx from 'clsx';
import { InfoCard } from '../../InfoCard';
import { Panel } from '../../Panel';
import { getAstroIconDataUri } from '../../../lib/astrology/astroIcons';
import {
  ASTROLOGY_CALCULATION_TIME_LABEL,
  ASTROLOGY_ICON_STYLE_LABEL,
  ASTROLOGY_LINE_DENSITY_LABELS,
  ASTROLOGY_LINE_PRESET_LABELS,
  ASTROLOGY_REFERENCE_LABEL,
  ASTROLOGY_SOURCE_LABEL,
  JYOTISH_AYANAMSA_LABEL,
} from '../../../lib/astrology/astrologyConfig';
import { CAPITAL_CITY_OPTIONS } from '../../../lib/astrology/capitalCities';
import {
  ASTROLOGY_LAYER_LABELS,
  ENERGY_META,
  FOCUS_META,
  NAKSHATRA_TYPE_META,
  PLANET_DAY_META,
  TITHI_TYPE_META,
} from '../../../lib/astrology/jyotishDaily';
import { MOON_PHASE_SOURCE_DOCS_URL } from '../../../lib/moon/moonPhases';
import type {
  AstrologyLineDensity,
  AstrologyLinePresetId,
  PlannerAstrologyConfig,
  PlannerAstrologyCustomCity,
  PlannerAstrologyLayers,
  PlannerConfig,
} from '../../../types/planner';

interface AstrologyCitySummary {
  name: string;
  country: string;
  timezone: string;
  latitudeText: string;
  longitudeText: string;
}

interface AstrologyWorkflowStepProps {
  config: PlannerConfig;
  selectedAstrologyCity: AstrologyCitySummary;
  astrologyDataReady: boolean;
  astrologyCalculatedAtLabel: string;
  astrologyStatus: 'idle' | 'loading' | 'success' | 'error';
  astrologyMessage: string | null;
  moonPhaseStatus: 'idle' | 'loading' | 'success' | 'error';
  moonPhaseMessage: string | null;
  moonPhaseDataReady: boolean;
  moonPhaseYearsLabel: string;
  moonPhaseFetchedAtLabel: string;
  onCityModeChange: (mode: PlannerAstrologyConfig['cityMode']) => void;
  onCityChange: (cityId: string) => void;
  onCustomCityChange: <K extends keyof PlannerAstrologyCustomCity>(field: K, value: PlannerAstrologyCustomCity[K]) => void;
  onDisplayChange: <K extends keyof PlannerAstrologyConfig['display']>(field: K, value: PlannerAstrologyConfig['display'][K]) => void;
  onLayerToggle: (layer: keyof PlannerAstrologyLayers) => void;
  onAstrologyConfigChange: (patch: Partial<PlannerAstrologyConfig>) => void;
  onRefreshAstrology: () => void;
  onMoonPhaseToggle: (enabled: boolean) => void;
  onRefreshMoonPhases: () => void;
}

function AstroIconPreview({ icon, label }: { icon: string; label: string }) {
  const src = getAstroIconDataUri(icon);

  return src ? <img src={src} alt={label} className="astro-icon-preview" /> : <span className="astro-icon-preview">{label}</span>;
}

export function AstrologyWorkflowStep({
  config,
  selectedAstrologyCity,
  astrologyDataReady,
  astrologyCalculatedAtLabel,
  astrologyStatus,
  astrologyMessage,
  moonPhaseStatus,
  moonPhaseMessage,
  moonPhaseDataReady,
  moonPhaseYearsLabel,
  moonPhaseFetchedAtLabel,
  onCityModeChange: handleAstrologyCityModeChange,
  onCityChange: handleAstrologyCityChange,
  onCustomCityChange: handleAstrologyCustomCityChange,
  onDisplayChange: updateAstrologyDisplay,
  onLayerToggle: handleAstrologyLayerToggle,
  onAstrologyConfigChange: updateAstrologyConfig,
  onRefreshAstrology: refreshAstrologyData,
  onMoonPhaseToggle: handleMoonPhaseToggle,
  onRefreshMoonPhases: refreshMoonPhaseData,
}: AstrologyWorkflowStepProps) {
  return (
    <>
      <Panel title="Астрология" eyebrow="Шаг 2">
        <p className="muted-copy">
          Уточните город пользователя для будущих расчетов Джйотиш. Можно выбрать готовый город из списка или ввести
          свой вручную вместе с часовым поясом и координатами.
        </p>

        <div className="workflow-mode-toggle workflow-panel__space">
          <button
            type="button"
            onClick={() => handleAstrologyCityModeChange('preset')}
            className={clsx('workflow-mode-toggle__button', config.astrology.cityMode === 'preset' && 'workflow-mode-toggle__button--active')}
          >
            Из списка
          </button>
          <button
            type="button"
            onClick={() => handleAstrologyCityModeChange('custom')}
            className={clsx('workflow-mode-toggle__button', config.astrology.cityMode === 'custom' && 'workflow-mode-toggle__button--active')}
          >
            Свой город
          </button>
        </div>

        {config.astrology.cityMode === 'preset' ? (
          <div className="form-grid workflow-panel__space">
            <label className="field">
              <span className="field__label">Город пользователя</span>
              <select
                value={config.astrology.cityId}
                onChange={(event) => handleAstrologyCityChange(event.target.value)}
                className="select"
              >
                {CAPITAL_CITY_OPTIONS.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name} · {city.country}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="field__label">Аянамша</span>
              <input value={JYOTISH_AYANAMSA_LABEL} disabled className="input" />
            </label>
          </div>
        ) : (
          <div className="form-grid workflow-panel__space">
            <label className="field">
              <span className="field__label">Название города</span>
              <input
                value={config.astrology.customCity?.name ?? ''}
                onChange={(event) => handleAstrologyCustomCityChange('name', event.target.value)}
                className="input"
                placeholder="Например, Казань"
              />
            </label>

            <label className="field">
              <span className="field__label">Страна или регион</span>
              <input
                value={config.astrology.customCity?.country ?? ''}
                onChange={(event) => handleAstrologyCustomCityChange('country', event.target.value)}
                className="input"
                placeholder="Россия"
              />
            </label>

            <label className="field">
              <span className="field__label">Часовой пояс</span>
              <input
                value={config.astrology.customCity?.timezone ?? ''}
                onChange={(event) => handleAstrologyCustomCityChange('timezone', event.target.value)}
                className="input"
                placeholder="Europe/Moscow"
              />
            </label>

            <label className="field">
              <span className="field__label">Широта</span>
              <input
                value={config.astrology.customCity?.latitude ?? ''}
                onChange={(event) => handleAstrologyCustomCityChange('latitude', event.target.value)}
                className="input"
                placeholder="55.7558"
              />
            </label>

            <label className="field">
              <span className="field__label">Долгота</span>
              <input
                value={config.astrology.customCity?.longitude ?? ''}
                onChange={(event) => handleAstrologyCustomCityChange('longitude', event.target.value)}
                className="input"
                placeholder="37.6173"
              />
            </label>

            <label className="field">
              <span className="field__label">Аянамша</span>
              <input value={JYOTISH_AYANAMSA_LABEL} disabled className="input" />
            </label>
          </div>
        )}

        <div className="summary-grid workflow-panel__space">
          <InfoCard label="Режим города" value={config.astrology.cityMode === 'custom' ? 'свой город' : 'из списка'} />
          <InfoCard label="Город" value={`${selectedAstrologyCity.name} · ${selectedAstrologyCity.country}`} />
          <InfoCard label="Часовой пояс" value={selectedAstrologyCity.timezone} />
          <InfoCard label="Координаты" value={`${selectedAstrologyCity.latitudeText}, ${selectedAstrologyCity.longitudeText}`} />
          <InfoCard label="Аянамша" value={JYOTISH_AYANAMSA_LABEL} />
          <InfoCard label="Расчёт" value={ASTROLOGY_CALCULATION_TIME_LABEL} />
          <InfoCard label="Иконки" value={ASTROLOGY_ICON_STYLE_LABEL} />
        </div>
      </Panel>

      <Panel title="Астро-день" eyebrow="Расчёт">
        <p className="muted-copy">
          Титхи и накшатра считаются на локальный восход выбранного города. Swiss Ephemeris не встраивается в проект,
          а используется только как внешний ориентир для сверки методики.
        </p>

        <div className="summary-grid workflow-panel__space">
          <InfoCard label="Статус" value={astrologyDataReady ? 'готово' : 'нужен расчёт'} />
          <InfoCard label="Год" value={config.year ? `${config.year}` : 'не выбран'} />
          <InfoCard label="Рассчитано" value={astrologyCalculatedAtLabel} />
          <InfoCard label="Источник расчёта" value={ASTROLOGY_SOURCE_LABEL} />
          <InfoCard label="Сверка" value={ASTROLOGY_REFERENCE_LABEL} />
          <InfoCard label="Записей" value={`${config.astrology.data?.entries.length ?? 0}`} />
        </div>

        <div className="form-grid workflow-panel__space">
          <label className="field">
            <span className="field__label">Weekly preset</span>
            <select
              value={config.astrology.display.weekPreset}
              onChange={(event) => updateAstrologyDisplay('weekPreset', event.target.value as AstrologyLinePresetId)}
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
              value={config.astrology.display.dayPreset}
              onChange={(event) => updateAstrologyDisplay('dayPreset', event.target.value as AstrologyLinePresetId)}
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
              value={config.astrology.display.lineDensity}
              onChange={(event) => updateAstrologyDisplay('lineDensity', event.target.value as AstrologyLineDensity)}
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

        <div className="summary-grid workflow-panel__space">
          <InfoCard label="Weekly строка" value={ASTROLOGY_LINE_PRESET_LABELS[config.astrology.display.weekPreset]} />
          <InfoCard label="Daily строка" value={ASTROLOGY_LINE_PRESET_LABELS[config.astrology.display.dayPreset]} />
          <InfoCard label="Плотность" value={ASTROLOGY_LINE_DENSITY_LABELS[config.astrology.display.lineDensity]} />
        </div>

        <div className="workflow-panel__space">
          <p className="small-label">Что показывать в астростроке</p>
          <p className="muted-copy">
            Выберите, какие элементы будут входить в астрологическую строку на weekly и daily страницах.
          </p>
          <div className="pill-list astro-layer-pills">
            {(Object.entries(ASTROLOGY_LAYER_LABELS) as Array<[keyof PlannerAstrologyLayers, string]>).map(([layer, label]) => (
              <button
                key={layer}
                type="button"
                onClick={() => handleAstrologyLayerToggle(layer)}
                className={clsx('pill', config.astrology.layers[layer] && 'pill--active')}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="workflow-mode-toggle workflow-panel__space">
          <button
            type="button"
            onClick={() => updateAstrologyConfig({ includeLegend: true })}
            className={clsx('workflow-mode-toggle__button', config.astrology.includeLegend && 'workflow-mode-toggle__button--active')}
          >
            легенда в PDF
          </button>
          <button
            type="button"
            onClick={() => updateAstrologyConfig({ includeLegend: false })}
            className={clsx('workflow-mode-toggle__button', !config.astrology.includeLegend && 'workflow-mode-toggle__button--active')}
          >
            без легенды
          </button>
        </div>

        <div className="inline-actions workflow-panel__space">
          <button
            type="button"
            onClick={() => refreshAstrologyData()}
            disabled={config.mode === 'undated' || astrologyStatus === 'loading'}
            className="button button--secondary"
          >
            {astrologyStatus === 'loading' ? 'Считаем...' : 'Рассчитать астрологию на год'}
          </button>
          <a href="#/astrology-pdf" className="button button--ghost">
            Добавить в PDF
          </a>
        </div>

        {astrologyMessage ? (
          <p
            className={clsx(
              'message',
              astrologyStatus === 'error' ? 'message--error' : astrologyStatus === 'success' ? 'message--success' : 'message--warning',
            )}
          >
            {astrologyMessage}
          </p>
        ) : null}
      </Panel>

      <Panel title="Расшифровка символов" eyebrow="Легенда">
        <p className="muted-copy">
          Эту страницу можно добавить в документ как отдельный лист. Она появится сразу после декабря и перед следующими разделами.
        </p>

        <div className="background-tools workflow-panel__space">
          <button
            type="button"
            onClick={() => updateAstrologyConfig({ includeLegend: !config.astrology.includeLegend })}
            className={clsx('button', config.astrology.includeLegend ? 'button--secondary' : 'button--primary')}
          >
            {config.astrology.includeLegend ? 'Убрать из планера' : 'Добавить в планер'}
          </button>
        </div>

        <div className="astro-legend-grid">
          <div className="astro-legend-card">
            <p className="small-label">Титхи</p>
            {Object.values(TITHI_TYPE_META).map((item) => (
              <p key={item.icon} className="astro-legend-row">
                <AstroIconPreview icon={item.icon} label={item.label} />
                <span>{item.range} · {item.label}</span>
              </p>
            ))}
          </div>
          <div className="astro-legend-card">
            <p className="small-label">Накшатра</p>
            {Object.values(NAKSHATRA_TYPE_META).map((item) => (
              <p key={item.icon} className="astro-legend-row">
                <AstroIconPreview icon={item.icon} label={item.label} />
                <span>{item.label}</span>
              </p>
            ))}
          </div>
          <div className="astro-legend-card">
            <p className="small-label">Планета дня</p>
            {Object.values(PLANET_DAY_META).map((item) => (
              <p key={item.icon} className="astro-legend-row">
                <AstroIconPreview icon={item.icon} label={item.label} />
                <span>{item.label}</span>
              </p>
            ))}
          </div>
          <div className="astro-legend-card">
            <p className="small-label">Энергия</p>
            {Object.values(ENERGY_META).map((item) => (
              <p key={item.icon} className="astro-legend-row">
                <AstroIconPreview icon={item.icon} label={item.label} />
                <span>{item.label}</span>
              </p>
            ))}
          </div>
          <div className="astro-legend-card">
            <p className="small-label">Фокус</p>
            {Object.values(FOCUS_META).map((item) => (
              <p key={item.icon} className="astro-legend-row">
                <AstroIconPreview icon={item.icon} label={item.label} />
                <span>{item.label}</span>
              </p>
            ))}
          </div>
        </div>
      </Panel>

      <Panel title="Фазы Луны" eyebrow="Астрономия">
        <p className="muted-copy">
          Источник данных: Astronomical Applications Department U.S. Naval Observatory. В календаре используются первичные
          фазы из USNO API, а промежуточные дни распределяются между соседними первичными фазами.
        </p>

        <div className="workflow-mode-toggle workflow-panel__space">
          <button
            type="button"
            onClick={() => handleMoonPhaseToggle(true)}
            disabled={config.mode === 'undated' || moonPhaseStatus === 'loading'}
            className={clsx('workflow-mode-toggle__button', config.moonPhases.enabled && 'workflow-mode-toggle__button--active')}
          >
            включить
          </button>
          <button
            type="button"
            onClick={() => handleMoonPhaseToggle(false)}
            disabled={moonPhaseStatus === 'loading'}
            className={clsx('workflow-mode-toggle__button', !config.moonPhases.enabled && 'workflow-mode-toggle__button--active')}
          >
            выключить
          </button>
        </div>

        <div className="summary-grid workflow-panel__space">
          <InfoCard label="Статус" value={config.moonPhases.enabled ? (moonPhaseDataReady ? 'готово' : 'нужна загрузка') : 'выключено'} />
          <InfoCard label="Покрытие" value={moonPhaseYearsLabel} />
          <InfoCard label="Обновлено" value={moonPhaseFetchedAtLabel} />
          <InfoCard label="Источник" value="USNO AA API" />
        </div>

        <div className="inline-actions workflow-panel__space">
          <button
            type="button"
            onClick={() => void refreshMoonPhaseData()}
            disabled={config.mode === 'undated' || moonPhaseStatus === 'loading'}
            className="button button--secondary"
          >
            {moonPhaseStatus === 'loading' ? 'Загрузка...' : 'Обновить данные'}
          </button>
          <a href={MOON_PHASE_SOURCE_DOCS_URL} target="_blank" rel="noreferrer" className="button button--ghost">
            Документация USNO
          </a>
        </div>

        {moonPhaseMessage ? (
          <p
            className={clsx(
              'message',
              moonPhaseStatus === 'error' ? 'message--error' : moonPhaseStatus === 'success' ? 'message--success' : 'message--warning',
            )}
          >
            {moonPhaseMessage}
          </p>
        ) : null}
      </Panel>
    </>
  );
}
