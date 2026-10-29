# Property Globe — Research & Analysis

*Researched 29 Oct 2026. This is a product research note, not legal advice. Every rule below
must be re-checked against the official source before it ships, and again on a schedule.*

## 1. What you asked for, restated

1. A **Google-Earth-style 3D globe** as the home screen.
2. You pick a **country** (then zoom into a region or area).
3. You enter **who you are**: citizenship(s), where you live, and your residency or visa status.
4. The site tells you **whether you can buy** land or a house there, and on what terms.
5. Where official land records are published, the map **colours individual plots** as
   buyable, buyable with conditions, or not buyable for you.

## 2. How buyer eligibility actually works

Across countries, "can I buy here?" comes down to the same seven questions. The rule engine
should model these and nothing more:

| # | Factor | Why it matters | Examples |
|---|--------|----------------|----------|
| 1 | **Citizenship(s)** | Most rules are about nationality, and some single out particular countries. | Florida SB 264 and Texas SB 17 restrict buyers tied to "countries of concern" (China, Iran, North Korea, Russia and others). NZ lets Australians and Singaporeans buy like locals. |
| 2 | **Residency status** in the target country | Permanent residents are usually treated like citizens. Temporary visa holders are often treated as foreign. | Australia: citizens and PRs are exempt from the established-home ban. Temporary residents are not. |
| 3 | **Special or diaspora status** | Some countries create a status between citizen and foreigner. | India: NRIs and OCI cardholders can buy residential and commercial property but **not agricultural land, plantations or farmhouses** (FEMA, RBI Master Direction). NZ: Active Investor Plus visa holders can buy one home worth NZ$5M+ (from Mar 2026). Turkey: citizenship by investment at US$400k. |
| 4 | **Property type** | Agricultural land is the most restricted category almost everywhere. | EU: agricultural and forest land is restricted for non-EU buyers in nearly every member state. Australia: new builds are allowed but established homes are banned. Canada: the ban covers buildings with 1–3 units. Egypt: you can own units but not land. |
| 5 | **Location inside the country** | Sensitive zones (borders, coasts, military sites, holy cities) are often off-limits. | Mexico: in the "restricted zone" (100 km of borders, 50 km of coasts) you hold property through a bank trust (fideicomiso). Canada: the ban applies only inside Census Metropolitan Areas and Census Agglomerations. Saudi Arabia: foreign ownership opened in designated zones from Jan 2026, with Mecca and Medina excluded. Vietnam: defence and security areas are excluded. US states: land near military bases. |
| 6 | **Ownership form and caps** | The answer is sometimes "yes, but only as…". | Thailand: freehold condo only, and only within the 49% foreign quota per building. Land is leasehold (30 years, renewable). Indonesia: leasehold rights with minimum prices. Vietnam: 50-year term and per-building and per-ward quotas. Switzerland (Lex Koller): permits plus canton quotas for holiday homes. |
| 7 | **Approval, tax and time limits** | The purchase may be allowed but still need consent, carry extra tax, or apply only during a set window. | Australia: FIRB approval, and the established-home ban runs from 1 Apr 2025 (sources say it ends 31 Mar 2027, others say 30 Jun 2029, so verify). NZ: Overseas Investment Office consent. Saudi Arabia: transfer fee of up to 5%. Canada: ban currently expires **1 Jan 2027**, with no extension confirmed as of Sep 2026. |

Take-away: eligibility is a function of **buyer profile × property type × location × date**.
Each country's rules can be written as data with an effective date. They should not be
hard-coded.

### Output verdicts (use the same set in every country)

- 🟢 **Eligible.** You can buy freehold with no special approval.
- 🟡 **Conditional.** You can buy, but you need approval, a minimum price, a quota slot, extra tax or a specific visa.
- 🟠 **Alternative structure only.** You can use a leasehold, trust (fideicomiso), company or condo instead of freehold land.
- 🔴 **Not eligible.**
- ⚪ **Unknown or not yet verified.** We don't have a reliable rule. Never guess.

Every verdict must show **why** (which rule), the **source link**, and a **last verified** date.

