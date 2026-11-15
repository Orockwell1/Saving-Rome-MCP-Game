import type { DevelopmentNode, IconRecipe } from '../types';

export type DevelopmentCategory = 'Technology' | 'Institution' | 'Policy' | 'Expedition' | 'Project';
export type DevelopmentPhase = 'proposal' | 'authorized' | 'commissioned' | 'complete';

export interface DevelopmentCardModel {
  id: string;
  title: string;
  description: string;
  category: DevelopmentCategory;
  icon: IconRecipe;
  status: DevelopmentNode['status'];
  requirements: { met: number; total: number } | null;
  progress: number;
}

export interface DevelopmentRequirement {
  id: string;
  label: string;
  met: boolean;
}

export interface DevelopmentInspectorModel {
  id: string;
  title: string;
  description: string;
  phase: DevelopmentPhase;
  requirements: DevelopmentRequirement[];
  estimate: string;
  impact: string;
  message: string;
  receipt: string;
  progress: number | null;
}

export interface DevelopmentAction {
  kind: 'discuss' | 'commission' | 'advance' | 'locate' | 'none';
  label: string;
  disabled: boolean;
  unavailableReason?: string;
}

export interface DevelopmentCardProps {
  model: DevelopmentCardModel;
  selected: boolean;
  highlighted?: boolean;
  dimmed?: boolean;
  disabled?: boolean;
  onSelect: (id: string) => void;
}

export interface DevelopmentInspectorProps {
  model: DevelopmentInspectorModel;
  action: DevelopmentAction;
  busy: boolean;
  error?: string;
  onAction: () => void;
  secondary?: { action: DevelopmentAction; onAction: () => void };
}
