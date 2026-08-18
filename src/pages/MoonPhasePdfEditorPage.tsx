import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  formatPdfEditorTime as formatTime,
  formatPdfFileSize as formatFileSize,
  normalizeSourcePdfError,
  openPdfFilePicker as openFilePicker,
  readSourcePdf,
  type UploadedSourcePdf,
} from '../lib/pdf/pdfEditorUtils';
import { InfoCard } from '../components/InfoCard';
import { Panel } from '../components/Panel';
import { StatusPill } from '../components/StatusPill';
import {
  annotateMoonPhasesPdf,
  buildMoonPhasePdfPreview,
  prepareMoonPhasePdfExportTarget,
} from '../lib/export/annotateMoonPhasesPdf';
import { savePdfBytes } from '../core/export/PdfExportEngine';
import {
  fetchMoonPhaseData,
  hasMoonPhaseDataForYear,
  MOON_PHASE_SOURCE_DOCS_URL,
  normalizeMoonPhaseConfig,
} from '../lib/moon/moonPhases';
import { buildPlannerPlan } from '../lib/navigation/buildPlannerPlan';
import { usePlannerStore } from '../store/plannerStore';
import type { PlannerConfig, PlannerMoonPhaseConfig } from '../types/planner';

interface MoonPhasePdfPreview {
  bytes: Uint8Array;
  url: string;
  byteLength: number;
  annotatedPageCount: number;
  markerCount: number;
  totalPageCount: number;
}

function createEffectiveConfig(config: PlannerConfig, year: number, moonPhases: PlannerMoonPhaseConfig): PlannerConfig {
  return {
    ...config,
    mode: 'dated',
    year,
    moonPhases: normalizeMoonPhaseConfig({
      ...moonPhases,
      enabled: true,
    }),
  };
}

