# Rome in ChatGPT — First-Pass Brief

## Project and status

Build a private, single-player grand strategy game played **inside ChatGPT through MCP**, with an embedded interactive map and visible technology tree. This brief records planning decisions; no implementation or ChatGPT connection has been verified. Start with a small, coherent playable slice. The player is not highly technical: explain decisions plainly and use adjustable defaults rather than asking them to settle every rule upfront.

## The premise

**“If you could go back in time, how would you save the Roman Empire?”**

The campaign begins in AD 210. The player is a time traveler named as Septimius Severus’s heir. ChatGPT plays the imperial steward. Both player and steward give orders in the same persistent world through the same validated game rules.

The player decides what saving Rome means. Government, succession, public health, agriculture, education, trade, diplomacy, military organization, exploration, and technology are possible strategies. Industrialization and conquest are optional. Outcomes should create competing priorities, opportunities, and unintended consequences.

The engine owns the facts and resolves outcomes. The model explains, plans, narrates, and issues authorized commands; it cannot invent resources or declare projects completed.

## Firm decisions

- **ChatGPT first:** an embedded game workspace, with conversation alongside the map and tech tree. Do not silently substitute a standalone browser game or Claude Code application.
- **No Americas:** no discovery, expeditions, colonization, or scripted travel to the New World. Playable geography is in Europe, Africa, and Asia.
- **Local hosting initially:** no paid hosting subscription is required. One chosen computer runs the game and holds the save.
- **PC and Mac:** either device should access the same campaign. With local hosting, the host computer must remain awake and reachable. Separate local installations do not automatically share saves.
- **Persistence:** retain routes, schedules, projects, inventories, standing orders, decisions, and chronicle across service restarts and fresh chats.
- **Shared commands:** clicking a fleet and ordering it through chat affect the same unit through the same rules.
- **Living world:** campaign time can progress while the player talks, with pause, speed controls, and fast-forward.
- **Map and tech tree are functional interfaces**, not decorative illustrations.

## Verify the ChatGPT connection first

Check current official requirements for the player’s account/workspace, private MCP write access, embedded UI, authentication, and supported clients. Earlier conversations included plan-tier claims that must not be treated as current verified facts.

Determine the supported secure connection from ChatGPT to the local service, potentially through an HTTPS tunnel. Keep the endpoint private and authenticated. Test both PC and Mac clients. Mobile comes later.

The first technical proof is: display a small embedded map, select a fleet, order movement through ChatGPT, and show the accepted route. A browser preview is useful during development but is not a replacement for this acceptance test. If the intended connection is unavailable, report the specific limitation rather than quietly changing the product.

## Optional tutorial: sweet citrus and an advanced sailing navy

The orange expedition is a quick, optional tutorial—not the campaign’s required storyline.

Opening request: **“I want a glass of sweet orange juice.”**

Use it to teach selecting units and locations, giving chat orders, inspecting prerequisites, allocating resources, commissioning projects, issuing standing orders, rerouting, and controlling time.

The tutorial develops a small, capable **ocean-going, multi-masted sailing fleet inspired by Age of Discovery vessels**, hundreds of years beyond Roman-era ships. It leaves behind trained crews and the shipyard knowledge/capacity to maintain and reproduce them. Do not merely spawn advanced ships.

Compress development time for the tutorial while showing commitments and progress. Its fleet, expenses, knowledge, and relationships remain in the campaign. Skipping it can leave Roman-era capabilities.

Afterward the steward asks: **“Your Majesty, what shall we do for Rome?”** The player can use the navy or focus on something entirely different.

### Historical assumption and geographic scope

Sweet oranges are associated with southern China and neighboring Southeast Asia. Exact cultivation and identification in AD 210 are uncertain; early references may mean other citrus. Treat a desirable sweet citrus variety in southern China as an **explicit game assumption**, not a proven historical fact. Do not assume modern supermarket cultivars.

Seek fruit and living plants or grafting material, enabling a supply route and eventual cultivation closer to Rome. Spoilage, seasons, plant survival, and provisioning can provide manageable constraints.

The first playable map must include a connected corridor:

**Mediterranean → Egypt/Red Sea → Indian Ocean → India and Sri Lanka → Southeast Asia → southern China.**

Detail selected ports and routes first; surrounding territory can remain coarse. Do not stop the map at Egypt when the tutorial’s destination is Asia.

There is no modern Suez Canal. Model overland transfers or separately research a justified ancient waterway connection. Keep Mediterranean and Red Sea fleet logistics coherent.

