"""Small explicit trade corridor; not a reconstruction of ancient borders."""
from copy import deepcopy

# Coastal waypoints deliberately keep the two Egyptian sea networks separate.
PORTS = [
    ("rome", "Portus / Rome", [12.25, 41.76], "italia", "mediterranean"),
    ("carthage", "Carthage", [10.33, 36.86], "africa", "mediterranean"),
    ("alexandria", "Alexandria", [29.88, 31.20], "egypt", "mediterranean"),
    ("berenike", "Berenike", [35.48, 23.91], "egypt", "eastern"),
    ("aden", "Aden", [45.03, 12.77], "arabia", "eastern"),
    ("muziris", "Muziris (approximate)", [76.20, 10.17], "india", "eastern"),
    ("mantai", "Mantai", [79.95, 8.98], "lanka", "eastern"),
    ("kedah", "Kedah", [100.34, 5.64], "southeast-asia", "eastern"),
    ("oc-eo", "Oc Eo (approximate)", [105.15, 10.25], "southeast-asia", "eastern"),
    ("panyu", "Panyu / southern China", [113.30, 22.80], "southern-china", "eastern"),
]
REGIONS = [
    ("italia", "Italia", "Rome", [12.5, 42.5], [8, 37, 19, 47]),
    ("africa", "Africa Proconsularis", "Rome", [9, 34], [7, 30, 12, 38]),
    ("egypt", "Aegyptus", "Rome", [30, 27], [25, 22, 36, 32]),
    ("arabia", "Southern Arabia", "Local rulers", [46, 15], [42, 12, 55, 20]),
    ("india", "Southwestern India", "Local rulers", [76, 12], [72, 8, 79, 17]),
    ("lanka", "Lanka", "Local rulers", [80.5, 7.5], [79, 5.8, 82, 10]),
    ("southeast-asia", "Southeast Asian trading ports", "Local rulers", [103, 10], [98, 1, 109, 17]),
    ("southern-china", "Southern China", "Han successor authorities", [113, 24], [108, 20, 120, 29]),
]
LINKS = [
    ("rome-carthage", "rome", "carthage", "sea", 6, [[12.25,41.76],[11,39],[10.33,36.86]]),
    ("carthage-alexandria", "carthage", "alexandria", "sea", 10, [[10.33,36.86],[12,35],[20,34],[26,33],[29.88,31.20]]),
    ("egypt-transfer", "alexandria", "berenike", "land", 9, [[29.88,31.20],[31.2,30],[32.7,26],[35.48,23.91]]),
    ("red-sea", "berenike", "aden", "sea", 12, [[35.48,23.91],[37,21],[40,17],[43.3,12.6],[45.03,12.77]]),
    ("arabian-sea", "aden", "muziris", "sea", 24, [[45.03,12.77],[52,11],[65,9],[74,9],[76.20,10.17]]),
    ("lanka-passage", "muziris", "mantai", "sea", 5, [[76.20,10.17],[77,7],[79,7],[79.95,8.98]]),
    ("bay-of-bengal", "mantai", "kedah", "sea", 18, [[79.95,8.98],[82,8],[92,6],[100.34,5.64]]),
    ("malacca-strait", "kedah", "oc-eo", "sea", 14, [[100.34,5.64],[101,3],[103.8,1.1],[104.8,2],[105.15,10.25]]),
    ("south-china-sea", "oc-eo", "panyu", "sea", 16, [[105.15,10.25],[107,8],[110,12],[112,17],[114.5,21],[113.30,22.80]]),
]


def initial_state():
    ports = [{"id": id_, "name": name, "position": point, "territory_id": region,
              "sea": sea, "inventory": {}, "facilities": ["harbor", "workshop"], "cargo_lots": []}
             for id_, name, point, region, sea in PORTS]
    return deepcopy({
        "version": 1, "revision": 0, "last_order_revision": 0, "day": 0.0, "year": 210, "paused": True,
        "speed": 1, "tutorial": "not_started", "resources": {
            "treasury": 5000, "timber": 240, "iron": 120, "cloth": 180,
            "food": 500, "workers": 12},
        "capabilities": ["roman_seafaring"], "ports": ports,
        "territories": [{"id": id_, "name": name, "owner": owner, "occupier": None,
                         "administration": name, "position": point, "bounds": bounds,
                         "description": "Coarse gameplay region; not researched historical borders."}
                        for id_, name, owner, point, bounds in REGIONS],
        "links": [{"id": id_, "from": a, "to": b, "mode": mode, "days": days,
                   "coordinates": points} for id_, a, b, mode, days, points in LINKS],
        "fleets": [
            {"id": "med-fleet", "name": "Classis Mediterranea", "position": [12.25,41.76],
             "port_id": "rome", "kind": "roman", "ships": 3, "route": None,
             "cargo": {}, "cargo_lots": []},
            {"id": "red-fleet", "name": "Red Sea merchants", "position": [35.48,23.91],
             "port_id": "berenike", "kind": "roman", "ships": 2, "route": None,
             "cargo": {}, "cargo_lots": []},
        ],
        "trees": [], "projects": [], "mandates": [], "decisions": [], "chronicle": [],
        "selection": None, "shipments": [], "institutions": [], "laws": [],
        "politics": {"support": 45, "opposition": 30, "legitimacy": 55},
        "assumptions": [
            "AD 210 premise: a time-travelling heir supplies knowledge, not free manufacturing.",
            "Sweet desirable citrus near southern China in AD 210 is a game assumption; variety and identification are uncertain.",
            "Advanced vessels are small three-masted carrack-inspired prototypes: carvel timber hull, square fore/main sails and lateen mizzen. They are not historical AD 210 ships.",
            "Development times, resource units and trade durations are deliberately compressed gameplay estimates; trade seasons affect citrus yields.",
            "Coarse regions and port coordinates are illustrative. No modern Suez Canal: Egyptian cargo crosses overland, never fleets.",
            "Roman-era merchants can traverse the Asian corridor; advanced ships improve speed, cargo capacity and plant survival.",
            "Institutional support, opposition and legitimacy are deterministic abstractions, not historical forecasts.",
        ],
    })
