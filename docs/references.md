# Reusable projects and data

Research shortlist, not installed dependencies or compatibility claims. Verify current versions, licenses, and actual implementation before copying code. Do not fork a whole game solely on README claims.

| Project | Possible role | Evaluation needed |
| --- | --- | --- |
| [OpenAI Apps SDK examples](https://github.com/openai/openai-apps-sdk-examples) | Starting point for embedded ChatGPT tools and views | Choose a minimal example; verify current account/client behavior and license |
| [MCP Apps](https://github.com/modelcontextprotocol/ext-apps) | Official embedded UI protocol/SDK | Match server and UI versions; test selection context and live updates |
| [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk) | Python MCP server/client | Verify current stable version, HTTP transport, and UI integration |
| [MapLibre GL JS](https://github.com/maplibre/maplibre-gl-js) | Zoomable geographic map, GeoJSON, routes and territory layers | BSD-3-Clause; test WebGL in embedded frame, bundle size, and offline assets; renderer license does not license tiles/fonts |
| [React Flow / xyflow](https://github.com/xyflow/xyflow) | Interactive technology dependency graph | MIT core; custom nodes/statuses, keyboard access, layout, embedding; paid extras are not required |
| [Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/) | Public-domain coastlines and physical geography | Modern baseline, not AD 210 political borders; clip playable geography and record transformations |
| [gameLLM / NODECOIN](https://github.com/hugoguerrap/gameLLM) | Reference for strategy command schemas and engine boundaries | Inspect actual engine/tests/license before reuse; multiplayer and blockchain are unnecessary |
| [RPG MCP](https://github.com/thegreystone/rpg-mcp) | Reference for persistent campaign facts across conversations | Inspect license before code reuse; not an embedded strategy-map foundation |
| [Golemreach](https://golemreach.com/play-in-chatgpt/) | UX precedent for embedded world view and conversational orders | Documentation reviewed only; not assumed reusable source code |

Recommendation: compose focused libraries around our own simulation. Use gameLLM as a reference pending deeper review, not an adopted engine. No third-party code or map data has been vendored yet.
