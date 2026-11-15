# Rome in ChatGPT

**If you could go back in time, how would you save the Roman Empire?**

A local-first, single-player strategy prototype beginning in AD 210. A Python simulation and SQLite save govern both MCP steward commands and a React campaign workspace.

**Status:** runnable local prototype; actual ChatGPT embedding and exact Figma component fidelity are not verified. The current priority is the [contract-based node/details design slice](docs/design-translation-layer.md), blocked on private source access. Browser preview is not ChatGPT acceptance.

## Run locally

Requires Python 3.11+, [uv](https://docs.astral.sh/uv/), and Node 24/npm.

```sh
uv sync --frozen
npm ci
npm run build
uv run python -m rome
```

Open `http://127.0.0.1:8787`. In another terminal, `uv run python -m rome --print-token` prints the local preview token; paste it into the workspace. Keep it private. The host binds only to loopback and checks bearer authorization and request origins.

The default campaign is `saves/campaign.db`. Restart with the same `--db` path to resume; the clock restarts paused without offline catch-up. Stop the owning host before using `--backup /private/path/backup.db`. A second host cannot own the same campaign clock.

```sh
uv run pytest tests/test_engine.py tests/test_server.py tests/test_generated_mcp.py -q
```

The embedded resource is built into one HTML file. `--stdio` serves the same engine through MCP while keeping the local preview available. Connecting ChatGPT additionally requires authenticated client/tunnel setup; localhost alone is not reachable from ChatGPT. No model API or Figma access is required to run the simulation.

## Implemented locally

- Persistent commands, receipts, previews, current-position rerouting and causal dispatches.
- Pause, 1×/5×/20× time, bounded active-session leases and event/project fast-forward.
- An offline Mediterranean–southern China atlas with coastlines, relief, rivers, selectable ports/fleets and explicit approximate historical regions. No Americas.
- Generated, validated development definitions using shared engine rules—not just the authored naval tutorial. Costs, prerequisites, local manufacturing capacity, institutions and policy decisions have executable consequences.
- Optional naval/citrus tutorial, scoped treasury mandates, expeditions, fruit spoilage, living plants, Egyptian overland cargo transfer and cultivation. Ships cannot cross a fictional Suez Canal.
- Shared node/details rendering, visible unsupported-icon fallbacks, provenance, keyboard selection and reduced-motion controls. This UI still needs the requested exact-design translation.

## Explicit limits

Generated content composes the implemented rule catalog; it cannot invent executable mechanics, arbitrary effects, code or external asset URLs. The local preview does not run an AI steward. Full warfare, territorial editing, belief conversion, comprehensive politics, detailed economic maintenance and historically reconstructed borders are not implemented. Travel times, resources and sweet citrus in AD 210 are declared gameplay assumptions.

The private Figma frames have not been inspected. Approved PNG artwork is not proof of matching component tokens, geometry or variants. Live ChatGPT UI/CSP compatibility and a Windows/PC acceptance pass remain outstanding.

## Development and provenance

- [First-pass brief](docs/first-pass-brief.md)
- [Architecture](docs/architecture.md) · [Milestones](docs/roadmap.md)
- [Design translation](docs/design-translation-layer.md) · [Motion contract](docs/motion-design.md)
- [Asset provenance](docs/assets.md) · [Third-party notices](THIRD_PARTY_NOTICES.txt)
- [Contributing](CONTRIBUTING.md)

Project-owned code/documentation and approved naval exports use MIT. Dependencies retain their own licenses. After changing npm dependencies, regenerate bundled notices with `uv run python scripts/collect_notices.py`. Never commit saves, credentials, private source links/IDs, raw design metadata or reference screenshots.
