# Build Prompt — "Property Globe"

*Copy everything below the line into a new coding session. Background research: [`RESEARCH.md`](RESEARCH.md).*

---

You are building **Property Globe**, a web app that tells a person whether *they* are legally
allowed to buy land or a home anywhere in the world. Where official parcel data exists, it
also colours individual plots as buyable or not buyable for that person.

## Product

1. **Home screen = interactive 3D globe** in the style of Google Earth. It is full-screen,
   rotates and zooms smoothly, and has a search box (country / city / address).
2. **Buyer profile panel** (first visit, editable any time, stored in the browser only,
   no login):
   - citizenship(s) (multi-select)
   - country of residence
   - status in the *target* country, offered per country (citizen / permanent resident /
     temporary visa: type / special status such as India NRI or OCI, NZ Active Investor Plus,
     EU citizen / none)
   - buyer type (individual / company / trust)
   - purpose (own home / investment) and property type of interest (house / apartment or
     condo / new build / vacant residential land / agricultural land / commercial)
3. **At globe zoom:** countries are shaded by the user's verdict.
   **At region zoom:** restricted-zone overlays appear (border and coastal buffers, metro areas,
   military areas, designated zones).
   **At street zoom:** parcels are coloured where cadastre data is available.
4. **Clicking a country, region or parcel** opens an explanation panel showing the verdict, a
   plain-English reason, conditions (approvals, minimum price, quotas, extra taxes, allowed
   structures such as leasehold or trust), every rule applied with **source link, effective
   dates and last-verified date**, and a "consult a local lawyer" disclaimer.

## Verdict model (same everywhere)

`ELIGIBLE` 🟢 · `CONDITIONAL` 🟡 · `ALTERNATIVE_STRUCTURE` 🟠 · `NOT_ELIGIBLE` 🔴 · `UNKNOWN` ⚪

- The final verdict is the **most restrictive** of all matching rules.
- Use `UNKNOWN` whenever no verified rule covers the case. **Never default to green.**

## Rules engine (rules are data, not code)

- One file per jurisdiction: `rules/<ISO-3166>/<optional-subdivision>.yaml`. Validate every
  file against a JSON Schema in CI.
- Each rule has these fields:
  - `id`
  - `jurisdiction` (country, or country + subdivision such as `US-FL`)
  - `applies_to`: buyer-class predicates (citizenship lists, include/exclude, residency
    status, special status, buyer type)
  - `property_types`
  - `geo_scope`: whole jurisdiction / reference to a restricted-zone layer / inverse of a layer
  - `verdict`
  - `conditions[]` (approval body, minimum price, quota, surcharge, max term, allowed structure)
  - `effective_from`, `effective_to`
  - `source_urls[]`, `source_type` (statute / regulator / secondary)
  - `last_verified`
  - `notes`
- Engine: `evaluate(profile, jurisdiction, property_type, geo_context, date) → {verdict, matched_rules[], conditions[]}`.
  It is a pure function in a shared TypeScript package, used by both the frontend and the
  backend. Unit-test it with a table of fixtures, one or more per seed rule.
- **Buyer classes:** map each profile to a small set of classes per country (e.g. `citizen`,
  `pr`, `special`, `temp_resident`, `non_resident`, `designated_nationality`). Pre-compute
  parcel verdicts per class, so the map never re-evaluates millions of parcels per user.