## 3. Snapshot of the countries researched

| Country | Rule summary (for foreign / non-resident buyers) | Typical verdict |
|---|---|---|
| 🇺🇸 USA | No federal ban. CFIUS covers sites near military bases. 28 states have foreign-ownership laws, mostly about agricultural land or "foreign adversary" buyers (FL SB 264, TX SB 17 from 2025). | 🟢 mostly. 🔴/🟡 for designated nationalities or agricultural/critical sites in some states |
| 🇨🇦 Canada | Non-Canadians can't buy 1–3-unit residential property inside CMAs and CAs. Rural areas are exempt. Ban expires 1 Jan 2027 unless renewed. | 🔴 in cities and 🟢 rural, until the expiry date |
| 🇦🇺 Australia | FIRB approval required. Ban on established homes from 1 Apr 2025. New builds are allowed. Citizens and PRs are exempt. | 🟡 new builds. 🔴 established homes |
| 🇳🇿 New Zealand | Foreign-buyer ban since 2018. Australians and Singaporeans are exempt. Investor Plus visa holders can buy one home worth NZ$5M+ with OIO consent. | 🔴 mostly. 🟡 for investor visa holders |
| 🇮🇳 India | NRIs and OCIs can buy residential and commercial property, but not agricultural land, plantations or farmhouses. Other foreigners resident in India have limited rights. Non-resident foreigners generally can't buy. | 🟢 NRI/OCI residential. 🔴 agricultural |
| 🇬🇧 UK | No nationality restrictions. Overseas entities must register on the Register of Overseas Entities. Non-resident stamp duty surcharge applies. | 🟢 / 🟡 (tax and registration) |
| 🇵🇹 Portugal | No restrictions on foreign buyers of residential property. | 🟢 |
| 🇨🇭 Switzerland | Lex Koller: permits required. Holiday-home quotas. Tightening was proposed in 2025. | 🟡 / 🔴 |
| 🇲🇽 Mexico | Free inland. Fideicomiso (bank trust) required in the coastal and border restricted zone. | 🟢 inland. 🟠 coast and border |
| 🇹🇭 Thailand | Condo freehold within the 49% building quota. Land is leasehold only. | 🟡 condo. 🟠 land |
| 🇮🇩 Indonesia | Leasehold-type rights only, with minimum price thresholds. | 🟠 |
| 🇻🇳 Vietnam | 50-year term, per-building and per-ward quotas, security zones excluded. | 🟡 / 🔴 |
| 🇵🇭 Philippines | Constitution bars foreigners from owning land. Condo units allowed within a 40% foreign cap. Long leases available. | 🟡 condo. 🔴 land |
| 🇸🇦 Saudi Arabia | Designated zones open from Jan 2026. Mecca and Medina restricted. Transfer fee of up to 5%. | 🟡 / 🔴 |
| 🇪🇬 Egypt | Foreigners can own units, not land (Law 230/1996, eased 2023–26). | 🟡 units. 🔴 land |
| 🇹🇷 Turkey | Allowed in most areas. Military and security zones excluded. Some nationalities restricted. Citizenship by investment at $400k. | 🟢 / 🔴 by zone or nationality |
| 🇧🇷 Brazil | Urban property is free. Rural and border land is restricted. | 🟢 urban. 🔴/🟡 rural |
| 🇪🇺 EU general | EU citizens are generally treated as locals (Denmark, Malta and others are exceptions). Agricultural land is restricted for non-EU buyers almost everywhere. | varies |

Several of these rules are changing right now (Canada's expiry, Australia's end date,
Thailand quota reform rumours, Saudi zones). That is why the data model needs
`effective_from`, `effective_to` and `last_verified` on every rule.

## 4. Can we really mark individual plots? (Honest feasibility)

**Short answer: yes for some countries, and only by inference.** No land registry publishes a
"foreigners may buy this plot" flag. A plot's colour has to be **derived** by overlaying:

