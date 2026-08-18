import { startTransition, useEffect, useState } from 'react';
import {
  ASTROLOGY_CALCULATION_TIME_LABEL,
  getAstrologyCity,
  normalizeAstrologyConfig,
} from '../../../lib/astrology/astrologyConfig';
import {
  calculateAstrologyDataForYear,
  hasAstrologyDataForConfig,
} from '../../../lib/astrology/jyotishDaily';
import {
  fetchMoonPhaseData,
  hasMoonPhaseDataForYear,
  normalizeMoonPhaseConfig,
} from '../../../lib/moon/moonPhases';
import type {
  PlannerAstrologyConfig,
  PlannerAstrologyCustomCity,
  PlannerAstrologyLayers,
  PlannerConfig,
} from '../../../types/planner';

type SetPlannerField = <K extends keyof PlannerConfig>(field: K, value: PlannerConfig[K]) => void;
type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export function useBuilderAstrologyActions(config: PlannerConfig, setField: SetPlannerField) {
  const [moonPhaseStatus, setMoonPhaseStatus] = useState<AsyncStatus>('idle');
  const [moonPhaseMessage, setMoonPhaseMessage] = useState<string | null>(null);
  const [astrologyStatus, setAstrologyStatus] = useState<AsyncStatus>('idle');
  const [astrologyMessage, setAstrologyMessage] = useState<string | null>(null);

  const selectedAstrologyCity = getAstrologyCity(config.astrology);
  const moonPhaseDataReady = config.mode === 'dated'
    && Boolean(config.year)
    && hasMoonPhaseDataForYear(config.moonPhases, config.year ?? 0);
  const moonPhaseYearsLabel = config.moonPhases.years.length > 0 ? config.moonPhases.years.join(', ') : 'нет данных';
  const moonPhaseFetchedAtLabel = config.moonPhases.fetchedAt
    ? new Date(config.moonPhases.fetchedAt).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })
    : 'не загружено';
  const astrologyDataReady = hasAstrologyDataForConfig(config);
  const astrologyCalculatedAtLabel = config.astrology.data?.calculatedAt
    ? new Date(config.astrology.data.calculatedAt).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })
    : 'не рассчитано';

  function updateMoonPhaseConfig(patch: Partial<PlannerConfig['moonPhases']>) {
    setField('moonPhases', normalizeMoonPhaseConfig({
      ...config.moonPhases,
      ...patch,
    }));
  }

  function updateAstrologyConfig(patch: Partial<PlannerAstrologyConfig>) {
    setField('astrology', normalizeAstrologyConfig({
      ...config.astrology,
      ...patch,
    }));
  }

  function syncMoonPhaseMessage(targetYear = config.year, enabled = config.moonPhases.enabled) {
    if (config.mode !== 'dated' || !targetYear) {
      setMoonPhaseStatus('idle');
      setMoonPhaseMessage('Фазы Луны доступны для датированного режима с выбранным годом.');
      return;
    }

    if (!enabled) {
      setMoonPhaseStatus('idle');
      setMoonPhaseMessage(null);
      return;
    }

    if (hasMoonPhaseDataForYear(config.moonPhases, targetYear)) {
      setMoonPhaseStatus('success');
      setMoonPhaseMessage(`Используются сохраненные данные USNO для ${targetYear} года.`);
      return;
    }

    setMoonPhaseStatus('idle');
    setMoonPhaseMessage(`Сохраненных данных USNO для ${targetYear} года нет. Нажмите «Обновить данные».`);
  }

  useEffect(() => {
    if (moonPhaseStatus === 'loading' || moonPhaseStatus === 'error') {
      return;
    }

    syncMoonPhaseMessage(config.year, config.moonPhases.enabled);
  }, [
    config.mode,
    config.year,
    config.moonPhases.enabled,
    config.moonPhases.fetchedAt,
    config.moonPhases.events.length,
    config.moonPhases.years.join(','),
    moonPhaseStatus,
  ]);

  function updateAstrologyDisplay<K extends keyof PlannerAstrologyConfig['display']>(
    field: K,
    value: PlannerAstrologyConfig['display'][K],
  ) {
    updateAstrologyConfig({
      display: {
        ...config.astrology.display,
        [field]: value,
      },
    });
  }

  function handleAstrologyCityChange(cityId: string) {
    updateAstrologyConfig({ cityId });
  }

  function handleAstrologyCityModeChange(cityMode: PlannerAstrologyConfig['cityMode']) {
    if (cityMode === 'custom') {
      const nextCustomCity: PlannerAstrologyCustomCity = config.astrology.cityMode === 'custom' && config.astrology.customCity
        ? config.astrology.customCity
        : {
            name: selectedAstrologyCity.name,
            country: selectedAstrologyCity.country,
            timezone: selectedAstrologyCity.timezone,
            latitude: selectedAstrologyCity.latitudeText,
            longitude: selectedAstrologyCity.longitudeText,
          };

      updateAstrologyConfig({ cityMode: 'custom', customCity: nextCustomCity });
      return;
    }

    updateAstrologyConfig({ cityMode: 'preset' });
  }

  function handleAstrologyCustomCityChange<K extends keyof PlannerAstrologyCustomCity>(
    field: K,
    value: PlannerAstrologyCustomCity[K],
  ) {
    updateAstrologyConfig({
      customCity: {
        ...(config.astrology.customCity ?? {
          name: selectedAstrologyCity.name,
          country: selectedAstrologyCity.country,
          timezone: selectedAstrologyCity.timezone,
          latitude: selectedAstrologyCity.latitudeText,
          longitude: selectedAstrologyCity.longitudeText,
        }),
        [field]: value,
      },
    });
  }

  function handleAstrologyLayerToggle(layer: keyof PlannerAstrologyLayers) {
    updateAstrologyConfig({
      layers: {
        ...config.astrology.layers,
        [layer]: !config.astrology.layers[layer],
      },
    });
  }

  function refreshAstrologyData(targetYear = config.year) {
    if (config.mode !== 'dated' || !targetYear) {
      setAstrologyStatus('idle');
      setAstrologyMessage('Астрологические данные доступны для датированного режима с выбранным годом.');
      return;
    }

    setAstrologyStatus('loading');
    setAstrologyMessage('Считаем титхи, накшатры, планету, энергию и фокус на локальный восход...');

    try {
      const data = calculateAstrologyDataForYear(targetYear, config.astrology);
      updateAstrologyConfig({ data });
      setAstrologyStatus('success');
      setAstrologyMessage(`Астрология рассчитана для ${targetYear}: ${selectedAstrologyCity.name}, ${ASTROLOGY_CALCULATION_TIME_LABEL}.`);
    } catch (error) {
      setAstrologyStatus('error');
      setAstrologyMessage(error instanceof Error ? error.message : 'Не удалось рассчитать астрологические данные.');
    }
  }

  async function refreshMoonPhaseData(targetYear = config.year) {
    if (config.mode !== 'dated' || !targetYear) {
      updateMoonPhaseConfig({ enabled: false });
      setMoonPhaseStatus('idle');
      setMoonPhaseMessage('Фазы Луны доступны для датированного режима с выбранным годом.');
      return;
    }

    setMoonPhaseStatus('loading');
    setMoonPhaseMessage('Загружаем фазы Луны из USNO...');

    try {
      const data = await fetchMoonPhaseData(targetYear);
      const nextData = normalizeMoonPhaseConfig({
        ...data,
        enabled: config.moonPhases.enabled,
      });

      startTransition(() => {
        setField('moonPhases', nextData);
      });

      setMoonPhaseStatus('success');
      setMoonPhaseMessage(`Данные USNO обновлены для ${targetYear} года и соседних границ календаря.`);
    } catch (error) {
      setMoonPhaseStatus('error');
      setMoonPhaseMessage(error instanceof Error ? error.message : 'Не удалось загрузить данные USNO.');
    }
  }

  function handleMoonPhaseToggle(enabled: boolean) {
    if (!enabled) {
      updateMoonPhaseConfig({ enabled: false });
      setMoonPhaseStatus('idle');
      setMoonPhaseMessage('Фазы Луны выключены.');
      return;
    }

    updateMoonPhaseConfig({ enabled: true });
    syncMoonPhaseMessage(config.year, true);
  }

  function handleModeChange(mode: PlannerConfig['mode']) {
    setField('mode', mode);

    if (mode === 'undated' && config.moonPhases.enabled) {
      updateMoonPhaseConfig({ enabled: false });
      setMoonPhaseStatus('idle');
      setMoonPhaseMessage('Фазы Луны выключены: для них нужны конкретные даты.');
    }
  }

  function handleFoundationYearChange(value: string) {
    const nextYear = value ? Number(value) : undefined;
    setField('year', nextYear);

    if (config.moonPhases.enabled) {
      syncMoonPhaseMessage(nextYear, true);
    }
  }

  return {
    selectedAstrologyCity,
    moonPhaseDataReady,
    moonPhaseYearsLabel,
    moonPhaseFetchedAtLabel,
    moonPhaseStatus,
    moonPhaseMessage,
    astrologyDataReady,
    astrologyCalculatedAtLabel,
    astrologyStatus,
    astrologyMessage,
    updateAstrologyConfig,
    updateAstrologyDisplay,
    handleAstrologyCityChange,
    handleAstrologyCityModeChange,
    handleAstrologyCustomCityChange,
    handleAstrologyLayerToggle,
    refreshAstrologyData,
    refreshMoonPhaseData,
    handleMoonPhaseToggle,
    handleModeChange,
    handleFoundationYearChange,
  };
}
