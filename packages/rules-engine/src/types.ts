/** Outcome of an eligibility check, ordered from least to most restrictive. */
export const VERDICTS = [
  'ELIGIBLE',
  'CONDITIONAL',
  'ALTERNATIVE_STRUCTURE',
  'UNKNOWN',
  'NOT_ELIGIBLE',
] as const;
export type Verdict = (typeof VERDICTS)[number];

/**
 * UNKNOWN ranks above every "yes" verdict so an unresolved question can never be hidden
 * behind a green, but below NOT_ELIGIBLE so a known prohibition still wins.
 */
export const VERDICT_SEVERITY: Record<Verdict, number> = {
  ELIGIBLE: 0,
  CONDITIONAL: 1,
  ALTERNATIVE_STRUCTURE: 2,
  UNKNOWN: 3,
  NOT_ELIGIBLE: 4,
};

export const PROPERTY_TYPES = [
  'house',
  'apartment',
  'new_build',
  'residential_land',
  'agricultural_land',
  'commercial',
] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

/** The buyer's standing in the country they want to buy in, derived from their profile. */
export const STATUSES = ['citizen', 'permanent_resident', 'temporary_resident', 'non_resident'] as const;
export type StatusInTarget = (typeof STATUSES)[number];

export const BUYER_TYPES = ['individual', 'company', 'trust'] as const;
export type BuyerType = (typeof BUYER_TYPES)[number];

export const SOURCE_TYPES = ['statute', 'regulator', 'secondary', 'general_knowledge'] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const CONDITION_KINDS = [
  'approval',
  'minimum_price',
  'quota',
  'surcharge',
  'structure',
  'term_limit',
  'registration',
  'location',
  'other',
] as const;
export type ConditionKind = (typeof CONDITION_KINDS)[number];

export interface BuyerProfile {
  /** ISO 3166-1 alpha-2 codes. */
  citizenships: string[];
  /** Country the buyer currently lives in (ISO alpha-2), if known. */
  residenceCountry: string | null;
  /** Residency status in `residenceCountry`, used when the buyer is not a citizen of it. */
  residenceStatus: 'permanent' | 'temporary';
  /** Ids from the special-status registry, e.g. "IN_OCI". */
  specialStatuses: string[];
  buyerType: BuyerType;
}

/** All present predicates must hold for a rule to apply. Absent predicates match anyone. */
export interface AppliesTo {
  status_in?: StatusInTarget[];
  residing_in_target?: boolean;
  citizenship_any?: string[];
  citizenship_none?: string[];
  special_any?: string[];
  special_none?: string[];
  buyer_types?: BuyerType[];
}

export interface Condition {
  kind: ConditionKind;
  text: string;
}

export interface Source {
  title: string;
  url: string;
}

export interface Rule {
  id: string;
  title: string;
  summary: string;
  applies_to: AppliesTo;
  property_types: PropertyType[] | 'all';
  /** Zone ids within the jurisdiction; omitted means every zone. */
  zones?: string[];
  verdict: Verdict;
  conditions?: Condition[];
  /** Inclusive ISO date. */
  effective_from?: string;
  /** Exclusive ISO date: the rule no longer applies on this day. */
  effective_to?: string;
  sources: Source[];
  source_type: SourceType;
  /** ISO date someone last checked the rule against its sources; absent means never checked. */
  last_verified?: string;
  notes?: string;
}

export interface Zone {
  id: string;
  label: string;
  description?: string;
}

export interface Jurisdiction {
  country: string;
  name: string;
  zones: Zone[];
  rules: Rule[];
}

export interface SpecialStatus {
  id: string;
  label: string;
  country: string;
  description: string;
}

export interface RulesBundle {
  generated_at: string;
  groups: Record<string, string[]>;
  special_statuses: SpecialStatus[];
  jurisdictions: Record<string, Jurisdiction>;
}

export interface ZoneResult {
  zone: Zone;
  verdict: Verdict;
  matched: Rule[];
  conditions: Condition[];
}

export interface CountryResult {
  country: string;
  /** False when we hold no rules for this country. */
  covered: boolean;
  status: StatusInTarget;
  zones: ZoneResult[];
  /** Least and most restrictive zone verdicts; equal when the country is uniform. */
  best: Verdict;
  worst: Verdict;
}
