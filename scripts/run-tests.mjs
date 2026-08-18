import { mkdir, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const outputDirectory = '.test-cache';
const outputFile = `${outputDirectory}/layoutOperations.test.mjs`;

await mkdir(outputDirectory, { recursive: true });

try {
  await build({
    entryPoints: ['tests/layoutOperations.test.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: outputFile,
  });
  await import(`${pathToFileURL(`${process.cwd()}/${outputFile}`).href}?t=${Date.now()}`);
} finally {
  await rm(outputDirectory, { recursive: true, force: true });
}
