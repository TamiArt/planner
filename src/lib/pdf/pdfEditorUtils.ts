export interface UploadedSourcePdf {
  file: File;
  bytes: Uint8Array;
  pageCount: number;
}

export function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '--:--';
  }

  return date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatFileSize(sizeBytes: number) {
  if (sizeBytes >= 1_000_000) {
    return `${(sizeBytes / 1_000_000).toFixed(2)} MB`;
  }

  return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
}

export function openFilePicker(input: HTMLInputElement | null) {
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

export function normalizeSourcePdfError(error: unknown, encryptedMessage: string) {
  if (error instanceof Error && /encrypted/i.test(error.message)) {
    return encryptedMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Не удалось прочитать исходный PDF.';
}