1. **Parcel geometry**, the official cadastre. Open in several countries: NZ (LINZ, CC BY 4.0),
   Netherlands (PDOK/Kadaster OGC API, CC BY 4.0), Finland, Norway, Slovenia and Scotland
   (INSPIRE WFS/ATOM), England & Wales (HM Land Registry INSPIRE Index Polygons, under OGL
   with conditions). For the USA and Canada, parcels are county-level and a commercial
   aggregator (Regrid) is the practical route, which is **paid**.
2. **Land-use or zoning class** for each parcel (agricultural / residential / commercial). This
   comes from cadastre attributes, zoning layers or land-cover datasets.
3. **Restricted-zone polygons**: borders and coastlines with buffers (Mexico 100 km / 50 km),
   military sites (OpenStreetMap `landuse=military`, US DoD installations), Canadian CMA/CA
   boundaries (Statistics Canada), Saudi designated zones, and so on.
4. The **rule engine** applied to the buyer profile, which gives a verdict for each parcel.

Where parcel data is closed (most of Asia, Africa, Latin America, and India's state-by-state
records, which are scanned and mostly not machine-readable), fall back to **region-level
shading**. That means colouring the whole country or state from the rules, plus restricted
zones where we have the polygons.

**Constraints to respect:**
- **Privacy.** Do **not** show owner names. Many licences (e.g. LINZ owner data, GDPR in
  the EU) restrict it. We only need geometry and land-use class.
- **For sale ≠ buyable.** Eligibility says you are *allowed* to buy. It doesn't mean the plot
  is *on the market*. Listing data is a separate, licensed integration and belongs in a later
  phase.
- **Licences.** Store the attribution string for each dataset and display it on the map.
- **Disclaimers.** Every verdict links to its legal source and recommends a local lawyer.

## 5. Globe and map technology options

| Option | Pros | Cons |
|---|---|---|
| **CesiumJS + Google Photorealistic 3D Tiles** | Closest to Google Earth (real 3D cities). Uses the OGC 3D Tiles standard. | Billed per root-tile session (~US$6 per 1k after the free tier, Enterprise SKU). Attribution required. |
| **CesiumJS + Cesium ion (World Terrain + Bing / Sentinel imagery)** | True globe, terrain, good GeoJSON and vector support. | ion has usage limits and plans. |
| **MapLibre GL JS (globe projection) + vector tiles** | Free and open. Fast for millions of parcel polygons via PMTiles. | Less "Google Earth" 3D realism. |
| **deck.gl on top of either** | GPU rendering of large parcel layers. | Extra complexity. |

**Recommendation:** use CesiumJS for the globe and the zoomed-out experience, with Google
Photorealistic 3D Tiles switched on only at city zoom (to control cost). Serve parcels as
**vector tiles (PMTiles / MVT)** with the eligibility verdict pre-computed per buyer-profile
"class". Parcel colours are recomputed client-side from rule IDs.

## 6. Key design decisions

- **Rules as data** (YAML or JSON per country, versioned in git, every rule cites a source)
  rather than code. Non-engineers can review them and diffs are auditable.
- **Profile classes.** Collapse each user into a small set of buyer classes per country
  (citizen / PR / special status / temporary resident / non-resident foreigner / restricted
  nationality). Then parcels need only one pre-computed verdict per class, not per user.
- **Verdict = most restrictive applicable rule**, with every matching rule listed in the
  explanation panel.
- **Unknown is a first-class answer.** Never show green without a verified rule.
- **No account needed** for the profile. Keep it in the browser by default, because
  citizenship and visa status are sensitive.

## 7. Phased plan

1. **MVP:** globe, buyer-profile form, country-level verdicts for ~15 countries, and an
   explanation panel with sources.
2. **Regions:** restricted-zone overlays (Canada CMAs, Mexico restricted zone, US state laws,
   Indian agricultural land rules, military areas).
3. **Parcels:** parcel-level colouring for open-cadastre countries (NZ, NL, England & Wales,
   Finland), then the US via Regrid.
4. **Listings, alerts and lawyer referral.** Change alerts fire when a rule changes, e.g.
   Canada after 1 Jan 2027.

## Sources

