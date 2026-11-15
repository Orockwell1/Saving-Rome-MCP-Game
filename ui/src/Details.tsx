import { useEffect, useRef, useState } from 'react';
import { campaign } from './campaign';
import { Icon } from './Icon';
import { resourcesText, number, type CargoLot, type Fleet, type Port, type State, type Position, type DevelopmentNode, type ToolData, type Selection } from './types';
import { bridge } from './bridge';
import { DevelopmentInspector } from './development/DevelopmentInspector';
import { developmentInspector } from './development/derive';
import type { DevelopmentAction } from './development/presentation';

function CargoSurvival({ lots, day }: { lots: CargoLot[] | undefined; day: number }) {
  if (!lots?.length) return null;
  const groups = new Map<string, CargoLot>();
  for (const lot of lots) {
    const key = `${lot.kind}:${lot.expires_day}`;
    const previous = groups.get(key);
    groups.set(key, { ...lot, quantity: (previous?.quantity ?? 0) + lot.quantity });
  }
  return <ul>{[...groups].map(([key, lot]) => <li key={key}>{number(lot.quantity)} {lot.kind} · expires day {number(lot.expires_day)} ({number(Math.max(0, lot.expires_day - day))} days remaining)</li>)}</ul>;
}

function CargoForm({ fleet, port, state, disabled }: { fleet?: Fleet; port?: Port; state: State; disabled: boolean }) {
  const [fruit, setFruit] = useState(0);
  const [plants, setPlants] = useState(0);
  const [mode, setMode] = useState('unload');
  const destinations = port ? state.links.filter(link => link.mode === 'land' && (link.from === port.id || link.to === port.id)).map(link => link.from === port.id ? link.to : link.from) : [];
  const [destination, setDestination] = useState('');
  const cargo = { ...(fruit > 0 ? { fruit } : {}), ...(plants > 0 ? { plants } : {}) };
  return <form className="compact-form" onSubmit={event => { event.preventDefault(); void campaign.command(fleet ? 'cargo' : 'transfer_cargo', fleet ? { fleet_id: fleet.id, mode, cargo } : { from_port: port!.id, to_port: destination, cargo }); }}>
    <h4>{fleet ? 'Dockside cargo' : 'Overland transfer'}</h4>
    <p className="muted">{fleet ? 'Loading and unloading require a docked fleet. Fruit and plants retain their real survival constraints.' : 'Goods travel by land; ships do not cross Egypt. Transfer arrives on its scheduled day.'}</p>
    {fleet ? <label>Operation<select value={mode} onChange={event => setMode(event.target.value)}><option value="unload">Unload into port</option><option value="load">Load from port</option></select></label> : <label>Destination<select value={destination} onChange={event => setDestination(event.target.value)} required><option value="">Select connected land port</option>{destinations.map(id => <option key={id} value={id}>{state.ports.find(item => item.id === id)?.name ?? id}</option>)}</select></label>}
    <div className="form-pair"><label>Fruit<input type="number" min="0" step="1" value={fruit} onChange={event => setFruit(Number(event.target.value))} /></label><label>Living plants<input type="number" min="0" step="1" value={plants} onChange={event => setPlants(Number(event.target.value))} /></label></div>
    <button disabled={disabled || !(fruit > 0 || plants > 0) || Boolean(fleet && !fleet.port_id) || Boolean(port && !destination)}>{fleet ? 'Commit cargo order' : 'Dispatch overland cargo'}</button>
  </form>;
}

