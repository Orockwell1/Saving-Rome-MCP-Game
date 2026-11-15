# Architecture

## Authority and interfaces

`rome/engine.py` owns campaign facts. `rome/models.py` validates strict data-only commands and generated proposals; `rome/rules.py` owns costs, durations, requirements and effects. `rome/world.py` supplies the deliberately limited historical scenario. Model narration cannot award resources, complete work, replace accepted definitions, or add executable rules.

`rome/server.py` uses the official Python MCP SDK. Six tools expose inspection, workspace rendering, previews, orders, proposals and the public catalog. Local `/api/tool` requests call the same registered MCP tools; there is no alternate browser simulation. `ui/src/bridge.ts` uses the MCP Apps SDK when embedded and bearer-authenticated HTTP in local preview.

The production React/MapLibre/React Flow/Motion workspace is a single `dist/index.html`, including geographic data, approved icons, the MapLibre worker and dependency notices. There are no map-tile, glyph, image-generation or font-CDN runtime requests. Actual ChatGPT iframe/CSP behavior still requires verification.

## Transactions and saves

SQLite WAL transactions persist campaign state and successful command receipts. Each command has a stable ID and an observed revision. Replaying the same ID/payload returns the saved result without spending again; changing a used ID's payload is rejected.

Snapshots have a monotonically increasing `revision`. `last_order_revision` records the last competing player/steward order. Clock frames and lease heartbeats do not invalidate an otherwise current observed order; actual orders do. Every accepted command revalidates present resources, prerequisites, capacity, cargo and targets in its transaction. Previews reserve nothing.

The UI serializes commands, accepts only non-older snapshots, and preserves an uncertain command's exact envelope for explicit retry. It never presents an unacknowledged order as complete.

A filesystem-local SQLite ownership lock permits one CLI host clock per campaign. Restart preserves definitions, routes, progress, selection and history, then pauses without offline catch-up. Use the backup command with the host stopped. Saves and credentials remain outside source control. Receipt/history pruning is not implemented.

## Campaign time and travel

The host advances from monotonic elapsed seconds at 1, 5 or 20 campaign days per real second. Playing requires a heartbeat lease of at most 120 seconds; the visible workspace renews it every 30 seconds. Pause does not require continued model activity. Hidden/closed UI stops renewals; expiry pauses the clock. No background model API is invoked.

Fast-forward processes intervening events rather than skipping them. Institution/law decisions stop advancement for an explicit choice. Scoped mandates can commission routine accepted projects within their cumulative treasury ceiling, available materials and workforce; they cannot resolve consequential decisions.

Fleet position derives from saved sea-link polylines and campaign timestamps. Rerouting begins at the interpolated position and compares remaining paths, not a snapped port. The Mediterranean and Red Sea are separate fleet networks. Egyptian land shipments transfer cargo, not vessels. Port locations, route times and frontiers are explicitly approximate.

## Generated development

A proposal contains stable IDs, named ambition, provenance, supported rule IDs, existing port IDs, prerequisites, affected people/scope and allowlisted icon recipes. It is bounded to 500 nodes per proposal. Validation rejects cycles, duplicate IDs, invented prerequisites, arbitrary fields/effects/code and replacement of existing definitions.

Proposal, acceptance, resource commitment, scheduled work, decision and completed outcome are different states. Cross-tree prerequisites can reference campaign-specific completed work. Local knowledge does not substitute for shipyard facilities, supplies or trained crews.

Unsupported visual recipes produce a labeled generic icon and retain the requested identifier. Unsupported mechanics fail validation; they are never decorative nodes implying nonexistent behavior. The public catalog exposes rule/schema and component/icon data without private design credentials.

## Development design boundary

The [design translation workflow](design-translation-layer.md) separates public component contracts from exact private Figma bindings, raw metadata and comparison captures. The first node/details contract now has source inspection, matching-viewport evidence, a hermetic presentation lab and real-campaign regressions. Shared pure components accept presentation models; the campaign adapter derives costs, prerequisites, progress and actions from acknowledged state. The lab never imports campaign transport. A passing component comparison is not a full-workspace or embedded-client sign-off.

## Connectivity boundary

The HTTP host binds to loopback, validates host/origin and requires its private token for tools. `--stdio` is for a trusted local MCP client or a private authenticated transport spawning the host. Do not expose the loopback service with an unauthenticated public reverse proxy.

OpenAI's current [connection documentation](https://developers.openai.com/plugins/deploy/connect-chatgpt) and [Secure MCP Tunnel guide](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels) describe supported remote access. A tunnel requires appropriate ChatGPT/Platform access and credentials. Neither an authenticated tunnel nor actual ChatGPT embedding has been established in this implementation session.
