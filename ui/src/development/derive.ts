import { number, resourcesText, type DevelopmentNode, type State, type Tree } from '../types';
import type { DevelopmentCardModel, DevelopmentCategory, DevelopmentInspectorModel } from './presentation';

const categories: Record<string, DevelopmentCategory> = {
  hull_research: 'Technology', rigging: 'Technology', sail_plan: 'Technology', navigation: 'Technology', research: 'Technology',
  institution: 'Institution', law: 'Policy',
};

export function developmentCard(node: DevelopmentNode, lookup: ReadonlyMap<string, DevelopmentNode>): DevelopmentCardModel {
  return {
    id: node.id, title: node.title, description: node.description, category: categories[node.rule] ?? 'Project', icon: node.icon, status: node.status,
    requirements: node.prerequisites.length ? { met: node.prerequisites.filter(id => lookup.get(id)?.status === 'completed').length, total: node.prerequisites.length } : null,
    progress: Math.max(0, Math.min(1, node.progress)),
  };
}

export function developmentInspector(node: DevelopmentNode, tree: Tree, state: State): DevelopmentInspectorModel {
  const lookup = new Map(state.trees.flatMap(item => item.nodes).map(item => [item.id, item]));
  const project = state.projects.find(item => item.node_id === node.id);
  const phase = node.status === 'completed' ? 'complete' : node.status === 'underway' ? 'commissioned' : node.status === 'available' && tree.status === 'accepted' ? 'authorized' : 'proposal';
  const place = state.ports.find(item => item.id === node.location_id) ?? state.territories.find(item => item.id === node.location_id);
  const requirements = node.prerequisites.map(id => ({ id, label: lookup.get(id)?.title ?? id, met: lookup.get(id)?.status === 'completed' }));
  const directBlockers = new Set(node.prerequisites.map(id => `Prerequisite incomplete: ${id}`));
  requirements.push(...node.blockers.filter(blocker => !directBlockers.has(blocker)).map((label, index) => ({ id: `blocker:${index}`, label, met: false })));
  const message = node.status === 'planned' ? 'Planned only: this node is not an executable mechanic. Discuss supported options with the steward.'
    : node.blockers.length ? node.blockers.join('. ')
      : phase === 'complete' ? 'The campaign confirms this development is complete.'
        : phase === 'commissioned' ? 'The campaign has accepted this project. Time and consequential decisions determine its outcome.'
          : phase === 'authorized' ? 'The ambition is accepted and current requirements are met. Commissioning commits the engine-defined resources.'
            : 'Accept this ambition in Council before commissioning work.';
  const receipt = phase === 'complete' ? `Complete${project ? ` · campaign day ${number(project.finish_day)}` : ''}`
    : phase === 'commissioned' ? `Commissioned${project ? ` · started day ${number(project.start_day)} · estimated finish day ${number(project.finish_day)}` : ''}`
      : phase === 'authorized' ? 'Authorized · awaiting your order'
        : node.status === 'planned' ? 'Planned · not executable' : tree.status === 'proposed' ? 'Proposal · awaiting ambition acceptance' : 'Proposal · awaiting requirements';
  return {
    id: node.id, title: node.title, description: node.description, phase, requirements,
    estimate: `${resourcesText(node.costs)} · ${number(node.duration)} campaign days`,
    impact: [place?.name ?? node.location_id, node.scope, node.people.join(', ')].filter(Boolean).join(' · '),
    message, receipt, progress: phase === 'commissioned' || phase === 'complete' ? Math.max(0, Math.min(1, node.progress)) : null,
  };
}
