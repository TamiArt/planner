import { writeFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { buildPlannerPdfBytes } from '../src/core/export/PdfExportEngine';
import { createDefaultPlannerConfig } from '../src/lib/config/defaultPlannerConfig';

async function main() {
  const config = createDefaultPlannerConfig();
  const pdfBytes = await buildPlannerPdfBytes(config);

  console.log('pdfBytes instanceof Uint8Array:', pdfBytes instanceof Uint8Array);
  console.log('PDF size:', pdfBytes.length);

  writeFileSync('planner-debug.pdf', pdfBytes);

  const loaded = await PDFDocument.load(pdfBytes);
  console.log('Pages:', loaded.getPageCount());
}

void main();
