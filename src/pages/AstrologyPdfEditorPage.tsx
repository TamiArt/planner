import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { AstrologyOverlaySettingsPanel } from '../components/astrology/AstrologyOverlaySettingsPanel';
import { AstrologyPdfPreviewPanel } from '../components/astrology/AstrologyPdfPreviewPanel';
import { InfoCard } from '../components/InfoCard';
import { Panel } from '../components/Panel';
import { StatusPill } from '../components/StatusPill';
import {
  ASTROLOGY_CALCULATION_TIME_LABEL,
  ASTROLOGY_REFERENCE_LABEL,
  ASTROLOGY_SOURCE_LABEL,
  getAstrologyCity,
  JYOTISH_AYANAMSA_LABEL,
  normalizeAstrologyConfig,
} from '../lib/astrology/astrologyConfig';
import { CAPITAL_CITY_OPTIONS } from '../lib/astrology/capitalCities';
import { calculateAstrologyDataForYear, hasAstrologyDataForConfig } from '../lib/astrology/jyotishDaily';
import { annotateAstrologyPdf, buildAstrologyPdfPreview, prepareAstrologyPdfExportTarget } from '../lib/export/annotateAstrologyPdf';
import {
  annotateAstrologyAndStickersPdf,
  buildAstrologyAndStickersPdfPreview,
  prepareAstrologyAndStickersPdfExportTarget,
} from '../lib/export/annotateAstrologyAndStickersPdf';
import { savePdfBytes } from '../core/export/PdfExportEngine';
import {
  formatPdfEditorTime as formatTime,
  formatPdfFileSize as formatFileSize,
  normalizeSourcePdfError,
  openPdfFilePicker as openFilePicker,
  readSourcePdf,
  type UploadedSourcePdf,
} from '../lib/pdf/pdfEditorUtils';
import { getStickerGeneratedPageCount, getStickerModuleConfig } from '../lib/stickers/stickerModuleConfig';
import { buildPlannerPlan } from '../lib/navigation/buildPlannerPlan';
import { usePlannerStore } from '../store/plannerStore';
import type { PlannerAstrologyConfig, PlannerAstrologyCustomCity, PlannerAstrologyLayers, PlannerConfig } from '../types/planner';

interface AstrologyPdfPreview {
  bytes: Uint8Array;
  url: string;
  byteLength: number;
  annotatedPageCount: number;
  markerCount: number;
  iconCount: number;
  appendedPageCount: number;
  totalPageCount: number;
}

function getAppendedStickerPageCount(result: unknown) {
  if (!result || typeof result !== 'object' || !('appendedPageCount' in result)) return 0;
  return typeof result.appendedPageCount === 'number' ? result.appendedPageCount : 0;
}

function createEffectiveConfig(config: PlannerConfig, year: number, astrology: PlannerAstrologyConfig): PlannerConfig {
  return { ...config, mode: 'dated', year, astrology: normalizeAstrologyConfig(astrology) };
}

function createAstrologyOverlayReferenceConfig(config: PlannerConfig, year: number, astrology: PlannerAstrologyConfig): PlannerConfig {
  return {
    ...createEffectiveConfig(config, year, astrology),
    astrology: normalizeAstrologyConfig({ ...astrology, includeLegend: false }),
  };
}

