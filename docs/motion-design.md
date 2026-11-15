# Motion design evaluation and implementation contract

Status: Motion React is integrated in the local prototype. A generated naval branch and religious reform branch were exercised with retained tree viewport and selection; the full 12/100/500 performance, responsive, system-preference and actual embedded-client checks below remain outstanding. Exact visual translation now follows the [single-node/details contract gate](design-translation-layer.md).

## Decision

Use the free MIT-licensed Motion React library as the single animation library. Use native CSS for simple hover/focus/color transitions. Motion AI Kit is not a game dependency; no hosted agent tooling, Motion+ audit or premium example is required.

Use LottieFiles motion-design guidance as a reference for purposeful timing, easing, and bounded sequencing. It does not require adopting the Lottie animation player. Do not import its entire stylistic prescription: Rome needs readable, quiet motion, without continuous ambient effects, bouncing cards, shaking errors, or particle celebrations.

Do not add GSAP, Lottie playback, 3D, or video tooling for the first playable without an unmet need.

## Provisional shared tokens

Project-authored defaults, not measured results or mandatory upstream values:

| Token | Value | Use |
| --- | --- | --- |
| quick | 120 ms | Small state/selection feedback |
| standard | 220 ms | Node entry, panel content change |
| deliberate | 320 ms | Larger panel transition |
| entry distance | 8 px maximum | Small inner-content offset |
| easing | cubic-bezier(0.2, 0, 0, 1) | Restrained ease-out |
| reveal sequence | 400 ms maximum total | Large batch appears together rather than delaying each node |

Share the same named tokens with Figma and code. Durations are real UI time, independent of campaign speed. A project taking months in the simulation must not take months to animate.

## Behaviors

- Generated tree additions: apply a validated, versioned batch with stable IDs. Fade in new visible nodes; avoid replaying entry effects for unchanged nodes or reopening a save. Bound the whole reveal sequence regardless of node count.
- Tree updates: preserve selection, keyboard focus, expanded branches, pan, and zoom. Highlight changed requirements with text/status indicators as well as color. Never auto-fit or steal the viewport on every update; offer an explicit Show new projects action.
- Graph ownership: React Flow owns its node-wrapper positioning, pan, zoom, and drag. Animate inner node content with Motion. Do not put competing layout transforms on graph wrappers. For animated node relocation, use a tested graph-coordinate interpolation that keeps edges attached; otherwise snap positions and fade changed content in the first version.
- Panels: brief opacity/short offset transitions, interruptible and immediately interactive. Restore focus after dismissal and preserve sensible focus during content changes. Animation completion must never be required for an engine command to commit.
- Status: a single brief emphasis for blocked/underway/completed changes; keep a persistent label and icon afterward. Avoid perpetual pulsing and animating every progress update.
- Map: MapLibre owns geography, camera, routes, and moving units. Use its layer/feature APIs for highlights; do not animate every geographic feature through React. Avoid unsolicited camera movement. Fleet motion derives from campaign timestamps, not an unrelated animation timer.
- Synchronization: apply authoritative state immediately and animate the presentation. Previewed projects must look distinct from committed work. Stale or rejected commands retain their actual status with an explanatory message.

## Accessibility

Configure Motion to respect the system preference (MotionConfig reducedMotion="user"). Also support an explicit in-game reduced-motion override. Custom map camera/graph animations need separate preference handling: MotionConfig does not control them.

Reduced motion disables sliding, scaling, animated reflow, route drawing, and camera flight; use immediate changes or brief fades. Keep routes and unit positions accurate. Preserve keyboard access, text statuses, and focus indicators. Announce concise batch summaries rather than a screen-reader announcement per generated node. No gameplay information may depend on seeing an animation.

## Performance and integration

Use the smallest applicable Motion feature set; measure the production bundle rather than quoting upstream marketing sizes. Lazy loading is an option, not an assumption that all layout features are free. Keep graph and map camera/drag handlers independent of React state churn. Animate visible changed content only; memoize stable nodes, cancel superseded animations, suspend decorative animation in hidden views, and do not relayout the entire graph on every clock tick.

Validate in the actual ChatGPT embedded frame. Browser preview results alone do not establish compatibility. Do not add a hosted AI Kit MCP connection merely to run animations; the runtime library works without it.

## Acceptance checks for the UI implementation

1. Generate a naval branch and a religious reform branch through the same components; add/change nodes without resetting selection or viewport.
2. Exercise 12-, 100-, and 500-node fixtures with a small update batch, long labels, live progress, and an open details panel. These are test sizes, not a claim of achieved capacity.
3. During updates, pan/zoom/drag and click actions remain usable; edges stay attached and commands are not delayed by choreography. Profile on a representative PC and Mac; aim for smooth 60 Hz interaction and record device, frame-time/long-task evidence, and bundle size. Reduce effects if the target is missed.
4. Test system and in-game reduced-motion settings, keyboard navigation, focus retention, hidden/reopened views, and interrupted/repeated updates.
5. Test live fleet positions against authoritative campaign time, including pause, speed changes, fast-forward, reroute, and reconnect.
6. Verify production assets and dependencies are bundled compatibly with embedded-app resource restrictions. Preserve license notices for any reused code.

## Sources reviewed

- [Motion React](https://motion.dev/docs/react): React animation capabilities.
- [Motion accessibility](https://motion.dev/docs/react-accessibility): preference handling and its scope.
- [Bundle guidance](https://motion.dev/docs/react-reduce-bundle-size): feature loading and bundle tradeoffs.
- [Motion source/license](https://github.com/motiondivision/motion): MIT runtime library.
- [AI Kit README](https://github.com/motiondivision/ai-kit): optional agent tooling and free/paid distinctions.
- [LottieFiles motion-design guidance](https://github.com/LottieFiles/motion-design-skill/blob/main/skills/motion-design/SKILL.md): timing, easing, and sequencing reference; MIT licensed. No upstream files vendored.
