# Figma handoff

Design source: private creator-owned workspace. Its URL and file key are deliberately excluded from this repository. Runtime players and assistants need no Figma access.

The implementation uses eleven existing creator-supplied naval PNG exports, approved by the creator for MIT publication. The creator describes them as ChatGPT-generated artwork inspired by another design. Inspiration and originality were not independently verified. Export hashes, dimensions and provenance are in `ui/src/assets/naval/manifest.json`.

Direct source-file inspection remains unverified: the available Figma session was signed out, and Brave denied Apple Events page access. No claim is made that the code reproduces uninspected source typography or component states.

## Contract-based first slice

Follow [Rome's design translation workflow](design-translation-layer.md). The immediate target is one exact development-tree node and its details panel, with private source bindings, public reusable contracts, named tokens/variants, explicit behavior and matching-viewport evidence.

The current UI is a functional baseline using the approved artwork, not a verified reproduction of the private components. Do not expand the component family or claim fidelity until the first slice's documented differences are resolved. Missing source states must remain explicit design decisions.

Visual target: readable historical atlas, muted political colors, deep blue seas, restrained animation; no map terrain or provinces need to be hand-drawn in Figma.

See [motion design evaluation](motion-design.md) for shared timing tokens, generated-tree behavior, accessibility, and implementation checks.
