// Node-only: loads rules/*.yaml, validates them and produces the bundle the app ships.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import Ajv, { type ValidateFunction } from 'ajv';
import yaml from 'js-yaml';
import schema from '../schema/rules.schema.json' with { type: 'json' };
import type { AppliesTo, Jurisdiction, RulesBundle, SpecialStatus } from './types.js';

export const META_FILE = '_meta.yaml';

interface Meta {
  groups: Record<string, string[]>;
  special_statuses: SpecialStatus[];
}

function validator(name: 'jurisdiction' | 'meta'): ValidateFunction {
  const ajv = new Ajv({ allErrors: true, strict: false });
  ajv.addSchema(schema);
  return ajv.compile({ $ref: `${schema.$id}#/${name}` });
}

function loadYaml(path: string): unknown {
  // CORE_SCHEMA keeps dates as plain strings instead of turning them into Date objects.
  return yaml.load(readFileSync(path, 'utf8'), { schema: yaml.CORE_SCHEMA });
}

export class RulesError extends Error {
  constructor(public readonly problems: string[]) {
    super(`Invalid rules:\n  - ${problems.join('\n  - ')}`);
  }
}

/** Reads and validates every rules file in `dir`. Throws RulesError listing every problem found. */
export function compileRules(dir: string, generatedAt = new Date().toISOString()): RulesBundle {
  const problems: string[] = [];
  const validateMeta = validator('meta');
  const validateJurisdiction = validator('jurisdiction');

  const meta = loadYaml(join(dir, META_FILE));
  if (!validateMeta(meta)) {
    throw new RulesError(validateMeta.errors!.map((e) => `${META_FILE}${e.instancePath}: ${e.message}`));
  }
  const { groups, special_statuses } = meta as Meta;
  const specialIds = new Set(special_statuses.map((s) => s.id));

  const expand = (where: string, refs: string[] | undefined) =>
    refs?.flatMap((ref) => {
      if (!ref.startsWith('@')) return [ref];
      const members = groups[ref.slice(1)];
      if (!members) problems.push(`${where}: unknown group ${ref}`);
      return members ?? [];
    });

  const jurisdictions: Record<string, Jurisdiction> = {};
  const ruleIds = new Set<string>();
  const files = readdirSync(dir).filter((f) => /^[A-Z]{2}\.yaml$/.test(f)).sort();

  for (const file of files) {
    const doc = loadYaml(join(dir, file));
    if (!validateJurisdiction(doc)) {
      problems.push(...validateJurisdiction.errors!.map((e) => `${file}${e.instancePath}: ${e.message}`));
      continue;
    }
    const j = doc as Jurisdiction;
    if (`${j.country}.yaml` !== file) problems.push(`${file}: country ${j.country} does not match file name`);
    const zoneIds = new Set(j.zones.map((z) => z.id));

    for (const rule of j.rules) {
      const where = `${file} ${rule.id}`;
      if (ruleIds.has(rule.id)) problems.push(`${where}: duplicate rule id`);
      ruleIds.add(rule.id);
      for (const z of rule.zones ?? []) if (!zoneIds.has(z)) problems.push(`${where}: unknown zone ${z}`);
      const a: AppliesTo = rule.applies_to;
      for (const s of [...(a.special_any ?? []), ...(a.special_none ?? [])]) {
        if (!specialIds.has(s)) problems.push(`${where}: unknown special status ${s}`);
      }
      if (rule.effective_from && rule.effective_to && rule.effective_from >= rule.effective_to) {
        problems.push(`${where}: effective_from must be before effective_to`);
      }
      a.citizenship_any = expand(where, a.citizenship_any);
      a.citizenship_none = expand(where, a.citizenship_none);
      if (!a.citizenship_any) delete a.citizenship_any;
      if (!a.citizenship_none) delete a.citizenship_none;
    }
    jurisdictions[j.country] = j;
  }

  if (problems.length) throw new RulesError(problems);
  return { generated_at: generatedAt, groups, special_statuses, jurisdictions };
}
