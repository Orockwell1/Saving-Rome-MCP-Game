import { memo } from 'react';
import { Icon } from '../Icon';
import type { DevelopmentCardModel, DevelopmentCardProps } from './presentation';
import './fonts.css';
import './tokens.css';
import './development.css';

const statusLabels: Record<DevelopmentCardModel['status'], string> = {
  proposed: '◇ PROPOSED',
  available: '› AVAILABLE',
  blocked: '! BLOCKED',
  underway: '◔ UNDERWAY',
  completed: '✓ COMPLETED',
  planned: 'PLANNED',
};

export const DevelopmentCard = memo(function DevelopmentCard({
  model,
  selected,
  highlighted = false,
  dimmed = false,
  disabled = false,
  onSelect,
}: DevelopmentCardProps) {
  const progress = Math.round(Math.max(0, Math.min(1, model.progress)) * 100);
  const requirementLabel = model.requirements
    ? `${model.requirements.met} / ${model.requirements.total} met`
    : null;

  return (
    <button
      type="button"
      className="development-node"
      data-development-contract="node-details.v1"
      data-development-region="node"
      data-status={model.status}
      data-selected={selected}
      data-highlighted={highlighted}
      data-dimmed={dimmed}
      data-development-extension={model.status === 'planned' ? 'planned' : undefined}
      aria-pressed={selected}
      aria-disabled={disabled}
      aria-label={`${model.category}: ${model.title}. ${statusLabels[model.status]}. ${model.description}${requirementLabel ? ` ${requirementLabel}.` : ''}${model.status === 'underway' ? ` ${progress}% complete.` : ''}`}
      onClick={event => {
        event.stopPropagation();
        if (!disabled) onSelect(model.id);
      }}
    >
      <span className="development-node__header">
        <span className="development-node__icon" data-development-region="node.icon" aria-hidden="true">
          <Icon recipe={model.icon} />
        </span>
        <span className="development-node__category" data-development-region="node.category">
          {model.category.toUpperCase()}
        </span>
        {selected && (
          <span className="development-node__selection" data-development-region="node.selection" aria-hidden="true">●</span>
        )}
      </span>
      <span className="development-node__title" data-development-region="node.title" title={model.title}>
        {model.title}
      </span>
      <span className="development-node__description" data-development-region="node.description">
        {model.description}
      </span>
      <span className="development-node__state">
        <span className="development-node__status" data-development-region="node.status">
          {statusLabels[model.status]}
        </span>
        {requirementLabel && (
          <span className="development-node__requirements" data-development-region="node.requirements">
            {requirementLabel}
          </span>
        )}
      </span>
      {model.status === 'underway' && (
        <span className="development-node__progress" data-development-region="node.progress" data-development-extension="progress" aria-hidden="true">
          <span className="development-node__track"><span style={{ width: `${progress}%` }} /></span>
          <span>{progress}%</span>
        </span>
      )}
    </button>
  );
});
