export type Position = [number, number];
export type Resources = Record<string, number>;
export type Selection = { kind: 'fleet' | 'port' | 'territory' | 'node'; id: string };
export interface CargoLot { kind: string; quantity: number; expires_day: number }
export interface Port { id: string; name: string; position: Position; territory_id: string; sea: string; inventory: Resources; facilities: string[]; cargo_lots?: CargoLot[] }
export interface Territory { id: string; name: string; owner: string; occupier: string | null; administration: string; position: Position; bounds: [number, number, number, number]; description: string }
export interface Link { id: string; from: string; to: string; mode: 'sea' | 'land'; days: number; coordinates: Position[] }
export interface Fleet { id: string; name: string; position: Position; port_id: string | null; kind: 'roman' | 'advanced'; ships: number; route: null | { destination: string; coordinates: Position[]; start_day: number; arrival_day: number; legs: object[] }; cargo: Resources; cargo_lots?: CargoLot[] }
export interface IconRecipe { base: string; badge?: string; variant?: 'navy' | 'burgundy' | 'olive'; seed?: number; fallback_label?: string }
export interface DevelopmentNode { id: string; title: string; description: string; rule: string; location_id: string; prerequisites: string[]; icon: IconRecipe; scope: string; people: string[]; status: 'proposed' | 'available' | 'blocked' | 'underway' | 'completed' | 'planned'; costs: Resources; duration: number; blockers: string[]; progress: number }
export interface Tree { id: string; title: string; ambition: string; version: 1; status: 'proposed' | 'accepted'; provenance: { author: string; version: string; hash: string }; nodes: DevelopmentNode[] }
export interface Project { id: string; node_id: string; tree_id: string; title: string; location_id: string; status: string; start_day: number; finish_day: number; progress: number }
export interface Mandate { id: string; title: string; tree_id: string; budget: number; spent: number; enabled: boolean }
export interface Decision { id: string; title: string; description: string; project_id: string | null; options: { id: string; label: string; costs: Resources }[]; resolved: boolean }
export interface Dispatch { id: string; day: number; kind: string; title: string; detail: string }
export interface State { version: 1; revision: number; day: number; year: number; paused: boolean; speed: number; tutorial: string; resources: Resources; capabilities: string[]; ports: Port[]; territories: Territory[]; links: Link[]; fleets: Fleet[]; trees: Tree[]; projects: Project[]; mandates: Mandate[]; decisions: Decision[]; chronicle: Dispatch[]; selection: Selection | null; assumptions: string[] }
export interface ToolData { state?: State; route?: NonNullable<Fleet['route']>; message?: string; error?: { code: string; message: string }; [key: string]: unknown }
export type Order = (action: string, payload?: Record<string, unknown>) => Promise<void>;
export const number = (value: number) => new Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(value);
export const resourcesText = (resources: Resources) => Object.entries(resources).map(([key, value]) => `${number(value)} ${key.replaceAll('_', ' ')}`).join(' · ') || 'No resource cost';
export const percent = (value: number) => Math.round(Math.max(0, Math.min(1, value)) * 100);
