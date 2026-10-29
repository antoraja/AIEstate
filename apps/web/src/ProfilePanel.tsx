import { BUYER_TYPES, type BuyerProfile, type SpecialStatus } from '@aiestate/rules-engine';
import type { CountryInfo } from './countries';

interface Props {
  profile: BuyerProfile;
  countries: CountryInfo[];
  specialStatuses: SpecialStatus[];
  asOf: string;
  todayIso: string;
  onChange(profile: BuyerProfile): void;
  onAsOfChange(date: string): void;
  onClose(): void;
}

const BUYER_TYPE_LABELS: Record<BuyerProfile['buyerType'], string> = {
  individual: 'Myself (individual)',
  company: 'A company',
  trust: 'A trust',
};

export function ProfilePanel({ profile, countries, specialStatuses, asOf, todayIso, onChange, onAsOfChange, onClose }: Props) {
  const nameOf = (iso: string) => countries.find((c) => c.iso === iso)?.name ?? iso;
  const set = (patch: Partial<BuyerProfile>) => onChange({ ...profile, ...patch });
  const livesAsForeigner = profile.residenceCountry !== null && !profile.citizenships.includes(profile.residenceCountry);

  return (
    <section className="panel profile-panel" aria-labelledby="profile-heading">
      <header className="panel-header">
        <h2 id="profile-heading">About you</h2>
        <button className="icon-button" onClick={onClose} aria-label="Close profile">
          ×
        </button>
      </header>
      <p className="muted small">Saved only in this browser. Nothing is sent anywhere.</p>

      <fieldset>
        <legend>Citizenship(s)</legend>
        <div className="chips">
          {profile.citizenships.map((iso) => (
            <span className="chip" key={iso}>
              {nameOf(iso)}
              <button
                aria-label={`Remove ${nameOf(iso)}`}
                onClick={() => set({ citizenships: profile.citizenships.filter((c) => c !== iso) })}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <select
          aria-label="Add a citizenship"
          value=""
          onChange={(e) => e.target.value && set({ citizenships: [...profile.citizenships, e.target.value] })}
        >
          <option value="">+ Add a citizenship…</option>
          {countries
            .filter((c) => !profile.citizenships.includes(c.iso))
            .map((c) => (
              <option key={c.iso} value={c.iso}>
                {c.name}
              </option>
            ))}
        </select>
      </fieldset>

      <fieldset>
        <legend>Where do you live now?</legend>
        <select
          aria-label="Country of residence"
          value={profile.residenceCountry ?? ''}
          onChange={(e) => set({ residenceCountry: e.target.value || null })}
        >
          <option value="">Choose a country…</option>
          {countries.map((c) => (
            <option key={c.iso} value={c.iso}>
              {c.name}
            </option>
          ))}
        </select>
        {livesAsForeigner && (
          <div className="radio-row" role="radiogroup" aria-label="Residency status">
            {(['permanent', 'temporary'] as const).map((s) => (
              <label key={s}>
                <input
                  type="radio"
                  name="residence-status"
                  checked={profile.residenceStatus === s}
                  onChange={() => set({ residenceStatus: s })}
                />
                {s === 'permanent' ? 'Permanent resident' : 'Temporary visa / permit'}
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <fieldset>
        <legend>Special status</legend>
        {specialStatuses.map((s) => (
          <label className="check" key={s.id} title={s.description}>
            <input
              type="checkbox"
              checked={profile.specialStatuses.includes(s.id)}
              onChange={(e) =>
                set({
                  specialStatuses: e.target.checked
                    ? [...profile.specialStatuses, s.id]
                    : profile.specialStatuses.filter((x) => x !== s.id),
                })
              }
            />
            {s.label}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>Who is buying?</legend>
        <select
          aria-label="Buyer type"
          value={profile.buyerType}
          onChange={(e) => set({ buyerType: e.target.value as BuyerProfile['buyerType'] })}
        >
          {BUYER_TYPES.map((t) => (
            <option key={t} value={t}>
              {BUYER_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </fieldset>

      <fieldset>
        <legend>Check the rules as of</legend>
        <div className="date-row">
          <input type="date" value={asOf} onChange={(e) => e.target.value && onAsOfChange(e.target.value)} />
          {asOf !== todayIso && (
            <button className="link-button" onClick={() => onAsOfChange(todayIso)}>
              Back to today
            </button>
          )}
        </div>
        <p className="muted small">Pick a future date to see rule changes already scheduled.</p>
      </fieldset>
    </section>
  );
}
