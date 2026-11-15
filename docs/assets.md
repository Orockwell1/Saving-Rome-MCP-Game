# Asset and data provenance

Project-owned code and documentation use MIT. External data and dependencies retain their own terms.

## Approved naval artwork

`ui/src/assets/naval/` contains eleven existing 362×362 PNGs supplied by the creator: stronger hulls, seasoned timber, shipyards, rigging, sailcloth, sail plans, navigation charts, provisions, crew training, trial vessel and blue-water fleet. The creator explicitly approved publishing these exact files under MIT and described them as ChatGPT-generated artwork inspired by another design. Originality and the inspiration's rights were not independently verified.

`manifest.json` records public semantic IDs, dimensions and SHA-256 hashes. The files were copied without image modification. This approval covers those exports, not private Figma frame screenshots or other unreviewed assets. Figma file keys, links and node bindings are not part of the public manifest.

Other semantic icons and ship markers are original code-owned SVG primitives. Unsupported icon recipes remain visibly labeled fallbacks. No paid image API, scraped game artwork, remote SVG or generated executable asset is used.

## Physical geography

Natural Earth v5.1.2, 1:50m scale, [public domain](https://www.naturalearthdata.com/about/terms-of-use/). Natural Earth's contributors include Tom Patterson and Nathaniel Vaughn Kelso.

- [Land](https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_land.geojson)
- [Relief regions](https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_geography_regions_polys.geojson)
- [Rivers](https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_rivers_lake_centerlines.geojson)
- [Lakes](https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_lakes.geojson)

`scripts/import_geography.py` clips/simplifies the source to the Europe–Africa–Asia footprint, excluding the Americas. Outputs are `land.json`, `relief.json`, `waters.json` and `regions.json` under `ui/src/assets/`. The imported result has 603 land, 125 relief and 243 water features.

The eleven political/context regions are original illustrative sketches clipped to coastlines, not researched ancient borders or modern administrative boundaries. Eight map to campaign territories; three provide approximate Roman, Parthian and Kushan context. Ownership, occupation and administration labels use engine facts. Coastal bands are decorative, not bathymetry. Historical port identifications such as Muziris and Oc Eo remain approximate.

## Fonts and dependency notices

The current UI uses local/system font stacks; no font files were imported. Exact design typography is pending private-source inspection.

`THIRD_PARTY_NOTICES.txt` preserves installed production npm licenses/notices and is embedded in the single-file widget. Regenerate with `uv run python scripts/collect_notices.py` after dependency changes. MapLibre retains its BSD-3-Clause and bundled notices; React, React Flow and Motion retain their upstream licenses. MCP packages contain an Apache-2.0/MIT licensing-transition notice; do not replace that actual notice with a simplified registry label. Python dependency notices remain in their installed distributions.

## Historical assumptions

The advanced ships are deliberately anachronistic, small carrack-inspired prototypes: carvel timber hulls, square fore/main sails and a lateen mizzen, informed by the [Mariners' Museum description](https://exploration.marinersmuseum.org/watercraft/carrack-nao/). No museum images or prose were copied.

Berenike represents Roman Indian Ocean trade, not a Suez sea passage; see [the archaeological context](https://archaeology.org/news/2024/06/11/ancient-roman-correspondence-recovered-at-egyptian-sea-port/). Desirable sweet citrus near southern China in AD 210 is a game assumption, not a settled identification; [citrus historical/genetic research](https://pmc.ncbi.nlm.nih.gov/articles/PMC12365825/) distinguishes ancient names and later modern cultivars. Costs, workforce units, maturation, survival and voyage durations are gameplay abstractions.