Ancient Asian trade did not require Renaissance-style ships. Advanced ships improve reliability, range, cargo capacity, and independence; they are not an artificial prerequisite for all contact with Asia.

## Map design

Visual direction: **a readable historical atlas with restrained animation**.

- Deep blue seas, muted political colors, warm land tones, shaded mountains and terrain.
- Strong external borders, finer provincial boundaries, and subtle historical styling around the interface.
- Readability takes priority over parchment texture and ornament.
- Fleet and legion markers with banners, visible routes, arrival estimates, and construction progress.
- Pan and zoom: broad views show states/frontiers and major activity; closer views reveal provinces, districts, settlements, ports, roads, and projects.
- Political view by default, with a simple supply/transport overlay when useful.
- Selection opens a compact detail panel and passes structured context to ChatGPT.
- The steward can highlight places and preview routes on the same map.

Use real coastlines/terrain with separate layers for territory, settlements, transport, and activity. Track source licenses and distinguish researched ancient geography from uncertain or gameplay-adjusted boundaries.

Districts are the eventual smallest territorial units, grouped into provinces and states. Track legal ownership, military occupation, and administrative assignment separately. Eventually support individual district conquest, provincial treaties, and internal border changes. Show occupation differently from formal ownership.

For the first pass, implement selectable territory, ports, fleets, and route changes. Full warfare and border editing can follow.

## Visible technology tree and goals

The technology tree is a second interactive workspace connected to the map.

- Show available, underway, blocked, and future capabilities.
- Selecting a distant goal highlights prerequisite paths and the next executable steps.
- Show real campaign materials, skills, facilities, capacity, and work estimates.
- Connect missing inputs and shipyards to locations on the map.
- Share selected technology context with the steward.
- Separate knowledge of an invention from capacity to manufacture, supply, and maintain it.
- Clearly mark planned/unimplemented nodes; do not imply all displayed ambitions are playable.
- Make institutional reforms and diplomatic goals visible too, initially through a simple projects/goals panel. Technology is one path among several.

### First modeled branch: blue-water sailing

Build a manageable dependency network for stronger hulls, timber/seasoning, shipyards, rigging, sailcloth, multiple masts and sail plans, navigation/charts, provisions, and crew training. Allow parallel work where appropriate. These converge into a trial vessel and a small operational fleet.

Research the precise ship design and requirements; label assumptions. Do not make naval development a single magic unlock.

Industrial steel is a later branch. Eventual ambitions include coal/coke/steel, steam, railways, firearms, artillery, airships, and steel fleets.

## Clock and pacing

The player wants a world that moves while talking, but liked the immediate satisfaction of saying what they want and seeing progress.

Use provisional, adjustable rules:

- Acknowledge orders immediately and show allocation, construction starts, or routes.
- Travel and construction consume campaign time; the engine advances independently of model responses while running.
- Offer pause, speed controls, and **advance to next important event / until this project is ready**.
- Fast-forward resolves intervening events and stops for consequential unresolved decisions.
- Initially pause when the play session ends. Define inactivity/session detection explicitly; closing a client is not always reliably detectable.
- Record pending decisions and events in a dispatch log. The map may update without assuming ChatGPT can spontaneously send messages.
- Read fresh state before briefings and commands.

Do not lock in an exact real-time/game-time ratio before playtesting.

## Steward authority

Do not require the player to design a permissions framework upfront.

- Inspect state, interpret goals, explain obstacles, and propose executable plans.
- Direct orders authorize routine execution within agreed scope and budget.
- Escalate new wars, substantial unbudgeted spending, competing priorities, or major changes in risk.
- Turn instructions such as “You can always handle that yourself” into visible, editable, scoped standing orders.
- Eventually delegate routine supplies, appropriate equipment, transport, and phased modernization.
- Distinguish proposals, committed orders, and completed outcomes.
- Explain changed schedules using actual saved causes.

## Technical direction

Preferred starting architecture: **Python simulation + TypeScript/React embedded UI + SQLite persistence**. MCP can use the language that best fits the verified integration. Keep rules separate from the UI and MCP adapter. This preference can change for a concrete technical reason.

One local service owns campaign state and time. Map actions and MCP tools call the same command layer.

Required foundations:

