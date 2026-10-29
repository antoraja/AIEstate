// Lists rules that need a human to re-check them: never verified, verified too long ago,
// or about to start/expire. Exits non-zero when anything is found so CI can flag it.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileRules } from '../src/compile.js';

const STALE_AFTER_DAYS = 90;
const CHANGE_WINDOW_DAYS = 60;

const here = dirname(fileURLToPath(import.meta.url));
const bundle = compileRules(resolve(here, '../../../rules'));
const today = process.argv[2] ?? new Date().toISOString().slice(0, 10);
const shift = (days: number) => new Date(Date.parse(today) + days * 86_400_000).toISOString().slice(0, 10);
const staleBefore = shift(-STALE_AFTER_DAYS);
const changeBy = shift(CHANGE_WINDOW_DAYS);

const findings: string[] = [];
for (const j of Object.values(bundle.jurisdictions)) {
  for (const r of j.rules) {
    if (!r.last_verified) findings.push(`${r.id}: never verified (${r.source_type})`);
    else if (r.last_verified < staleBefore) findings.push(`${r.id}: last verified ${r.last_verified}`);
    for (const [label, date] of [['starts', r.effective_from], ['expires', r.effective_to]] as const) {
      if (date && date >= today && date <= changeBy) findings.push(`${r.id}: ${label} ${date}`);
    }
  }
}

console.log(findings.length ? findings.join('\n') : 'No stale or soon-changing rules.');
process.exit(findings.length ? 1 : 0);
