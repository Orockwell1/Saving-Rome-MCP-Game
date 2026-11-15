"""Public semantic catalog. Recipes contain data only, never SVG, HTML or URLs."""
from copy import deepcopy
import json
from pathlib import Path

ASSETS = json.loads((Path(__file__).resolve().parents[1] / "ui/src/assets/naval/manifest.json").read_text())

VERSION = "1.0.0"
NAVAL = {
    "seasoned-timber": "Timber stacks; seasoning and durable construction materials",
    "stronger-hulls": "Reinforced hull; shipbuilding knowledge",
    "shipyards": "Crane and vessel; construction and maintenance facilities",
    "rigging": "Rope and tackle; rigging production",
    "sailcloth": "Woven cloth; sailmaking and textiles",
    "sail-plans": "Multi-masted vessel; coordinated sail plan",
    "navigation-charts": "Chart and instruments; navigational knowledge",
    "sea-provisions": "Stored supplies; food, water and logistics",
    "crew-training": "Trained sailors; workforce and seamanship",
    "trial-vessel": "Single advanced ship; sea trials",
    "blue-water-fleet": "Three sailing ships; operational naval capacity",
}
PRIMITIVES = {
    "faith": "Radiant circle; belief, religious observance or reform",
    "law": "Scales; a law, charter or legal obligation",
    "assembly": "Council; deliberation, representation and institutions",
    "learning": "Open book; knowledge, education and research",
    "construction": "Tools; facilities and physical works",
    "diplomacy": "Joined hands; negotiations and relationships",
    "resources": "Crate; materials, supply and inventory",
    "transport": "Vessel; travel, freight and expeditions",
    "generic": "Diamond; labeled fallback for an unknown semantic symbol",
}
COMPONENTS = {
    "development-node": "Stable ID, title, rule, prerequisites, scope, people, location, icon recipe; engine adds status/cost/duration/progress/blockers",
    "map-marker": "Fleet, port or project identifier, authoritative geographic position, accessible label",
    "territory-highlight": "Territory ID with separate legal owner, occupation and administration",
    "route": "Engine-validated coordinates, start/arrival days, destination; preview distinct from committed route",
    "detail-panel": "Selected entity facts, current requirements and explicitly authorized actions",
    "decision": "Engine-owned consequence and named supported options with costs",
    "dispatch": "Persisted day, kind, title and factual outcome",
}


def inspect_catalog(query: str = "", identifier: str | None = None) -> dict:
    entries = [
        {"id": key, "kind": "icon", "description": value,
         "tags": key.split("-"), "dimensions": ASSETS["assets"].get(key, {}).get("dimensions", [64, 64]),
         "variants": ["navy", "burgundy", "olive"],
         "badge_slots": ["bottom-right"], "fallback": "generic",
         "source": ASSETS["provenance"] if key in NAVAL else "project-authored vector primitive",
         "license": "MIT", "version": VERSION,
         "sha256": ASSETS["assets"].get(key, {}).get("sha256")}
        for key, value in (NAVAL | PRIMITIVES).items()
    ] + [
        {"id": key, "kind": "component", "description": value,
         "tags": key.split("-"), "variants": ["default"], "fallback": "detail-panel"}
        for key, value in COMPONENTS.items()
    ]
    text = query.casefold()
    matches = [entry for entry in entries if
               (not identifier or entry["id"] == identifier) and
               (not text or text in (entry["id"] + " " + entry["description"]).casefold())]
    return deepcopy({
        "version": VERSION,
        "entries": matches,
        "fallback": "generic",
        "recipe": {
            "base": "one icon ID; unknown IDs render a labeled generic fallback",
            "badge": "optional primitive ID in the bottom-right slot",
            "variant": ["navy", "burgundy", "olive"],
            "seed": "optional nonnegative integer for a deterministic decorative motif",
        },
        "constraints": ["No scripts, SVG markup, HTML, CSS, shaders or external URLs",
                        "Status is engine data, separate from semantic icon art",
                        "Accepted recipes persist in versioned, hashed tree definitions"],
        "art_generation": {"available": False, "reason": "No image-generation service configured or required"},
    })
