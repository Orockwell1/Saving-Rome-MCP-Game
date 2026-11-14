# Rome in ChatGPT

**If you could go back in time, how would you save the Roman Empire?**

An open-source, single-player grand strategy game being designed for play inside ChatGPT through MCP. Start in AD 210 as a time traveler named as Severus’s heir. Discuss policy with an imperial steward, give orders on an interactive campaign map, and explore a visible technology tree.

**Status: planning and technical discovery. No playable release or verified ChatGPT integration yet.**

## The direction

- Save Rome through your own approach: institutions, health, agriculture, diplomacy, military reform, technology, or exploration.
- One authoritative simulation for map actions and steward commands.
- Local hosting, persistent campaigns, and access from PC and Mac through the same running host.
- An optional citrus-expedition tutorial develops an advanced sailing fleet; initial geography connects the Mediterranean to southern China.
- Europe, Africa, and Asia only. **The Americas are excluded.**

Preferred stack: Python simulation, SQLite persistence, TypeScript/React interface. Validate integration before locking dependencies.

## Start here

- [First-pass brief](docs/first-pass-brief.md)
- [Build preparation and roadmap](docs/roadmap.md)
- [Architecture decisions](docs/architecture.md)
- [Reusable projects and data](docs/references.md)
- [Figma design handoff](docs/design.md)
- [Contributing](CONTRIBUTING.md)

There is no install or run command yet. The first milestone is one fleet moving through an embedded ChatGPT map, with rules and a persistent save behind it.

## Open source and privacy

Project-owned code and documentation are MIT licensed. Third-party code, maps, fonts, and art retain their own terms; see [asset provenance](docs/assets.md). Campaign saves, credentials, and local settings must not be committed. Public source does not require public campaign data.

See [motion design evaluation](docs/motion-design.md) for shared timing tokens, generated-tree behavior, accessibility, and implementation checks.
