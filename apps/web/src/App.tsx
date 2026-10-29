import { PROPERTY_TYPES, evaluateCountry, type BuyerProfile, type CountryResult, type PropertyType, type RulesBundle } from '@aiestate/rules-engine';
import rulesJson from '@aiestate/rules-engine/rules.json';
import { useEffect, useMemo, useRef, useState } from 'react';
import { indexCountries, type CountryCollection } from './countries';
import { ExplainPanel } from './ExplainPanel';
import { Globe, type GlobeHandle } from './Globe';
import { EMPTY_PROFILE, loadProfile, loadPropertyType, saveProfile, savePropertyType, today } from './profile';
import { ProfilePanel } from './ProfilePanel';
import { LEGEND_ORDER, PROPERTY_LABELS, VERDICT_STYLE } from './verdicts';

const bundle = rulesJson as unknown as RulesBundle;

export function App() {
  const [collection, setCollection] = useState<CountryCollection | null>(null);
  const [loadError, setLoadError] = useState(false);
  const savedProfile = useMemo(loadProfile, []);
  const [profile, setProfile] = useState<BuyerProfile>(savedProfile ?? EMPTY_PROFILE);
  const [profileOpen, setProfileOpen] = useState(savedProfile === null);
  const [propertyType, setPropertyType] = useState<PropertyType>(loadPropertyType);
  const todayIso = useMemo(today, []);
  const [asOf, setAsOf] = useState(todayIso);
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const globe = useRef<GlobeHandle>(null);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/countries.geojson`)
      .then((r) => (r.ok ? (r.json() as Promise<CountryCollection>) : Promise.reject(new Error(r.statusText))))
      .then(setCollection)
      .catch(() => setLoadError(true));
  }, []);

  const countries = useMemo(() => (collection ? indexCountries(collection) : []), [collection]);

  const results = useMemo(() => {
    const map = new Map<string, CountryResult>();
    for (const c of countries) map.set(c.iso, evaluateCountry(bundle, profile, c.iso, propertyType, asOf));
    return map;
  }, [countries, profile, propertyType, asOf]);

  const updateProfile = (p: BuyerProfile) => {
    setProfile(p);
    saveProfile(p);
  };
  const updatePropertyType = (t: PropertyType) => {
    setPropertyType(t);
    savePropertyType(t);
  };

  const goTo = (query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return;
    const match = countries.find((c) => c.name.toLowerCase() === q) ?? countries.find((c) => c.name.toLowerCase().startsWith(q));
    if (!match) return;
    setSelected(match.iso);
    globe.current?.flyTo(match.iso);
    setSearch('');
  };

  const selectedCountry = selected ? countries.find((c) => c.iso === selected) : undefined;
  const selectedResult = selected ? results.get(selected) : undefined;
  const coveredCount = Object.keys(bundle.jurisdictions).length;

  return (
    <div className="app">
      {collection ? (
        <Globe ref={globe} collection={collection} countries={countries} results={results} selected={selected} onSelect={setSelected} />
      ) : (
        <div className="loading">{loadError ? 'Could not load the map data. Please reload.' : 'Loading the globe…'}</div>
      )}

      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">◍</span>
          <div>
            <h1>AIEstate</h1>
            <p>Where can you buy?</p>
          </div>
        </div>
        <form
          className="search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            goTo(search);
          }}
        >
          <input
            list="country-list"
            placeholder="Search a country…"
            aria-label="Search a country"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              // Picking from the datalist fills in an exact name; jump straight there.
              if (countries.some((c) => c.name === e.target.value)) goTo(e.target.value);
            }}
          />
          <datalist id="country-list">
            {countries.map((c) => (
              <option key={c.iso} value={c.name} />
            ))}
          </datalist>
        </form>
        <label className="property-select">
          <span>Buying</span>
          <select value={propertyType} onChange={(e) => updatePropertyType(e.target.value as PropertyType)}>
            {PROPERTY_TYPES.map((t) => (
              <option key={t} value={t}>
                {PROPERTY_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <button className="profile-button" onClick={() => setProfileOpen((o) => !o)} aria-expanded={profileOpen}>
          About you
        </button>
      </header>

      {profile.citizenships.length === 0 && !profileOpen && (
        <button className="banner" onClick={() => setProfileOpen(true)}>
          Add your citizenship and where you live to see your personal answers →
        </button>
      )}
      {asOf !== todayIso && (
        <div className="date-banner">
          Showing rules as of <strong>{asOf}</strong>
          <button className="link-button" onClick={() => setAsOf(todayIso)}>
            Back to today
          </button>
        </div>
      )}

      {profileOpen && (
        <ProfilePanel
          profile={profile}
          countries={countries}
          specialStatuses={bundle.special_statuses}
          asOf={asOf}
          todayIso={todayIso}
          onChange={updateProfile}
          onAsOfChange={setAsOf}
          onClose={() => setProfileOpen(false)}
        />
      )}

      {selectedCountry && selectedResult && (
        <ExplainPanel
          name={selectedCountry.name}
          result={selectedResult}
          propertyType={propertyType}
          onClose={() => setSelected(null)}
        />
      )}

      <aside className="legend" aria-label="Legend">
        <ul>
          {LEGEND_ORDER.map((v) => (
            <li key={v}>
              <span className="swatch" style={{ background: VERDICT_STYLE[v].color }} aria-hidden="true">
                {VERDICT_STYLE[v].symbol}
              </span>
              {VERDICT_STYLE[v].label}
            </li>
          ))}
          <li>
            <span className="swatch striped" aria-hidden="true" />
            Depends on the area
          </li>
        </ul>
        <p className="muted small">
          {coveredCount} countries researched · not legal advice
        </p>
      </aside>
    </div>
  );
}
