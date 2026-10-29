import { PROPERTY_TYPES, type BuyerProfile, type PropertyType } from '@aiestate/rules-engine';

const PROFILE_KEY = 'aiestate.profile.v1';
const PROPERTY_KEY = 'aiestate.propertyType.v1';

export const EMPTY_PROFILE: BuyerProfile = {
  citizenships: [],
  residenceCountry: null,
  residenceStatus: 'temporary',
  specialStatuses: [],
  buyerType: 'individual',
};

// Citizenship and visa status are sensitive, so the profile only ever lives in this browser.
// Storage can be unavailable (private mode, blocked site data); the app works without it.

export function loadProfile(): BuyerProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? { ...EMPTY_PROFILE, ...(JSON.parse(raw) as Partial<BuyerProfile>) } : null;
  } catch {
    return null;
  }
}

export function saveProfile(profile: BuyerProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    /* storage unavailable */
  }
}

export function loadPropertyType(): PropertyType {
  try {
    const raw = localStorage.getItem(PROPERTY_KEY);
    if (raw && (PROPERTY_TYPES as readonly string[]).includes(raw)) return raw as PropertyType;
  } catch {
    /* storage unavailable */
  }
  return 'house';
}

export function savePropertyType(type: PropertyType): void {
  try {
    localStorage.setItem(PROPERTY_KEY, type);
  } catch {
    /* storage unavailable */
  }
}

export const today = () => new Date().toISOString().slice(0, 10);
