# Architecture — provisional

## Agreed constraints

ChatGPT-first embedded map and technology tree; local-first hosting; one private persistent campaign; no Americas. Model narration never overrides engine facts.

## Preferred components

- Python: simulation and authoritative command validation.
- SQLite: transactional save, commands, events, projects, orders, and campaign clock.
- TypeScript/React: embedded map, panels, and naval technology tree.
- MCP adapter: current official SDK and embedded-app protocol; choose Python-only or a thin TypeScript adapter after the integration proof.

Keep engine logic independent of HTTP, MCP, and rendering. Both UI actions and chat commands use the same command API. Persist command identifiers for retries and use campaign revisions/revalidation for stale requests. Preview is not a reservation; committing must check again.

## Clock

Advance independently while playing. Support pause, speed, and event-based fast-forward. Use explicit elapsed-time bookkeeping and saved events; define inactivity behavior. Do not assume a chat model runs continuously or can be invoked by the service without an API. Background actions use game rules and mandates.

## Local connectivity

A local host runs the campaign; another device accesses that same host. Verify a supported authenticated HTTPS connection/tunnel for ChatGPT. No credentials or saves in Git. A development browser preview is helpful but is not proof of embedded ChatGPT functionality.

## Open decisions

Current ChatGPT eligibility/auth flow; exact SDK versions; map renderer choice following embedded WebGL tests; initial route dataset; time speeds; precise naval design; asset export and licensing. Record decisions with evidence as spikes complete.
