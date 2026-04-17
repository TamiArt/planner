import { PDFDocument } from 'pdf-lib';
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { InfoCard } from '../components/InfoCard';
import { Panel } from '../components/Panel';
import { StatusPill } from '../components/StatusPill';
import { PlannerPageSvg } from '../components/preview/PlannerPageSvg';
import { buildStickerRenderModel } from '../core/render-model';
import { getBackgroundById } from '../lib/assets/assetRegistry';
import {
  appendStickerPagesPdf,
  buildStickerAppendPreviewPdf,
  prepareStickerAppendExportTarget,
} from '../lib/export/appendStickerPagesPdf';
import { savePdfBytes } from '../core/export/PdfExportEngine';
import { removeStickerAssetBlobs } from '../lib/stickers/stickerAssetStorage';
import {
  getStickerGeneratedPageCount,
  getStickerModuleConfig,
  patchStickerModuleConfig,
} from '../lib/stickers/stickerModuleConfig';
import { getStickerCategoryMeta, STICKER_CATEGORY_ORDER } from '../lib/stickers/stickerCatalog';
import { READY_SHEET_ALLOWED_DIMENSIONS_LABEL } from '../lib/stickers/readySheetDimensions';
import { createAutoStickerAsset, createReadyStickerSheet } from '../lib/stickers/uploadStickerAssets';
import { getThemeById } from '../lib/themes/themeRegistry';
import { usePlannerStore } from '../store/plannerStore';
import type { StickerCategory } from '../types/planner';

interface UploadedSourcePdf {
  file: File;
  bytes: Uint8Array;
  pageCount: number;
}

interface FinalPdfPreview {
  bytes: Uint8Array;
  url: string;
  byteLength: number;
  appendedPageCount: number;
  totalPageCount: number;
}

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '--:--';
  }

  return date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes >= 1_000_000) {
    return `${(sizeBytes / 1_000_000).toFixed(2)} MB`;
  }

  return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
}

function openFilePicker(input: HTMLInputElement | null) {
  if (!input) {
    return;
  }

  input.value = '';

  const pickerInput = input as HTMLInputElement & { showPicker?: () => void };
  if (typeof pickerInput.showPicker === 'function') {
    try {
      pickerInput.showPicker();
      return;
    } catch {
      // Fall back to click when showPicker is restricted.
    }
  }

  input.click();
}

