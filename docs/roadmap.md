# Milestones and remaining acceptance

## M0 — Protocol proof; ChatGPT acceptance blocked

The official MCP client negotiated protocol `2025-11-25` with Python MCP SDK `2.3.0` over the running HTTP host. Six tools were discovered; inspect, route preview, movement commitment, command replay and shared state worked. The production HTML resource was read through the official SDK. Unauthorized local API requests returned 401.

**Not verified:** authenticated ChatGPT installation, actual iframe rendering/CSP, chat-to-map round trip, or a PC/Windows client. The available ChatGPT session was signed out; tunnel credentials were absent. A browser preview does not close this milestone.

## M1 — Persistent simulation, locally exercised

SQLite transactions, ownership lock, clock leases, current-position rerouting, event ordering, idempotency and conflicting orders are implemented. Engine tests cover restarts, backups, same-revision competition, no double spending, lease expiry, decision stops and cargo/resource invariants.

Actual host restart preserved a generated campaign's day, trees, projects, fleets, resources, selection and history. Browser interaction exposed and fixed a clock/revision race: ticks and heartbeat renewals no longer invalidate a Pause order, while competing orders still conflict. Live resume/pause and midroute orders were exercised again after the fix.

## M2 — Corridor atlas and generated development

The schematic map was replaced with offline 1:50m geography, coast-clipped contextual regions, relief, rivers, labeled ports and fleet banners. Mediterranean and Asia-corridor views, uncommitted route previews and changed ETAs were visually exercised in Chromium on a Mac.

A separately authored twelve-node naval proposal was accepted, completed under a scoped mandate, and produced local manufacturing capacity, a trial vessel and a three-ship advanced squadron. A religious civic-reform proposal was imported through the UI; its consultation completed with a prerequisite referencing the naval branch. The SDK integration test separately exercises novel naval/religious proposals, policy choices, forged-definition rejection and persistence without a model API.

**Priority gate:** inspect and translate one exact private Figma node/details pair using [public contracts and private evidence](design-translation-layer.md). The current component UI is not a Figma fidelity claim. Do not expand the family before documented differences are resolved.

## M3 — Optional tutorial and executable logistics

The authored eleven-node naval tutorial is optional. Skipping grants no advanced capabilities. Engine tests cover paid local manufacture, capacity/knowledge distinction, Asian contact using Roman vessels, outbound/return voyages, spoilage, living plants, Egyptian land transfer and cultivation.

Institution and law primitives produce explicit political choices rather than silently resolving major policy through a standing order. Wider belief conversion, warfare and detailed economic maintenance are outside the implemented rules.

## Outstanding release evidence

- Exact private-source component mapping, design-token/variant review and matching-viewport node/details comparison.
- Full 12/100/500-node browser performance exercise, responsive and system/in-game reduced-motion acceptance.
- Fresh-checkout installation proof and final candidate publication.
- Actual ChatGPT installation, embedded interaction and PC/Mac access to the same host.

Current local evidence is not a claim of release completion or unbounded tree performance. See [asset provenance](assets.md) and [architecture](architecture.md) for explicit historical, data and transport limitations.
