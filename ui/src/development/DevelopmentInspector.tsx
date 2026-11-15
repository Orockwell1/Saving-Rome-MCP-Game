import { memo, useId } from 'react';
import type { DevelopmentInspectorProps, DevelopmentPhase } from './presentation';
import './fonts.css';
import './tokens.css';
import './development.css';

const phaseLabels: Record<DevelopmentPhase, string> = {
  proposal: '◇  STEWARD PROPOSAL',
  authorized: '›  READY TO COMMISSION',
  commissioned: '◔  COMMISSIONED',
  complete: '✓  COMPLETED',
};

export const DevelopmentInspector = memo(function DevelopmentInspector({
  model,
  action,
  busy,
  error,
  onAction,
  secondary,
}: DevelopmentInspectorProps) {
  const titleId = useId();
  const unavailableId = useId();
  const secondaryUnavailableId = useId();
  const disabled = busy || action.disabled || action.kind === 'none';
  const progress = model.progress === null
    ? null
    : Math.round(Math.max(0, Math.min(1, model.progress)) * 100);

  return (
    <section
      className="development-inspector"
      data-development-contract="node-details.v1"
      data-development-region="details"
      data-phase={model.phase}
      data-busy={busy}
      aria-labelledby={titleId}
      aria-busy={busy}
    >
      <p className="development-inspector__phase" data-development-region="details.phase">{phaseLabels[model.phase]}</p>
      <h2 id={titleId} className="development-inspector__title" data-development-region="details.title"><span>{model.title}</span></h2>
      <p className="development-inspector__description" data-development-region="details.description">{model.description}</p>
      {model.requirements.length > 0 && (
        <div className="development-inspector__section" data-development-region="details.requirements">
          <h3 className="development-inspector__label">PREREQUISITES</h3>
          <ul className="development-inspector__requirements">
            {model.requirements.map(requirement => (
              <li key={requirement.id}>
                {requirement.met ? '✓ Met' : '! Unmet'} · {requirement.label}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="development-inspector__section">
        <div className="development-inspector__facts" data-development-region="details.budget">
          <h3 className="development-inspector__label">COST &amp; DURATION</h3>
          <p>{model.estimate}</p>
        </div>
        <div className="development-inspector__facts" data-development-region="details.impact">
          <h3 className="development-inspector__label">AFFECTED PLACES &amp; GROUPS</h3>
          <p className="development-inspector__impact"><span aria-hidden="true">⌖ </span>{model.impact}</p>
        </div>
      </div>
      {model.message && (
        <p className="development-inspector__reason" data-development-region="details.reason">{model.message}</p>
      )}
      {progress !== null && (
        <div className="development-inspector__progress" data-development-region="details.progress" data-development-extension="progress">
          <progress value={progress} max={100} aria-label="Development progress" />
          <span>{progress}% complete</span>
        </div>
      )}
      <button
        type="button"
        className="development-inspector__action"
        data-development-region="details.action"
        data-action={action.kind}
        data-development-extension={busy ? 'busy' : undefined}
        disabled={disabled}
        aria-describedby={action.unavailableReason ? unavailableId : undefined}
        onClick={() => {
          if (!disabled) onAction();
        }}
      >
        {busy ? 'Working…' : action.label}
      </button>
      {action.unavailableReason && (
        <p id={unavailableId} className="development-inspector__unavailable" data-development-extension="unavailable">
          {action.unavailableReason}
        </p>
      )}
      {secondary && (
        <>
          <button
            type="button"
            className="development-inspector__action"
            data-development-action="secondary"
            data-action={secondary.action.kind}
            disabled={busy || secondary.action.disabled || secondary.action.kind === 'none'}
            aria-describedby={secondary.action.unavailableReason ? secondaryUnavailableId : undefined}
            onClick={() => {
              if (!busy && !secondary.action.disabled && secondary.action.kind !== 'none') secondary.onAction();
            }}
          >
            {secondary.action.label}
          </button>
          {secondary.action.unavailableReason && (
            <p id={secondaryUnavailableId} className="development-inspector__unavailable" data-development-extension="unavailable">
              {secondary.action.unavailableReason}
            </p>
          )}
        </>
      )}
      {error && (
        <p className="development-inspector__error" data-development-region="details.error" data-development-extension="error" role="alert">{error}</p>
      )}
      {model.receipt && (
        <p className="development-inspector__receipt" data-development-region="details.receipt" role="status">{model.receipt}</p>
      )}
    </section>
  );
});
