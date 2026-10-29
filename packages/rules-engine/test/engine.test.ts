import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { RulesError, compileRules } from '../src/compile.js';
import { deriveContext, evaluateCountry } from '../src/engine.js';
import type { BuyerProfile, PropertyType, Verdict } from '../src/types.js';

const bundle = compileRules(resolve(__dirname, '../../../rules'), 'test');
const TODAY = '2026-10-29';

const profile = (p: Partial<BuyerProfile>): BuyerProfile => ({
  citizenships: [],
  residenceCountry: null,
  residenceStatus: 'temporary',
  specialStatuses: [],
  buyerType: 'individual',
  ...p,
});

/** Verdict for one zone, or for the whole country when it has a single zone. */
function verdict(p: BuyerProfile, country: string, type: PropertyType, zone?: string, date = TODAY): Verdict {
  const result = evaluateCountry(bundle, p, country, type, date);
  const z = zone ? result.zones.find((r) => r.zone.id === zone) : result.zones[0];
  if (!z) throw new Error(`no zone ${zone} in ${country}`);
  return z.verdict;
}

describe('acceptance check: Indian citizen holding OCI-style rights, living in the UAE', () => {
  // The build prompt's example buyer: an Indian national living abroad (an NRI). We also check
  // the same answers for a foreign citizen holding an OCI card.
  const nri = profile({ citizenships: ['IN'], residenceCountry: 'AE' });
  const oci = profile({ citizenships: ['GB'], residenceCountry: 'AE', specialStatuses: ['IN_OCI'] });

  it.each([
    ['NRI', nri],
    ['OCI', oci],
  ])('%s: India house is eligible, farmland is not', (_, p) => {
    expect(verdict(p, 'IN', 'house')).toBe('ELIGIBLE');
    expect(verdict(p, 'IN', 'agricultural_land')).toBe('NOT_ELIGIBLE');
  });

  it('Toronto condo: banned before 2027-01-01, unknown after', () => {
    expect(verdict(nri, 'CA', 'apartment', 'metro')).toBe('NOT_ELIGIBLE');
    expect(verdict(nri, 'CA', 'apartment', 'metro', '2027-01-02')).toBe('UNKNOWN');
    expect(verdict(nri, 'CA', 'apartment', 'rest')).toBe('ELIGIBLE');
  });

  it('Cancún needs a fideicomiso, the interior does not', () => {
    expect(verdict(nri, 'MX', 'house', 'restricted')).toBe('ALTERNATIVE_STRUCTURE');
    expect(verdict(nri, 'MX', 'house', 'interior')).toBe('ELIGIBLE');
  });

  it('Thai condo is conditional, Australian established house is not eligible', () => {
    expect(verdict(nri, 'TH', 'apartment')).toBe('CONDITIONAL');
    expect(verdict(nri, 'AU', 'house')).toBe('NOT_ELIGIBLE');
  });
});

