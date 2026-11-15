import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { MotionConfig } from 'motion/react';
import { Atlas } from './Atlas';
import { Development } from './Development';
import { Council, Chronicle } from './Council';
import { Details } from './Details';
import { Icon } from './Icon';
import { bridge } from './bridge';
import { campaign, useCampaign } from './campaign';
import { number, type Position, type Selection } from './types';

type Tab = 'atlas' | 'development' | 'council' | 'chronicle';
const systemMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const readSystemMotion = () => systemMotion.matches;
function subscribeSystemMotion(onChange: () => void) {
  systemMotion.addEventListener('change', onChange);
  return () => systemMotion.removeEventListener('change', onChange);
}
const compactViewport = window.matchMedia('(max-width: 760px)');
const readCompactViewport = () => compactViewport.matches;
function subscribeCompactViewport(onChange: () => void) {
  compactViewport.addEventListener('change', onChange);
  return () => compactViewport.removeEventListener('change', onChange);
}

function TokenForm({ reconnect = false }: { reconnect?: boolean }) {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  return <form className="token-form" onSubmit={async event => { event.preventDefault(); setLoading(true); try { await campaign.login(token); } finally { setLoading(false); } }}><label>Local service session token<input type="password" value={token} onChange={event => setToken(event.target.value)} autoComplete="off" required placeholder="Paste your local preview token" /></label><button className="primary" disabled={!token.trim() || loading}>{loading ? 'Connecting…' : reconnect ? 'Reconnect securely' : 'Open campaign'}</button><p className="muted">On your host, run <code>uv run python -m rome --print-token</code>. Sent only in an Authorization header. Kept in this browser tab’s session storage, never in a link.</p></form>;
}

