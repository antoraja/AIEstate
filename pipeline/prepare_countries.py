"""Builds apps/web/public/data/countries.geojson from Natural Earth (public domain).

Keeps only the ISO alpha-2 code and name, and rounds coordinates to 0.01 degrees (~1 km),
which is plenty for country shading on a globe and keeps the file small.

Usage:  python3 pipeline/prepare_countries.py [path-to-ne_50m_admin_0_countries.geojson]
Without an argument the source file is downloaded.
"""

import json
import sys
import urllib.request
from pathlib import Path

SOURCE_URL = (
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/"
    "geojson/ne_50m_admin_0_countries.geojson"
)
OUT = Path(__file__).resolve().parent.parent / "apps/web/public/data/countries.geojson"
PRECISION = 2
# Antarctica has no property market (Antarctic Treaty), and its pole-touching polygon cannot be
# filled by Cesium's polygon triangulation.
EXCLUDE = {"AQ"}


def iso_a2(props: dict) -> str | None:
    # ISO_A2 is "-99" for a few countries (e.g. France, Norway); the _EH column fills those in.
    for key in ("ISO_A2_EH", "ISO_A2"):
        code = props.get(key)
        if code and code != "-99":
            return code
    return None


def round_coords(coords):
    if isinstance(coords[0], (int, float)):
        return [round(coords[0], PRECISION), round(coords[1], PRECISION)]
    return [round_coords(c) for c in coords]


def dedupe_ring(ring):
    out = [ring[0]]
    for point in ring[1:]:
        if point != out[-1]:
            out.append(point)
    return out if len(out) >= 4 else None


def simplify(geometry):
    polygons = geometry["coordinates"] if geometry["type"] == "MultiPolygon" else [geometry["coordinates"]]
    kept = []
    for polygon in polygons:
        rings = [dedupe_ring(r) for r in round_coords(polygon)]
        if rings[0] is not None:
            kept.append([r for r in rings if r is not None])
    return {"type": "MultiPolygon", "coordinates": kept}


def main() -> None:
    if len(sys.argv) > 1:
        source = json.loads(Path(sys.argv[1]).read_text())
    else:
        with urllib.request.urlopen(SOURCE_URL) as response:
            source = json.load(response)

    features = []
    for f in source["features"]:
        code = iso_a2(f["properties"])
        if not code or code in EXCLUDE:
            continue
        features.append(
            {
                "type": "Feature",
                "properties": {"iso": code, "name": f["properties"]["NAME"]},
                "geometry": simplify(f["geometry"]),
            }
        )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"type": "FeatureCollection", "features": features}, separators=(",", ":")))
    print(f"Wrote {len(features)} features to {OUT} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
