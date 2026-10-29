# AIEstate — Property Globe

A Google-Earth-style globe that shows where **you** are legally allowed to buy land or a home,
based on your citizenship, where you live and your residency status. Click a country to see
the verdict, the conditions, and every rule behind it with its source.

> General information from public sources, not legal advice.

- [`RESEARCH.md`](RESEARCH.md) — how buyer eligibility works, country snapshot, data and tech options.
- [`BUILD_PROMPT.md`](BUILD_PROMPT.md) — the full product brief and phased plan.

## Status

| Phase (from the build brief) | State |
|---|---|
| 1. Rules schema, engine, tests, seed data for 13 countries | ✅ Done |
| 2. Globe home screen, profile panel, country shading, explanation panel | ✅ Done |
| 3. Restricted-zone map overlays (Canada CMAs, Mexico coast/border zone, US states) | ⏳ Zones exist in the rules and the explanation panel; not yet drawn on the map |
| 4. Parcel-level colouring (NZ, England & Wales) | ⏳ Not started |
| 5. Date control and stale-rule CI job | ✅ Done (date picker; slider later) |

## Run it

Requires Node 22.

```bash
npm install
npm run dev        # compiles rules/*.yaml, then starts Vite on http://localhost:5173
npm test           # rules engine tests, including the brief's acceptance check
npm run build      # production build in apps/web/dist
```

The globe works with no keys, using Cesium's bundled offline Natural Earth imagery. For
satellite imagery or Google photorealistic 3D cities, copy `apps/web/.env.example` to
`apps/web/.env.local` and add keys. Google 3D Tiles are billed per session, so they load only
when you zoom below ~25 km.

## How it works

```
rules/*.yaml ──(npm run rules:build: JSON-Schema validation + cross-checks)──▶ rules.json
                                                                                 │
profile (browser only) + property type + date ──▶ evaluateCountry() ◀───────────┘
                                                        │
                       verdict per country zone ──▶ globe colours + explanation panel
```

- **Rules are data.** One YAML file per country in [`rules/`](rules). Each rule says who it
  applies to (status, citizenship, special status, buyer type), which property types and
  zones it covers, its verdict, conditions, dates, sources and when it was last checked.
- **Strictest rule wins** within a zone. If no rule matches, the answer is **Unknown**: the
  app never defaults to green. Citizens get a built-in baseline (no foreign-buyer rules).
- **Zones** split a country where the answer differs by area (Canadian cities vs rural
  areas, Mexico's coastal zone, Florida/Texas). Countries with mixed answers are striped on
  the globe.
- **Source quality is shown on every rule**: official law/regulator, law-firm/news summary,
  or "not yet sourced — verify" for rules written from general knowledge.
- **Privacy:** the profile is kept in `localStorage` only. There is no backend.

### Layout

```
rules/                      Country rule files + _meta.yaml (citizenship groups, special statuses)
packages/rules-engine/      Types, JSON Schema, compiler, evaluator, tests, stale-rule report
apps/web/                   React + Vite + CesiumJS globe
pipeline/                   Data preparation (country boundaries from Natural Earth)
```

## Adding or updating a country

1. Add or edit `rules/<ISO>.yaml` (copy a similar country). Use `@GROUP` names from
   `_meta.yaml` for lists of nationalities.
2. Cite sources and set `source_type` honestly. Set `last_verified` only after checking the
   source yourself.
3. Add fixture rows to `packages/rules-engine/test/engine.test.ts`.
4. `npm run rules:build && npm test`.

`npm run rules:stale` lists rules that were never verified, are older than 90 days, or start
or expire in the next 60 days. CI runs it weekly.

## Data credits

Country boundaries: [Natural Earth](https://www.naturalearthdata.com/) (public domain).
Antarctica is left out (no property market, and Cesium can't fill its pole-touching polygon).
Globe: [CesiumJS](https://cesium.com/platform/cesiumjs/) (Apache 2.0).