describe('fixtures per jurisdiction', () => {
  it.each<[string, BuyerProfile, string, PropertyType, string | undefined, string, Verdict]>([
    // label, profile, country, property, zone, date, expected
    ['AU PR', profile({ citizenships: ['GB'], residenceCountry: 'AU', residenceStatus: 'permanent' }), 'AU', 'house', undefined, TODAY, 'ELIGIBLE'],
    ['AU NZ citizen', profile({ citizenships: ['NZ'] }), 'AU', 'house', undefined, TODAY, 'ELIGIBLE'],
    ['AU new build', profile({ citizenships: ['US'] }), 'AU', 'new_build', undefined, TODAY, 'CONDITIONAL'],
    ['AU temp resident during ban', profile({ citizenships: ['US'], residenceCountry: 'AU' }), 'AU', 'house', undefined, TODAY, 'NOT_ELIGIBLE'],
    ['AU temp resident, extension unclear', profile({ citizenships: ['US'], residenceCountry: 'AU' }), 'AU', 'house', undefined, '2028-01-01', 'UNKNOWN'],
    ['AU temp resident after 2029', profile({ citizenships: ['US'], residenceCountry: 'AU' }), 'AU', 'house', undefined, '2030-01-01', 'CONDITIONAL'],
    ['AU non-resident before ban', profile({ citizenships: ['US'] }), 'AU', 'house', undefined, '2024-01-01', 'NOT_ELIGIBLE'],
    ['CA work permit', profile({ citizenships: ['IN'], residenceCountry: 'CA' }), 'CA', 'house', 'metro', TODAY, 'CONDITIONAL'],
    ['CA registered Indian', profile({ citizenships: ['US'], specialStatuses: ['CA_REGISTERED_INDIAN'] }), 'CA', 'house', 'metro', TODAY, 'ELIGIBLE'],
    ['CA vacant land', profile({ citizenships: ['US'] }), 'CA', 'residential_land', 'metro', TODAY, 'ELIGIBLE'],
    ['NZ foreigner', profile({ citizenships: ['US'] }), 'NZ', 'house', undefined, TODAY, 'NOT_ELIGIBLE'],
    ['NZ Australian', profile({ citizenships: ['AU'] }), 'NZ', 'house', undefined, TODAY, 'ELIGIBLE'],
    ['NZ dual AU/US', profile({ citizenships: ['US', 'AU'] }), 'NZ', 'house', undefined, TODAY, 'ELIGIBLE'],
    ['NZ investor visa', profile({ citizenships: ['US'], specialStatuses: ['NZ_ACTIVE_INVESTOR_PLUS'] }), 'NZ', 'house', undefined, TODAY, 'CONDITIONAL'],
    ['NZ investor visa before exemption', profile({ citizenships: ['US'], specialStatuses: ['NZ_ACTIVE_INVESTOR_PLUS'] }), 'NZ', 'house', undefined, '2025-12-01', 'NOT_ELIGIBLE'],
    ['NZ resident visa', profile({ citizenships: ['US'], residenceCountry: 'NZ', residenceStatus: 'permanent' }), 'NZ', 'house', undefined, TODAY, 'ELIGIBLE'],
    ['IN foreigner abroad', profile({ citizenships: ['US'] }), 'IN', 'apartment', undefined, TODAY, 'NOT_ELIGIBLE'],
    ['IN foreigner resident', profile({ citizenships: ['US'], residenceCountry: 'IN' }), 'IN', 'apartment', undefined, TODAY, 'CONDITIONAL'],
    ['IN citizen at home, farmland', profile({ citizenships: ['IN'], residenceCountry: 'IN' }), 'IN', 'agricultural_land', undefined, TODAY, 'CONDITIONAL'],
    ['US federal', profile({ citizenships: ['DE'] }), 'US', 'house', 'other', TODAY, 'ELIGIBLE'],
    ['US farmland reporting', profile({ citizenships: ['DE'] }), 'US', 'agricultural_land', 'other', TODAY, 'CONDITIONAL'],
    ['US FL China non-resident', profile({ citizenships: ['CN'] }), 'US', 'house', 'fl', TODAY, 'NOT_ELIGIBLE'],
    ['US FL China visa holder', profile({ citizenships: ['CN'], residenceCountry: 'US' }), 'US', 'house', 'fl', TODAY, 'CONDITIONAL'],
    ['US FL Cuba farmland', profile({ citizenships: ['CU'] }), 'US', 'agricultural_land', 'fl', TODAY, 'NOT_ELIGIBLE'],
    ['US TX Russia non-resident', profile({ citizenships: ['RU'] }), 'US', 'house', 'tx', TODAY, 'NOT_ELIGIBLE'],
    ['US TX Russia before SB 17', profile({ citizenships: ['RU'] }), 'US', 'house', 'tx', '2025-01-01', 'ELIGIBLE'],
    ['US other state, adversary', profile({ citizenships: ['CN'] }), 'US', 'house', 'other', TODAY, 'UNKNOWN'],
    ['US green card holder from China', profile({ citizenships: ['CN'], residenceCountry: 'US', residenceStatus: 'permanent' }), 'US', 'house', 'fl', TODAY, 'ELIGIBLE'],
    ['GB non-resident', profile({ citizenships: ['US'] }), 'GB', 'house', undefined, TODAY, 'CONDITIONAL'],
    ['GB resident', profile({ citizenships: ['US'], residenceCountry: 'GB' }), 'GB', 'house', undefined, TODAY, 'ELIGIBLE'],
    ['PT anyone', profile({ citizenships: ['BR'] }), 'PT', 'agricultural_land', undefined, TODAY, 'ELIGIBLE'],
    ['TH land', profile({ citizenships: ['US'] }), 'TH', 'house', undefined, TODAY, 'ALTERNATIVE_STRUCTURE'],
    ['PH former Filipino house', profile({ citizenships: ['US'], specialStatuses: ['PH_FORMER_NATURAL_BORN'] }), 'PH', 'house', undefined, TODAY, 'CONDITIONAL'],
    ['PH foreigner house', profile({ citizenships: ['US'] }), 'PH', 'house', undefined, TODAY, 'ALTERNATIVE_STRUCTURE'],
    ['CH EU resident', profile({ citizenships: ['DE'], residenceCountry: 'CH' }), 'CH', 'house', undefined, TODAY, 'ELIGIBLE'],
    ['CH non-EU B permit', profile({ citizenships: ['US'], residenceCountry: 'CH' }), 'CH', 'house', undefined, TODAY, 'CONDITIONAL'],
    ['CH abroad land', profile({ citizenships: ['DE'] }), 'CH', 'residential_land', undefined, TODAY, 'NOT_ELIGIBLE'],
    ['CH citizen farmland', profile({ citizenships: ['CH'] }), 'CH', 'agricultural_land', undefined, TODAY, 'CONDITIONAL'],
    ['VN land', profile({ citizenships: ['US'] }), 'VN', 'residential_land', undefined, TODAY, 'NOT_ELIGIBLE'],
    ['ID house', profile({ citizenships: ['US'] }), 'ID', 'house', undefined, TODAY, 'ALTERNATIVE_STRUCTURE'],
  ])('%s', (_, p, country, type, zone, date, expected) => {
    expect(verdict(p, country, type, zone, date)).toBe(expected);
  });
});