export function App() {
  const view = useCampaign();
  const [tab, setTab] = useState<Tab>('atlas');
  const [reduce, setReduce] = useState(false);
  const systemReduced = useSyncExternalStore(subscribeSystemMotion, readSystemMotion);
  const reduced = reduce || systemReduced;
  const [focus, setFocus] = useState<{ position: Position; serial: number } | null>(null);
  const disabled = view.busy || view.uncertain || !view.connected;
  const compact = useSyncExternalStore(subscribeCompactViewport, readCompactViewport);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const detailsOpenRef = useRef(false);
  const selectionRequest = useRef(0);
  const returnFocus = useRef<HTMLElement | null>(null);
  const returnToSelectionLink = useRef(false);
  const returnScroll = useRef(0);
  const restoreFocus = useRef(false);
  const backButton = useRef<HTMLButtonElement | null>(null);
  const closeDetails = useCallback(() => {
    selectionRequest.current++;
    detailsOpenRef.current = false;
    restoreFocus.current = true;
    setDetailsOpen(false);
  }, []);
  const changeTab = (next: Tab) => {
    selectionRequest.current++;
    detailsOpenRef.current = false;
    setDetailsOpen(false);
    setTab(next);
  };
  const onSelect = useCallback((selection: Selection) => {
    const before = campaign.snapshot();
    if (before.busy || before.uncertain || !before.connected || !before.state) return;
    const request = ++selectionRequest.current;
    const origin = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const scroll = window.scrollY;
    void campaign.command('select', selection).then(() => {
      const acknowledged = campaign.snapshot();
      if (request !== selectionRequest.current || acknowledged.error || acknowledged.uncertain || !acknowledged.connected || !acknowledged.state || acknowledged.state.revision <= before.state!.revision) return;
      if (acknowledged.state.selection?.kind !== selection.kind || acknowledged.state.selection.id !== selection.id) return;
      if (selection.kind === 'node' && compactViewport.matches) {
        if (!detailsOpenRef.current) { returnFocus.current = origin; returnToSelectionLink.current = Boolean(origin?.classList.contains('mobile-selection-link')); returnScroll.current = scroll; }
        detailsOpenRef.current = true;
        setDetailsOpen(true);
      }
    });
  }, []);
  const onLocate = useCallback((position: Position) => {
    selectionRequest.current++;
    detailsOpenRef.current = false;
    setDetailsOpen(false);
    setTab('atlas');
    setFocus(previous => ({ position, serial: (previous?.serial ?? 0) + 1 }));
  }, []);
  const state = view.state;
  const nodeSelected = state?.selection?.kind === 'node';
  const compactDetails = compact && detailsOpen && nodeSelected;
  useLayoutEffect(() => {
    if (compactDetails || !restoreFocus.current) return;
    restoreFocus.current = false;
    const target = returnFocus.current?.isConnected ? returnFocus.current : document.querySelector<HTMLElement>(returnToSelectionLink.current ? '.mobile-selection-link' : '.graph-tools select');
    target?.focus({ preventScroll: true });
    window.scrollTo({ top: returnScroll.current, behavior: 'instant' });
  }, [compactDetails]);
  useEffect(() => {
    if (!compactDetails) return;
    window.scrollTo({ top: 0, behavior: 'instant' });
    backButton.current?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); closeDetails(); } };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [compactDetails, closeDetails]);
  useEffect(() => {
    if (!compact || !nodeSelected) { detailsOpenRef.current = false; setDetailsOpen(false); }
  }, [compact, nodeSelected]);
  if (!state) return <main className="connection-screen"><div className="connection-card"><span className="brand-mark">SPQR</span><p className="eyebrow">An empire. An unwritten future.</p><h1>Rome</h1><p className="connection-lead">You inherit an empire in AD 210.<br />What will you choose to save?</p>{bridge.embedded ? <><p role="status">{view.error ? 'The host connection needs attention.' : 'Connecting to the authoritative campaign through the MCP host…'}</p><button onClick={() => void campaign.inspect()}>Retry host connection</button></> : <><p className="preview-label">Local development preview · ChatGPT embedding unverified</p><TokenForm /></>}{view.error && <p className="inline-error" role="alert">{view.error}</p>}</div></main>;
  const decisions = state.decisions.filter(decision => !decision.resolved).length;
  return <MotionConfig reducedMotion={reduced ? 'always' : 'never'}><div className={`app ${reduced ? 'reduced-motion' : ''} ${compactDetails ? 'development-focus-view' : ''}`}>
    {compactDetails && <header className="development-focus-heading"><strong>ROME</strong><span>Developments</span></header>}
    <header className="masthead"><div className="brand"><span className="brand-mark">SPQR</span><div><h1>ROME</h1><span>Imperial workspace</span></div></div><div className="campaign-date"><span className="eyebrow">The reign begins with you</span><strong>AD {state.year}</strong><span>Campaign day {number(state.day)}</span></div><div className="connection-state"><span className={view.connected ? 'online-dot' : 'offline-dot'} />{view.connected ? 'Campaign connected' : 'Connection lost'}<small>Revision {state.revision}</small></div></header>
    {!bridge.embedded && <div className="preview-strip">Local development preview · ChatGPT embedding unverified · no AI runs here</div>}
    <section className="resource-bar" aria-label="Imperial resources">{Object.entries(state.resources).map(([key, value]) => <div key={key}><span>{key.replaceAll('_', ' ')}</span><strong>{number(value)}</strong></div>)}<details className="preferences"><summary>Preferences</summary><div className="preferences-body"><label className="check-label"><input type="checkbox" checked={reduce} onChange={event => setReduce(event.target.checked)} />Reduce motion</label><p>System reduced motion: {systemReduced ? 'on' : 'off'}. Map and graph camera movement follows this preference.</p>{!bridge.embedded && <TokenForm reconnect />}<p>Clock advances only with an active session lease. Closing or hiding this workspace stops heartbeats; the service pauses within 120 seconds. No offline catch-up.</p></div></details></section>
    <section className="clock-bar" aria-label="Campaign time controls"><div className={`clock-state ${state.paused ? 'paused' : 'running'}`}><span className="clock-indicator" /><strong>{state.paused ? 'Time paused' : 'World progressing'}</strong><small>{decisions ? `${decisions} consequential decision${decisions === 1 ? '' : 's'} pending` : `${state.speed} campaign day${state.speed === 1 ? '' : 's'} / second`}</small></div><div className="clock-actions"><button className="primary" disabled={disabled} onClick={() => void campaign.command('clock', { mode: state.paused ? 'resume' : 'pause' })}>{state.paused ? 'Resume' : 'Pause'}</button><div className="speed-controls" aria-label="Clock speed">{[1, 5, 20].map(speed => <button key={speed} aria-pressed={state.speed === speed} disabled={disabled} onClick={() => void campaign.command('clock', { mode: 'speed', speed })}>{speed}×</button>)}</div><button disabled={disabled} onClick={() => void campaign.command('clock', { mode: 'next_event' })}>Next important event →</button></div></section>
    <div className="feedback" aria-live="polite">{view.busy ? <p>Submitting order to the campaign…</p> : view.message && <p>{view.message}</p>}{view.error && <div className="error-banner" role="alert"><span>{view.error}</span>{view.uncertain ? <button disabled={view.busy} onClick={() => void campaign.retry()}>Retry same order safely</button> : <button onClick={campaign.clear}>Dismiss</button>}{!view.connected && <button onClick={() => void campaign.inspect()}>Refresh campaign</button>}</div>}</div>
    <nav className="workspace-tabs" aria-label="Workspace"><button aria-current={tab === 'atlas' ? 'page' : undefined} onClick={() => changeTab('atlas')}>Atlas<span>Places & fleets</span></button><button aria-current={tab === 'development' ? 'page' : undefined} onClick={() => changeTab('development')}>Development<span>Knowledge & capacity</span></button><button aria-current={tab === 'council' ? 'page' : undefined} onClick={() => changeTab('council')}>Council{decisions > 0 && <b className="count-badge">{decisions}</b>}<span>Ambitions & decisions</span></button><button aria-current={tab === 'chronicle' ? 'page' : undefined} onClick={() => changeTab('chronicle')}>Chronicle<span>The saved record</span></button></nav>
    <main className="workspace-body"><div className="main-workspace"><section hidden={tab !== 'atlas'} aria-label="Atlas workspace"><Atlas state={state} active={tab === 'atlas'} reduced={reduced} onSelect={onSelect} focus={focus} preview={view.routePreview} /><div className="location-lists"><section><h3>Fleets under your command</h3><div className="fleet-list">{state.fleets.map(fleet => <button className={state.selection?.id === fleet.id ? 'selected' : ''} key={fleet.id} disabled={disabled} onClick={() => onSelect({ kind: 'fleet', id: fleet.id })}><Icon recipe={{ base: fleet.kind === 'advanced' ? 'blue-water-fleet' : 'transport' }} small /><span>{fleet.name}<small>{fleet.ships} ships · {fleet.route ? `Arrives day ${number(fleet.route.arrival_day)}` : 'In port'}</small></span></button>)}</div></section><section><h3>Ports of the eastern corridor</h3><div className="port-list">{state.ports.map(port => <button className={state.selection?.id === port.id ? 'selected' : ''} key={port.id} disabled={disabled} onClick={() => onSelect({ kind: 'port', id: port.id })}>{port.name}<small>{port.sea}</small></button>)}</div></section><details><summary>Territories · ownership, occupation, administration</summary><div className="port-list">{state.territories.map(territory => <button key={territory.id} disabled={disabled} onClick={() => onSelect({ kind: 'territory', id: territory.id })}>{territory.name}<small>{territory.owner}{territory.occupier ? ` · occupied by ${territory.occupier}` : ''}</small></button>)}</div></details></div></section>
      <section hidden={tab !== 'development'} aria-label="Development workspace"><Development state={state} reduced={reduced} disabled={disabled} onSelect={onSelect} /></section>
      <section hidden={tab !== 'council'} aria-label="Council workspace"><Council state={state} disabled={disabled} /></section>
      <section hidden={tab !== 'chronicle'} aria-label="Chronicle workspace"><Chronicle state={state} /></section>
    </div><div id="selection-details" className={nodeSelected ? 'node-selection-details' : undefined} hidden={compact && nodeSelected && !compactDetails}>
      {compactDetails && <div className="development-focus-navigation"><button ref={backButton} onClick={closeDetails}>‹ Developments</button><p>{state.trees.find(tree => tree.nodes.some(node => node.id === state.selection?.id))?.title ?? 'Development details'}</p></div>}
      <Details state={state} disabled={disabled} busy={view.busy} commandError={view.error} onLocate={onLocate} onSelect={onSelect} />
    </div></main>
    {state.selection && !compactDetails && (nodeSelected ? <button className="mobile-selection-link" disabled={disabled} onClick={() => onSelect(state.selection!)}>Inspect selected project</button> : <a className="mobile-selection-link" href="#selection-details">Inspect selected {state.selection.kind} ↓</a>)}
    <footer className="workspace-footer"><span>Facts belong to the simulation. The future belongs to you.</span><span>Local-first · single player · AD 210</span></footer>
  </div></MotionConfig>;
}
