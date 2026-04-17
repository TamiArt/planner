import type { PDFDocument, PDFFont } from 'pdf-lib';
import * as fontkit from 'fontkit';

export interface PdfFontSet {
  heading: PDFFont;
  body: PDFFont;
  bold: PDFFont;
}

const PDF_FONT_PATHS = {
  regular: '/fonts/arial.ttf',
  bold: '/fonts/arialbd.ttf',
} as const;

function resolvePublicAssetPath(assetPath: string) {
  const baseUrl = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return `${normalizedBase}${assetPath.replace(/^\/+/, '')}`;
}

async function importNodeModule<T>(specifier: string): Promise<T> {
  const dynamicImport = Function('value', 'return import(value)') as (value: string) => Promise<T>;
  return dynamicImport(specifier);
}

async function readBinaryAsset(assetPath: string) {
  if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
    const response = await fetch(resolvePublicAssetPath(assetPath));
    if (!response.ok) {
      throw new Error(`Не удалось загрузить PDF-ресурс ${assetPath}: ${response.status} ${response.statusText}`);
    }

    return new Uint8Array(await response.arrayBuffer());
  }

  const processRef = (globalThis as typeof globalThis & { process?: { cwd: () => string } }).process;
  if (!processRef) {
    throw new Error(`Не удалось определить окружение для загрузки шрифта ${assetPath}.`);
  }

  const { readFile } = await importNodeModule<{ readFile: (path: string) => Promise<Uint8Array> }>('node:fs/promises');
  const absolutePath = `${processRef.cwd().replace(/[\\/]+$/, '')}\\public${assetPath.replace(/\//g, '\\')}`;
  const bytes = await readFile(absolutePath);

  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

export async function loadPdfFonts(pdfDoc: PDFDocument): Promise<PdfFontSet> {
  pdfDoc.registerFontkit(fontkit as never);

  const [regularBytes, boldBytes] = await Promise.all([
    readBinaryAsset(PDF_FONT_PATHS.regular),
    readBinaryAsset(PDF_FONT_PATHS.bold),
  ]);

  const body = await pdfDoc.embedFont(regularBytes, { subset: false });
  const bold = await pdfDoc.embedFont(boldBytes, { subset: false });

  return {
    heading: bold,
    body,
    bold,
  };
}
