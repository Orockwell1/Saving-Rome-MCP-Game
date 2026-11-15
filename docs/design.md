# Figma handoff

Design source: private creator-owned workspace. Its URL and file key are deliberately excluded from this repository. Runtime players and assistants need no Figma access.

The implementation uses eleven existing creator-supplied naval PNG exports, approved by the creator for MIT publication. The creator describes them as ChatGPT-generated artwork inspired by another design. Inspiration and originality were not independently verified. Export hashes, dimensions and provenance are in `ui/src/assets/naval/manifest.json`.

Authenticated local source references were inspected. The original connector handoff did not supply an immutable version; comparison subsequently used a verified, version-pinned capture with matching node/index versions and render hashes. Exact source bindings, original copy, screenshots and comparisons remain outside Git.

## Contract-based first slice

The [design translation workflow](design-translation-layer.md) now has one implemented node/details pair: a public versioned contract, reusable components, named tokens, five node states with four interactions, four inspector phases, and explicit operational extensions. Generated and authored projects use the same components and authoritative-state adapter.

The selected pair was compared at matching desktop and compact dimensions; source geometry, typography, markers and interaction differences were corrected. The creator chose to keep the new ship vector private, so the existing public transport glyph remains an explicit substitution. Residual text-edge differences are recorded; pixel identity and full-frame fidelity are not claimed. Busy, error, unsupported-rule and live-progress behavior is identified separately from source variants. The map and surrounding workspace are not covered by this component sign-off.

Visual target: readable historical atlas, muted political colors, deep blue seas, restrained animation; no map terrain or provinces need to be hand-drawn in Figma.

See [motion design evaluation](motion-design.md) for shared timing tokens, generated-tree behavior, accessibility, and implementation checks.
