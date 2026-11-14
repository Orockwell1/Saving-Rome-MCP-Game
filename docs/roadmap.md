# Build preparation and roadmap

## Before broad implementation

- [ ] Verify current official ChatGPT account/workspace requirements, MCP writes, embedded UI, and local HTTPS connection options.
- [ ] Review the linked Figma node; record component states, colors, typography, icon exports, and rights before importing assets.
- [ ] Compare an official embedded-app example against the Python backend preference. Pick and pin compatible versions only after a working spike.
- [ ] Choose a small map dataset and record provenance. Modern boundaries are not ancient borders.
- [ ] Define stable IDs and minimal schemas for campaign, ports, fleet, routes, projects, prerequisites, commands, dispatches, and standing orders.
- [ ] Specify pause/speed/fast-forward defaults and safe retry/stale-state behavior.

## M0 — ChatGPT connection proof

One fleet, two ports, an embedded selectable map, inspect/preview/issue movement tools, and a shared command layer. Verify on PC and Mac. The local host must remain reachable. Authenticate the endpoint; verify current requirements rather than assuming localhost is directly reachable.

Acceptance: select fleet, issue a chat order, see the accepted route in the map. Record tested client, versions, and limitations.

## M1 — Persistent movement

SQLite save, campaign clock, travel progress, rerouting from current position, event log, idempotent commands and stale-state checks. Restart and resume in a fresh chat. Test meaningful movement invariants and persistence rather than UI implementation details.

## M2 — Map corridor and naval tree

Mediterranean–Egypt/Red Sea–India/Sri Lanka–Southeast Asia–southern China, with selected ports detailed and other territory coarse. Model Egyptian transfers coherently. Add roughly 8–12 naval nodes, resource bottlenecks, a shipyard project, and a trial vessel. Map and tree selection provide steward context.

## M3 — Optional tutorial

Citrus expedition, accelerated but accounted-for naval development, scoped standing order, fast-forward that stops for consequential decisions, and a small advanced sailing fleet. Label AD 210 sweet-citrus availability as an assumption. Skipping the tutorial leaves Roman-era capabilities.

## Deferred

Full warfare, territorial editing, extensive politics, complete historical boundaries, enormous tech tree, mobile certification, and paid hosting. Do not require multiplayer, blockchain, or a paid model API.
