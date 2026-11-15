"""Engine-owned primitives. Generated trees supply names, never effects or prices."""
from copy import deepcopy

from .catalog import NAVAL, PRIMITIVES


def rule(title, costs, duration, *, requires=(), facilities=(), inventory=None,
         capability=None, facility=None, supplies=None, effect=None, workers=2):
    return {"title": title, "costs": costs, "duration": duration, "workers": workers,
            "requires": list(requires), "facilities": list(facilities),
            "inventory": inventory or {}, "capability": capability, "facility": facility,
            "supplies": supplies or {}, "effect": effect,
            "capacity": "Two simultaneous projects per port; shared imperial workforce."}


RULES = {
    "hull_research": rule("Stronger hull design", {"treasury": 100}, 3,
                          facilities=("workshop",), capability="strong_hulls"),
    "seasoned_timber": rule("Season and grade timber", {"treasury": 70, "timber": 40}, 4,
                            supplies={"seasoned_timber": 40}),
    "shipyard": rule("Ocean-going shipyard", {"treasury": 180, "timber": 30, "iron": 15}, 6,
                     requires=("strong_hulls",), facility="advanced_shipyard", workers=3),
    "rigging": rule("Reliable rigging and cordage", {"treasury": 60, "cloth": 15}, 3,
                    capability="ocean_rigging"),
    "sailcloth": rule("Durable sailcloth supply", {"treasury": 50, "cloth": 35}, 3,
                      supplies={"sailcloth": 35}),
    "sail_plan": rule("Multiple masts and sail plans", {"treasury": 90}, 4,
                      requires=("strong_hulls", "ocean_rigging"), capability="multi_mast"),
    "navigation": rule("Charts and navigation practice", {"treasury": 100}, 4,
                       capability="ocean_navigation"),
    "provisions": rule("Preserved provisions and water storage", {"treasury": 45, "food": 60}, 2,
                       supplies={"provisions": 60}),
    "crew_training": rule("Ocean-going crew training", {"treasury": 100, "food": 25}, 5,
                          requires=("ocean_navigation", "multi_mast"), facility="trained_crews"),
    "trial_vessel": rule("Build and test a trial vessel", {"treasury": 200, "iron": 15}, 6,
                         requires=("strong_hulls", "multi_mast", "ocean_navigation"),
                         facilities=("advanced_shipyard", "trained_crews"),
                         inventory={"seasoned_timber": 15, "sailcloth": 10, "provisions": 20},
                         capability="trial_validated", effect="trial", workers=3),
    "operational_fleet": rule("Commission maintainable ocean fleet", {"treasury": 300, "iron": 25}, 8,
                              requires=("trial_validated",), facilities=("advanced_shipyard", "trained_crews"),
                              inventory={"seasoned_timber": 25, "sailcloth": 25, "provisions": 40},
                              capability="blue_water_navy", effect="fleet", workers=3),
    "research": rule("Fund a local study", {"treasury": 70}, 4,
                     facilities=("workshop",), capability="scholarship", effect="study"),
    "consultation": rule("Consult affected communities", {"treasury": 60, "food": 10}, 3,
                         facility="consultation_record", effect="consultation"),
    "institution": rule("Charter a named institution", {"treasury": 140, "timber": 10}, 5,
                        facilities=("consultation_record",), facility="chartered_institution", effect="institution"),
    "cultivation": rule("Establish protected citrus cultivation", {"treasury": 80, "food": 20}, 20,
                        inventory={"plants": 2}, facility="citrus_garden",
                        capability="citrus_cultivation", effect="harvest"),
    "law": rule("Debate and enact a named law", {"treasury": 100}, 4,
                facilities=("chartered_institution",), effect="law"),
}

ICON_BASES = set(NAVAL) | set(PRIMITIVES)
ICON_BADGES = set(PRIMITIVES) - {"generic"}
NAVAL_ICONS = {
    "hull_research": "stronger-hulls", "seasoned_timber": "seasoned-timber",
    "shipyard": "shipyards", "rigging": "rigging", "sailcloth": "sailcloth",
    "sail_plan": "sail-plans", "navigation": "navigation-charts",
    "provisions": "sea-provisions", "crew_training": "crew-training",
    "trial_vessel": "trial-vessel", "operational_fleet": "blue-water-fleet",
}


def catalog():
    return {"rules": [{"id": key, **deepcopy(value)} for key, value in RULES.items()],
            "limits": {"nodes_per_tree": 500, "projects_per_port": 2},
            "generation": "Choose supported rules; titles, scope and people name new content. Costs, requirements and outcomes are fixed by these primitives. Unsupported mechanics are rejected."}


def naval_proposal():
    dependencies = {
        "hull_research": [], "seasoned_timber": [], "shipyard": ["hull_research"],
        "rigging": [], "sailcloth": [], "sail_plan": ["hull_research", "rigging"],
        "navigation": [], "provisions": [], "crew_training": ["navigation", "sail_plan"],
        "trial_vessel": ["shipyard", "crew_training", "seasoned_timber", "sailcloth", "provisions"],
        "operational_fleet": ["trial_vessel"],
    }
    return {"id": "tutorial-navy", "title": "A navy for sweet citrus", "version": 1,
            "ambition": "Develop a maintainable experimental sailing navy, then seek sweet citrus in southern China.",
            "provenance": {"author": "Rome optional tutorial seed", "version": "1"},
            "nodes": [{"id": f"naval-{key}", "title": RULES[key]["title"],
                       "description": "Compressed experimental development using time-traveller knowledge and local Roman labor.",
                       "rule": key, "location_id": "berenike",
                       "prerequisites": [f"naval-{dep}" for dep in deps],
                       "icon": {"base": NAVAL_ICONS[key], "variant": "navy", "seed": index},
                       "scope": "Berenike naval development", "people": ["shipwrights", "sailors"]}
                      for index, (key, deps) in enumerate(dependencies.items())]}
