import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ChangeEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { DevelopmentCard } from '../../ui/src/development/DevelopmentCard';
import { DevelopmentInspector } from '../../ui/src/development/DevelopmentInspector';
import { caseIds, collectEvidence, contract, referenceContentSchema, type CaseId, type LayoutEvidence, type ReferenceContent } from './contracts';
import { defaultContent, makeFixture } from './fixtures';
import './lab.css';

const compactQuery = matchMedia('(max-width: 760px)');
const readCompact = () => compactQuery.matches;
function subscribeCompact(notify: () => void) {
  compactQuery.addEventListener('change', notify);
  return () => compactQuery.removeEventListener('change', notify);
}

function Lab() {
  const compact = useSyncExternalStore(subscribeCompact, readCompact);
  const [scenario, setScenario] = useState<CaseId>('blocked');
  const [content, setContent] = useState<ReferenceContent>(defaultContent);
  const [selected, setSelected] = useState(true);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState('');
  const [importError, setImportError] = useState('');
  const [importing, setImporting] = useState(false);
  const [evidence, setEvidence] = useState<LayoutEvidence | null>(null);
  const stage = useRef<HTMLElement>(null);
  const back = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  const importGeneration = useRef(0);
  const fixture = useMemo(() => makeFixture(content, scenario), [content, scenario]);
  const busy = fixture.busy || pending;
  const select = useCallback(() => { setSelected(true); }, []);
  const close = () => { restoreFocus.current = true; setSelected(false); };

  useEffect(() => () => { importGeneration.current++; }, []);
  useEffect(() => {
    if (compact && selected) back.current?.focus({ preventScroll: true });
    else if (restoreFocus.current) {
      stage.current?.querySelector<HTMLButtonElement>('[data-development-region="node"]')?.focus({ preventScroll: true });
      restoreFocus.current = false;
    }
  }, [compact, selected]);

  async function importReference(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const generation = ++importGeneration.current;
    setImportError('');
    if (!file) { setImporting(false); return; }
    setImporting(true);
    try {
      if (file.size > 65_536) throw new Error('Reference content exceeds the 64 KiB limit.');
      const parsed = referenceContentSchema.safeParse(JSON.parse(await file.text()));
      if (!parsed.success) throw new Error('Reference content rejected: only the documented presentation fields are allowed.');
      if (generation !== importGeneration.current) return;
      setContent(parsed.data); setScenario('blocked'); setSelected(true); setPending(false); setEvidence(null);
      setNotice('Local reference content loaded in memory. It was not uploaded or stored.');
    } catch (error) {
      if (generation === importGeneration.current) setImportError(error instanceof SyntaxError ? 'Reference content is not valid JSON.' : error instanceof Error ? error.message : 'Reference content could not be read.');
    } finally {
      if (generation === importGeneration.current) setImporting(false);
    }
  }

  function act() {
    if (busy || fixture.action.disabled) return;
    if (fixture.action.kind === 'commission') {
      setScenario('available'); setPending(true); setNotice('Order awaiting acknowledgement. The fixture phase has not changed.');
    } else setNotice(`Fixture action: ${fixture.action.kind}. No campaign or chat message was sent.`);
  }

  return <>
    <header className="lab-controls">
      <h1>Development node/details contract lab</h1>
      <p>Read-only fixture · no campaign connection, credentials, storage, AI or external assets. Only this component pair and its compact container are comparison targets.</p>
      <div className="lab-control-row">
        <label><span id="lab-scenario-label">Scenario</span><select aria-labelledby="lab-scenario-label" value={scenario} onChange={event => {
          setScenario(event.target.value as CaseId); setPending(false); setSelected(event.target.value !== 'empty'); setNotice(''); setEvidence(null);
        }}>{caseIds.map(id => <option key={id} value={id}>{id}</option>)}</select></label>
        <label>Local reference content<input type="file" accept="application/json,.json" onChange={event => void importReference(event)} /></label>
        <button type="button" onClick={close}>Clear selection</button>
        <button type="button" onClick={() => { if (stage.current) setEvidence(collectEvidence(stage.current)); }}>Collect layout evidence</button>
        <button type="button" disabled={!pending} onClick={() => { setPending(false); setScenario('underway'); setNotice('Accepted fixture snapshot delivered.'); }}>Deliver accepted snapshot</button>
        <button type="button" disabled={!pending} onClick={() => { setPending(false); setScenario('error'); setNotice('Rejected fixture snapshot delivered.'); }}>Deliver rejected snapshot</button>
      </div>
      <p role="status">{importing ? 'Reading local reference content…' : notice || `Contract ${contract.id} · revision ${contract.revision}`}</p>
      {importError && <p role="alert">{importError}</p>}
      {evidence && <details open><summary>Bounded layout evidence</summary><pre aria-label="Layout evidence">{JSON.stringify(evidence, null, 2)}</pre></details>}
    </header>
    <section ref={stage} className={`lab-stage ${selected ? 'has-selection' : ''}`} aria-label="Reference viewport" onKeyDown={event => {
      if (compact && selected && event.key === 'Escape') { event.preventDefault(); close(); }
    }}>
      <div className="lab-frame-header"><strong>ROME</strong><span>Developments</span></div>
      <button ref={back} type="button" className="lab-back" onClick={close}>‹ Developments</button>
      <p className="lab-ambition">{content.ambition}</p>
      {scenario !== 'empty' ? <>
        <div className="lab-node"><DevelopmentCard model={fixture.card} selected={selected} onSelect={select} /></div>
        <div className="lab-sheet" hidden={!selected}>
          <DevelopmentInspector model={fixture.details} action={fixture.action} busy={busy} error={fixture.error} onAction={act}
            secondary={fixture.details.phase === 'authorized' ? { action: { kind: 'discuss', label: 'Discuss with the steward ›', disabled: busy }, onAction: () => setNotice('Fixture discussion requested. No chat message was sent.') } : undefined} />
        </div>
      </> : <p className="lab-empty">No development is selected. Choose a populated scenario to inspect it.</p>}
    </section>
  </>;
}

createRoot(document.getElementById('root')!).render(<Lab />);
