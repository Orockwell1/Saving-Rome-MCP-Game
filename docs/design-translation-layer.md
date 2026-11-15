# Design translation: one development node and its details panel

## Current state

The workflow is adapted from Bandog's contract-based development tooling. Authenticated private references have now been inspected and mapped to one reusable development card and inspector. The original connector handoff was live, without an immutable version; the subsequent comparison used a verified version-pinned capture. Exact source identities and evidence remain outside Git.

Implemented: [the public contract](components/development-node-details.v1.json), presentation types, scoped tokens/styles, shared generated/authored-tree integration, a hermetic comparison lab, and real-host browser regressions. The selected pair is verified with declared differences, not pixel-identical or a sign-off of the full frame, map, or wider workspace.

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

A supplied local connector handoff needs no token to open. Preserve whether it is live or version-pinned; never relabel unversioned evidence as immutable. For an optional fresh REST capture:

1. Generate a short-lived personal token with `file_content:read`, following [Figma's token instructions](https://developers.figma.com/docs/rest-api/personal-access-tokens/). Do not use a `VITE_` environment variable.
2. Store `FIGMA_ACCESS_TOKEN` in the host environment or the repository's ignored `.env.local`, with owner-only permissions. Never paste it into a contract, command argument, issue, or screenshot.
3. Keep `source.json` outside every Git checkout. Its `schemaVersion` is `1`; `fileKey` and the unique `nodeIds` come from the actual private selection, not an example or guessed ID.
4. Run:

   ```sh
   chmod 600 .env.local
   uv run python scripts/capture_design.py --source /private/design/source.json
   ```

The command records a shallow frame index, the selected node trees, and PNG renders at scale 1 using absolute bounds. Node JSON and images are pinned to the same Figma file version. Timestamped private capture directories preserve previous references; `capture.json` records dimensions and hashes and remains `unreviewed`. The tool does not publish assets, write to Figma, or approve a match. It refuses Git-contained metadata, credential redirects, unsupported image origins, missing nodes/renders, and unpinned versions.

## Run the isolated component lab

```sh
npm run dev:design
npm run build:design
npm run test:design
```

The loopback-only lab runs at `http://127.0.0.1:5174` with no campaign proxy. It imports the real presentation components, not the campaign bridge. Public default data is independently authored fixture content, not a hidden copy of the reference campaign.

Use the native file picker for private presentation-only reference JSON, validated by the strict schema in `tests/design-lab/contracts.ts`. Files stay in browser memory. Metadata and unknown fields are rejected; allowed strings render literally, never as markup, styles, executable controls or fetched URLs. No reference file becomes a Vite import, upload or storage entry. The loader limits files to 64 KiB; the schema bounds text, identifiers and requirement counts.

Closed scenario IDs cover proposal, blocked, available, underway, complete, pending acknowledgement, errors, empty selection, unsupported rules, disconnected steward and long content. Delivery buttons explicitly simulate fixture acknowledgements; they never claim to run the engine or an AI. “Collect layout evidence” records only the bounded, named regions and computed geometry/styles—never source text, HTML or credentials.

Production behavior is separate: `npm run build && npm run test:ui` exercises isolated real campaigns. The graph adapter opts its native buttons into pointer handling and out of drag/pan interception. Busy/unavailable selection is exposed with `aria-disabled` without dropping focus; compact restoration runs after the visible graph commits.

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

The public contract and private binding cover five node states × four interactions, four inspector phases, reusable tokens, 21 semantic regions and seven closed behavior flows. Busy/error/empty/planned/disconnected/live-progress/long-content behavior is explicitly an operational extension, not an invented source variant.

- Production TypeScript/build and the separate lab build passed. The production HTML was approximately 7.52 MB / 4.05 MB gzip.
- All nine hermetic Playwright journeys passed across 1488×784, 396×784 and 390×844, including strict private-content import, no uploads, keyboard selection, acknowledgement/rejection, disconnected steward and long-content scrolling. Failed harness selectors/copy assertions were corrected; reruns were limited to affected journeys.
- Four real-host journeys passed across desktop and mobile: generated-tree inspection/authorization/commissioning plus live reduced-motion behavior. The order test delays a genuine server response, not a fabricated snapshot. Selection spends nothing; commissioning debits the engine-defined cost once.
- Native checks matched source background/border/focus styling for all 20 node combinations, and phase color/action counts for all four inspector phases.
- Eleven measured reference boxes match exactly. The selected card is 210×137; the proposal inspector is 324×479. At DPR 1, the inspector is at (1137,185) in 1488×784, (36,153) in 396×784, and (33,153) in 390×844. Neither compact viewport has document horizontal overflow.
- Source comparison fixed font coverage, platform-dependent symbols, excess text weight, the missing impact marker and a one-pixel panel-title baseline offset. Real-host checks fixed pointer activation and compact focus restoration.

| Target | Initial pixels differing by >16/255 in any channel | After corrections |
| --- | ---: | ---: |
| Selected node | 7.657% | 3.775% |
| Proposal inspector | 9.445% | 3.655% |

These are raw difference counts, not similarity or approval scores. The node includes the creator-approved substitution of the existing public transport glyph; the supplied private ship vector is not published. Residual text-edge rasterization differences remain. Private reports retain full images, differences, measurements and source bindings; no claim of pixel identity is made.

The existing 15 capture privacy tests cover checkout/symlink exclusion, strict identifiers, token-origin restrictions and redirect refusal. Actual authenticated ChatGPT embedding/CSP and Windows acceptance remain unverified. A local browser or fixture does not close those milestones.
