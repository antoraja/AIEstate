import {
  VERDICT_SEVERITY,
  type AppliesTo,
  type BuyerProfile,
  type Condition,
  type CountryResult,
  type Jurisdiction,
  type PropertyType,
  type Rule,
  type RulesBundle,
  type StatusInTarget,
  type Verdict,
  type Zone,
  type ZoneResult,
} from './types.js';

const WHOLE_COUNTRY: Zone = { id: 'all', label: 'Whole country' };

/**
 * Citizens are outside every foreign-ownership regime, so they get a baseline ELIGIBLE rule
 * even in countries we have not modelled. Domestic restrictions (e.g. farmland rules that also
 * bind citizens) still apply on top, because the strictest matching rule wins.
 */
export function citizenBaselineRule(country: string): Rule {
  return {
    id: `${country.toLowerCase()}-citizen-baseline`,
    title: 'Citizens are not subject to foreign-ownership rules',
    summary:
      'As a citizen you are outside the foreign-buyer restrictions. Domestic rules such as zoning, ' +
      'farmland limits and taxes may still apply.',
    applies_to: { status_in: ['citizen'] },
    property_types: 'all',
    verdict: 'ELIGIBLE',
    sources: [],
    source_type: 'general_knowledge',
  };
}

export interface BuyerContext {
  status: StatusInTarget;
  residing: boolean;
  citizenships: Set<string>;
  specials: Set<string>;
  buyerType: BuyerProfile['buyerType'];
}

export function deriveContext(profile: BuyerProfile, country: string): BuyerContext {
  const residing = profile.residenceCountry === country;
  let status: StatusInTarget;
  if (profile.citizenships.includes(country)) status = 'citizen';
  else if (residing) status = profile.residenceStatus === 'permanent' ? 'permanent_resident' : 'temporary_resident';
  else status = 'non_resident';
  return {
    status,
    residing,
    citizenships: new Set(profile.citizenships),
    specials: new Set(profile.specialStatuses),
    buyerType: profile.buyerType,
  };
}

const anyIn = (values: string[], set: Set<string>) => values.some((v) => set.has(v));

export function appliesTo(a: AppliesTo, ctx: BuyerContext): boolean {
  if (a.status_in && !a.status_in.includes(ctx.status)) return false;
  if (a.residing_in_target !== undefined && a.residing_in_target !== ctx.residing) return false;
  if (a.citizenship_any && !anyIn(a.citizenship_any, ctx.citizenships)) return false;
  if (a.citizenship_none && anyIn(a.citizenship_none, ctx.citizenships)) return false;
  if (a.special_any && !anyIn(a.special_any, ctx.specials)) return false;
  if (a.special_none && anyIn(a.special_none, ctx.specials)) return false;
  if (a.buyer_types && !a.buyer_types.includes(ctx.buyerType)) return false;
  return true;
}

export function isActive(rule: Rule, date: string): boolean {
  if (rule.effective_from && date < rule.effective_from) return false;
  if (rule.effective_to && date >= rule.effective_to) return false;
  return true;
}

function coversProperty(rule: Rule, propertyType: PropertyType): boolean {
  return rule.property_types === 'all' || rule.property_types.includes(propertyType);
}

function coversZone(rule: Rule, zoneId: string): boolean {
  return !rule.zones || rule.zones.includes(zoneId);
}

export function strictest(verdicts: Verdict[]): Verdict {
  return verdicts.reduce((a, b) => (VERDICT_SEVERITY[b] > VERDICT_SEVERITY[a] ? b : a));
}

export function mostLenient(verdicts: Verdict[]): Verdict {
  return verdicts.reduce((a, b) => (VERDICT_SEVERITY[b] < VERDICT_SEVERITY[a] ? b : a));
}

function evaluateZone(
  rules: Rule[],
  zone: Zone,
  ctx: BuyerContext,
  propertyType: PropertyType,
  date: string,
): ZoneResult {
  const matched = rules.filter(
    (r) => isActive(r, date) && coversProperty(r, propertyType) && coversZone(r, zone.id) && appliesTo(r.applies_to, ctx),
  );
  if (matched.length === 0) return { zone, verdict: 'UNKNOWN', matched, conditions: [] };

  const verdict = strictest(matched.map((r) => r.verdict));
  // Strictest first so the rule that decided the verdict leads the explanation.
  matched.sort((a, b) => VERDICT_SEVERITY[b.verdict] - VERDICT_SEVERITY[a.verdict]);
  const conditions: Condition[] = matched.flatMap((r) => r.conditions ?? []);
  return { zone, verdict, matched, conditions };
}

/**
 * Evaluates one buyer against one country for one property type on one date. Every zone of
 * the country gets its own verdict; within a zone the strictest matching rule wins, and a
 * zone with no matching rule is UNKNOWN rather than assumed eligible.
 */
export function evaluateCountry(
  bundle: RulesBundle,
  profile: BuyerProfile,
  country: string,
  propertyType: PropertyType,
  date: string,
): CountryResult {
  const jurisdiction: Jurisdiction | undefined = bundle.jurisdictions[country];
  const ctx = deriveContext(profile, country);
  const zones = jurisdiction?.zones.length ? jurisdiction.zones : [WHOLE_COUNTRY];
  const rules = [citizenBaselineRule(country), ...(jurisdiction?.rules ?? [])];

  const results = zones.map((z) => evaluateZone(rules, z, ctx, propertyType, date));
  const verdicts = results.map((r) => r.verdict);
  return {
    country,
    covered: Boolean(jurisdiction),
    status: ctx.status,
    zones: results,
    best: mostLenient(verdicts),
    worst: strictest(verdicts),
  };
}