- **Date awareness:** evaluate rules "as of today". A time slider lets the user see the
  effect of known future changes (e.g. Canada's ban expiring on 1 Jan 2027).

### Seed jurisdictions (MVP)

Encode these first, marked `source_type: secondary` until each is checked against the
official statute:

- **Canada:** non-Canadians can't buy 1–3-unit residential property inside CMAs and CAs.
  `effective_to: 2027-01-01`.
- **Australia:** FIRB approval required. Established dwellings are banned for foreign persons
  from 2025-04-01. The end date is unclear (2027-03-31 vs 2029-06-30), so mark it
  needs-verification. New builds are conditional. Citizens and PRs are exempt.
- **New Zealand:** foreign-buyer ban. AU and SG citizens are exempt. Active Investor Plus
  visa holders can buy one home of NZ$5M+ with OIO consent from 2026-03-06.
- **India:** NRIs and OCIs: residential and commercial property allowed. Agricultural land,
  plantations and farmhouses not allowed (RBI Master Direction under FEMA).
- **USA:** federal: eligible. Florida SB 264 and Texas SB 17: designated-country buyers
  restricted (scope differs per state). Add more states incrementally.
- **UK, Portugal:** eligible. UK: overseas-entity registration and a non-resident stamp duty
  surcharge as conditions.
- **Mexico:** eligible inland. `ALTERNATIVE_STRUCTURE` (fideicomiso) within 100 km of borders
  and 50 km of coasts.
- **Thailand:** condo `CONDITIONAL` (49% foreign quota). Land `ALTERNATIVE_STRUCTURE`
  (leasehold).
- **Philippines:** condo conditional (40% cap). Land not eligible.
- **Others:** Indonesia, Vietnam, Switzerland, Saudi Arabia, Egypt, Turkey, Brazil.
- Every other country: `UNKNOWN`.

## Geo data

- **Globe:** CesiumJS. Default imagery and terrain come from Cesium ion. Google Photorealistic
  3D Tiles load only at city zoom, behind a feature flag. That layer is billed per root-tile
  session, so lazy-load it and cap sessions. Show all required attributions.
- **Country and subdivision boundaries:** Natural Earth or geoBoundaries.
- **Restricted-zone layers** (pre-processed to vector tiles):
  - Statistics Canada CMA/CA boundaries
  - Mexico 100 km / 50 km buffers, computed from borders and coastlines
  - military areas from OSM `landuse=military` plus official lists where available
  - Saudi designated zones once published
- **Parcels**, phase 2. Start with open cadastres:
  - New Zealand: LINZ, CC BY 4.0
  - Netherlands: PDOK Kadaster OGC API, CC BY 4.0
  - England & Wales: HM Land Registry INSPIRE Index Polygons
  - Finland: INSPIRE WFS
  - USA: via Regrid (paid licence), behind an adapter interface

  Ingest **geometry and land-use or zoning class only. Never owner names** (privacy and
  licence terms). Join land use to property types. Spatially join to the restricted-zone
  layers. Pre-compute the verdict per buyer class. Output PMTiles with a compact
  `verdict_by_class` property.
- Store licence and attribution metadata for each dataset, and render it in the map credits.

## Architecture

- **Frontend:** React + TypeScript + Vite, CesiumJS (via resium), Tailwind. Accessible,
  colour-blind-safe palette (pair every colour with an icon or pattern). Responsive down to
  phone width.
- **Shared:** `packages/rules-engine` (pure TS), `packages/rules-schema` (JSON Schema + types).
- **Data pipeline:** Python (GeoPandas / DuckDB-spatial / tippecanoe) in `pipeline/`.
  Re-runnable per dataset, outputs PMTiles to object storage.
- **API** (thin): serves the compiled rule bundle and tile URLs. No user PII is stored
  server-side.
- **Admin / review:** each rule change is a PR. Run a scheduled job that flags any rule with
  `last_verified` older than 90 days or `effective_to` within 60 days.

## Non-negotiables

- Every verdict is explainable and cited. A disclaimer appears on every panel.
- "Can legally buy" is never presented as "is for sale". Listings are out of scope for the MVP.
- No owner names or other personal data from registries.
- The profile stays in the browser unless the user explicitly opts into an account.
- Use `UNKNOWN` instead of guessing.

## Deliverables, in order

1. Monorepo scaffold, rules JSON Schema, rules engine with unit tests, and seed YAML for the
   MVP countries.
2. Globe home screen, profile panel, country-level shading and explanation panel.
3. Restricted-zone overlays (Canada CMA/CA, Mexico zone, US state rules).
4. Parcel pipeline and parcel layer for New Zealand and England & Wales.
5. Time slider, stale-rule CI job, attributions page.

Acceptance check: a profile of *Indian citizen, OCI, resident in the UAE*:
- India house → 🟢
- India farmland → 🔴
- Canada (Toronto) condo → 🔴 before 2027-01-01, then per whatever rule is current
- Mexico (Cancún) → 🟠 fideicomiso
- Thailand condo → 🟡
- Australia established house → 🔴

Each verdict shows its cited rules.
