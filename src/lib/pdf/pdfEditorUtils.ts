import { PDFDocument } from 'pdf-lib';

export interface UploadedSourcePdf {
  file: File;
  bytes: Uint8Array;
  pageCount: number;
}

export function formatPdfEditorTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '--:--';
  }

  return date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatPdfFileSize(sizeBytes: number) {
  if (sizeBytes >= 1_000_000) {
    return `${(sizeBytes / 1_000_000).toFixed(2)} MB`;
  }

  return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
}

export function openPdfFilePicker(input: HTMLInputElement | null) {
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

export function normalizeSourcePdfError(error: unknown, action: 'edit' | 'append' = 'edit') {
  if (error instanceof Error && /encrypted/i.test(error.message)) {
    return action === 'append'
      ? 'Исходный PDF защищен паролем или шифрованием. Такой файл пока нельзя дополнить.'
      : 'Исходный PDF защищен паролем или шифрованием. Такой файл пока нельзя редактировать.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Не удалось прочитать исходный PDF.';
}

export async function readSourcePdf(file: File): Promise<UploadedSourcePdf> {
  if (!(file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
    throw new Error('Выберите PDF-файл.');
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdfDoc = await PDFDocument.load(bytes);

  return {
    file,
    bytes,
    pageCount: pdfDoc.getPageCount(),
  };
}
