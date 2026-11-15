import { useState } from 'react';
import { bridge } from './bridge';
import { campaign } from './campaign';
import { Icon } from './Icon';
import { number, percent, resourcesText, type Mandate, type State, type ToolData, type Tree } from './types';

function MandateForm({ mandate, trees, disabled }: { mandate?: Mandate; trees: Tree[]; disabled: boolean }) {
  const [title, setTitle] = useState(mandate?.title ?? '');
  const [tree, setTree] = useState(mandate?.tree_id ?? '');
  const [budget, setBudget] = useState(mandate?.budget ?? 500);
  const [enabled, setEnabled] = useState(mandate?.enabled ?? true);
  return <form className="mandate-form" onSubmit={event => { event.preventDefault(); void campaign.command('set_mandate', { id: mandate?.id ?? crypto.randomUUID(), title, tree_id: tree, budget, enabled }); }}>
    {mandate && <p className="muted">Saved: {mandate.enabled ? 'Enabled' : 'Suspended'} · {number(mandate.spent)} spent of {number(mandate.budget)} authorized</p>}
    <label>Standing order<input required value={title} onChange={event => setTitle(event.target.value)} placeholder="Describe this scoped authorization" /></label>
    <div className="form-pair"><label>Accepted ambition<select required value={tree} onChange={event => setTree(event.target.value)}><option value="">Choose ambition</option>{trees.filter(item => item.status === 'accepted').map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label>Treasury ceiling<input type="number" min={mandate?.spent ?? 0} step="1" required value={budget} onChange={event => setBudget(Number(event.target.value))} /></label></div>
    <label className="check-label"><input type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)} />Authorize routine work in this tree</label><button disabled={disabled || !tree || !title}>{mandate ? 'Save revised mandate' : 'Authorize mandate'}</button>
  </form>;
}

function AmbitionComposer({ state, disabled }: { state: State; disabled: boolean }) {
  const [ambition, setAmbition] = useState('');
  const [proposal, setProposal] = useState('');
  const [catalog, setCatalog] = useState<ToolData | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  return <section className="council-card ambition-composer"><div className="section-title"><Icon recipe={{ base: 'learning' }} small /><div><span className="eyebrow">No predetermined destiny</span><h3>What shall we do for Rome?</h3></div></div>
    <label>Your ambition<textarea rows={3} value={ambition} onChange={event => setAmbition(event.target.value)} placeholder="Describe an institution, discovery, reform, or expedition…" /></label>
    <button className="primary" disabled={!ambition.trim() || loading} onClick={async () => { setLoading(true); setError(''); setFeedback(''); try { await bridge.ask(ambition, state.revision, state.selection); setFeedback('Ambition sent to the conversation. The steward must inspect current facts and propose supported rules; no projects have been invented locally.'); } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); } finally { setLoading(false); } }}>{loading ? 'Contacting steward…' : 'Ask the imperial steward'}</button>
    {!bridge.embedded && <p className="muted">Local preview has no AI. Send your ambition in the connected ChatGPT conversation, or import a structured proposal below.</p>}
    {feedback && <p role="status">{feedback}</p>}{error && <p className="inline-error" role="alert">{error}</p>}
    <details className="proposal-import"><summary>Import a generated proposal / inspect rule catalog</summary><p>The engine validates each node’s rule, prerequisites, location, and icon recipe. Unsupported mechanics are rejected, not simulated by the UI.</p>
      <button disabled={loading} onClick={async () => { setLoading(true); try { setCatalog(await campaign.catalog()); } catch (cause) { campaign.report(cause); } finally { setLoading(false); } }}>Read supported catalog & schema</button>
      {catalog && <pre tabIndex={0}>{JSON.stringify(catalog, null, 2)}</pre>}
      <label>Tree proposal JSON<textarea className="code-editor" rows={10} value={proposal} spellCheck={false} onChange={event => setProposal(event.target.value)} placeholder="Paste a versioned TreeProposal from the steward" /></label>
      <button disabled={disabled || !proposal.trim()} onClick={() => { try { const parsed: unknown = JSON.parse(proposal); if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('A proposal must be a JSON object.'); void campaign.command('propose_tree', { proposal: parsed }); } catch (cause) { campaign.report(cause); } }}>Validate & propose development</button>
    </details>
  </section>;
}