- Canada: [CMHC — Prohibition on the Purchase of Residential Property by Non-Canadians Act](https://www.cmhc-schl.gc.ca/professionals/housing-markets-data-and-research/housing-research/consultations/prohibition-purchase-residential-property-non-canadians-act), [McCarthy Tétrault](https://www.mccarthy.ca/en/insights/blogs/lay-land/two-year-extension-prohibition-purchase-residential-property-non-canadians), [MPA — ban expiring](https://www.mpamag.com/ca/mortgage-industry/industry-trends/canadas-foreign-buyer-ban-is-expiring-what-comes-next-could-reshape-the-market/582215)
- Australia: [HSF Kramer FIRB update](https://www.hsfkramer.com/notes/realestate/2025-posts/firb-update), [Attwood Marshall](https://attwoodmarshall.com.au/foreign-buyer-ban-on-established-dwellings)
- New Zealand: [Bell Gully](https://www.bellgully.com/insights/overseas-investment-act-update-door-opens-for-investor-visa-holders-buying-residential-land/), [OneRoof explainer](https://www.oneroof.co.nz/news/explainer-when-will-foreigners-be-able-to-buy-real-estate-in-new-zealand-and-what-happens-next-48772)
- India: [RBI Master Direction](https://rbi.org.in/SCRIPTs/BS_ViewMasDirections.aspx?id=10196), [Taxmann on FEMA property rules](https://www.taxmann.com/post/blog/acquisition-transfer-of-immovable-property-under-fema-regulations/)
- USA: [Mintz (Jan 2026)](https://www.mintz.com/insights-center/viewpoints/2896/2026-01-28-increasing-regulation-foreign-ownership-united-states), [Morgan Lewis — Texas SB 17](https://www.morganlewis.com/pubs/2025/07/us-federal-government-expands-cfius-texas-joins-states-limiting-foreign-control-of-real-property), [Gibson Dunn](https://www.gibsondunn.com/rise-of-state-laws-restricting-foreign-entities-from-acquiring-property-another-front-in-us-china-tensions/), [National Agricultural Law Center](https://nationalaglawcenter.org/wp-content/uploads//assets/Webinars/Foreign%20Ownership%20July%202026.pdf)
- Multi-country: [IMI Daily](https://www.imidaily.com/analysis/where-foreigners-can-and-cannot-buy-property-market-by-market/), [Gulf News — Saudi 2026](https://gulfnews.com/world/gulf/saudi/new-saudi-rules-limit-foreign-property-ownership-from-2026-1.500337786), [Ahram — Egypt](https://english.ahram.org.eg/News/571983.aspx), [Europe 2026](https://one-place.com/news/foreigner-property-ownership-rules-europe-2026), [Turkey by nationality](https://www.deal-tr.com/en/blog/foreign-property-ownership-restrictions-in-turkey-by-nationality-2026-guide)
- Thailand / Indonesia: [terms.law — 49% rule](https://terms.law/Thai/property/condo-foreign-quota.html), [Oxford Business Group](https://oxfordbusinessgroup.com/reports/thailand/2014-report/economy/home-from-home-foreign-ownership-rules-for-land-and-condominiums), [JLL](https://www.jll.com/en-jp/insights/rethinking-thailands-condominium-ownership-policy)
- Parcel data: [LINZ licensing](https://www.linz.govt.nz/products-services/data/licensing-and-using-data/linz-licence-pending-approval-data), [PDOK Kadaster OGC API](https://api.pdok.nl/kadaster/brk-kadastrale-percelen/ogc/v1), [INSPIRE Cadastral Parcels spec](https://knowledge-base.inspire.ec.europa.eu/publications/inspire-data-specification-cadastral-parcels-technical-guidelines_en), [Regrid](https://regrid.com/regrid-knows-land-parcel-data)
- Globe: [Google Photorealistic 3D Tiles docs](https://developers.google.com/maps/documentation/tile/3d-tiles?hl=en), [Map Tiles API billing](https://developers.google.com/maps/documentation/tile/usage-and-billing?authuser=6)

*Facts from secondary sources (law-firm blogs, news) are marked for verification in the rule
data. The Philippines and Mexico rows come from general knowledge and were not re-searched
this session.*