function FleetDetails({ fleet, state, disabled }: { fleet: Fleet; state: State; disabled: boolean }) {
  const [destination, setDestination] = useState('');
  const [preview, setPreview] = useState<ToolData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const generation = useRef(0);
  useEffect(() => { generation.current++; setPreview(null); setError(''); setLoading(false); campaign.showRoute(null); }, [destination, fleet.id]);
  const previewRoute = async () => {
    const current = ++generation.current;
    setPreview(null); setLoading(true); setError('');
    try { const result = await campaign.preview('move', { fleet_id: fleet.id, destination }); if (current === generation.current) { setPreview(result); campaign.showRoute(result.route ?? null); } }
    catch (cause) { if (current === generation.current) setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { if (current === generation.current) setLoading(false); }
  };
  return <><div className="detail-title"><Icon recipe={{ base: fleet.kind === 'advanced' ? 'blue-water-fleet' : 'transport' }} /><div><span className="eyebrow">{fleet.kind} fleet · {fleet.ships} ships</span><h2>{fleet.name}</h2></div></div>
    <p>{fleet.route ? `Underway to ${state.ports.find(port => port.id === fleet.route!.destination)?.name ?? fleet.route.destination}. Arrival day ${number(fleet.route.arrival_day)} · ${number(Math.max(0, fleet.route.arrival_day - state.day))} days remaining.` : `Docked at ${state.ports.find(port => port.id === fleet.port_id)?.name ?? fleet.port_id ?? 'sea'}.`}</p>
    <h4>Cargo aboard</h4><p>{Object.keys(fleet.cargo).length ? resourcesText(fleet.cargo) : 'Hold empty'}</p>
    <CargoSurvival lots={fleet.cargo_lots} day={state.day} />
    <label>Route destination<select value={destination} onChange={event => setDestination(event.target.value)}><option value="">Choose a port</option>{state.ports.map(port => <option key={port.id} value={port.id}>{port.name} · {port.sea}</option>)}</select></label>
    <div className="button-row"><button disabled={!destination || loading} onClick={() => void previewRoute()}>{loading ? 'Calculating…' : 'Preview route'}</button><button className="primary" disabled={disabled || !destination || !preview} onClick={() => void campaign.command('move', { fleet_id: fleet.id, destination })}>{fleet.route ? 'Change orders' : 'Sail to port'}</button></div>
    {error && <p role="alert" className="inline-error">{error}</p>}{preview && <div className="preview"><p>{preview.message ?? 'Route calculated by the engine.'}</p><details><summary>Route evidence</summary><pre>{JSON.stringify(preview, null, 2)}</pre></details><small>Estimate only. The engine revalidates current position, route, and resources when you commit.</small></div>}
    <section className="detail-section"><h4>Citrus expedition</h4><p>Southern China is connected by eastern seas. Roman vessels can attempt the route too; advanced ships are not a magic gate.</p><div className="button-row"><button disabled={disabled} onClick={() => void campaign.command('expedition', { mode: 'outbound', fleet_id: fleet.id })}>Order outbound voyage</button><button disabled={disabled} onClick={() => void campaign.command('expedition', { mode: 'return', fleet_id: fleet.id })}>Return to Berenike</button></div></section>
    <CargoForm fleet={fleet} state={state} disabled={disabled} />
  </>;
}

function NodeDetails({ node, state, disabled, busy, commandError, onLocate, onSelect }: { node: DevelopmentNode; state: State; disabled: boolean; busy: boolean; commandError?: string; onLocate: (position: Position) => void; onSelect: (selection: Selection) => void }) {
  const [inspection, setInspection] = useState<{ revision: number; data: ToolData | null; error: string; loading: boolean } | null>(null);
  const [discussion, setDiscussion] = useState({ busy: false, error: '', sent: false });
  const previewGeneration = useRef(0);
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { previewGeneration.current++; return () => { previewGeneration.current++; }; }, [node.id, state.revision]);
  const tree = state.trees.find(item => item.nodes.some(candidate => candidate.id === node.id))!;
  const place = state.ports.find(item => item.id === node.location_id) ?? state.territories.find(item => item.id === node.location_id);
  const model = developmentInspector(node, tree, state);
  const currentInspection = inspection?.revision === state.revision ? inspection : null;
  const unavailableReason = disabled ? 'Campaign orders are unavailable while busy, disconnected, or awaiting confirmation.' : undefined;
  const discussUnavailable = !bridge.embedded ? 'No connected steward is available in standalone preview.' : unavailableReason;
  const action: DevelopmentAction = model.phase === 'authorized'
    ? { kind: 'commission', label: 'Commission project', disabled: disabled || discussion.busy, unavailableReason }
    : model.phase === 'commissioned'
      ? { kind: 'advance', label: 'Advance until ready', disabled: disabled || discussion.busy, unavailableReason }
      : model.phase === 'complete' && place
        ? { kind: 'locate', label: 'Show on atlas', disabled: false }
        : { kind: 'discuss', label: 'Discuss with the steward', disabled: Boolean(discussUnavailable) || discussion.busy, unavailableReason: discussUnavailable };
  const isCurrent = () => {
    const selection = campaign.snapshot().state?.selection;
    return mounted.current && selection?.kind === 'node' && selection.id === node.id;
  };
  const discuss = async () => {
    const latest = campaign.snapshot();
    if (!isCurrent() || latest.busy || latest.uncertain || !latest.connected || discussion.busy || !bridge.embedded) return;
    setDiscussion({ busy: true, error: '', sent: false });
    try {
      await bridge.discussNode(node.id, latest.state!.revision, isCurrent);
      if (isCurrent()) setDiscussion({ busy: false, error: '', sent: true });
    } catch (cause) {
      if (isCurrent()) setDiscussion({ busy: false, error: cause instanceof Error ? cause.message : String(cause), sent: false });
    }
  };
  const inspect = async () => {
    const current = ++previewGeneration.current;
    const revision = state.revision;
    const valid = () => current === previewGeneration.current && isCurrent() && campaign.snapshot().state?.revision === revision;
    setInspection({ revision, data: null, error: '', loading: true });
    try {
      const data = await campaign.preview('project', { node_id: node.id });
      if (valid()) setInspection({ revision, data, error: '', loading: false });
    } catch (cause) {
      if (valid()) setInspection({ revision, data: null, error: cause instanceof Error ? cause.message : String(cause), loading: false });
    }
  };
  const performAction = () => {
    if (action.disabled || !isCurrent()) return;
    if (action.kind === 'locate') { if (place) onLocate(place.position); return; }
    if (action.kind === 'discuss') { void discuss(); return; }
    const latest = campaign.snapshot();
    if (latest.busy || latest.uncertain || !latest.connected) return;
    const latestTree = latest.state?.trees.find(item => item.nodes.some(candidate => candidate.id === node.id));
    const latestNode = latestTree?.nodes.find(item => item.id === node.id);
    if (action.kind === 'commission' && latestTree?.status === 'accepted' && latestNode?.status === 'available') void campaign.command('start_project', { node_id: node.id });
    if (action.kind === 'advance' && latestNode?.status === 'underway') void campaign.command('clock', { mode: 'until_project', node_id: node.id });
  };
  return <>
    <DevelopmentInspector model={model} action={action} busy={busy || discussion.busy} error={[commandError, discussion.error && `Steward discussion failed: ${discussion.error}`].filter(Boolean).join('\n') || undefined} onAction={performAction} secondary={model.phase === 'authorized' ? { action: { kind: 'discuss', label: 'Discuss with the steward', disabled: Boolean(discussUnavailable) || discussion.busy, unavailableReason: discussUnavailable }, onAction: () => void discuss() } : undefined} />
    <section className="development-technical" aria-label="Development technical details">
      <h3>Project facts and controls</h3>
      <dl><dt>Rule / scope</dt><dd>{node.rule} / {node.scope}</dd><dt>Provenance</dt><dd>{tree.provenance.author} · v{tree.provenance.version}</dd></dl>
      <button onClick={() => { if (place) onLocate(place.position); }} disabled={!place}>Show {place?.name ?? node.location_id} on atlas</button>
      {node.prerequisites.length > 0 && <section><h4>Inspect prerequisite projects</h4><div className="prerequisite-list">{node.prerequisites.map(id => { const prerequisite = state.trees.flatMap(item => item.nodes).find(item => item.id === id); return <button key={id} onClick={() => onSelect({ kind: 'node', id })} disabled={disabled || !prerequisite}>{prerequisite?.title ?? id}<small>{prerequisite?.status ?? 'Not in current tree'}</small></button>; })}</div></section>}
      <button disabled={disabled || currentInspection?.loading} onClick={() => void inspect()}>{currentInspection?.loading ? 'Inspecting…' : 'Inspect requirements'}</button>
      {currentInspection?.error && <p role="alert" className="inline-error">Requirements could not be loaded: {currentInspection.error}</p>}
      {currentInspection?.data && <details open className="preview"><summary>Engine requirements · revision {currentInspection.revision}</summary><pre>{JSON.stringify(currentInspection.data, null, 2)}</pre></details>}
      {action.kind !== 'discuss' && model.phase !== 'authorized' && <><button disabled={Boolean(discussUnavailable) || discussion.busy} onClick={() => void discuss()}>{discussion.busy ? 'Contacting steward…' : 'Discuss with the steward'}</button>{discussUnavailable && <p className="muted">{discussUnavailable}</p>}</>}
      {discussion.sent && <p role="status">Discussion sent to the connected steward. No orders were authorized.</p>}
    </section>
  </>;
}