export function Council({ state, disabled }: { state: State; disabled: boolean }) {
  const pending = state.decisions.filter(item => !item.resolved);
  const evidence = state as unknown as Record<string, unknown>;
  return <div className="council-page"><div className="workspace-heading"><div><span className="eyebrow">The imperial council</span><h2>Ambition, authority, consequence</h2><p>The steward proposes. You authorize. The engine decides what actually happens.</p></div></div>
    {pending.length > 0 && <section className="decision-section"><h3>{pending.length} decision{pending.length === 1 ? '' : 's'} require your judgment</h3>{pending.map(decision => <article className="decision-card" key={decision.id}><span className="eyebrow">Consequential choice · advancement stops here</span><h3>{decision.title}</h3><p>{decision.description}</p><div className="decision-options">{decision.options.map(option => <button key={option.id} disabled={disabled} onClick={() => void campaign.command('resolve_decision', { decision_id: decision.id, option_id: option.id })}>{option.label}<small>{resourcesText(option.costs)}</small></button>)}</div></article>)}</section>}
    <div className="council-grid"><AmbitionComposer state={state} disabled={disabled} /><section className="council-card tutorial"><div className="section-title"><Icon recipe={{ base: 'blue-water-fleet' }} /><div><span className="eyebrow">Optional expedition</span><h3>A glass of sweet citrus</h3></div></div><p>Build a maintainable sailing navy, cross the eastern seas, and bring fruit and living plants home. Knowledge is only the beginning.</p><p className="muted">Status: {state.tutorial.replaceAll('_', ' ')}. Costs, local facilities, crews, and elapsed time are real commitments.</p>
      {state.tutorial === 'not_started' && <div className="button-row"><button className="primary" disabled={disabled} onClick={() => void campaign.command('tutorial', { mode: 'start' })}>Begin naval tutorial</button><button disabled={disabled} onClick={() => void campaign.command('tutorial', { mode: 'skip' })}>Keep Roman capabilities</button></div>}
      <details><summary>The expedition’s real logistics</summary><ol><li>Commission projects or authorize their scoped mandate.</li><li>Select an eastern fleet and order the outbound expedition.</li><li>Resolve the citrus acquisition decision on arrival.</li><li>Return to Berenike and unload the cargo.</li><li>Select Berenike: dispatch overland cargo to Alexandria.</li><li>At Alexandria, load a Mediterranean fleet; sail to Rome and unload.</li><li>Ask the steward for a local cultivation project using the supported cultivation rule: two living plants, 80 treasury, and 20 food establish a garden in 20 days and produce ten fresh fruit.</li></ol><p>No Suez Canal, no fleet teleportation. Fruit spoils; plant survival matters. A local garden’s harvest has a 30-day shelf life.</p></details>
    </section></div>
    <section><h3 className="section-heading">Your ambitions</h3>{state.trees.length === 0 ? <p className="empty-copy">No development proposals yet. Your first ambition can be naval, institutional, or something new.</p> : <div className="goal-grid">{state.trees.map(tree => <article className="council-card" key={tree.id}><span className={`status ${tree.status}`}>{tree.status}</span><h3>{tree.title}</h3><p>{tree.ambition}</p><p className="muted">{tree.nodes.filter(node => node.status === 'completed').length} of {tree.nodes.length} projects complete · proposed by {tree.provenance.author}</p>{tree.status === 'proposed' && <button disabled={disabled} className="primary" onClick={() => void campaign.command('accept_tree', { tree_id: tree.id })}>Accept this ambition</button>}<details><summary>Committed definition & provenance</summary><p>Version {tree.provenance.version} · {tree.provenance.hash}</p><ul>{tree.nodes.map(node => <li key={node.id}>{node.title} — {resourcesText(node.costs)}; {node.duration} days; {node.status}</li>)}</ul></details></article>)}</div>}</section>
    <section><h3 className="section-heading">Scoped standing orders</h3><p className="muted">Authorize routine projects in one accepted tree, with a treasury ceiling. Decisions and real blockers stop automatic work.</p><div className="goal-grid">{state.mandates.map(mandate => <section className="council-card" key={mandate.id}><h4>{mandate.title}</h4><MandateForm mandate={mandate} trees={state.trees} disabled={disabled} /></section>)}<section className="council-card"><h4>New mandate</h4><MandateForm trees={state.trees} disabled={disabled} /></section></div></section>
    <section><h3 className="section-heading">Work in progress</h3>{state.projects.length === 0 ? <p className="empty-copy">No commissioned projects.</p> : <div className="project-list">{state.projects.map(project => <button key={project.id} disabled={disabled} onClick={() => void campaign.command('select', { kind: 'node', id: project.node_id })}><span>{project.title}<small>{project.status} · day {number(project.start_day)} → {number(project.finish_day)}</small></span><span>{percent(project.progress)}%</span><progress value={percent(project.progress)} max="100" aria-label={`${project.title} progress`} /></button>)}</div>}</section>
    <section className="council-card"><h3>Institutions & logistical evidence</h3><p>Authoritative saved outcomes, distinct from proposed reforms.</p>{['politics', 'institutions', 'laws', 'shipments'].map(key => <details key={key}><summary>{key.charAt(0).toUpperCase() + key.slice(1)}</summary><pre>{JSON.stringify(evidence[key] ?? [], null, 2)}</pre></details>)}</section>
  </div>;
}

export function Chronicle({ state }: { state: State }) {
  return <div className="chronicle-page"><div className="workspace-heading"><div><span className="eyebrow">The imperial record</span><h2>Chronicle of this Rome</h2><p>Saved outcomes and changes, not imagined success.</p></div></div>{state.chronicle.length === 0 ? <p className="empty-copy">The chronicle begins with your first orders.</p> : <ol className="dispatches">{[...state.chronicle].reverse().map(dispatch => <li key={dispatch.id}><div className="dispatch-date">DAY {number(dispatch.day)}<small>{dispatch.kind.replaceAll('_', ' ')}</small></div><div><h3>{dispatch.title}</h3><p>{dispatch.detail}</p></div></li>)}</ol>}<section className="council-card"><h3>Historical assumptions</h3><ul>{state.assumptions.map(assumption => <li key={assumption}>{assumption}</li>)}</ul></section></div>;
}