function normalizeSourcePdfError(error: unknown) {
  if (error instanceof Error && /encrypted/i.test(error.message)) {
    return 'Исходный PDF защищен паролем или шифрованием. Такой файл пока нельзя дополнить.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Не удалось прочитать исходный PDF.';
}

function getStickerSourceModeLabel(sourceMode: ReturnType<typeof getStickerModuleConfig>['sourceMode']) {
  return sourceMode === 'ready-sheet' ? 'готовые листы' : 'авто из PNG';
}

function getStickerBackgroundModeLabel(backgroundMode: ReturnType<typeof getStickerModuleConfig>['backgroundMode']) {
  return backgroundMode === 'transparent' ? 'прозрачный' : 'белый';
}

export function StickerPdfAppenderPage() {
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const autoStickerInputRef = useRef<HTMLInputElement | null>(null);
  const readySheetInputRef = useRef<HTMLInputElement | null>(null);
  const config = usePlannerStore((state) => state.config);
  const lastSavedAt = usePlannerStore((state) => state.lastSavedAt);
  const updateSection = usePlannerStore((state) => state.updateSection);
  const [sourcePdf, setSourcePdf] = useState<UploadedSourcePdf | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isAppending, setIsAppending] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [finalPreview, setFinalPreview] = useState<FinalPdfPreview | null>(null);
  const [pendingStickerCategory, setPendingStickerCategory] = useState<StickerCategory>('functional');

  const themeName = getThemeById(config.themeId).name;
  const backgroundName = getBackgroundById(config.backgroundId, config.customBackground).name;
  const stickerConfig = useMemo(() => getStickerModuleConfig(config), [config]);
  const stickerRenderModel = useMemo(() => buildStickerRenderModel(config), [config]);
  const stickerPageCount = stickerRenderModel.pages.length;
  const autoStickerItems = stickerConfig.autoPngs ?? [];
  const readySheetItems = stickerConfig.readySheets ?? [];
  const [selectedPageId, setSelectedPageId] = useState(stickerRenderModel.pages[0]?.page.id ?? '');
  const sourcePdfStatus = sourcePdf ? `${sourcePdf.file.name} · загружен` : 'не выбран';

  const stickerCategoryLabels = (stickerConfig.categories?.length ? stickerConfig.categories : STICKER_CATEGORY_ORDER)
    .map((category) => getStickerCategoryMeta(category).label)
    .join(', ');

  const selectedPage = stickerRenderModel.pages.find((page) => page.page.id === selectedPageId)
    ?? stickerRenderModel.pages[0];
  const selectedPageLinks = selectedPage
    ? stickerRenderModel.links.filter((link) => link.sourcePageId === selectedPage.page.id)
    : [];

  useEffect(() => {
    function rehydrateStore() {
      void usePlannerStore.persist.rehydrate();
    }

    function handleStorage(event: StorageEvent) {
      if (event.key !== 'planner-builder-config') {
        return;
      }

      rehydrateStore();
    }

    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    if (!stickerRenderModel.pages.some((page) => page.page.id === selectedPageId)) {
      setSelectedPageId(stickerRenderModel.pages[0]?.page.id ?? '');
    }
  }, [selectedPageId, stickerRenderModel.pages]);

  useEffect(() => {
    if (!finalPreview?.url) {
      return undefined;
    }

    return () => {
      URL.revokeObjectURL(finalPreview.url);
    };
  }, [finalPreview?.url]);

  useEffect(() => {
    const canBuildPreview = Boolean(sourcePdf) && config.modules.stickers.enabled && stickerPageCount > 0;

    if (!canBuildPreview || !sourcePdf) {
      setIsPreviewLoading(false);
      setPreviewError(null);
      setFinalPreview(null);
      return;
    }

    const previewSourcePdf = sourcePdf;
    let isDisposed = false;

    async function buildPreview() {
      setIsPreviewLoading(true);
      setPreviewError(null);

      try {
        const result = await buildStickerAppendPreviewPdf(config, previewSourcePdf.bytes);
        const previewBytes = Uint8Array.from(result.bytes);
        const blob = new Blob([previewBytes], { type: 'application/pdf' });
        const nextUrl = URL.createObjectURL(blob);

        if (isDisposed) {
          URL.revokeObjectURL(nextUrl);
          return;
        }

        setFinalPreview({
          bytes: previewBytes,
          url: nextUrl,
          byteLength: previewBytes.byteLength,
          appendedPageCount: result.appendedPageCount,
          totalPageCount: result.totalPageCount,
        });
      } catch (error) {
        if (isDisposed) {
          return;
        }

        setFinalPreview(null);
        setPreviewError(error instanceof Error ? error.message : 'Не удалось подготовить предпросмотр итогового PDF.');
      } finally {
        if (!isDisposed) {
          setIsPreviewLoading(false);
        }
      }
    }

    void buildPreview();

    return () => {
      isDisposed = true;
    };
  }, [config, sourcePdf, stickerPageCount]);

  function updateStickerConfig(patch: Partial<ReturnType<typeof getStickerModuleConfig>>) {
    const nextConfig = patchStickerModuleConfig(config, patch);

    updateSection('stickers', {
      enabled: nextConfig.enabled,
      count: getStickerGeneratedPageCount(nextConfig),
      variant: nextConfig.sourceMode === 'ready-sheet' ? 'ready-sheet-template' : 'sticker-sheet-template',
      options: nextConfig as unknown as Record<string, unknown>,
    });
  }

  function handleAutoStickerUploadClick() {
    openFilePicker(autoStickerInputRef.current);
  }

  function handleReadySheetUploadClick() {
    openFilePicker(readySheetInputRef.current);
  }

  async function handleSourcePdfChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      if (!(file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
        throw new Error('Выберите PDF-файл.');
      }

      const bytes = new Uint8Array(await file.arrayBuffer());
      const pdfDoc = await PDFDocument.load(bytes);
      const nextSourcePdf = {
        file,
        bytes,
        pageCount: pdfDoc.getPageCount(),
      } satisfies UploadedSourcePdf;

      setSourcePdf(nextSourcePdf);
      setFeedback(`Исходный PDF "${file.name}" загружен: ${nextSourcePdf.pageCount} стр.`);
    } catch (error) {
      setSourcePdf(null);
      setFeedback(normalizeSourcePdfError(error));
    } finally {
      event.target.value = '';
    }
  }

  async function handleAutoStickerUploadChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    const createdAssets: Awaited<ReturnType<typeof createAutoStickerAsset>>[] = [];

    if (files.length === 0) {
      return;
    }

    try {
      for (const file of files) {
        const createdAsset = await createAutoStickerAsset(file, pendingStickerCategory, stickerConfig.backgroundMode);
        createdAssets.push(createdAsset);
      }

      const currentCategories = stickerConfig.categories?.length ? stickerConfig.categories : STICKER_CATEGORY_ORDER;

      updateStickerConfig({
        enabled: true,
        sourceMode: 'auto-png-pack',
        categories: currentCategories.includes(pendingStickerCategory)
          ? currentCategories
          : [pendingStickerCategory, ...currentCategories],
        autoPngs: [...autoStickerItems, ...createdAssets],
      });

      setFeedback(
        `Добавлено ${createdAssets.length} PNG в категорию "${getStickerCategoryMeta(pendingStickerCategory).label}".`,
      );
    } catch (error) {
      if (createdAssets.length > 0) {
        await removeStickerAssetBlobs(createdAssets.map((item) => item.storageId));
      }

      setFeedback(error instanceof Error ? error.message : 'Не удалось загрузить PNG со стикером.');
    } finally {
      event.target.value = '';
    }
  }

  async function handleReadySheetUploadChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    const createdSheets: Awaited<ReturnType<typeof createReadyStickerSheet>>[] = [];

    if (files.length === 0) {
      return;
    }

    try {
      for (const file of files) {
        const createdSheet = await createReadyStickerSheet(file);
        createdSheets.push(createdSheet);
      }

      updateStickerConfig({
        enabled: true,
        sourceMode: 'ready-sheet',
        readySheets: [...readySheetItems, ...createdSheets],
      });

      setFeedback(`Добавлено ${createdSheets.length} страниц готовых листов.`);
    } catch (error) {
      if (createdSheets.length > 0) {
        await removeStickerAssetBlobs(createdSheets.map((item) => item.storageId));
      }

      setFeedback(error instanceof Error ? error.message : 'Не удалось загрузить PNG готового листа.');
    } finally {
      event.target.value = '';
    }
  }

  async function handleAppendExport() {
    if (!sourcePdf) {
      setFeedback('Сначала загрузите исходный PDF.');
      return;
    }

    setIsAppending(true);

    try {
      const target = await prepareStickerAppendExportTarget(sourcePdf.file.name);
      setFeedback(target.fileHandle
        ? 'Собираем sticker pages и сохраняем новый PDF в выбранный файл...'
        : 'Собираем sticker pages и подготавливаем скачивание нового PDF...');

      const result = finalPreview && !isPreviewLoading
        ? await (async () => {
            await savePdfBytes(target, finalPreview.bytes);
            return {
              byteLength: finalPreview.byteLength,
              appendedPageCount: finalPreview.appendedPageCount,
              totalPageCount: finalPreview.totalPageCount,
            };
          })()
        : await appendStickerPagesPdf(config, sourcePdf.bytes, target);
      const sizeLabel = ` (${formatFileSize(result.byteLength)})`;
      setFeedback(
        target.fileHandle
          ? `Новый PDF сохранен: было ${sourcePdf.pageCount} стр., добавлено ${result.appendedPageCount}, итог ${result.totalPageCount}${sizeLabel}.`
          : `Новый PDF собран, загрузка начата: было ${sourcePdf.pageCount} стр., добавлено ${result.appendedPageCount}, итог ${result.totalPageCount}${sizeLabel}.`,
      );
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Не удалось дополнить исходный PDF.');
    } finally {
      setIsAppending(false);
    }
  }

  async function handleRemoveAutoSticker(assetId: string) {
    const asset = autoStickerItems.find((item) => item.id === assetId);

    if (!asset) {
      return;
    }

    await removeStickerAssetBlobs([asset.storageId]);
    updateStickerConfig({
      autoPngs: autoStickerItems.filter((item) => item.id !== assetId),
    });
    setFeedback(`Стикер "${asset.name}" удален из текущей конфигурации sticker pages.`);
  }

  async function handleRemoveReadySheet(sheetId: string) {
    const sheet = readySheetItems.find((item) => item.id === sheetId);

    if (!sheet) {
      return;
    }

    await removeStickerAssetBlobs([sheet.storageId]);
    updateStickerConfig({
      readySheets: readySheetItems.filter((item) => item.id !== sheetId),
    });
    setFeedback(`Готовая sticker page "${sheet.name}" удалена из текущей конфигурации.`);
  }

  const canAppend = Boolean(sourcePdf) && stickerPageCount > 0 && config.modules.stickers.enabled && !isAppending;
  const finalPreviewUrl = finalPreview ? `${finalPreview.url}#toolbar=1&navpanes=0&view=FitH` : null;

  return (
    <main className="page-shell">
      <section className="hero hero--templates">
        <div className="hero__grid hero__grid--single">
          <div>
            <a href="#/" className="hero__back-link">
              <span aria-hidden="true">←</span>
              <span>Назад в конструктор</span>
            </a>
            <p className="hero__eyebrow">Append PDF</p>
            <h1 className="hero__title hero__title--compact">Добавление sticker pages в уже готовый PDF.</h1>
            <p className="hero__lead">
              Этот экран не пересобирает исходный документ с нуля. Он берет выбранный PDF, генерирует страницы со
              стикерами текущим движком и дописывает их в конец нового файла, сохраняя исходные страницы как есть.
            </p>

            <div className="hero__actions">
              <a href="#/templates" className="button button--secondary">Открыть шаблоны</a>
              <a href="#/moon-phases-pdf" className="button button--ghost">Добавить фазы Луны</a>
              <a href="#/astrology-pdf" className="button button--ghost">Добавить астрологию</a>
            </div>

            <div className="hero__status-strip">
              <StatusPill label="Синхронизация" value={`локально · ${formatTime(lastSavedAt)}`} />
              <StatusPill label="Sticker pages" value={`${stickerPageCount} стр.`} />
              <StatusPill label="Исходный PDF" value={sourcePdf ? `${sourcePdfStatus} · ${sourcePdf.pageCount} стр.` : 'не выбран'} />
            </div>
          </div>
        </div>
      </section>

      {feedback ? <p className="floating-note">{feedback}</p> : null}

      <div className="builder-grid">
        <div className="builder-column">
          <Panel title="Исходный PDF" eyebrow="Шаг 1">
            <p className="muted-copy">
              Выберите готовый PDF-файл, который нужно дополнить. Защищенные паролем PDF пока не поддерживаются.
            </p>

            <div className="background-tools">
              <button type="button" onClick={() => openFilePicker(pdfInputRef.current)} className="button button--primary">
                {sourcePdf ? 'Заменить PDF' : 'Загрузить PDF'}
              </button>
            </div>

            {sourcePdf ? (
              <div className="append-upload-state workflow-panel__space">
                <p className="small-label">PDF загружен</p>
                <h3 className="append-upload-state__title">{sourcePdf.file.name}</h3>
                <p className="append-upload-state__copy">
                  Этот файл уже прочитан приложением. Все существующие страницы и данные исходного PDF будут сохранены,
                  а sticker pages только добавятся в конец нового файла.
                </p>

                <div className="append-upload-state__meta">
                  <InfoCard label="Страницы" value={`${sourcePdf.pageCount}`} />
                  <InfoCard label="Размер файла" value={formatFileSize(sourcePdf.file.size)} />
                  <InfoCard label="Будет добавлено" value={`${stickerPageCount} sticker pages`} />
                </div>

                <div className="background-tools append-upload-state__actions">
                  <button
                    type="button"
                    onClick={stickerConfig.sourceMode === 'ready-sheet' ? handleReadySheetUploadClick : handleAutoStickerUploadClick}
                    disabled={isAppending}
                    className="button button--primary"
                  >
                    {stickerConfig.sourceMode === 'ready-sheet' ? 'Добавить ready sheet' : 'Добавить PNG-стикеры'}
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleAppendExport()}
                    disabled={!canAppend}
                    className="button button--secondary"
                  >
                    {isAppending ? 'Сохраняем новый PDF...' : 'Сохранить PDF со стикерами'}
                  </button>

                  <button
                    type="button"
                    onClick={() => openFilePicker(pdfInputRef.current)}
                    disabled={isAppending}
                    className="button button--secondary"
                  >
                    Выбрать другой PDF
                  </button>
                </div>
              </div>
            ) : null}

            {sourcePdf ? (
              <div className="summary-grid">
                <InfoCard label="Файл" value={sourcePdf.file.name} />
                <InfoCard label="Страницы" value={`${sourcePdf.pageCount}`} />
                <InfoCard label="Размер" value={formatFileSize(sourcePdf.file.size)} />
              </div>
            ) : (
              <div className="message-stack workflow-panel__space">
                <p className="message message--warning">PDF пока не загружен. После выбора файла здесь появится его сводка и действия.</p>
              </div>
            )}
          </Panel>

          <Panel title="Новый PDF" eyebrow="Шаг 2">
            <p className="muted-copy">
              В конец файла добавятся только сгенерированные sticker pages. Текущий движок рендерит их в формате
              2048 × 1536, а готовые листы стикеров принимает в размере {READY_SHEET_ALLOWED_DIMENSIONS_LABEL}.
              Итоговый документ может содержать страницы разного размера, если исходный PDF был другого формата.
            </p>

            <div className="actions-grid workflow-panel__space">
              <button
                type="button"
                onClick={() => void handleAppendExport()}
                disabled={!canAppend}
                className="action-card action-card--primary"
              >
                <p className="action-card__title">{isAppending ? 'Собираем новый PDF...' : 'Сохранить PDF с добавленными стикерами'}</p>
                <p className="action-card__copy">Исходный PDF сохраняется полностью, а стикер-страницы дописываются в конец нового файла.</p>
              </button>

              <a href="#/" className="action-card">
                <p className="action-card__title">Проверить конфиг</p>
                <p className="action-card__copy">Если страниц со стикерами нет, вернитесь в конструктор и настройте модуль stickers.</p>
              </a>
            </div>

            <div className="message-stack workflow-panel__space">
              {!config.modules.stickers.enabled ? (
                <p className="message message--error">Модуль стикеров сейчас выключен. Включите его в конструкторе перед append-экспортом.</p>
              ) : null}

              {config.modules.stickers.enabled && stickerPageCount === 0 ? (
                <p className="message message--error">Текущая конфигурация не создает sticker pages. Добавьте PNG или готовые листы.</p>
              ) : null}

              {config.modules.stickers.enabled && stickerPageCount > 0 ? (
                <p className="message message--success">Sticker pages готовы к добавлению: {stickerPageCount} стр.</p>
              ) : null}
            </div>
          </Panel>
        </div>

        <div className="builder-column">
          <Panel title="Что будет добавлено" eyebrow="Текущий конфиг">
            <p className="muted-copy">
              Источник для sticker pages берется из текущей конфигурации конструктора, поэтому эта вкладка автоматически
              подхватывает изменения, если вы редактируете stickers в соседней вкладке.
            </p>

            <div className="summary-grid">
              <InfoCard label="Тема" value={themeName} />
              <InfoCard label="Фон" value={backgroundName} />
              <InfoCard label="Режим стикеров" value={getStickerSourceModeLabel(stickerConfig.sourceMode)} />
              <InfoCard label="Фон стикеров" value={getStickerBackgroundModeLabel(stickerConfig.backgroundMode)} />
              <InfoCard label="Категории" value={stickerCategoryLabels} />
              <InfoCard label="Готовые листы" value={`${readySheetItems.length}`} />
              <InfoCard label="PNG-файлы" value={`${autoStickerItems.length}`} />
              <InfoCard label="Размер страницы" value={`${stickerRenderModel.width} × ${stickerRenderModel.height}`} />
            </div>
          </Panel>
        </div>
      </div>

      <div className="preview-section">
        <Panel title="Предпросмотр итогового PDF" eyebrow="Перед сохранением">
          <p className="muted-copy">
            Ниже показывается уже собранный итоговый файл: исходный PDF со всеми его страницами плюс новые sticker pages
            в конце. Предпросмотр обновляется автоматически после загрузки PDF или изменения набора стикеров.
          </p>

          {sourcePdf ? (
            <div className="workflow-panel__space">
              <div className="summary-grid">
                <InfoCard label="Исходных страниц" value={`${sourcePdf.pageCount}`} />
                <InfoCard label="Будет добавлено" value={`${stickerPageCount}`} />
                <InfoCard label="Итоговый файл" value={finalPreview ? `${finalPreview.totalPageCount} стр.` : 'собирается'} />
                <InfoCard label="Размер предпросмотра" value={finalPreview ? formatFileSize(finalPreview.byteLength) : '...'} />
              </div>

              <div className="message-stack">
                {isPreviewLoading ? (
                  <p className="message message--warning">Собираем предпросмотр итогового PDF...</p>
                ) : null}

                {previewError ? (
                  <p className="message message--error">{previewError}</p>
                ) : null}

                {!config.modules.stickers.enabled ? (
                  <p className="message message--error">Чтобы собрать финальный предпросмотр, включите модуль stickers в конструкторе.</p>
                ) : null}

                {config.modules.stickers.enabled && stickerPageCount === 0 ? (
                  <p className="message message--warning">Добавьте хотя бы один PNG или готовую sticker page, чтобы увидеть итоговый PDF.</p>
                ) : null}

                {finalPreview && !previewError ? (
                  <p className="message message--success">
                    Предпросмотр готов: было {sourcePdf.pageCount} стр., добавлено {finalPreview.appendedPageCount}, итог {finalPreview.totalPageCount} стр.
                  </p>
                ) : null}
              </div>

              {finalPreview ? (
                <div className="pdf-preview-panel">
                  <div className="pdf-preview-panel__actions">
                    <a
                      href={finalPreview.url}
                      target="_blank"
                      rel="noreferrer"
                      className="button button--secondary"
                    >
                      Открыть итоговый PDF в новой вкладке
                    </a>
                  </div>

                  <div className="pdf-preview-panel__frame">
                    <iframe
                      key={finalPreview.url}
                      src={finalPreviewUrl ?? undefined}
                      title="Предпросмотр итогового PDF"
                      className="pdf-preview-panel__viewer"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="message-stack workflow-panel__space">
              <p className="message message--warning">Сначала загрузите исходный PDF. После этого здесь появится его итоговый предпросмотр со sticker pages.</p>
            </div>
          )}
        </Panel>

        <Panel title="Предпросмотр sticker pages" eyebrow="RenderModel">
          {selectedPage ? (
            <div className="preview-workbench">
              <div className="preview-workbench__sidebar">
                {stickerRenderModel.pages.map((page) => (
                  <button
                    key={page.page.id}
                    type="button"
                    onClick={() => setSelectedPageId(page.page.id)}
                    className={`preview-workbench__page-button${page.page.id === selectedPage.page.id ? ' preview-workbench__page-button--active' : ''}`}
                  >
                    <strong>{page.page.title}</strong>
                    <span>{page.page.label}</span>
                  </button>
                ))}
              </div>

              <div className="preview-workbench__stage">
                <div className="planner-preview planner-preview--rendered">
                  <div className="planner-preview__canvas">
                    <div className="planner-preview__paper planner-preview__paper--svg">
                      <PlannerPageSvg
                        page={selectedPage}
                        links={selectedPageLinks}
                        theme={stickerRenderModel.theme}
                        onNavigate={setSelectedPageId}
                      />
                    </div>
                  </div>
                </div>

                <div className="preview-workbench__meta">
                  <InfoCard label="Текущая страница" value={selectedPage.page.title} />
                  <InfoCard label="Ссылка prev/next" value={`${selectedPageLinks.length}`} />
                  <InfoCard label="Всего sticker pages" value={`${stickerRenderModel.pages.length}`} />
                </div>

                <div className="preview-manager">
                  <div className="preview-manager__header">
                    <div>
                      <p className="small-label">Управление файлами</p>
                      <h3 className="preview-manager__title">Удаление загруженных стикеров</h3>
                    </div>
                    <p className="preview-manager__copy">
                      Здесь можно убрать PNG-стикеры или готовые sticker pages из текущего набора перед сохранением нового PDF.
                    </p>
                  </div>

                  <div className="preview-manager__grid">
                    <article className="surface-block preview-manager__panel">
                      <p className="small-label">PNG stickers</p>
                      <p className="preview-manager__count">{autoStickerItems.length} файлов</p>
                      <div className="background-tools preview-manager__controls">
                        <label className="field preview-manager__field">
                          <span className="field__label">Категория PNG</span>
                          <select
                            value={pendingStickerCategory}
                            onChange={(event) => setPendingStickerCategory(event.target.value as StickerCategory)}
                            disabled={isAppending}
                            className="select"
                          >
                            {STICKER_CATEGORY_ORDER.map((category) => (
                              <option key={category} value={category}>
                                {getStickerCategoryMeta(category).label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          type="button"
                          onClick={handleAutoStickerUploadClick}
                          disabled={isAppending}
                          className="button button--secondary"
                        >
                          {autoStickerItems.length > 0 ? 'Добавить ещё PNG' : 'Добавить PNG'}
                        </button>
                      </div>
                      <div className="sticker-upload-grid">
                        {autoStickerItems.length > 0 ? autoStickerItems.map((item) => (
                          <article key={item.id} className="sticker-upload-card">
                            <div className="sticker-upload-card__preview">
                              <img src={item.previewSource} alt={item.name} className="sticker-upload-card__image" />
                            </div>
                            <div>
                              <p className="sticker-upload-card__title">{item.name}</p>
                              <p className="sticker-upload-card__meta">
                                {getStickerCategoryMeta(item.category).label} · {item.width}×{item.height} · {formatFileSize(item.sizeBytes)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => void handleRemoveAutoSticker(item.id)}
                              disabled={isAppending}
                              className="action-button"
                            >
                              Удалить
                            </button>
                          </article>
                        )) : (
                          <p className="muted-copy">PNG-стикеры пока не загружены.</p>
                        )}
                      </div>
                    </article>

                    <article className="surface-block preview-manager__panel">
                      <p className="small-label">Ready sheets</p>
                      <p className="preview-manager__count">{readySheetItems.length} файлов</p>
                      <div className="background-tools preview-manager__controls">
                        <button
                          type="button"
                          onClick={handleReadySheetUploadClick}
                          disabled={isAppending}
                          className="button button--secondary"
                        >
                          {readySheetItems.length > 0 ? 'Добавить ещё листы' : 'Добавить ready sheet'}
                        </button>
                      </div>
                      <div className="sticker-upload-grid">
                        {readySheetItems.length > 0 ? readySheetItems.map((sheet) => (
                          <article key={sheet.id} className="sticker-upload-card sticker-upload-card--sheet">
                            <div className="sticker-upload-card__preview sticker-upload-card__preview--sheet">
                              <img src={sheet.previewSource} alt={sheet.name} className="sticker-upload-card__image" />
                            </div>
                            <div>
                              <p className="sticker-upload-card__title">{sheet.name}</p>
                              <p className="sticker-upload-card__meta">{sheet.width}×{sheet.height} · {formatFileSize(sheet.sizeBytes)}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => void handleRemoveReadySheet(sheet.id)}
                              disabled={isAppending}
                              className="action-button"
                            >
                              Удалить
                            </button>
                          </article>
                        )) : (
                          <p className="muted-copy">Готовые sticker pages пока не загружены. Поддерживается размер {READY_SHEET_ALLOWED_DIMENSIONS_LABEL}.</p>
                        )}
                      </div>
                    </article>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="message-stack">
              <p className="message message--warning">Предпросмотр пока пуст. Сначала настройте модуль stickers в конструкторе.</p>
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

      <input
        ref={autoStickerInputRef}
        type="file"
        accept="image/png,.png"
        multiple
        onChange={handleAutoStickerUploadChange}
        className="hidden-input"
      />

      <input
        ref={readySheetInputRef}
        type="file"
        accept="image/png,.png"
        multiple
        onChange={handleReadySheetUploadChange}
        className="hidden-input"
      />
    </main>
  );
}