describe('engine behaviour', () => {
  it('returns UNKNOWN for countries without rules, except for their own citizens', () => {
    const r = evaluateCountry(bundle, profile({ citizenships: ['US'] }), 'BR', 'house', TODAY);
    expect(r.covered).toBe(false);
    expect(r.worst).toBe('UNKNOWN');
    expect(verdict(profile({ citizenships: ['BR'] }), 'BR', 'house')).toBe('ELIGIBLE');
  });

  it('reports best and worst zone verdicts for countries with mixed rules', () => {
    const r = evaluateCountry(bundle, profile({ citizenships: ['US'] }), 'CA', 'house', TODAY);
    expect(r.best).toBe('ELIGIBLE');
    expect(r.worst).toBe('NOT_ELIGIBLE');
  });

  it('lists the deciding rule first and collects conditions', () => {
    const r = evaluateCountry(bundle, profile({ citizenships: ['US'], specialStatuses: ['NZ_ACTIVE_INVESTOR_PLUS'] }), 'NZ', 'house', TODAY);
    const zone = r.zones[0]!;
    expect(zone.matched[0]!.id).toBe('nz-investor-visa-exemption');
    expect(zone.conditions.map((c) => c.kind)).toContain('minimum_price');
  });

  it('derives status from citizenship first, then residence', () => {
    expect(deriveContext(profile({ citizenships: ['FR'], residenceCountry: 'FR' }), 'FR').status).toBe('citizen');
    expect(deriveContext(profile({ citizenships: ['FR'], residenceCountry: 'ES', residenceStatus: 'permanent' }), 'ES').status).toBe('permanent_resident');
    expect(deriveContext(profile({ citizenships: ['FR'], residenceCountry: 'ES' }), 'IT').status).toBe('non_resident');
  });

  it('expands citizenship groups at compile time', () => {
    const rule = bundle.jurisdictions.CH!.rules.find((r) => r.id === 'ch-eu-efta-residents')!;
    expect(rule.applies_to.citizenship_any).toContain('DE');
    expect(rule.applies_to.citizenship_any).toContain('NO');
  });
});

describe('compileRules validation', () => {
  function rulesDir(files: Record<string, string>) {
    const dir = mkdtempSync(join(tmpdir(), 'rules-'));
    writeFileSync(join(dir, '_meta.yaml'), 'groups: {}\nspecial_statuses: []\n');
    for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, name), body);
    return dir;
  }

  const rule = (extra: string) => `country: XX
name: Test
zones: [{ id: all, label: All }]
rules:
  - id: xx-rule
    title: Test rule
    summary: A rule used in tests.
    applies_to: {}
    property_types: all
    verdict: ELIGIBLE
    sources: []
    source_type: general_knowledge
${extra}`;

  it('accepts a minimal valid file', () => {
    expect(() => compileRules(rulesDir({ 'XX.yaml': rule('') }))).not.toThrow();
  });

  it.each([
    ['unknown zone', '    zones: [nowhere]\n', 'unknown zone'],
    ['unknown group', '    applies_to: { citizenship_any: ["@NOPE"] }\n', 'unknown group'],
    ['bad dates', '    effective_from: 2026-01-01\n    effective_to: 2025-01-01\n', 'effective_from must be before'],
  ])('rejects %s', (_, extra, message) => {
    const body = rule(extra).replace('    applies_to: {}\n', extra.includes('applies_to') ? '' : '    applies_to: {}\n');
    expect(() => compileRules(rulesDir({ 'XX.yaml': body }))).toThrow(message);
  });

  it('requires sources for anything other than general knowledge', () => {
    const body = rule('').replace('source_type: general_knowledge', 'source_type: statute');
    expect(() => compileRules(rulesDir({ 'XX.yaml': body }))).toThrow(RulesError);
  });
});
