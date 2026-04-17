import { PDFDocument } from 'pdf-lib';
import type { PlannerConfig } from '../../types/planner';
import { buildPlannerPdfBytes, savePdfBytes, type PdfExportTarget, type SaveFilePickerHandle } from '../../core/export/PdfExportEngine';
import { loadPdfFonts } from '../../core/export/pdfFonts';
import { validatePlannerConfig } from '../validators/plannerConfigValidator';

export type { PdfExportTarget } from '../../core/export/PdfExportEngine';

const DOWNLOAD_OBJECT_URL_TTL_MS = 5 * 60 * 1000;
const activeDownloadPayloads = new Map<string, Blob>();
let downloadCleanupRegistered = false;

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-zа-я0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function cleanupDownloadUrl(url: string) {
  activeDownloadPayloads.delete(url);
  URL.revokeObjectURL(url);
}

function ensureDownloadCleanupHook() {
  if (downloadCleanupRegistered || typeof window === 'undefined') {
    return;
  }

  const releaseAll = () => {
    Array.from(activeDownloadPayloads.keys()).forEach((url) => cleanupDownloadUrl(url));
  };

  window.addEventListener('pagehide', releaseAll);
  window.addEventListener('beforeunload', releaseAll);
  downloadCleanupRegistered = true;
}

function createPersistentDownloadUrl(blob: Blob) {
  const url = URL.createObjectURL(blob);
  activeDownloadPayloads.set(url, blob);
  ensureDownloadCleanupHook();
  return url;
}

function triggerBrowserDownload(link: HTMLAnchorElement) {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      link.click();
      resolve();
    });
  });
}

async function downloadBlob(filename: string, blob: Blob) {
  const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
  const url = createPersistentDownloadUrl(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  await triggerBrowserDownload(link);

  window.setTimeout(() => {
    link.remove();
  }, 30 * 1000);

  window.setTimeout(() => {
    cleanupDownloadUrl(url);
  }, DOWNLOAD_OBJECT_URL_TTL_MS);
}

async function showPdfSavePicker(filename: string): Promise<SaveFilePickerHandle | undefined> {
  const pickerWindow = window as Window & {
    showSaveFilePicker?: (options?: {
      suggestedName?: string;
      types?: Array<{
        description: string;
        accept: Record<string, string[]>;
      }>;
    }) => Promise<SaveFilePickerHandle>;
  };

  if (typeof pickerWindow.showSaveFilePicker !== 'function') {
    return undefined;
  }

  try {
    return await pickerWindow.showSaveFilePicker({
      suggestedName: filename,
      types: [
        {
          description: 'PDF-файл планера',
          accept: {
            'application/pdf': ['.pdf'],
          },
        },
      ],
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Экспорт отменен пользователем.');
    }

    throw error;
  }
}

export async function preparePdfFileTarget(filename: string): Promise<PdfExportTarget> {
  return {
    filename,
    fileHandle: await showPdfSavePicker(filename),
  };
}

function buildFileStem(config: PlannerConfig) {
  const base = slugify(config.title || 'planner');
  return `${base}-${config.mode}${config.mode === 'dated' && config.year ? `-${config.year}` : ''}`;
}

function buildUsageGuide(config: PlannerConfig) {
  const backgroundLabel = config.customBackground?.id === config.backgroundId
    ? config.customBackground.type === 'color'
      ? `${config.customBackground.name} (custom color)`
      : config.customBackground.variant === 'generated-gradient'
        ? `${config.customBackground.name} (custom gradient)`
      : `${config.customBackground.name} (uploaded photo)`
    : config.backgroundId;
  const coverLabel = config.coverImage
    ? `${config.coverImage.name} (${config.coverImage.width}×${config.coverImage.height})`
    : 'не задана';
  const pageBackgroundLabel = config.pageBackgroundImage
    ? `${config.pageBackgroundImage.name} (${config.pageBackgroundImage.width}×${config.pageBackgroundImage.height})`
    : 'не задан';

  return [
    `Инструкция по использованию: ${config.title}`,
    '',
    'Этот файл создан как цифровой планер для PDF-аннотаторов.',
    '',
    'Рекомендуемые приложения:',
    '- Goodnotes',
    '- Notability',
    '- Samsung Notes',
    '- Xodo',
    '- Noteshelf',
    '',
    'Как использовать:',
    '1. Откройте PDF в выбранном приложении.',
    '2. Перемещайтесь по документу через вкладки справа и через Index.',
    '3. Пишите поверх страниц стилусом или клавиатурой.',
    '4. Sticker sheets разделены на 3 категории: функциональные, декоративные, эмодзи / иконки.',
    '5. Sticker sheets служат встроенной визуальной библиотекой. Копирование и вставка элементов зависит от возможностей вашего PDF-приложения.',
    '6. Для декора и вставки собственных PNG используйте инструменты самого приложения, а не PDF.',
    '',
    `Режим: ${config.mode}${config.mode === 'dated' && config.year ? ` (${config.year})` : ''}`,
    `Тема: ${config.themeId}`,
    `Фон: ${backgroundLabel}`,
    `Прозрачность фона: ${Math.round(config.backgroundOpacity * 100)}%`,
    `Обложка PNG: ${coverLabel}`,
    `Фон листов PNG: ${pageBackgroundLabel}`,
  ].join('\n');
}

export function downloadPlannerConfig(config: PlannerConfig) {
  const blob = new Blob([JSON.stringify(config, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  void downloadBlob(`${buildFileStem(config)}.json`, blob);
}

export function downloadUsageGuide(config: PlannerConfig) {
  void (async () => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([842, 595]);
    const fonts = await loadPdfFonts(pdfDoc);
    const lines = buildUsageGuide(config).split('\n');

    page.drawText('Instruction', {
      x: 48,
      y: 548,
      size: 24,
      font: fonts.heading,
    });

    lines.forEach((line, index) => {
      page.drawText(line || ' ', {
        x: 48,
        y: 512 - index * 16,
        size: 11,
        font: fonts.body,
      });
    });

    const bytes = await pdfDoc.save({ useObjectStreams: false });
    await savePdfBytes({ filename: 'instruction.pdf' }, Uint8Array.from(bytes));
  })();
}

export async function preparePdfExportTarget(config: PlannerConfig): Promise<PdfExportTarget> {
  return preparePdfFileTarget(`${buildFileStem(config)}.pdf`);
}

export async function exportPlannerPdf(config: PlannerConfig, target?: PdfExportTarget) {
  const validation = validatePlannerConfig(config);
  if (validation.errors.length > 0) {
    throw new Error(validation.errors.join(' '));
  }

  // Capture the save target while we are still inside the original user gesture.
  // Building the PDF can take long enough for the browser to reject showSaveFilePicker.
  const exportTarget = target ?? await preparePdfExportTarget(config);
  const bytes = await buildPlannerPdfBytes(config);
  return savePdfBytes(exportTarget, bytes);
}