export function Details({ state, disabled, busy, commandError, onLocate, onSelect }: { state: State; disabled: boolean; busy: boolean; commandError?: string; onLocate: (position: Position) => void; onSelect: (selection: Selection) => void }) {
  const selected = state.selection;
  if (!selected) return <aside className="details-panel"><span className="eyebrow">Imperial brief</span><h2>Your next decision</h2><p>Select a port, territory, fleet, or project to inspect the engine’s facts and give orders.</p><div className="callout"><h3>Many possible Romes</h3><p>Choose an ambition in Council. New institutions, laws, and inventions use the same development system; no fixed tree determines your campaign.</p></div><h4>Historical assumptions</h4><ul>{state.assumptions.map(item => <li key={item}>{item}</li>)}</ul></aside>;
  const fleet = selected.kind === 'fleet' ? state.fleets.find(item => item.id === selected.id) : undefined;
  const port = selected.kind === 'port' ? state.ports.find(item => item.id === selected.id) : undefined;
  const territory = selected.kind === 'territory' ? state.territories.find(item => item.id === selected.id) : undefined;
  const node = selected.kind === 'node' ? state.trees.flatMap(item => item.nodes).find(item => item.id === selected.id) : undefined;
  return <aside className={node ? 'development-details-panel' : 'details-panel'} aria-label="Selection details">{!node && <span className="eyebrow">Selected {selected.kind}</span>}
    {fleet && <FleetDetails key={fleet.id} fleet={fleet} state={state} disabled={disabled} />}
    {node && <NodeDetails key={node.id} node={node} state={state} disabled={disabled} busy={busy} commandError={commandError} onLocate={onLocate} onSelect={onSelect} />}
    {port && <><div className="detail-title"><Icon recipe={{ base: 'transport' }} /><div><h2>{port.name}</h2><p>{port.sea}</p></div></div><h4>Local inventory</h4><p>{resourcesText(port.inventory)}</p><CargoSurvival lots={port.cargo_lots} day={state.day} /><h4>Facilities</h4><p>{port.facilities.join(', ') || 'None'}</p><button onClick={() => onLocate(port.position)}>Locate port</button><CargoForm key={port.id} port={port} state={state} disabled={disabled} /></>}
    {territory && <><h2>{territory.name}</h2><p>{territory.description}</p><dl><dt>Legal owner</dt><dd>{territory.owner}</dd><dt>Military occupation</dt><dd>{territory.occupier ?? 'None'}</dd><dt>Administration</dt><dd>{territory.administration}</dd></dl><p className="muted">The boundary shown is a coarse gameplay region, not a researched ancient frontier.</p><button onClick={() => onLocate(territory.position)}>Locate territory</button></>}
    {!fleet && !node && !port && !territory && <p>The selected object is not present in the latest campaign snapshot.</p>}
  </aside>;
}
