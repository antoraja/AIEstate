export interface CountryFeature {
  type: 'Feature';
  properties: { iso: string; name: string };
  geometry: { type: 'MultiPolygon'; coordinates: number[][][][] };
}

export interface CountryCollection {
  type: 'FeatureCollection';
  features: CountryFeature[];
}

export interface CountryInfo {
  iso: string;
  name: string;
  /** Label anchor: centroid of the country's largest polygon, as [lon, lat]. */
  anchor: [number, number];
}

/** Planar area and centroid of a lon/lat ring (shoelace). Good enough to place a label. */
function ringStats(ring: number[][]): { area: number; cx: number; cy: number } {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x0, y0] = ring[i] as [number, number];
    const [x1, y1] = ring[i + 1] as [number, number];
    const cross = x0 * y1 - x1 * y0;
    a += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  a /= 2;
  return a === 0 ? { area: 0, cx: ring[0]![0]!, cy: ring[0]![1]! } : { area: Math.abs(a), cx: cx / (6 * a), cy: cy / (6 * a) };
}

/** One entry per ISO code (some countries span several features), sorted by name. */
export function indexCountries(collection: CountryCollection): CountryInfo[] {
  const best = new Map<string, { name: string; area: number; anchor: [number, number] }>();
  for (const f of collection.features) {
    for (const polygon of f.geometry.coordinates) {
      const { area, cx, cy } = ringStats(polygon[0]!);
      const current = best.get(f.properties.iso);
      if (!current || area > current.area) {
        best.set(f.properties.iso, { name: current?.name ?? f.properties.name, area, anchor: [cx, cy] });
      }
    }
  }
  return [...best.entries()]
    .map(([iso, v]) => ({ iso, name: v.name, anchor: v.anchor }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
