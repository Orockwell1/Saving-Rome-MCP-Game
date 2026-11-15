import { useCallback, useState } from 'react';
import { MotionConfig, useReducedMotion } from 'motion/react';
import { Atlas } from './Atlas';
import { Development } from './Development';
import { Council, Chronicle } from './Council';
import { Details } from './Details';
import { Icon } from './Icon';
import { bridge } from './bridge';
import { campaign, useCampaign } from './campaign';
import { number, type Position, type Selection } from './types';

type Tab = 'atlas' | 'development' | 'council' | 'chronicle';
function TokenForm({ reconnect = false }: { reconnect?: boolean }) {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  return <form className="token-form" onSubmit={async event => { event.preventDefault(); setLoading(true); try { await campaign.login(token); } finally { setLoading(false); } }}><label>Local service session token<input type="password" value={token} onChange={event => setToken(event.target.value)} autoComplete="off" required placeholder="Paste your local preview token" /></label><button className="primary" disabled={!token.trim() || loading}>{loading ? 'Connecting…' : reconnect ? 'Reconnect securely' : 'Open campaign'}</button><p className="muted">On your host, run <code>uv run python -m rome --print-token</code>. Sent only in an Authorization header. Kept in this browser tab’s session storage, never in a link.</p></form>;
}

export function App() {
  const view = useCampaign();
  const [tab, setTab] = useState<Tab>('atlas');
  const [reduce, setReduce] = useState(false);
  const systemReduced = useReducedMotion();
  const reduced = reduce || Boolean(systemReduced);
  const [focus, setFocus] = useState<{ position: Position; serial: number } | null>(null);
  const disabled = view.busy || view.uncertain || !view.connected;
  const onSelect = useCallback((selection: Selection) => { if (!disabled) void campaign.command('select', selection); }, [disabled]);
  const onLocate = useCallback((position: Position) => { setTab('atlas'); setFocus(previous => ({ position, serial: (previous?.serial ?? 0) + 1 })); }, []);
  const state = view.state;
  if (!state) return <main className="connection-screen"><div className="connection-card"><span className="brand-mark">SPQR</span><p className="eyebrow">An empire. An unwritten future.</p><h1>Rome</h1><p className="connection-lead">You inherit an empire in AD 210.<br />What will you choose to save?</p>{bridge.embedded ? <><p role="status">{view.error ? 'The host connection needs attention.' : 'Connecting to the authoritative campaign through the MCP host…'}</p><button onClick={() => void campaign.inspect()}>Retry host connection</button></> : <><p className="preview-label">Local development preview · ChatGPT embedding unverified</p><TokenForm /></>}{view.error && <p className="inline-error" role="alert">{view.error}</p>}</div></main>;
  const decisions = state.decisions.filter(decision => !decision.resolved).length;
  return <MotionConfig reducedMotion={reduce ? 'always' : 'user'}><div className={`app ${reduced ? 'reduced-motion' : ''}`}>
    <header className="masthead"><div className="brand"><span className="brand-mark">SPQR</span><div><h1>ROME</h1><span>Imperial workspace</span></div></div><div className="campaign-date"><span className="eyebrow">The reign begins with you</span><strong>AD {state.year}</strong><span>Campaign day {number(state.day)}</span></div><div className="connection-state"><span className={view.connected ? 'online-dot' : 'offline-dot'} />{view.connected ? 'Campaign connected' : 'Connection lost'}<small>Revision {state.revision}</small></div></header>
    {!bridge.embedded && <div className="preview-strip">Local development preview · ChatGPT embedding unverified · no AI runs here</div>}
    <section className="resource-bar" aria-label="Imperial resources">{Object.entries(state.resources).map(([key, value]) => <div key={key}><span>{key.replaceAll('_', ' ')}</span><strong>{number(value)}</strong></div>)}<details className="preferences"><summary>Preferences</summary><div className="preferences-body"><label className="check-label"><input type="checkbox" checked={reduce} onChange={event => setReduce(event.target.checked)} />Reduce motion</label><p>System reduced motion: {systemReduced ? 'on' : 'off'}. Map and graph camera movement follows this preference.</p>{!bridge.embedded && <TokenForm reconnect />}<p>Clock advances only with an active session lease. Closing or hiding this workspace stops heartbeats; the service pauses within 120 seconds. No offline catch-up.</p></div></details></section>
    <section className="clock-bar" aria-label="Campaign time controls"><div className={`clock-state ${state.paused ? 'paused' : 'running'}`}><span className="clock-indicator" /><strong>{state.paused ? 'Time paused' : 'World progressing'}</strong><small>{decisions ? `${decisions} consequential decision${decisions === 1 ? '' : 's'} pending` : `${state.speed} campaign day${state.speed === 1 ? '' : 's'} / second`}</small></div><div className="clock-actions"><button className="primary" disabled={disabled} onClick={() => void campaign.command('clock', { mode: state.paused ? 'resume' : 'pause' })}>{state.paused ? 'Resume' : 'Pause'}</button><div className="speed-controls" aria-label="Clock speed">{[1, 5, 20].map(speed => <button key={speed} aria-pressed={state.speed === speed} disabled={disabled} onClick={() => void campaign.command('clock', { mode: 'speed', speed })}>{speed}×</button>)}</div><button disabled={disabled} onClick={() => void campaign.command('clock', { mode: 'next_event' })}>Next important event →</button></div></section>
    <div className="feedback" aria-live="polite">{view.busy ? <p>Submitting order to the campaign…</p> : view.message && <p>{view.message}</p>}{view.error && <div className="error-banner" role="alert"><span>{view.error}</span>{view.uncertain ? <button disabled={view.busy} onClick={() => void campaign.retry()}>Retry same order safely</button> : <button onClick={campaign.clear}>Dismiss</button>}{!view.connected && <button onClick={() => void campaign.inspect()}>Refresh campaign</button>}</div>}</div>
    <nav className="workspace-tabs" aria-label="Workspace"><button aria-current={tab === 'atlas' ? 'page' : undefined} onClick={() => setTab('atlas')}>Atlas<span>Places & fleets</span></button><button aria-current={tab === 'development' ? 'page' : undefined} onClick={() => setTab('development')}>Development<span>Knowledge & capacity</span></button><button aria-current={tab === 'council' ? 'page' : undefined} onClick={() => setTab('council')}>Council{decisions > 0 && <b className="count-badge">{decisions}</b>}<span>Ambitions & decisions</span></button><button aria-current={tab === 'chronicle' ? 'page' : undefined} onClick={() => setTab('chronicle')}>Chronicle<span>The saved record</span></button></nav>
    <main className="workspace-body"><div className="main-workspace"><section hidden={tab !== 'atlas'} aria-label="Atlas workspace"><Atlas state={state} active={tab === 'atlas'} reduced={reduced} onSelect={onSelect} focus={focus} preview={view.routePreview} /><div className="location-lists"><section><h3>Fleets under your command</h3><div className="fleet-list">{state.fleets.map(fleet => <button className={state.selection?.id === fleet.id ? 'selected' : ''} key={fleet.id} disabled={disabled} onClick={() => onSelect({ kind: 'fleet', id: fleet.id })}><Icon recipe={{ base: fleet.kind === 'advanced' ? 'blue-water-fleet' : 'transport' }} small /><span>{fleet.name}<small>{fleet.ships} ships · {fleet.route ? `Arrives day ${number(fleet.route.arrival_day)}` : 'In port'}</small></span></button>)}</div></section><section><h3>Ports of the eastern corridor</h3><div className="port-list">{state.ports.map(port => <button className={state.selection?.id === port.id ? 'selected' : ''} key={port.id} disabled={disabled} onClick={() => onSelect({ kind: 'port', id: port.id })}>{port.name}<small>{port.sea}</small></button>)}</div></section><details><summary>Territories · ownership, occupation, administration</summary><div className="port-list">{state.territories.map(territory => <button key={territory.id} disabled={disabled} onClick={() => onSelect({ kind: 'territory', id: territory.id })}>{territory.name}<small>{territory.owner}{territory.occupier ? ` · occupied by ${territory.occupier}` : ''}</small></button>)}</div></details></div></section>
      <section hidden={tab !== 'development'} aria-label="Development workspace"><Development state={state} reduced={reduced} onSelect={onSelect} /></section>
      <section hidden={tab !== 'council'} aria-label="Council workspace"><Council state={state} disabled={disabled} /></section>
      <section hidden={tab !== 'chronicle'} aria-label="Chronicle workspace"><Chronicle state={state} /></section>
    </div><div id="selection-details"><Details state={state} disabled={disabled} onLocate={onLocate} /></div></main>
    {state.selection && <a className="mobile-selection-link" href="#selection-details">Inspect selected {state.selection.kind} ↓</a>}
    <footer className="workspace-footer"><span>Facts belong to the simulation. The future belongs to you.</span><span>Local-first · single player · AD 210</span></footer>
  </div></MotionConfig>;
}