- Persist time, units, routes, resources, projects, capabilities, mandates, decisions, and chronicle.
- Validate feasibility and resource commitments; prevent double spending.
- Idempotent commands: retrying the same command identifier applies it once.
- Check stale state and revalidate before committing; do not overwrite newer orders.
- Commit related changes atomically.
- Preserve useful event history and support save backups/resume.
- Use a small stable tool set for inspection, prerequisites, previews, commands, and time controls. Do not create a tool per invention.
- No paid AI API is assumed: ChatGPT is the initial steward. Background world behavior can use rules and standing orders; the service cannot assume it can invoke the ChatGPT conversation autonomously.

Start at province/unit/project level. Do not simulate millions of citizens, introduce multiplayer networking, or adopt a blockchain.

## Longer-term vision—not first-pass scope

- Regional specialization constrained by food, population, skills, freight, and resources.
- Mixed march/sea/rail routes with transfer delays and capacities.
- Campaign-map battles, occupation, treaties, and provincial reorganization.
- Foreign powers with interests and historically grounded development.
- Diplomacy using aid, expertise, and equipment; a smuggled artifact does not grant manufacturing capability.
- Succession, factions, institutions, health, education, religion, and migration consequences.
- The Raven’s Teeth as personal guard and intelligence organization, passing to the chosen heir.
- Broad modernization programs competing for labor and materials.

Replayability comes from testing different theories of saving Rome and facing the consequences—not a compulsory orange-to-steel checklist.

## Build sequence

1. **Connection proof:** local service, ChatGPT MCP, tiny embedded map, one selectable fleet, one successful chat-issued movement command.
2. **Map/save foundation:** Asia-reaching corridor, ports, selectable territory, transport links, routes, persistence.
3. **Time/events:** movement, rerouting from current position, speed controls, dispatches, pause, event-based fast-forward.
4. **Naval projects:** small visible prerequisite network connected to actual resources and shipyards.
5. **Tutorial/delegation:** citrus expedition, basic standing orders, trial vessel, advanced fleet.
6. **Resume/device verification:** service restart and fresh chat from the other computer against the same campaign host.

Keep each increment playable. Complete historical geography, full combat, extensive politics, and an enormous tech tree must not block the first slice.

## First-pass acceptance

- Embedded map and visible naval tech tree work inside ChatGPT.
- Both UI and chat orders use the same engine and save.
- Fleet movement has a visible route and arrival estimate; time actually progresses.
- Rerouting uses current position; the steward explains arrival changes from saved facts.
- A blocked naval project traces to an actual missing campaign requirement.
- Meeting requirements and spending resources creates a usable trial vessel.
- One scoped standing order executes routine work and logs it.
- The expedition can reach the Asian destination, with coherent Egyptian transfers.
- Fast-forward processes intervening events and stops for consequential decisions.
- Restart/new conversation preserves the campaign.
- PC and Mac can access the same locally hosted save, with uptime requirements explained.
- No routes or content lead to the Americas.
- Clearly label historical assumptions, approximations, unfinished features, and unverified integration behavior.

## References

These are documented precedents, not personally tested or approved dependencies. Verify actual implementation and current availability before relying on them.

- [gameLLM / NODECOIN](https://github.com/hugoguerrap/gameLLM): MCP strategy commands for settlement, research, armies, trade, and diplomacy. Inspect the engine before assuming README claims are implemented. Multiplayer/blockchain design is not needed for Rome.
- [Golemreach](https://golemreach.com/play-in-chatgpt/): documented in-chat live world view and conversational control.
- [RPG MCP](https://github.com/thegreystone/rpg-mcp): persistent rules-aware campaigns across conversations.
- [Cloudflare interactive ChatGPT chess tutorial](https://developers.cloudflare.com/workers/demos/chatgpt-app/): embedded game interface and MCP commands; cloud hosting is optional, not the selected initial deployment.
- [Citrus origin research](https://pmc.ncbi.nlm.nih.gov/articles/PMC11814927/).
- [Sweet-orange history and identification uncertainty](https://pmc.ncbi.nlm.nih.gov/articles/PMC12365825/).
- [Historical citrus spread into the Mediterranean](https://cris.tau.ac.il/en/publications/the-citrus-route-revealed-from-southeast-asia-into-the-mediterran/).

## Handoff instructions

Treat this as the agreed baseline. Inspect any existing project and current official ChatGPT integration documentation first. Explain a compact architecture and initial vertical slice before broad implementation. Ask only materially blocking questions; make routine choices with stated, adjustable defaults. Do not reopen settled requirements such as ChatGPT-first play, local hosting, optional tutorial, or exclusion of the Americas.
