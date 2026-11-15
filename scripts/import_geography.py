# /// script
# requires-python = ">=3.11"
# dependencies = ["shapely==2.1.2"]
# ///
"""Bundle Natural Earth v5.1.2 physical geography and illustrative AD 210 regions.

Run with: uv run scripts/import_geography.py
No modern administrative boundaries are used. Authored regions are approximate
display geometry, not historical research or a source of campaign ownership.
"""
import hashlib
import json
from pathlib import Path
from urllib.request import urlopen

from shapely import make_valid
from shapely.geometry import Polygon, box, mapping, shape
from shapely.ops import unary_union

BASE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson"
ROOT = Path(__file__).resolve().parents[1]
EXTENT = box(-20, -36, 150, 72)

# Hand-authored sketches follow geographic corridors, not present-day states.
# Context frontiers are deliberately separate from selectable campaign regions.
# Neither category claims surveyed ancient boundaries. Campaign ownership,
# occupation and administration always come from the engine.
REGIONS = [
    ("italia", "territory", "Italia", [[6.8,44],[7.5,45.5],[10,46.5],[12.5,46.6],[14,46],[14,44.5],[19,40],[17,36.5],[11,36],[8,38],[8,42],[6.8,44]]),
    ("africa", "territory", "Africa Proconsularis", [[7.4,37.5],[11.8,37.5],[12.5,33.1],[10.3,31.3],[8.4,32.3],[7.6,34.7],[7.4,37.5]]),
    ("egypt", "territory", "Aegyptus", [[25.2,31.9],[29.5,32.1],[32.5,31.6],[34,29.4],[36.8,22],[33.3,21.9],[30.4,22.6],[28.3,26.1],[25.4,29.1],[25.2,31.9]]),
    ("arabia", "territory", "Southern Arabia", [[41.8,16.8],[44.5,18.8],[49,18.1],[53.6,19],[56,16.2],[51.8,12.3],[45,11.5],[42,13.5],[41.8,16.8]]),
    ("india", "territory", "Southwestern India", [[72.5,17.8],[74.3,17.1],[76.2,14.3],[77.4,11.6],[78.3,8],[76.7,7],[73,11],[72.5,17.8]]),
    ("lanka", "territory", "Lanka", [[79.3,10.2],[81.7,9.5],[82.4,6.3],[80.5,5.5],[79,6.5],[79.3,10.2]]),
    ("southeast-asia", "territory", "Southeast Asian trading ports", [[98,8.3],[99.2,12.3],[102.2,14.2],[106.2,12.8],[109.2,10.2],[107,7.8],[104.8,1],[101,1.2],[98,8.3]]),
    ("southern-china", "territory", "Southern China", [[107.2,21.2],[108.8,24.5],[111.5,26.8],[115,27.6],[118.3,26.4],[120.5,24.4],[117.4,21],[112,19],[108,19.6],[107.2,21.2]]),
    ("roman-context", "context", "Roman world · c. AD 210", [[-10,36],[-9,44],[-5,49],[-6,55],[-2,56],[1,53],[3,51],[6,50],[8,48],[12,48],[16,47],[19,47],[22,48],[26,48],[29,45],[29,42],[35,42],[40,40],[43,37],[40,34],[37,31],[35,29],[36.5,22],[31,22],[27,27],[24,30],[19,30],[14,31],[10,31],[7,32],[1,33],[-5,32],[-10,36]]),
    ("parthian-context", "context", "Parthian sphere · c. AD 210", [[40,34],[43,37],[44,39],[49,39],[53,38],[58,39],[62,37],[62,32],[59,28],[55,25],[50,29],[46,30],[40,34]]),
    ("kushan-context", "context", "Kushan sphere · approximate", [[62,37],[66,39],[72,38],[76,35],[77,31],[74,27],[70,25],[66,28],[62,32],[62,37]]),
]


def fetch(name):
    raw = urlopen(f"{BASE}/ne_50m_{name}.geojson", timeout=60).read()
    print(f"ne_50m_{name}: sha256={hashlib.sha256(raw).hexdigest()}")
    return json.loads(raw)["features"]


def feature(geometry, properties):
    return {"type": "Feature", "properties": properties, "geometry": mapping(geometry)}


def save(name, features):
    target = ROOT / "ui/src/assets" / f"{name}.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps({"type": "FeatureCollection", "features": features}, separators=(",", ":")) + "\n")
    print(f"{name}: {len(features)} features")


def main():
    coast = []
    for item in fetch("land"):
        area = make_valid(shape(item["geometry"]))
        # Eliminate Greenland and American components before extent clipping.
        for part in getattr(area, "geoms", [area]):
            if part.centroid.x < -30:
                continue
            clipped = part.intersection(EXTENT)
            if not clipped.is_empty:
                coast.append(clipped)
    land = unary_union(coast)
    save("land", [feature(part, {}) for part in coast])

    regions = []
    game_areas = []
    for id_, kind, name, points in REGIONS:
        area = make_valid(Polygon(points)).intersection(land)
        if kind == "territory":
            game_areas.append(area)
        regions.append((area, {"id": id_, "kind": kind, "name": name, "approximate": True}))
    simulated = unary_union(game_areas)
    # Context color never asserts a broad empire owns a simulated territory.
    save("regions", [feature(area.difference(simulated) if props["kind"] == "context" else area, props) for area, props in regions])

    relief = []
    for item in fetch("geography_regions_polys"):
        props = item["properties"]
        if props.get("REGION") not in {"Europe", "Asia", "Africa"} or props.get("FEATURECLA") not in {"Range/mtn", "Plateau", "Desert"}:
            continue
        area = make_valid(shape(item["geometry"])).intersection(land).simplify(0.025, preserve_topology=True)
        if not area.is_empty:
            relief.append(feature(area, {"name": props["NAME"], "kind": props["FEATURECLA"]}))
    save("relief", relief)

    waters = []
    for dataset, kind in [("rivers_lake_centerlines", "river"), ("lakes", "lake")]:
        for item in fetch(dataset):
            props = item["properties"]
            if props.get("scalerank", 0) > (3 if kind == "river" else 2):
                continue
            area = make_valid(shape(item["geometry"])).intersection(EXTENT)
            if not area.is_empty:
                waters.append(feature(area.simplify(0.025, preserve_topology=True), {"kind": kind, "name": props.get("name", "")}))
    save("waters", waters)


if __name__ == "__main__":
    main()
