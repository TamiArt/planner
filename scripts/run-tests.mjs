import { mkdir, readdir, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const outputDirectory = '.test-cache';

await mkdir(outputDirectory, { recursive: true });

try {
  const entries = await readdir('tests', { withFileTypes: true });
  const testFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.test.ts'))
    .map((entry) => `tests/${entry.name}`)
    .sort();

  if (testFiles.length === 0) {
    throw new Error('No test files found in tests/*.test.ts');
  }

  for (const [index, testFile] of testFiles.entries()) {
    const outputFile = `${outputDirectory}/test-${index}.mjs`;
    await build({
      entryPoints: [testFile],
      bundle: true,
      platform: 'node',
      format: 'esm',
      outfile: outputFile,
    });
    await import(`${pathToFileURL(`${process.cwd()}/${outputFile}`).href}?t=${Date.now()}`);
  }
} finally {
  await rm(outputDirectory, { recursive: true, force: true });
}
