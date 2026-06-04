#!/usr/bin/env node
// Lightweight syntax check for the React + Vite source tree.
// Walks src/ and uses esbuild (already a Vite transitive dep) to parse each file.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform } from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, '..', 'src');
const EXTENSIONS = new Set(['.js', '.jsx', '.mjs']);

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      yield full;
    }
  }
}

const errors = [];
let count = 0;

for await (const file of walk(SRC)) {
  count += 1;
  const source = await fs.readFile(file, 'utf8');
  const loader = file.endsWith('.jsx') ? 'jsx' : 'js';
  try {
    await transform(source, { loader, sourcefile: file, sourcemap: false });
  } catch (error) {
    errors.push({ file, message: error.message });
  }
}

if (errors.length > 0) {
  console.error(`\u2717 ${errors.length} file(s) failed syntax check:`);
  for (const err of errors) {
    console.error(`\n  ${path.relative(process.cwd(), err.file)}`);
    console.error(`  ${err.message}`);
  }
  process.exit(1);
}

console.log(`\u2713 Syntax OK across ${count} files in src/.`);