export function MoonPhasePdfEditorPage() {
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const config = usePlannerStore((state) => state.config);
  const lastSavedAt = usePlannerStore((state) => state.lastSavedAt);
  const setField = usePlannerStore((state) => state.setField);
  const [sourcePdf, setSourcePdf] = useState<UploadedSourcePdf | null>(null);
  const [selectedYear, setSelectedYear] = useState(config.year ?? new Date().getFullYear());
  const [moonPhases, setMoonPhases] = useState(() => normalizeMoonPhaseConfig(config.moonPhases));
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isFetchingMoonData, setIsFetchingMoonData] = useState(false);
  const [isBuildingPreview, setIsBuildingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [preview, setPreview] = useState<MoonPhasePdfPreview | null>(null);

  const dataReady = hasMoonPhaseDataForYear(moonPhases, selectedYear);
  const effectiveConfig = useMemo(
    () => createEffectiveConfig(config, selectedYear, moonPhases),
    [config, moonPhases, selectedYear],
  );
  const effectivePlan = useMemo(() => buildPlannerPlan(effectiveConfig), [effectiveConfig]);
  const expectedPageCount = effectivePlan.pages.length;
  const mismatchWarning = sourcePdf && sourcePdf.pageCount !== expectedPageCount
    ? `В текущем конфиге ${expectedPageCount} стр., а в PDF ${sourcePdf.pageCount} стр. Метки накладываются по номерам страниц текущего конфига.`
    : null;
  const moonPhaseYearsLabel = moonPhases.years.length > 0 ? moonPhases.years.join(', ') : 'нет данных';
  const moonPhaseFetchedAtLabel = moonPhases.fetchedAt
    ? new Date(moonPhases.fetchedAt).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })
    : 'не загружено';
  const previewUrl = preview ? `${preview.url}#toolbar=1&navpanes=0&view=FitH` : null;

  useEffect(() => {
    return () => {
      if (preview?.url) {
        URL.revokeObjectURL(preview.url);
      }
    };
  }, [preview?.url]);

  useEffect(() => {
    if (!sourcePdf || !dataReady) {
      setIsBuildingPreview(false);
      setPreviewError(null);
      replacePreview(null);
      return;
    }

    const previewSourcePdf = sourcePdf;
    let isDisposed = false;

    async function buildPreview() {
      setIsBuildingPreview(true);
      setPreviewError(null);

      try {
        const result = await buildMoonPhasePdfPreview(effectiveConfig, previewSourcePdf.bytes);
        const previewBytes = Uint8Array.from(result.bytes);
        const blob = new Blob([previewBytes], { type: 'application/pdf' });
        const nextUrl = URL.createObjectURL(blob);

        if (isDisposed) {
          URL.revokeObjectURL(nextUrl);
          return;
        }

        replacePreview({
          bytes: previewBytes,
          url: nextUrl,
          byteLength: previewBytes.byteLength,
          annotatedPageCount: result.annotatedPageCount,
          markerCount: result.markerCount,
          totalPageCount: result.totalPageCount,
        });
      } catch (error) {
        if (isDisposed) {
          return;
        }

        replacePreview(null);
        setPreviewError(error instanceof Error ? error.message : 'Не удалось собрать предпросмотр PDF с фазами Луны.');
      } finally {
        if (!isDisposed) {
          setIsBuildingPreview(false);
        }
      }
    }

    void buildPreview();

    return () => {
      isDisposed = true;
    };
  }, [dataReady, effectiveConfig, sourcePdf]);

  function replacePreview(nextPreview: MoonPhasePdfPreview | null) {
    setPreview((current) => {
      if (current?.url) {
        URL.revokeObjectURL(current.url);
      }

      return nextPreview;
    });
  }

  async function handleSourcePdfChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const nextSourcePdf = await readSourcePdf(file);

      setSourcePdf(nextSourcePdf);
      replacePreview(null);
      setFeedback(`PDF "${file.name}" загружен: ${nextSourcePdf.pageCount} стр.`);
    } catch (error) {
      setSourcePdf(null);
      replacePreview(null);
      setFeedback(normalizeSourcePdfError(error));
    } finally {
      event.target.value = '';
    }
  }

  async function handleFetchMoonData() {
    setIsFetchingMoonData(true);
    setFeedback('Загружаем фазы Луны из USNO...');

    try {
      const data = await fetchMoonPhaseData(selectedYear);
      setMoonPhases(data);
      setField('moonPhases', data);
      replacePreview(null);
      setFeedback(`Данные USNO загружены для ${selectedYear} года и соседних границ календаря.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Не удалось загрузить данные USNO.');
    } finally {
      setIsFetchingMoonData(false);
    }
  }

  async function handleBuildPreview() {
    if (!sourcePdf) {
      setFeedback('Сначала загрузите исходный PDF.');
      return;
    }

    if (!dataReady) {
      setFeedback('Сначала загрузите данные фаз Луны для выбранного года.');
      return;
    }

    setIsBuildingPreview(true);
    setPreviewError(null);
    setFeedback('Накладываем фазы Луны и собираем предпросмотр PDF...');

    try {
      const result = await buildMoonPhasePdfPreview(effectiveConfig, sourcePdf.bytes);
      const previewBytes = Uint8Array.from(result.bytes);
      const blob = new Blob([previewBytes], { type: 'application/pdf' });
      const nextUrl = URL.createObjectURL(blob);

      replacePreview({
        bytes: previewBytes,
        url: nextUrl,
        byteLength: previewBytes.byteLength,
        annotatedPageCount: result.annotatedPageCount,
        markerCount: result.markerCount,
        totalPageCount: result.totalPageCount,
      });
      setFeedback(`Предпросмотр готов: добавлено ${result.markerCount} лунных меток на ${result.annotatedPageCount} стр.`);
    } catch (error) {
      replacePreview(null);
      const message = error instanceof Error ? error.message : 'Не удалось собрать PDF с фазами Луны.';
      setPreviewError(message);
      setFeedback(message);
    } finally {
      setIsBuildingPreview(false);
    }
  }

  async function handleSavePdf() {
    if (!sourcePdf) {
      setFeedback('Сначала загрузите исходный PDF.');
      return;
    }

    if (!dataReady) {
      setFeedback('Сначала загрузите данные фаз Луны для выбранного года.');
      return;
    }

    setIsSaving(true);

    try {
      const target = await prepareMoonPhasePdfExportTarget(sourcePdf.file.name);
      setFeedback(target.fileHandle
        ? 'Сохраняем новую копию PDF с фазами Луны...'
        : 'Готовим скачивание новой копии PDF с фазами Луны...');

      const result = preview && !isBuildingPreview
        ? await (async () => {
            await savePdfBytes(target, preview.bytes);
            return {
              byteLength: preview.byteLength,
              annotatedPageCount: preview.annotatedPageCount,
              markerCount: preview.markerCount,
              totalPageCount: preview.totalPageCount,
            };
          })()
        : await annotateMoonPhasesPdf(effectiveConfig, sourcePdf.bytes, target);
      const sizeLabel = ` (${formatFileSize(result.byteLength)})`;
      setFeedback(
        target.fileHandle
          ? `PDF сохранен: ${result.markerCount} меток, ${result.annotatedPageCount} стр.${sizeLabel}.`
          : `PDF собран, загрузка начата: ${result.markerCount} меток, ${result.annotatedPageCount} стр.${sizeLabel}.`,
      );
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Не удалось сохранить PDF с фазами Луны.');
    } finally {
      setIsSaving(false);
    }
  }

  function handleYearChange(value: string) {
    const nextYear = Math.min(2100, Math.max(2020, Number(value) || new Date().getFullYear()));
    setSelectedYear(nextYear);
    replacePreview(null);
  }

  const canBuild = Boolean(sourcePdf) && dataReady && !isBuildingPreview && !isSaving;

  return (
    <main className="page-shell">
      <section className="hero hero--templates">
        <div className="hero__grid hero__grid--single">
          <div>
            <a href="#/" className="hero__back-link">
              <span aria-hidden="true">←</span>
              <span>Назад в конструктор</span>
            </a>
            <p className="hero__eyebrow">Moon phases PDF</p>
            <h1 className="hero__title hero__title--compact">Добавление фаз Луны в готовый PDF.</h1>
            <p className="hero__lead">
              Загрузите уже существующий планер, подтяните фазы Луны из U.S. Naval Observatory и сохраните новую копию.
              Метки накладываются поверх страниц по структуре текущего конфига планера.
            </p>

            <div className="hero__actions">
              <a href="#/append-stickers" className="button button--secondary">Добавить стикеры</a>
              <a href="#/astrology-pdf" className="button button--ghost">Добавить астрологию</a>
              <a href={MOON_PHASE_SOURCE_DOCS_URL} target="_blank" rel="noreferrer" className="button button--ghost">
                Источник USNO
              </a>
            </div>

            <div className="hero__status-strip">
              <StatusPill label="Синхронизация" value={`локально · ${formatTime(lastSavedAt)}`} />
              <StatusPill label="Год" value={`${selectedYear}`} />
              <StatusPill label="Данные фаз" value={dataReady ? 'готовы' : 'нужна загрузка'} />
              <StatusPill label="Исходный PDF" value={sourcePdf ? `${sourcePdf.pageCount} стр.` : 'не выбран'} />
            </div>
          </div>
        </div>
      </section>

      {feedback ? <p className="floating-note">{feedback}</p> : null}

      <div className="builder-grid">
        <div className="builder-column">
          <Panel title="Исходный PDF" eyebrow="Шаг 1">
            <p className="muted-copy">
              Выберите PDF, который нужно отредактировать. Исходный файл не перезаписывается: приложение сохранит новую копию.
            </p>

            <div className="background-tools workflow-panel__space">
              <button type="button" onClick={() => openFilePicker(pdfInputRef.current)} className="button button--primary">
                {sourcePdf ? 'Заменить PDF' : 'Загрузить PDF'}
              </button>
            </div>

            {sourcePdf ? (
              <div className="summary-grid">
                <InfoCard label="Файл" value={sourcePdf.file.name} />
                <InfoCard label="Страницы PDF" value={`${sourcePdf.pageCount}`} />
                <InfoCard label="Размер" value={formatFileSize(sourcePdf.file.size)} />
                <InfoCard label="Страницы конфига" value={`${expectedPageCount}`} />
              </div>
            ) : (
              <div className="message-stack workflow-panel__space">
                <p className="message message--warning">PDF пока не загружен.</p>
              </div>
            )}
          </Panel>

          <Panel title="Данные фаз Луны" eyebrow="Шаг 2">
            <p className="muted-copy">
              Данные берутся из USNO Astronomical Applications API. Для корректного января и декабря загружается выбранный год
              вместе с соседними годами.
            </p>

            <label className="field workflow-panel__space">
              <span className="field__label">Год планера</span>
              <input
                type="number"
                min={2020}
                max={2100}
                value={selectedYear}
                onChange={(event) => handleYearChange(event.target.value)}
                className="input"
              />
            </label>

            <div className="summary-grid">
              <InfoCard label="Статус" value={dataReady ? 'готово' : 'нужно обновить'} />
              <InfoCard label="Покрытие" value={moonPhaseYearsLabel} />
              <InfoCard label="Обновлено" value={moonPhaseFetchedAtLabel} />
              <InfoCard label="События USNO" value={`${moonPhases.events.length}`} />
            </div>

            <div className="background-tools workflow-panel__space">
              <button
                type="button"
                onClick={() => void handleFetchMoonData()}
                disabled={isFetchingMoonData}
                className="button button--secondary"
              >
                {isFetchingMoonData ? 'Загрузка...' : dataReady ? 'Обновить данные USNO' : 'Загрузить данные USNO'}
              </button>
            </div>
          </Panel>
        </div>

        <div className="builder-column">
          <Panel title="Наложение на PDF" eyebrow="Шаг 3">
            <p className="muted-copy">
              Инструмент добавляет только лунные метки, не пересобирая страницы. Лучше всего он подходит для PDF,
              экспортированного из текущего конфига планера.
            </p>

            <div className="actions-grid workflow-panel__space">
              <button
                type="button"
                onClick={() => void handleBuildPreview()}
                disabled={!canBuild}
                className="action-card"
              >
                <p className="action-card__title">{isBuildingPreview ? 'Собираем предпросмотр...' : 'Собрать предпросмотр'}</p>
                <p className="action-card__copy">Проверить, где окажутся фазы Луны, перед сохранением файла.</p>
              </button>

              <button
                type="button"
                onClick={() => void handleSavePdf()}
                disabled={!canBuild}
                className="action-card action-card--primary"
              >
                <p className="action-card__title">{isSaving ? 'Сохраняем PDF...' : 'Сохранить PDF с фазами'}</p>
                <p className="action-card__copy">Создать новую копию исходного PDF с наложенными фазами Луны.</p>
              </button>
            </div>

            <div className="message-stack workflow-panel__space">
              {mismatchWarning ? (
                <p className="message message--warning">{mismatchWarning}</p>
              ) : null}

              {!sourcePdf ? (
                <p className="message message--warning">Сначала загрузите PDF.</p>
              ) : null}

              {sourcePdf && !dataReady ? (
                <p className="message message--warning">Загрузите данные USNO для выбранного года.</p>
              ) : null}

              {sourcePdf && dataReady ? (
                <p className="message message--success">Готово к наложению фаз Луны.</p>
              ) : null}
            </div>
          </Panel>

          <Panel title="Что будет добавлено" eyebrow="Метки">
            <div className="summary-grid">
              <InfoCard label="Месяцы" value="короткие метки в ячейках дат" />
              <InfoCard label="Недели" value="метка фазы у каждого дня" />
              <InfoCard label="Дни" value="строка с фазой Луны" />
              <InfoCard label="Источник" value="USNO AA API" />
            </div>
          </Panel>
        </div>
      </div>

      <div className="preview-section">
        <Panel title="Предпросмотр PDF с фазами Луны" eyebrow="Перед сохранением">
          <p className="muted-copy">
            Ниже показывается уже собранный итоговый файл: загруженный PDF с наложенными фазами Луны по текущему конфигу.
            Предпросмотр обновляется автоматически после загрузки PDF, смены года и обновления данных USNO.
          </p>

          {sourcePdf ? (
            <div className="workflow-panel__space">
              <div className="summary-grid">
                <InfoCard label="Страниц PDF" value={preview ? `${preview.totalPageCount}` : isBuildingPreview ? 'собирается' : '—'} />
                <InfoCard label="Страниц с метками" value={preview ? `${preview.annotatedPageCount}` : isBuildingPreview ? 'собирается' : '—'} />
                <InfoCard label="Лунных меток" value={preview ? `${preview.markerCount}` : isBuildingPreview ? 'считаем' : '—'} />
                <InfoCard label="Размер" value={preview ? formatFileSize(preview.byteLength) : isBuildingPreview ? 'собирается' : '—'} />
              </div>

              <div className="message-stack">
                {isBuildingPreview ? (
                  <p className="message message--warning">Собираем предпросмотр итогового PDF с фазами Луны...</p>
                ) : null}

                {previewError ? (
                  <p className="message message--error">{previewError}</p>
                ) : null}

                {preview && !previewError ? (
                  <p className="message message--success">
                    Предпросмотр готов: добавлено {preview.markerCount} лунных меток на {preview.annotatedPageCount} стр.
                  </p>
                ) : null}
              </div>

              {preview ? (
                <div className="pdf-preview-panel">
                  <div className="pdf-preview-panel__actions">
                    <a href={preview.url} target="_blank" rel="noreferrer" className="button button--secondary">
                      Открыть PDF в новой вкладке
                    </a>
                  </div>

                  <div className="pdf-preview-panel__frame">
                    <iframe
                      key={preview.url}
                      src={previewUrl ?? undefined}
                      title="Предпросмотр PDF с фазами Луны"
                      className="pdf-preview-panel__viewer"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="message-stack workflow-panel__space">
              <p className="message message--warning">Сначала загрузите исходный PDF. После этого здесь появится его итоговый предпросмотр с фазами Луны.</p>
            </div>
          )}
        </Panel>
      </div>

      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={handleSourcePdfChange}
        className="hidden-input"
      />
    </main>
  );
}