export function AstrologyPdfEditorPage() {
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const config = usePlannerStore((state) => state.config);
  const lastSavedAt = usePlannerStore((state) => state.lastSavedAt);
  const setField = usePlannerStore((state) => state.setField);
  const [sourcePdf, setSourcePdf] = useState<UploadedSourcePdf | null>(null);
  const [selectedYear, setSelectedYear] = useState(config.year ?? new Date().getFullYear());
  const [astrology, setAstrology] = useState(() => normalizeAstrologyConfig(config.astrology));
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isCalculatingAstrology, setIsCalculatingAstrology] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [preview, setPreview] = useState<AstrologyPdfPreview | null>(null);
  const [includeStickerPages, setIncludeStickerPages] = useState(false);
  const effectiveConfig = useMemo(() => createEffectiveConfig(config, selectedYear, astrology), [astrology, config, selectedYear]);
  const overlayReferenceConfig = useMemo(() => createAstrologyOverlayReferenceConfig(config, selectedYear, astrology), [astrology, config, selectedYear]);
  const previewConfigSignature = useMemo(() => JSON.stringify(effectiveConfig), [effectiveConfig]);
  const dataReady = hasAstrologyDataForConfig(effectiveConfig);
  const effectivePlan = useMemo(() => buildPlannerPlan(overlayReferenceConfig), [overlayReferenceConfig]);
  const expectedPageCount = effectivePlan.pages.length;
  const stickerConfig = useMemo(() => getStickerModuleConfig(effectiveConfig), [effectiveConfig]);
  const stickerPageCount = getStickerGeneratedPageCount(stickerConfig);
  const stickersReady = effectiveConfig.modules.stickers.enabled && stickerPageCount > 0;
  const selectedAstrologyCity = getAstrologyCity(astrology);
  const astrologyCalculatedAtLabel = astrology.data?.calculatedAt
    ? new Date(astrology.data.calculatedAt).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })
    : 'не рассчитано';
  const mismatchWarning = sourcePdf && sourcePdf.pageCount !== expectedPageCount
    ? `В текущем конфиге ${expectedPageCount} стр., а в PDF ${sourcePdf.pageCount} стр. Астрология накладывается по номерам страниц текущего конфига.`
    : null;

  useEffect(() => {
    function rehydrateStore() { void usePlannerStore.persist.rehydrate(); }
    function handleStorage(event: StorageEvent) {
      if (event.key === 'planner-builder-config') rehydrateStore();
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
  }, [preview?.url]);

  useEffect(() => {
    if (!sourcePdf || !dataReady || (includeStickerPages && !stickersReady)) {
      setIsPreviewLoading(false);
      setPreviewError(null);
      replacePreview(null);
      return;
    }
    const previewSourcePdf = sourcePdf;
    let isDisposed = false;
    async function buildPreview() {
      setIsPreviewLoading(true);
      setPreviewError(null);
      try {
        const result = includeStickerPages
          ? await buildAstrologyAndStickersPdfPreview(effectiveConfig, previewSourcePdf.bytes)
          : await buildAstrologyPdfPreview(effectiveConfig, previewSourcePdf.bytes);
        const previewBytes = Uint8Array.from(result.bytes);
        const nextUrl = URL.createObjectURL(new Blob([previewBytes], { type: 'application/pdf' }));
        if (isDisposed) { URL.revokeObjectURL(nextUrl); return; }
        replacePreview({
          bytes: previewBytes,
          url: nextUrl,
          byteLength: previewBytes.byteLength,
          annotatedPageCount: result.annotatedPageCount,
          markerCount: result.markerCount,
          iconCount: result.iconCount,
          appendedPageCount: getAppendedStickerPageCount(result),
          totalPageCount: result.totalPageCount,
        });
      } catch (error) {
        if (!isDisposed) {
          replacePreview(null);
          setPreviewError(error instanceof Error ? error.message : 'Не удалось собрать предпросмотр PDF с астрологией.');
        }
      } finally {
        if (!isDisposed) setIsPreviewLoading(false);
      }
    }
    void buildPreview();
    return () => { isDisposed = true; };
  }, [dataReady, includeStickerPages, previewConfigSignature, sourcePdf, stickersReady]);

  function replacePreview(nextPreview: AstrologyPdfPreview | null) {
    setPreview((current) => {
      if (current?.url) URL.revokeObjectURL(current.url);
      return nextPreview;
    });
  }

  function updateAstrologyConfig(patch: Partial<PlannerAstrologyConfig>) {
    const nextAstrology = normalizeAstrologyConfig({ ...astrology, ...patch });
    setAstrology(nextAstrology);
    setField('astrology', nextAstrology);
  }

  function handleAstrologyCityModeChange(cityMode: PlannerAstrologyConfig['cityMode']) {
    if (cityMode === 'custom') {
      const nextCustomCity: PlannerAstrologyCustomCity = astrology.cityMode === 'custom' && astrology.customCity
        ? astrology.customCity
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

  function handleAstrologyCustomCityChange<K extends keyof PlannerAstrologyCustomCity>(field: K, value: PlannerAstrologyCustomCity[K]) {
    updateAstrologyConfig({
      customCity: {
        ...(astrology.customCity ?? {
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

  function updateAstrologyDisplay<K extends keyof PlannerAstrologyConfig['display']>(field: K, value: PlannerAstrologyConfig['display'][K]) {
    updateAstrologyConfig({ display: { ...astrology.display, [field]: value } });
  }

  function handleAstrologyLayerToggle(layer: keyof PlannerAstrologyLayers) {
    updateAstrologyConfig({ layers: { ...astrology.layers, [layer]: !astrology.layers[layer] } });
  }

  async function handleSourcePdfChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const nextSourcePdf = await readSourcePdf(file);
      setSourcePdf(nextSourcePdf);
      setFeedback(`PDF "${file.name}" загружен: ${nextSourcePdf.pageCount} стр.`);
    } catch (error) {
      setSourcePdf(null);
      replacePreview(null);
      setFeedback(normalizeSourcePdfError(error));
    } finally {
      event.target.value = '';
    }
  }

  function handleCalculateAstrology() {
    setIsCalculatingAstrology(true);
    setFeedback('Считаем астрологию на локальный восход выбранного города...');
    try {
      const baseAstrology = normalizeAstrologyConfig(astrology);
      const data = calculateAstrologyDataForYear(selectedYear, baseAstrology);
      const nextAstrology = normalizeAstrologyConfig({ ...baseAstrology, data });
      setAstrology(nextAstrology);
      setField('astrology', nextAstrology);
      setFeedback(`Астрология рассчитана для ${selectedYear}: ${selectedAstrologyCity.name}, ${ASTROLOGY_CALCULATION_TIME_LABEL}.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Не удалось рассчитать астрологические данные.');
    } finally { setIsCalculatingAstrology(false); }
  }

  async function handleBuildPreview() {
    if (!sourcePdf) { setFeedback('Сначала загрузите исходный PDF.'); return; }
    if (!dataReady) { setFeedback('Сначала рассчитайте астрологию для выбранного года и города.'); return; }
    if (includeStickerPages && !stickersReady) {
      setFeedback('Чтобы добавить стикеры вместе с астрологией, включите модуль stickers и подготовьте хотя бы одну sticker page.');
      return;
    }
    setIsPreviewLoading(true);
    setPreviewError(null);
    setFeedback(includeStickerPages
      ? 'Накладываем астрологию, добавляем sticker pages и собираем предпросмотр PDF...'
      : 'Накладываем астрологию и собираем предпросмотр PDF...');
    try {
      const result = includeStickerPages
        ? await buildAstrologyAndStickersPdfPreview(effectiveConfig, sourcePdf.bytes)
        : await buildAstrologyPdfPreview(effectiveConfig, sourcePdf.bytes);
      const previewBytes = Uint8Array.from(result.bytes);
      const nextUrl = URL.createObjectURL(new Blob([previewBytes], { type: 'application/pdf' }));
      replacePreview({
        bytes: previewBytes,
        url: nextUrl,
        byteLength: previewBytes.byteLength,
        annotatedPageCount: result.annotatedPageCount,
        markerCount: result.markerCount,
        iconCount: result.iconCount,
        appendedPageCount: getAppendedStickerPageCount(result),
        totalPageCount: result.totalPageCount,
      });
      setFeedback(includeStickerPages
        ? `Предпросмотр готов: ${result.markerCount} текстовых меток, ${result.iconCount} иконок, ${getAppendedStickerPageCount(result)} sticker pages.`
        : `Предпросмотр готов: добавлено ${result.markerCount} текстовых меток и ${result.iconCount} иконок на ${result.annotatedPageCount} стр.`);
    } catch (error) {
      replacePreview(null);
      const message = error instanceof Error ? error.message : 'Не удалось собрать PDF с астрологией.';
      setPreviewError(message);
      setFeedback(message);
    } finally { setIsPreviewLoading(false); }
  }

  async function handleSavePdf() {
    if (!sourcePdf) { setFeedback('Сначала загрузите исходный PDF.'); return; }
    if (!dataReady) { setFeedback('Сначала рассчитайте астрологию для выбранного года и города.'); return; }
    if (includeStickerPages && !stickersReady) {
      setFeedback('Чтобы сохранить PDF со стикерами и астрологией, сначала подготовьте sticker pages в текущем конфиге.');
      return;
    }
    setIsSaving(true);
    try {
      const target = includeStickerPages
        ? await prepareAstrologyAndStickersPdfExportTarget(sourcePdf.file.name)
        : await prepareAstrologyPdfExportTarget(sourcePdf.file.name);
      setFeedback(target.fileHandle
        ? includeStickerPages ? 'Сохраняем новую копию PDF с астрологией и sticker pages...' : 'Сохраняем новую копию PDF с астрологией...'
        : includeStickerPages ? 'Готовим скачивание новой копии PDF с астрологией и sticker pages...' : 'Готовим скачивание новой копии PDF с астрологией...');
      const result = preview && !isPreviewLoading
        ? await (async () => {
            await savePdfBytes(target, preview.bytes);
            return {
              byteLength: preview.byteLength,
              annotatedPageCount: preview.annotatedPageCount,
              markerCount: preview.markerCount,
              iconCount: preview.iconCount,
              appendedPageCount: preview.appendedPageCount,
              totalPageCount: preview.totalPageCount,
            };
          })()
        : includeStickerPages
          ? await annotateAstrologyAndStickersPdf(effectiveConfig, sourcePdf.bytes, target)
          : await annotateAstrologyPdf(effectiveConfig, sourcePdf.bytes, target);
      const sizeLabel = ` (${formatFileSize(result.byteLength)})`;
      setFeedback(target.fileHandle
        ? includeStickerPages
          ? `PDF сохранен: ${result.markerCount} меток, ${result.iconCount} иконок, ${getAppendedStickerPageCount(result)} sticker pages.${sizeLabel}.`
          : `PDF сохранен: ${result.markerCount} меток, ${result.iconCount} иконок, ${result.annotatedPageCount} стр.${sizeLabel}.`
        : includeStickerPages
          ? `PDF собран, загрузка начата: ${result.markerCount} меток, ${result.iconCount} иконок, ${getAppendedStickerPageCount(result)} sticker pages.${sizeLabel}.`
          : `PDF собран, загрузка начата: ${result.markerCount} меток, ${result.iconCount} иконок, ${result.annotatedPageCount} стр.${sizeLabel}.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Не удалось сохранить PDF с астрологией.');
    } finally { setIsSaving(false); }
  }

  function handleYearChange(value: string) {
    setSelectedYear(Math.min(2100, Math.max(2020, Number(value) || new Date().getFullYear())));
  }

  const canBuild = Boolean(sourcePdf) && dataReady && (!includeStickerPages || stickersReady) && !isPreviewLoading && !isSaving;

  return (
    <main className="page-shell">
      <section className="hero hero--templates">
        <div className="hero__grid hero__grid--single"><div>
          <a href="#/" className="hero__back-link"><span aria-hidden="true">←</span><span>Назад в конструктор</span></a>
          <p className="hero__eyebrow">Astrology PDF</p>
          <h1 className="hero__title hero__title--compact">Добавление астрологии в готовый PDF.</h1>
          <p className="hero__lead">Загрузите уже существующий планер, рассчитайте Джйотиш-метки на год и сохраните новую копию. При желании здесь же можно сразу дописать в итоговый файл и `sticker pages` из текущего конфига.</p>
          <div className="hero__actions"><a href="#/moon-phases-pdf" className="button button--secondary">Фазы Луны в PDF</a><a href="#/append-stickers" className="button button--ghost">Добавить стикеры</a></div>
          <div className="hero__status-strip">
            <StatusPill label="Синхронизация" value={`локально · ${formatTime(lastSavedAt)}`} />
            <StatusPill label="Год" value={`${selectedYear}`} />
            <StatusPill label="Астрология" value={dataReady ? 'готова' : 'нужен расчёт'} />
            <StatusPill label="Sticker pages" value={includeStickerPages ? (stickersReady ? `${stickerPageCount} стр.` : 'не готовы') : 'выкл'} />
            <StatusPill label="Исходный PDF" value={sourcePdf ? `${sourcePdf.pageCount} стр.` : 'не выбран'} />
          </div>
        </div></div>
      </section>
      {feedback ? <p className="floating-note">{feedback}</p> : null}
      <div className="builder-grid">
        <div className="builder-column">
          <Panel title="Исходный PDF" eyebrow="Шаг 1">
            <p className="muted-copy">Выберите PDF, который нужно отредактировать. Исходный файл не перезаписывается: приложение сохранит новую копию.</p>
            <div className="background-tools workflow-panel__space"><button type="button" onClick={() => openFilePicker(pdfInputRef.current)} className="button button--primary">{sourcePdf ? 'Заменить PDF' : 'Загрузить PDF'}</button></div>
            {sourcePdf ? <div className="summary-grid">
              <InfoCard label="Файл" value={sourcePdf.file.name} /><InfoCard label="Страницы PDF" value={`${sourcePdf.pageCount}`} />
              <InfoCard label="Размер" value={formatFileSize(sourcePdf.file.size)} /><InfoCard label="Страницы конфига" value={`${expectedPageCount}`} />
              <InfoCard label="Sticker pages" value={includeStickerPages ? `${stickerPageCount}` : 'не добавляем'} />
            </div> : <div className="message-stack workflow-panel__space"><p className="message message--warning">PDF пока не загружен.</p></div>}
          </Panel>
          <Panel title="Расчёт астрологии" eyebrow="Шаг 2">
            <p className="muted-copy">Титхи, накшатра, планета дня, энергия и фокус считаются локально через Astronomy Engine. Swiss Ephemeris не встраивается в проект и остается только внешним ориентиром для сверки методики.</p>
            <div className="workflow-mode-toggle workflow-panel__space">
              <button type="button" onClick={() => handleAstrologyCityModeChange('preset')} className={astrology.cityMode === 'preset' ? 'workflow-mode-toggle__button workflow-mode-toggle__button--active' : 'workflow-mode-toggle__button'}>Из списка</button>
              <button type="button" onClick={() => handleAstrologyCityModeChange('custom')} className={astrology.cityMode === 'custom' ? 'workflow-mode-toggle__button workflow-mode-toggle__button--active' : 'workflow-mode-toggle__button'}>Свой город</button>
            </div>
            <div className="form-grid workflow-panel__space">
              <label className="field"><span className="field__label">Год планера</span><input type="number" min={2020} max={2100} value={selectedYear} onChange={(event) => handleYearChange(event.target.value)} className="input" /></label>
              {astrology.cityMode === 'preset' ? <label className="field"><span className="field__label">Город пользователя</span><select value={astrology.cityId} onChange={(event) => updateAstrologyConfig({ cityId: event.target.value })} className="select">{CAPITAL_CITY_OPTIONS.map((city) => <option key={city.id} value={city.id}>{city.name} · {city.country}</option>)}</select></label> : <>
                <label className="field"><span className="field__label">Название города</span><input value={astrology.customCity?.name ?? ''} onChange={(event) => handleAstrologyCustomCityChange('name', event.target.value)} className="input" placeholder="Например, Казань" /></label>
                <label className="field"><span className="field__label">Страна или регион</span><input value={astrology.customCity?.country ?? ''} onChange={(event) => handleAstrologyCustomCityChange('country', event.target.value)} className="input" placeholder="Россия" /></label>
                <label className="field"><span className="field__label">Часовой пояс</span><input value={astrology.customCity?.timezone ?? ''} onChange={(event) => handleAstrologyCustomCityChange('timezone', event.target.value)} className="input" placeholder="Europe/Moscow" /></label>
                <label className="field"><span className="field__label">Широта</span><input value={astrology.customCity?.latitude ?? ''} onChange={(event) => handleAstrologyCustomCityChange('latitude', event.target.value)} className="input" placeholder="55.7558" /></label>
                <label className="field"><span className="field__label">Долгота</span><input value={astrology.customCity?.longitude ?? ''} onChange={(event) => handleAstrologyCustomCityChange('longitude', event.target.value)} className="input" placeholder="37.6173" /></label>
              </>}
            </div>
            <div className="summary-grid">
              <InfoCard label="Статус" value={dataReady ? 'готово' : 'нужен расчёт'} /><InfoCard label="Режим города" value={astrology.cityMode === 'custom' ? 'свой город' : 'из списка'} />
              <InfoCard label="Город" value={`${selectedAstrologyCity.name} · ${selectedAstrologyCity.country}`} /><InfoCard label="Часовой пояс" value={selectedAstrologyCity.timezone} />
              <InfoCard label="Координаты" value={`${selectedAstrologyCity.latitudeText}, ${selectedAstrologyCity.longitudeText}`} /><InfoCard label="Аянамша" value={JYOTISH_AYANAMSA_LABEL} />
              <InfoCard label="Рассчитано" value={astrologyCalculatedAtLabel} /><InfoCard label="Источник" value={ASTROLOGY_SOURCE_LABEL} /><InfoCard label="Сверка" value={ASTROLOGY_REFERENCE_LABEL} />
            </div>
            <div className="background-tools workflow-panel__space"><button type="button" onClick={handleCalculateAstrology} disabled={isCalculatingAstrology} className="button button--secondary">{isCalculatingAstrology ? 'Считаем...' : dataReady ? 'Пересчитать астрологию' : 'Рассчитать астрологию'}</button></div>
          </Panel>
        </div>
        <div className="builder-column">
          <AstrologyOverlaySettingsPanel
            astrology={astrology}
            stickerPageCount={stickerPageCount}
            onWeekPresetChange={(preset) => updateAstrologyDisplay('weekPreset', preset)}
            onDayPresetChange={(preset) => updateAstrologyDisplay('dayPreset', preset)}
            onLineDensityChange={(density) => updateAstrologyDisplay('lineDensity', density)}
            onLayerToggle={handleAstrologyLayerToggle}
            onIncludeLegendChange={(includeLegend) => updateAstrologyConfig({ includeLegend })}
          />
          <Panel title="Наложение на PDF" eyebrow="Шаг 3">
            <p className="muted-copy">Инструмент может либо только наложить астрологические метки, либо сразу сделать комбинированный итог: наложить астрологию и затем дописать в конец `sticker pages` из текущего конфига.</p>
            <div className="workflow-mode-toggle workflow-panel__space"><button type="button" onClick={() => setIncludeStickerPages(false)} className={`workflow-mode-toggle__button ${!includeStickerPages ? 'workflow-mode-toggle__button--active' : ''}`}>только астрология</button><button type="button" onClick={() => setIncludeStickerPages(true)} className={`workflow-mode-toggle__button ${includeStickerPages ? 'workflow-mode-toggle__button--active' : ''}`}>астрология + стикеры</button></div>
            <div className="summary-grid workflow-panel__space"><InfoCard label="Режим" value={includeStickerPages ? 'комбинированный PDF' : 'только overlay астрологии'} /><InfoCard label="Модуль stickers" value={effectiveConfig.modules.stickers.enabled ? 'включен' : 'выключен'} /><InfoCard label="Готовых sticker pages" value={`${stickerPageCount}`} /></div>
            <div className="actions-grid workflow-panel__space">
              <button type="button" onClick={() => void handleBuildPreview()} disabled={!canBuild} className="action-card"><p className="action-card__title">{isPreviewLoading ? 'Обновляем предпросмотр...' : 'Обновить предпросмотр'}</p><p className="action-card__copy">Итоговый PDF собирается автоматически, а этой кнопкой можно принудительно обновить его сразу.</p></button>
              <button type="button" onClick={() => void handleSavePdf()} disabled={!canBuild} className="action-card action-card--primary"><p className="action-card__title">{isSaving ? 'Сохраняем PDF...' : includeStickerPages ? 'Сохранить PDF с астрологией и стикерами' : 'Сохранить PDF с астрологией'}</p><p className="action-card__copy">{includeStickerPages ? 'Создать новую копию исходного PDF: сначала наложить астрологию, затем добавить sticker pages в конец.' : 'Создать новую копию исходного PDF с наложенной астрологией.'}</p></button>
            </div>
            <div className="message-stack workflow-panel__space">
              {mismatchWarning ? <p className="message message--warning">{mismatchWarning}</p> : null}
              {isPreviewLoading && sourcePdf && dataReady ? <p className="message message--warning">{includeStickerPages ? 'Собираем итоговый PDF с астрологией и sticker pages для предпросмотра...' : 'Собираем итоговый PDF с астрологией для предпросмотра...'}</p> : null}
              {previewError ? <p className="message message--error">{previewError}</p> : null}
              {!sourcePdf ? <p className="message message--warning">Сначала загрузите PDF.</p> : null}
              {sourcePdf && !dataReady ? <p className="message message--warning">Рассчитайте астрологию для выбранного года и города.</p> : null}
              {includeStickerPages && !effectiveConfig.modules.stickers.enabled ? <p className="message message--error">Режим со стикерами включен, но модуль stickers сейчас выключен в текущем конфиге.</p> : null}
              {includeStickerPages && effectiveConfig.modules.stickers.enabled && stickerPageCount === 0 ? <p className="message message--warning">Режим со стикерами включен, но sticker pages пока не подготовлены.</p> : null}
              {sourcePdf && dataReady && (!includeStickerPages || stickersReady) ? <p className="message message--success">{includeStickerPages ? 'Готово к сборке PDF с астрологией и sticker pages.' : 'Готово к наложению астрологии.'}</p> : null}
            </div>
          </Panel>
        </div>
      </div>
      <AstrologyPdfPreviewPanel sourcePageCount={sourcePdf?.pageCount} preview={preview} isLoading={isPreviewLoading} error={previewError} includeStickerPages={includeStickerPages} />
      <input ref={pdfInputRef} type="file" accept="application/pdf,.pdf" onChange={handleSourcePdfChange} className="hidden-input" />
    </main>
  );
}
