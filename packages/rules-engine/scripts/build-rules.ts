import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RulesError, compileRules } from '../src/compile.js';

const here = dirname(fileURLToPath(import.meta.url));
const rulesDir = resolve(here, '../../../rules');
const outFile = resolve(here, '../generated/rules.json');

try {
  const bundle = compileRules(rulesDir);
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, JSON.stringify(bundle));
  const ruleCount = Object.values(bundle.jurisdictions).reduce((n, j) => n + j.rules.length, 0);
  console.log(`Compiled ${ruleCount} rules for ${Object.keys(bundle.jurisdictions).length} countries -> ${outFile}`);
} catch (e) {
  if (e instanceof RulesError) {
    console.error(e.message);
    process.exit(1);
  }
  throw e;
}
