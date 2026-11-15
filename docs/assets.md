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

The node/details contract uses self-hosted fonts; other existing workspace surfaces retain their current stacks.

| Family | Source | License |
| --- | --- | --- |
| Source Sans 3, regular/bold | Unmodified WOFF2 binaries from Adobe's [3.052R release](https://github.com/adobe-fonts/source-sans/releases/tag/3.052R), under `ui/src/assets/fonts/source-sans/` | SIL OFL 1.1; adjacent `LICENSE.md` |
| Crimson Text, bold | `@fontsource/crimson-text` 5.3.0 | SIL OFL 1.1 |
| Noto Sans Symbols 2 | `@fontsource/noto-sans-symbols-2` 5.3.0; symbols WOFF2 only | SIL OFL 1.1 |

Full Source Sans coverage preserves the prerequisite checkmark. The explicit symbol fallback avoids platform-dependent phase/impact glyphs. Font licenses are not replaced by MIT.

Vendored SHA-256: regular `63de0da0cc05298e2e9c6e5cef506d8454ca665f6e668a99d94f51174b9256ed`; bold `12954097ebbad6749ee1c81a143d555c263420115892211529fe6f51794b8439`. The source release archive hash is `d7f6724027fe5ca0bab44d6121284f1fa8f66dec5f2864aa969aed347041ac95`.

`THIRD_PARTY_NOTICES.txt` preserves production npm and vendored-font licenses/notices and is embedded in the single-file widget. Regenerate with `uv run python scripts/collect_notices.py` after dependency changes. MapLibre retains its BSD-3-Clause and bundled notices; React, React Flow and Motion retain their upstream licenses. MCP packages contain an Apache-2.0/MIT licensing-transition notice; do not replace that actual notice with a simplified registry label. Python dependency notices remain in their installed distributions.

## Historical assumptions

The advanced ships are deliberately anachronistic, small carrack-inspired prototypes: carvel timber hulls, square fore/main sails and a lateen mizzen, informed by the [Mariners' Museum description](https://exploration.marinersmuseum.org/watercraft/carrack-nao/). No museum images or prose were copied.

Berenike represents Roman Indian Ocean trade, not a Suez sea passage; see [the archaeological context](https://archaeology.org/news/2024/06/11/ancient-roman-correspondence-recovered-at-egyptian-sea-port/). Desirable sweet citrus near southern China in AD 210 is a game assumption, not a settled identification; [citrus historical/genetic research](https://pmc.ncbi.nlm.nih.gov/articles/PMC12365825/) distinguishes ancient names and later modern cultivars. Costs, workforce units, maturation, survival and voyage durations are gameplay abstractions.
