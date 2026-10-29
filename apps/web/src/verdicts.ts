import type { PropertyType, SourceType, StatusInTarget, Verdict } from '@aiestate/rules-engine';

/** Each verdict pairs a colour with a symbol so it never relies on colour alone. */
export const VERDICT_STYLE: Record<Verdict, { label: string; short: string; symbol: string; color: string }> = {
  ELIGIBLE: { label: 'You can buy', short: 'Eligible', symbol: '✓', color: '#2e9e5b' },
  CONDITIONAL: { label: 'You can buy, with conditions', short: 'Conditional', symbol: '!', color: '#e8b525' },
  ALTERNATIVE_STRUCTURE: {
    label: 'Only through a lease, trust or company',
    short: 'Alternative',
    symbol: '⇄',
    color: '#e8772e',
  },
  NOT_ELIGIBLE: { label: 'You cannot buy', short: 'Not eligible', symbol: '✕', color: '#d64045' },
  UNKNOWN: { label: 'Not known yet', short: 'Unknown', symbol: '?', color: '#8a94a6' },
};

export const LEGEND_ORDER: Verdict[] = ['ELIGIBLE', 'CONDITIONAL', 'ALTERNATIVE_STRUCTURE', 'NOT_ELIGIBLE', 'UNKNOWN'];

export const PROPERTY_LABELS: Record<PropertyType, string> = {
  house: 'House',
  apartment: 'Apartment / condo',
  new_build: 'New build / off-plan',
  residential_land: 'Residential land',
  agricultural_land: 'Farmland',
  commercial: 'Commercial',
};

export const STATUS_LABELS: Record<StatusInTarget, string> = {
  citizen: 'a citizen',
  permanent_resident: 'a permanent resident',
  temporary_resident: 'a temporary resident (visa holder living there)',
  non_resident: 'a foreign buyer living abroad',
};

export const SOURCE_LABELS: Record<SourceType, { label: string; tone: 'good' | 'ok' | 'warn' }> = {
  statute: { label: 'Official law', tone: 'good' },
  regulator: { label: 'Official regulator', tone: 'good' },
  secondary: { label: 'Law-firm / news summary', tone: 'ok' },
  general_knowledge: { label: 'Not yet sourced — verify', tone: 'warn' },
};
