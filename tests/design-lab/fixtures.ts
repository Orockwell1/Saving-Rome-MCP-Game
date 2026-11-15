import type { DevelopmentAction, DevelopmentCardModel, DevelopmentInspectorModel } from '../../ui/src/development/presentation';
import type { CaseId, ReferenceContent } from './contracts';

export const defaultContent: ReferenceContent = {
  schemaVersion: 1,
  ambition: 'Local development study',
  card: { title: 'Pilot vessel', description: 'Needs berth and crew capacity.', category: 'Project', requirements: { met: 0, total: 2 } },
  details: {
    title: 'Pilot vessel', description: 'Equip a coastal vessel for a test voyage.',
    requirements: [
      { id: 'concept', label: 'Hull concept recorded', met: true },
      { id: 'berth', label: 'Berth capacity', met: false },
      { id: 'crew', label: 'Crew practice', met: false },
    ],
    estimate: '90 treasury · 30 timber · 6 days', impact: 'Home port · shipbuilders and crew',
    message: 'Finish the berth and crew programme before authorizing the test voyage.',
    receipt: 'Proposal · awaiting requirements',
  },
};

export function makeFixture(content: ReferenceContent, scenario: CaseId) {
  const accepted = ['available', 'underway', 'completed', 'busy', 'error'].includes(scenario);
  const status = scenario === 'busy' || scenario === 'error' ? 'available'
    : ['empty', 'disconnected', 'long-content'].includes(scenario) ? 'blocked'
      : scenario as DevelopmentCardModel['status'];
  const phase = status === 'available' ? 'authorized' : status === 'underway' ? 'commissioned' : status === 'completed' ? 'complete' : 'proposal';
  const longTitle = 'A deliberately long programme for shipbuilders, harbour crews, materials, practical learning and the lasting capacity of a coastal community';
  const card: DevelopmentCardModel = {
    id: 'example-project', title: scenario === 'long-content' ? longTitle : content.card.title,
    description: content.card.description, category: content.card.category, icon: { base: 'transport' }, status,
    requirements: status === 'completed' ? null : { met: accepted ? content.card.requirements.total : content.card.requirements.met, total: content.card.requirements.total },
    progress: status === 'underway' ? .6 : status === 'completed' ? 1 : 0,
  };
  const details: DevelopmentInspectorModel = {
    id: card.id, title: scenario === 'long-content' ? longTitle : content.details.title,
    description: scenario === 'long-content' ? 'Long explanations remain readable without widening the document. '.repeat(16) : content.details.description,
    phase, requirements: accepted ? content.details.requirements.map(row => ({ ...row, met: true })) : content.details.requirements,
    estimate: content.details.estimate, impact: content.details.impact,
    message: status === 'planned' ? 'This is a plan, not an executable mechanic.' : accepted ? 'The presentation follows the last accepted campaign snapshot.' : content.details.message,
    receipt: phase === 'authorized' ? 'Awaiting an explicit player order' : phase === 'commissioned' ? 'Commissioned · accepted order' : phase === 'complete' ? 'Complete · verified outcome' : content.details.receipt,
    progress: phase === 'commissioned' ? card.progress : null,
  };
  const action: DevelopmentAction = status === 'available' ? { kind: 'commission', label: 'Commission project', disabled: scenario === 'busy' }
    : status === 'underway' ? { kind: 'advance', label: 'Advance until ready', disabled: false }
      : status === 'completed' ? { kind: 'locate', label: 'View on atlas', disabled: false }
        : status === 'planned' ? { kind: 'none', label: 'Not implemented', disabled: true, unavailableReason: 'No executable rule is implemented for this plan.' }
          : { kind: 'discuss', label: 'Discuss with the steward ›', disabled: scenario === 'disconnected', unavailableReason: scenario === 'disconnected' ? 'No steward is connected. No message can be sent from local preview.' : undefined };
  return { card, details, action, busy: scenario === 'busy', error: scenario === 'error' ? 'Order rejected. The acknowledged state has not changed.' : undefined };
}
