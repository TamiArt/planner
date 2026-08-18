import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatPdfEditorTime,
  formatPdfFileSize,
  normalizeSourcePdfError,
} from '../src/lib/pdf/pdfEditorUtils';

test('formats PDF file sizes consistently', () => {
  assert.equal(formatPdfFileSize(1), '1 KB');
  assert.equal(formatPdfFileSize(1024), '1 KB');
  assert.equal(formatPdfFileSize(1536), '2 KB');
  assert.equal(formatPdfFileSize(1_000_000), '1.00 MB');
  assert.equal(formatPdfFileSize(2_500_000), '2.50 MB');
});

test('returns fallback time for invalid timestamps', () => {
  assert.equal(formatPdfEditorTime('not-a-date'), '--:--');
});

test('uses operation-specific message for encrypted PDFs', () => {
  const error = new Error('Input document is encrypted');

  assert.match(normalizeSourcePdfError(error, 'edit'), /нельзя редактировать/);
  assert.match(normalizeSourcePdfError(error, 'append'), /нельзя дополнить/);
});

test('preserves useful PDF errors and normalizes unknown failures', () => {
  assert.equal(normalizeSourcePdfError(new Error('Broken xref')), 'Broken xref');
  assert.equal(normalizeSourcePdfError(null), 'Не удалось прочитать исходный PDF.');
});
