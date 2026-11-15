import { z } from 'zod';
import rawContract from '../../docs/components/development-node-details.v1.json';

export const regionIds = [
  'node', 'node.icon', 'node.category', 'node.selection', 'node.title', 'node.description', 'node.status', 'node.requirements', 'node.progress',
  'details', 'details.phase', 'details.title', 'details.description', 'details.requirements', 'details.budget', 'details.impact', 'details.reason', 'details.action', 'details.receipt', 'details.progress', 'details.error',
] as const;
export const flowIds = ['select-inspect', 'compact-back', 'commission-acknowledgement', 'commission-error', 'disconnected-steward', 'long-content', 'private-reference-import'] as const;
export const caseIds = ['blocked', 'proposed', 'available', 'underway', 'completed', 'busy', 'error', 'empty', 'planned', 'disconnected', 'long-content'] as const;
export type CaseId = typeof caseIds[number];
const coordinate = z.number().finite().min(0).max(4096);
const color = z.string().regex(/^#[\da-f]{6}$/i);
const typography = z.strictObject({ family: z.enum(['Source Sans 3', 'Crimson Text']), weight: z.union([z.literal(400), z.literal(700)]), size: z.number().positive(), lineHeight: z.number().positive(), letterSpacing: z.number().optional() });
const owner = z.string().regex(/^ui\/src\/[a-zA-Z0-9/.-]+$/);
const text = z.string().max(4000);

export const contract = z.strictObject({
  schemaVersion: z.literal(1), id: z.literal('node-details.v1'), revision: z.number().int().positive(),
  approval: z.enum(['comparison-pending', 'verified-with-declared-differences']),
  sourceBinding: z.literal('private-development-metadata-only'),
  acceptedDifferences: z.array(z.literal('existing-public-ship-glyph')),
  owners: z.strictObject({ node: owner, details: owner, presentation: owner, tokens: owner, integration: z.array(owner) }),
  variants: z.strictObject({
    nodeState: z.array(z.enum(['proposed', 'available', 'blocked', 'underway', 'completed'])),
    interaction: z.array(z.enum(['default', 'hover', 'selected', 'focus'])),
    detailsPhase: z.array(z.enum(['proposal', 'authorized', 'commissioned', 'complete'])),
    operationalExtensions: z.array(z.enum(['busy', 'error', 'empty', 'planned', 'disconnected', 'live-progress', 'long-content'])),
  }),
  tokens: z.strictObject({
    background: color, surface: color, raised: color, hover: color, selected: color, ink: color, muted: color, accent: color,
    border: color, softBorder: color, selectedBorder: color, focus: color, blocked: color, proposed: color, available: color, underway: color, completed: color,
    radius: z.number().nonnegative(), spacing: z.array(z.number().positive()), borderWidths: z.array(z.number().positive()),
    label: typography, small: typography, body: typography, cardTitle: typography, detailsTitle: typography,
  }),
  regions: z.array(z.strictObject({ id: z.enum(regionIds), required: z.boolean(), referenceBox: z.tuple([coordinate, coordinate, coordinate, coordinate]).optional() })).min(1).max(regionIds.length)
    .refine(regions => new Set(regions.map(region => region.id)).size === regions.length, 'Region IDs must be unique'),
  viewports: z.array(z.strictObject({ id: z.enum(['expanded', 'compact', 'mobile-safety']), width: coordinate, height: coordinate, dpr: z.literal(1), nodeOrigin: z.tuple([coordinate, coordinate]).optional(), detailsOrigin: z.tuple([coordinate, coordinate]) })),
  flows: z.array(z.enum(flowIds)).length(flowIds.length).refine(flows => new Set(flows).size === flowIds.length),
  behavior: z.strictObject({ fieldSemantics: text, permissions: text, transitions: text, navigation: text, keyboard: text, errors: text, scrolling: text, motion: text, noWrite: text, privacy: text }),
}).parse(rawContract);

export const referenceContentSchema = z.strictObject({
  schemaVersion: z.literal(1),
  ambition: z.string().max(400),
  card: z.strictObject({
    title: z.string().min(1).max(400), description: text,
    category: z.enum(['Technology', 'Institution', 'Policy', 'Expedition', 'Project']),
    requirements: z.strictObject({ met: z.number().int().min(0).max(500), total: z.number().int().min(0).max(500) }).refine(value => value.met <= value.total),
  }),
  details: z.strictObject({
    title: z.string().min(1).max(400), description: text,
    requirements: z.array(z.strictObject({ id: z.string().regex(/^[a-z][a-z0-9-]{0,79}$/), label: z.string().max(400), met: z.boolean() })).max(32)
      .refine(rows => new Set(rows.map(row => row.id)).size === rows.length),
    estimate: text, impact: text, message: text, receipt: text,
  }),
});
export type ReferenceContent = z.infer<typeof referenceContentSchema>;

export interface LayoutEvidence {
  contractId: string;
  revision: number;
  viewport: { width: number; height: number; dpr: number };
  regions: {
    id: typeof regionIds[number];
    count: number;
    elements: ({
      box: number[];
      visible: boolean;
    } & Pick<CSSStyleDeclaration, 'fontFamily' | 'fontSize' | 'fontWeight' | 'lineHeight' | 'letterSpacing' | 'color' | 'backgroundColor' | 'borderWidth' | 'borderColor' | 'borderRadius'>)[];
  }[];
}

export function collectEvidence(stage: HTMLElement): LayoutEvidence {
  const bounds = stage.getBoundingClientRect();
  const regions = contract.regions.map(region => {
    const elements = Array.from(stage.querySelectorAll<HTMLElement>(`[data-development-region="${region.id}"]`)).slice(0, 4);
    return { id: region.id, count: elements.length, elements: elements.map(element => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        box: [rect.x - bounds.x, rect.y - bounds.y, rect.width, rect.height],
        visible: element.getClientRects().length > 0,
        fontFamily: style.fontFamily, fontSize: style.fontSize, fontWeight: style.fontWeight, lineHeight: style.lineHeight, letterSpacing: style.letterSpacing,
        color: style.color, backgroundColor: style.backgroundColor, borderWidth: style.borderWidth, borderColor: style.borderColor, borderRadius: style.borderRadius,
      };
    }) };
  });
  return { contractId: contract.id, revision: contract.revision, viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio }, regions };
}
