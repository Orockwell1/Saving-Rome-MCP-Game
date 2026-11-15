# Design translation: one development node and its details panel

## Current state

The contract-based workflow below is adapted from Bandog's development tooling. **Exact Rome source inspection is blocked on local Figma credentials.** The current node/details UI is a working implementation baseline, not a verified Figma translation. No exact component bindings, approved design tokens, matching-viewport comparison, or visual sign-off have been produced.

Implemented now: a private, version-pinned, read-only evidence capture command and its privacy-boundary tests. Public component contracts and the contract-driven node/panel revision must follow source inspection; they are not represented by invented mappings or a passing empty audit.

## Public/private boundary

| Public repository | Private development directory, outside Git |
| --- | --- |
| Reusable code and semantic component/region IDs | Figma file keys, node/variable/style/asset IDs and links |
| Approved component tokens, variants and behavior contracts | Raw Figma JSON, original frame text, reference screenshots |
| Exact viewport dimensions and fixture behavior definitions | Per-contract source bindings and source-version capture manifest |
| Approved redistributed assets and license notices | Side-by-side captures, image differences and review decisions |
| Sanitized status/count/geometry evidence | Credentials and signed download URLs |

Never import private metadata into Vite or the production MCP resource. A public contract identifies implementation ownership and supported behavior; a private binding maps that contract to the exact source nodes. Asset approval does not imply approval of a component's geometry, typography, responsive behavior, or visual fidelity.

## Capture the source

1. Generate a short-lived personal token with `file_content:read`, following [Figma's token instructions](https://developers.figma.com/docs/rest-api/personal-access-tokens/). Do not use a `VITE_` environment variable.
2. Store `FIGMA_ACCESS_TOKEN` in the host environment or the repository's ignored `.env.local`, with owner-only permissions. Never paste it into a contract, command argument, issue, or screenshot.
3. Keep `source.json` outside every Git checkout. Its `schemaVersion` is `1`; `fileKey` and the unique `nodeIds` come from the actual private selection, not an example or guessed ID.
4. Run:

   ```sh
   chmod 600 .env.local
   uv run python scripts/capture_design.py --source /private/design/source.json
   ```

The command records a shallow frame index, the selected node trees, and PNG renders at scale 1 using absolute bounds. Node JSON and images are pinned to the same Figma file version. Timestamped private capture directories preserve previous references; `capture.json` records dimensions and hashes and remains `unreviewed`. The tool does not publish assets, write to Figma, or approve a match. It refuses Git-contained metadata, credential redirects, unsupported image origins, missing nodes/renders, and unpinned versions.

## First slice, before expansion

1. **Choose one exact node and its details-panel target.** Identify their actual component/instance IDs, source frame, variants, relevant variables/styles, asset IDs, dimensions and capture version in private metadata. A loose icon PNG is not a component contract.
2. **Identify missing design decisions.** Inventory selected, proposed, blocked, available, underway, completed, busy, empty, error, keyboard-focus and responsive states. Record which are present in the source. Missing required states are open design decisions, not inferred Figma variants.
3. **Map public implementation ownership.** Name the reusable node and details components, stable semantic DOM regions, approved icon recipe, public tokens and variants. Keep exact private source IDs only in the local binding. Do not duplicate a component convention for generated versus authored nodes.
4. **Define behavior separately from appearance.** Preserve engine-owned costs, durations, prerequisites and statuses. Selection may expose details but never spend. Commissioning uses the shared command layer, remains unavailable when blocked/busy/completed, and changes status only after acknowledgement. Errors retain authoritative state. Define native keyboard focus, document/panel scrolling, long-label handling and reduced-motion behavior explicitly.
5. **Use a hermetic fixture.** Mount the real reusable components with clearly identified fixture data. No campaign transport, credentials, storage writes, Figma writes or background AI. Closed semantic state/control/flow IDs only—never user-supplied selectors, scripts, URLs or arbitrary CSS. The fixture is not a production build input.
6. **Compare identical targets.** Use the declared source version, state, viewport and device scale. Capture Figma and implementation at matching dimensions, run native keyboard/click flows, and inspect both the image difference and bounded geometry/style evidence. A pixel difference alone does not prove behavior or identify a correct fix.
7. **Fix documented differences.** Classify findings as mapping, behavior, visual or environment; change the owning component/token, not the reference to hide a mismatch. Re-run the identical evidence set. Do not expand the component family until required findings are resolved or an explicit design decision changes the contract revision.

A passing report requires real source bindings, complete required-region/state coverage, executed behavior flows and matching-viewport evidence. Schema validity, a browser screenshot, a successful build, or possession of licensed artwork is insufficient.

## Verification so far

`uv run pytest tests/test_design_capture.py -q`: 15 tests passed. These cover checkout/symlink exclusion, strict source identifiers, token-origin restrictions, redirect refusal, and private non-executed credential files. Live API capture was attempted and stopped because `FIGMA_ACCESS_TOKEN` was not configured. No authenticated Figma or visual-match result is claimed.
